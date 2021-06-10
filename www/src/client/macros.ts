/* 
 * The tiny macro processor of Wunderland Client.
 *
 * Written in TypeScript and compiled to ECMAScript.
 *
 * Build: tsc --sourceMap macros.ts
 * 
 * Ideas: 
 *  Fuchur: Fuchur denkt .o( makros mit / im Namen sind auch doof ) <- Holger: zumindest am Anfang!
 */

namespace wlMacros {

  class MacroProps {
    public body : string;
    public trigger : TriggerProps;
  }

  class TriggerProps {
    public pattern : string;
    public matching: string;
  }

  export class EvaluationContext {
    public cmd : string;
    public parameters : Array<string> = [];
    public localVariables : { [key: string]: string } = {};

    /**
     * Constructor to pass command in
     */
     constructor(cmd : string) {
      if (cmd) {
        this.cmd = cmd;
        this.parameters = cmd.split(' ');
        this.localVariables = {};
      }
      else {
        this.cmd = '';
        this.parameters = [];
        this.localVariables = {};
      }
    }

    /**
     * isMacro - return true, if the current command is a macro, otherwise false.
     */
     public isMacro() {
      return (this.cmd!=null && this.cmd.length>0 && this.cmd.charAt(0) == MacroProcessor.MACRO_KEY);
    }

    /**
     * getFirstWord returns the first word of the macro/command
     * @returns the first word of the command without leading '/'
     */
    public getFirstWord() {
      if (this.parameters.length==0) return '';
      let firstWord = this.parameters[0];
      return this.isMacro ? firstWord.substr(1) : firstWord;
    }
  }

  /**
   * Stack holding a list of execution context and a step 
   * counter for recursion detection.
   */
  export class Stack {
    public content : Array<EvaluationContext> = [];
    public stepCount : number = 0;

    /**
     * Constructor to pass initial EvaluationContext in
     */
    constructor(firstContext : EvaluationContext) {
      if (!firstContext) firstContext = new EvaluationContext(null);
      this.content.push(firstContext);
    }
    /**
     * getContext - return current context, if there is none, create one
     */
    public getCContext() {
      if (this.content.length == 0) {
        this.content.push(new EvaluationContext(null));
      }
      return this.content[this.content.length-1];
    }
    /**
     * getCCmd - get current command
     */
    public getCCmd() {
      return this.content.length > 0 ? this.content[this.content.length-1].cmd : '';
    }

    public push(context : EvaluationContext) {
      this.content.push(context);
    }

    public pop() : EvaluationContext {
      return this.content.pop();
    }

    /**
     * Search the variable in stack, beginning from the end /current.
     * If nothing found, return null.
     * @param vName name of the variable to search
     * @returns a value string or ```null```
     */
    public searchVariable(vName : string) : string {
      let vValue : string = null;
      for (let i = this.content.length-1; i>=0; i--) {
        vValue = this.content[i].localVariables[vName]
        if (vValue!=null) break;
      }
      return vValue;
    }
  }

  /**
   * MacroResult contains the result of a macro evaluation.
   */
  export class EvalResult {
    /**
     * ```true``` if the cmd should be send remote, otherwise ```false```
     */
    public send : boolean;
    /**
     * the command to send remote
     */
    public cmd : string;
    /**
     * a message to output locally, may be multiline, but must end with '\n'
     */
    public message : string;
    /**
     * Constructor to initialze class
     * @param send ```true``` if the cmd should be send remote, otherwise ```false```
     * @param cmd the command to send remote
     * @param message a message to output locally, may be multiline, but must end with '\n'
     */
    constructor (send : boolean, cmd : string, message : string) {
      this.send = send;
      this.cmd = cmd;
      this.message = message;
    }
    /**
     * Append another EvalResult to this one
     * @param next another EvalResult, which content should be appended
     */
    public append(next : EvalResult) {
      if (next) {
        if (next.send === true) this.send = true;
        this.cmd += next.cmd;
        this.message += next.message;
      }
    }
  }

  export class MacroProcessor {
  
    // constants
    static readonly VERSION = '0.4';
    static readonly MACRO_KEY = '/';
    static readonly STORAGE_KEY_LIST = 'Macros.List';
    static readonly STORAGE_KEY_LISTVAR = 'Macros.ListVar';
    static readonly MAX_RECUR = 42;
    static readonly TF_SEPARATOR_TOKEN = '%;';
    
    // All custom macros we know.
    private customMacros: { [key: string]: MacroProps } = {};

    // All global variables we know. (and some are default + special)
    private globalVariables: { [key: string]: string } = { 'borg':'1', 'matching':'glob' };
  
    // Triggers need complete lines to match. If we received a partial 
    // line, store it here and use it, as soon as it completes.
    private partialLineBufferForTrigger : string = '';

    // Constructor loads settings from localStorage
    constructor() { 
    //  this.reloadSettings();
    }
  
    // Return version number
    public getVersion() : string {
      return MacroProcessor.VERSION;
    }

    // Sanity checks! Someone may have deleted/corrupted special variables
    private maintainSpecialVariables() : boolean {
      let fixed : boolean = false;
      // 'borg' must exist, set it to '0' or '1' if unset or modified.
      if (this.globalVariables['borg']==null || this.globalVariables['borg']=='') {
        this.globalVariables['borg'] = '0';
        fixed = true;
      }
      else if (this.globalVariables['borg']!='0') {
        this.globalVariables['borg'] = '1';
        fixed = true;
      }
      // 'matching' must exist and be lower case ...
      let mMatching = this.globalVariables['matching'].toLowerCase();
      // correct regex -> regexp ...
      if (mMatching=='regex') {
        this.globalVariables['matching'] = 'regexp';
      }
      // ... or set it to 'glob', if unset or invalid value.
      else if (mMatching!='simple' && mMatching!='glob' && mMatching!='regexp') {
        this.globalVariables['matching'] = 'glob';
        fixed = true;
      }

      return fixed;
    }
  
    // Save all settings to localStorage.
    private saveSettings() {
      this.maintainSpecialVariables();
      localStorage.setItem(MacroProcessor.STORAGE_KEY_LIST, JSON.stringify(this.customMacros));
      localStorage.setItem(MacroProcessor.STORAGE_KEY_LISTVAR, JSON.stringify(this.globalVariables));
    }
  
    // Try to (re-)load settings from localStorage.
    public reloadSettings() {
      let updateRequired = false;

      try {
        let storedMacrosString = localStorage.getItem(MacroProcessor.STORAGE_KEY_LIST);  
        if (storedMacrosString) {
          let storedMacros = JSON.parse(storedMacrosString);
          // the first iteration of the save format had a cmd as string value,
          // but now its a dictionary, so we convert old saved data into new.
          this.customMacros = {};
          let updateRequired = false;
          if (storedMacros) {
            for (let mName in storedMacros) {
              let mBody = storedMacros[mName];
              if (typeof mBody === 'string') {
                let props = new MacroProps;
                props.body = mBody;
                this.customMacros[mName] = props;
                updateRequired = true;
              } else {
                this.customMacros[mName] = (mBody as unknown) as MacroProps;
              }
            }
          }
          else {
            updateRequired = true;
          }
        }
       
        let storedGlobalVarsString = localStorage.getItem(MacroProcessor.STORAGE_KEY_LISTVAR);  
        if (storedGlobalVarsString) {
          let storedGlobalVars = JSON.parse(storedGlobalVarsString);
          // the first iteration of the save format had a cmd as string value,
          // but now its a dictionary, so we convert old saved data into new.
          this.globalVariables = {};
          if (storedGlobalVars) {
            this.globalVariables = storedGlobalVars;
          }
        }

        if (this.maintainSpecialVariables()) updateRequired=true;
        
        // We updated the save format?
        if (updateRequired) this.saveSettings();
      }
      catch (e) {
        console.log('Macro processor: ' + e.name + ': ' + e.message);
      }
    }
  
    // Build a key name (similar to TF) from event.
    public getNamedKey(event : KeyboardEvent) : string
    {
      let keyName = '';

      // If the key is ONLY unidentified or a modifier key, skip it.
      // see: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values
      // NOTE: IE and Firefox report 'OS' for 'Meta', see: https://bugzilla.mozilla.org/show_bug.cgi?id=1232918
      if (['Unidentified','Alt','AltGraph','CapsLock','Control','Fn','FnLock','Hyper','Meta',
        'NumLock','ScrollLock','Shift','Super','Symbol','SymbolLock','OS',
        'Insert','Backspace','Delete'].indexOf(event.key) == -1)
      {
        keyName = 'key_';
        if (event.ctrlKey) keyName += 'ctrl_';
        if (event.altKey) keyName += 'alt_';
        if (event.shiftKey) keyName += 'shift_';
        if (event.metaKey) keyName += 'meta_';
        keyName += event.key == ' ' ? 'Space' : event.key;
      }
      
      return keyName;
    }
  
    /**
     * Handle a single key-down event.
     * @param event a ```KeyboardEvent``` raised on the client
     * @returns evaluation result
     */
    public keyTrigger(event : KeyboardEvent) : EvalResult {
      let result = new EvalResult(false, '', '');

      // Build a key name (similar to TF)
      let keyName = this.getNamedKey(event);
        
      if (keyName.length > 0) {       
        // Try to handle this, can only be a custom macro, so check it first.
        if (this.customMacros[keyName]) {
          result = this.expandMacro(new Stack(new EvaluationContext('/'+keyName)));  
        }

        // If we can not?
        if (!result.send) {
          // Reset new command and user message.
          result.cmd = ''; result.message = '';
          // Give a hint for function keys only.
          if (['F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
            'F13','F14','F15','F16','F17','F18','F19','F20','F21','F22','F23','F24',
            ].indexOf(event.key) != -1) {
            result.message = '% The key "' + keyName + '" is undefined; you may use "/def ' + keyName + ' = <commands>" to define it.\n';
          }
        }
      }

      return result;
    }

    /**
     * Handle a single text line trigger event.
     * @param text a single text line received from the server
     * @returns evaluation result
     */
     public textTrigger (text : string) : EvalResult {
      let result = new EvalResult(false, '', '');

      // triggers are switched off globally.
      if (this.globalVariables['borg']=='0') {
        this.partialLineBufferForTrigger = '';
        return result;
      }

      if (text.length > 0) {
        // Prefix the new text with the old buffer and reset buffer.
        text = this.partialLineBufferForTrigger.concat(text);
        this.partialLineBufferForTrigger = '';

        // Split text into lines. (no matter if LF or CRLF)
        let lines = text.split(/\r?\n/);

        // There last element on 'lines' contains the rest after the 
        // last '\n'. It might be empty anyway, but we need to chop
        // it off the array and append it to the 'partialLineBuffer'
        // for the next run.
        this.partialLineBufferForTrigger = lines.pop();

        let picomatch = require('picomatch');

        // the rest of the array was complete lines, so test 
        // all triggers now.
        for (let i=0;i<lines.length;i++) {
          for (let mName in this.customMacros) {
            let mProps = this.customMacros[mName];
            if (mProps.trigger != null && mProps.trigger.pattern != null && mProps.trigger.pattern.length > 0) {
              if (mProps.trigger.matching == 'simple') {
                if (lines[i] == mProps.trigger.pattern) {
                  console.log('% trigger match simple pattern of: '+mName);
                  let context = new EvaluationContext('/'+mName);
                  context.parameters.push(lines[i]); // the triggering line is the only additional parameter
                  context.localVariables['P0'] = lines[i]; // in addition populate the P0 variable
                  result.append(this.expandMacro(new Stack(context)));
                }
              }
              else if (mProps.trigger.matching == 'glob') {
                // pm.compileRe(pm.parse("(*) has arrived.")).exec("Gast1 has arrived.")[1] == 'Gast1'
                let mResult = picomatch.compileRe(picomatch.parse(mProps.trigger.pattern)).exec(lines[i]);
                if (mResult) {
                  console.log('% trigger match glob pattern of: '+mName);
                  let context = new EvaluationContext('/'+mName);
                  for (let p=0;;p++) {
                    if (!mResult[p]) break;
                    context.parameters.push(mResult[p]);
                    context.localVariables['P' + p] = mResult[p];
                  }
                  context.localVariables['PL'] = lines[i].substr(0, mResult.index);
                  context.localVariables['PR'] = lines[i].substr(mResult.index + mResult[0].length);
                  result.append(this.expandMacro(new Stack(context)));
                }                
              } 
              else if (mProps.trigger.matching == 'regexp') {
                let regex = new RegExp(mProps.trigger.pattern);
                let mResult = regex.exec(lines[i]);
                if (mResult) {
                  console.log('% trigger match regexp pattern of: '+mName);
                  let context = new EvaluationContext('/'+mName);
                  for (let p=0;;p++) {
                    if (!mResult[p]) break;
                    context.parameters.push(mResult[p]);
                    context.localVariables['P' + p] = mResult[p];
                  }
                  // '   111   '
                  context.localVariables['PL'] = lines[i].substr(0, mResult.index);
                  context.localVariables['PR'] = lines[i].substr(mResult.index + mResult[0].length);
                  result.append(this.expandMacro(new Stack(context)));
                }                
              } 
              else {
                console.log('MacroProcessor macro \''+mName+'\' invalid trigger matching: ' + mProps.trigger.matching + ' detected');
              }
            }
          }
        }
      }

      return result;
    }

    // Find and return a double-quoted string from source.
    // Return empty string, if not found.
    private getQuotedString(source : string, quoteChar : string) : string {
      let quoted : string = '';
      
      // charAt(0) must be the opening quote.
      if (source.charAt(0) != quoteChar) return quoted;

      // search for the closing quote.
      for (let i=1;i<source.length;i++) {
        if (source.charAt(i) == quoteChar) {
          // We have found one. But it must not be escaped, so
          // count '\' chars in front of quote. If it's an uneven
          // uneven number, it is escaped and we must continue!
          let bs = 0;
          for (let k = i-1;k>0;k--) {
            if (source.charAt(k) == '\\') {
              bs++;
              continue;
            }
            break;
          }
          if (bs % 2 == 0) {
            // even number of backslashes == closing quote found! 
            quoted = source.substr(0, i+1);
            break;
          }
        }
      }
      
      return quoted;
    }
  
    // Handle /DEF command - define a named macro, do NOT pass words array, 
    // but the whole cmd line, because char position is relevant here!
    // @returns evaluation result
    private handleDEF(stack : Stack) : EvalResult {
      let result = new EvalResult(false, '', '');

      let myContext = stack.getCContext();
      let firstWord = myContext.getFirstWord();
      let mPattern = '';
      let mMatching = '';
      let body = myContext.cmd.substr(4).trim();
      
      // collect options
      while (body.length>0 && body.charAt(0)=='-') {
        if (body.length<2) {
          result.message = '% '+firstWord+': missing option -\n';
          return result;
        }
        
        // -t trigger option
        if (body.charAt(1)=='t') {
          mPattern = this.getQuotedString(body.substr(2), '"');
          if (!mPattern || mPattern.length==0) {
            result.message = '% '+firstWord+': invalid/incomplete trigger option, quotes missing?\n';
            return result;            
          } 
          else if (mPattern.length==2) {
            result.message = '% '+firstWord+': empty trigger found\n';
            return result;            
          }
          else { // found a quoted trigger string!
            // cut trigger part off the body. +2 for the '-t' option and trim.
            body = body.substr(mPattern.length + 2).trim();
            // chop off the quotes off from trigger on both sides.
            mPattern = mPattern.substr(1, mPattern.length-2);
            //console.log('TMP '+firstWord+': found trigger:\''+mPattern+'\'.');
          }
        } 

        // -m matching option
        else if (body.charAt(1)=='m') {
          if (body.indexOf('-msimple ')==0) {
            mMatching = 'simple';
            body = body.substr(9).trim();
          } else if (body.indexOf('-mglob ')==0) {
            mMatching = 'glob';
            body = body.substr(7).trim();
          } else if (body.indexOf('-mregexp ')==0) {
            mMatching = 'regexp';
            body = body.substr(9).trim();
          } else {
            result.message = '% '+firstWord+': matching option must be: -msimple, -mglob or -mregexp\n';
            return result;
          }
        }
        else {
          result.message = '% '+firstWord+': unknown option -'+body.charAt(1)+'\n';
          return result;
        }
      }
      
      let eqSign = body.indexOf("=");
      if (eqSign > 0) {
        let mName = body.substring(0, eqSign).trim();
        let mBody = body.substring(eqSign+1).trim();
        if (mName.length > 0) {

          // sanity checks
          if (mPattern.length > 0) {
            if (mMatching.length==0) mMatching = this.globalVariables['matching']; // default
            if (mMatching == 'glob') {
              var picomatch = require('picomatch');
              try {
                let regex = picomatch.compileRe(picomatch.parse(mPattern));
              } catch (error) {
                result.message = '% '+firstWord+': glob error: '+error+'\n';
                return result;
              }
            }
            else if (mMatching == 'regexp') {
              try {
                let regex = new RegExp(mPattern);
              } catch (error) {
                result.message = '% '+firstWord+': regexp error: '+error+'\n';
                return result;
              }
            }
            // else don't check simple
          } else {
            // if no pattern, no matching required
            mMatching = '';
          }

          // wser wants to know
          if (this.customMacros[mName]!=null && this.customMacros[mName].body !== mBody) {
            result.message = '% '+firstWord+': redefined macro ' + mName + '\n';
          }

          // create/update macro
          let macro = new MacroProps;
          macro.body = mBody;
          macro.trigger = new TriggerProps;
          macro.trigger.pattern = mPattern;
          macro.trigger.matching = mMatching;
          this.customMacros[mName] = macro;
          this.saveSettings();
        }
        else {
          result.message = '% '+firstWord+': &lt;name&gt; must not be empty\n';
        }
      }
      else if (eqSign == 0) {
        result.message = '% '+firstWord+': &lt;name&gt; missing, try: /def &lt;name&gt; = &lt;body&gt;\n';
      }
      else {
        result.message = '% '+firstWord+': \'=\' missing, try: /def &lt;name&gt; = &lt;body&gt;\n';
      }

      return result;
    }

    // Handle /UNDEF command - undefine a named macro
    // @returns evaluation result
    private handleUNDEF(stack : Stack) : EvalResult {
      let result = new EvalResult(false, '', '');

      let myContext = stack.getCContext();
      let firstWord = myContext.getFirstWord();
      for (let i = 1; i < myContext.parameters.length; i++) {
        if (myContext.parameters[i].length > 0) {
          if (!this.customMacros[myContext.parameters[i]]) {
            result.message += '% '+firstWord+': macro "' + myContext.parameters[i] + '" was not defined.\n';
          } else {
            delete this.customMacros[myContext.parameters[i]];
            this.saveSettings();
          }
        }
      }

      return result;
    }

    // Handle /LIST command - display a list of macros
    // @returns evaluation result
    private handleLIST(stack : Stack) : EvalResult {
      let result = new EvalResult(false, '', '');

      let myContext = stack.getCContext();
      let firstWord = myContext.getFirstWord();

      var picomatch = null;

      if (myContext.parameters.length > 1) {
        picomatch = require('picomatch');
      }
      
      var sortedKeys = Object.keys(this.customMacros).sort();
      for (var i = 0; i<sortedKeys.length; i++) {
        if (!picomatch || picomatch.isMatch(sortedKeys[i], myContext.parameters.slice(1))) {
          let macroProps = this.customMacros[sortedKeys[i]];
          result.message += '/def ';
          if (macroProps.trigger != null && macroProps.trigger.pattern!=null && macroProps.trigger.pattern.length > 0) {
            result.message += '-m' + macroProps.trigger.matching + ' ';
            result.message += '-t"' + macroProps.trigger.pattern + '" ';
          }
          result.message += (sortedKeys[i]+' = '+macroProps.body+'\n');
        }
      }
      
      if (result.message.length == 0) result.message = '% '+firstWord+': no macros found.\n';

      return result;
    }

    // Substitute in 'text' in this order:
    // 1. given parameters     : %{#}, %{*}, %{0}, %{1}, %{2} and so on
    // 2. given local variables: %{whatever} in local scoped defined is
    // 3. global variables     : %{borg}, %{matching} and so on 
    private substituteVariables(text : string, stack : Stack) : string
    {
      let oldBody = text;
      let newBody = '';

      let deadEndLimit = 42; // limit number of substitution loops
      
      let myContext = stack.getCContext();
      let globVars = this.globalVariables;

      while (deadEndLimit--) {
        newBody = oldBody.replace(/(%{[^ -]*?})/, function(m) { 
          var strippedM = m.substr(2, m.length-3);
          
          if (strippedM == '#') {
            return ''+myContext.parameters.length+'';
          }
          else if (strippedM == '*') {
            return ''+myContext.parameters.slice(1).join(' ')+'';
          }
          else {
            const parsedM = parseInt(strippedM);
            // if this is not a numbered parameter
            if (isNaN(parsedM)) { 
              // local variables may shadow global
              let vValue = stack.searchVariable(strippedM);
              if (vValue != null) return vValue;
              // global variables as fallback
              vValue = globVars[strippedM];
              if (vValue != null) return vValue;
              // or just empty
              return ''; 
            }
            // it is a numbered parameter
            else {
              if (parsedM < myContext.parameters.length) {
                return myContext.parameters[parsedM];
              }
              else {
                return '';
              }
            }
          }
        });
        if (newBody != oldBody) {
          oldBody = newBody;
        }
        else break;
      }
      
      return newBody;
    }

    // Handle /SET command - set the value of a global variable, do NOT pass words array, 
    // but the whole cmd line, because spaces are relevant here!
    // @returns evaluation result
    private handleSET(stack : Stack) : EvalResult {
      let result = new EvalResult(false, '', '');

      let myContext = stack.getCContext();
      let firstWord = myContext.getFirstWord();

      let body = myContext.cmd.substr(4).trim();
      
      let wsSign = body.indexOf(" ");
      let eqSign = body.indexOf("=");

      let vName : string  = '';
      let vValue : string  = null;

      // there is an '=' and no ' ' or the '=' is the first
      if (eqSign>=0 && (wsSign<0 || eqSign<wsSign)) {
        vName = body.substring(0, eqSign).trim();
        vValue = body.substring(eqSign+1); // do not trim!
        // no value is valid!
      }
      // maybe there is at least a ' '?
      else if (wsSign > 0) {
        vName = body.substring(0, wsSign).trim();
        vValue = body.substring(wsSign+1).trim(); // trim!
        if (vValue.length == 0) vValue = null; // no value is not valid!
      }
      // no '=' and no ' ' found.
      else {
        vName = body;
      }
      
      if (vName.length > 0 && vValue != null) {
        if (this.globalVariables[vName]!=null && this.globalVariables[vName] !== vValue) {
            result.message = '% '+firstWord+': redefined variable ' + vName + '\n';
        }
        this.globalVariables[vName] = vValue;
        this.saveSettings();
      }
      else if (vName.length == 0 && vValue != null && vValue.length > 0) {
        result.message = '% '+firstWord+': &lt;name&gt; must not be empty\n';
      }
      else if (vName.length == 0) {
        return this.handleLISTVAR(stack);
      }
      else {
        if (this.globalVariables[vName]!=null) {
            result.message = '% '+vName+'='+this.globalVariables[vName]+'\n';
        }
        else {
          result.message = '% '+vName+' not set globally\n';
        }
      }

      return result;
    }

    // Handle /UNSET command - unset variable(s)
    // @returns evaluation result
    private handleUNSET(stack : Stack) : EvalResult {
      let result = new EvalResult(false, '', '');

      let myContext = stack.getCContext();
      let firstWord = myContext.getFirstWord();

      for (let i = 1; i < myContext.parameters.length; i++) {
        if (myContext.parameters[i].length > 0) {
          if (!this.globalVariables[myContext.parameters[i]]) {
            result.message += '% '+firstWord+': global variable "' + myContext.parameters[i] + '" was not defined.\n';
          } else {
            delete this.globalVariables[myContext.parameters[i]];
            this.saveSettings();
          }
        }
      }

      return result;
    }

    // Handle /LISTVAR command - list values of variables
    // @returns evaluation result
    private handleLISTVAR(stack : Stack) : EvalResult {
      let result = new EvalResult(false, '', '');

      var picomatch = null;
      
      let myContext = stack.getCContext();
      let firstWord = myContext.getFirstWord();

      if (myContext.parameters.length > 1) {
        picomatch = require('picomatch');
      }
      
      var sortedKeys = Object.keys(this.globalVariables).sort();
      for (var i = 0; i<sortedKeys.length; i++) {
        if (!picomatch || picomatch.isMatch(sortedKeys[i], myContext.parameters.slice(1))) {
          let vValue = this.globalVariables[sortedKeys[i]];
          result.message += '/set '+sortedKeys[i]+'='+vValue+'\n';
        }
      }
      
      if (result.message.length == 0) result.message = '% '+firstWord+': no global variables found.\n';

      return result;
    }

    // Handle /LET command - set the value of a local variable in the parent (!) 
    // context, because our local context will disappear after the macro expansion has finished.
    // @returns evaluation result
    private handleLET(stack : Stack) : EvalResult {
      let result = new EvalResult(false, '', '');

      let myContext = stack.getCContext();
      let firstWord = myContext.getFirstWord();

      // Create a local variable in the current context.
      let body = myContext.cmd.substr(4).trim();
      
      let wsSign = body.indexOf(" ");
      let eqSign = body.indexOf("=");

      let vName : string  = '';
      let vValue : string  = null;

      // there is an '=' and no ' ' or the '=' is the first
      if (eqSign>=0 && (wsSign<0 || eqSign<wsSign)) {
        vName = body.substring(0, eqSign).trim();
        vValue = body.substring(eqSign+1); // do not trim!
        // no value is valid!
      }
      // maybe there is at least a ' '?
      else if (wsSign > 0) {
        vName = body.substring(0, wsSign).trim();
        vValue = body.substring(wsSign+1).trim(); // trim!
        if (vValue.length == 0) vValue = null; // no value is not valid!
      }
      // no '=' and no ' ' found.
      else {
        vName = body;
      }

      if (vName.length > 0 && vValue != null) {
        myContext.localVariables[vName] = vValue;
      }
      else if (vName.length == 0) {
        result.message = '% '+firstWord+': &lt;name&gt; must not be empty\n';
      }
      else {
        result.message = '% '+firstWord+': &lt;value&gt; must not be empty\n';
      }

      return result;
    }

    // Handle /HELP command - display the help text
    // @returns evaluation result
    private handleHELP(stack : Stack) : EvalResult {
      let result = new EvalResult(false, '', '');

      let myContext = stack.getCContext();
      let topic = myContext.parameters.length > 1 ? myContext.parameters[1].toLowerCase() : '';

      result.message = new MacroHelp(topic).getHelp();

      return result;
    }

    /**
     * Handle custom macro.
     * @param stack stack to use
     * @returns evaluation result
     */
    // Handle default case, custom macro or just do nothing.
    // @returns evaluation result
    private handleCUSTOM(stack : Stack) : EvalResult {
      let result = new EvalResult(false, '', '');

      let myContext = stack.getCContext();
      let firstWord = myContext.getFirstWord();

      if (this.customMacros[firstWord]!=null) {
        let body = this.customMacros[firstWord].body;
        let steps = body.split(MacroProcessor.TF_SEPARATOR_TOKEN);
        let stepNums = steps.length;
        if (stepNums > 42) {
          result.message = '% '+firstWord+': command list truncated to 42 for some reason, sorry\n';
          stepNums = 42;
        }
        for (let i = 0; i < stepNums; i++) {
          // substitute variables in this step
          let step = this.substituteVariables(steps[i], stack); // substitute variables
          // Macro calls macro? Do not check substituted 'step' here because this
          // may be (mis-)used for 'macro injection' through subsituted '/'.
          if (steps[i].length>0 && steps[i].charAt(0) == MacroProcessor.MACRO_KEY) {
            // create child context and resolve nested step
            stack.push(new EvaluationContext(step));
            let childResult = this.resolveSingle(stack);
            if (childResult.send === true) result.send = true;
            result.cmd += childResult.cmd;
            result.message += childResult.message;
          }
          else {
            // otherwise just append to list of new cmd
            result.cmd += (step + '\n');
          }
        }
        result.send = true;
      }
      else {
        result.message = '% '+firstWord+': no such command or macro\n';
      }
      return result;
    }


    /**
     * Expand any macro, and maybe sub macros, so this may be called recursively.
     * @param stack stack to use
     * @returns evaluation result
     */
    private expandMacro(stack : Stack) : EvalResult {
      let result : EvalResult;

      // If there is no stack, we have nothing to execute.
      if (stack==null) throw new Error("Argument 'stack' must not be null.");

      let myContext = stack.getCContext();
      let firstWord = myContext.getFirstWord();

      if (firstWord.length > 0) {

        // recursion check
        if (stack.stepCount < MacroProcessor.MAX_RECUR) {

          stack.stepCount++;

          switch(firstWord.toLowerCase()) {
            case 'def':
              result = this.handleDEF(stack);
              break;
            case 'undef':
              result = this.handleUNDEF(stack);
              break;
            case 'list':
              result = this.handleLIST(stack);
              break;
            case 'set':
              result = this.handleSET(stack);
              break;
            case 'unset':
              result = this.handleUNSET(stack);
              break;
            case 'listvar':
              result = this.handleLISTVAR(stack);
              break;
            case 'let':
              result = this.handleLET(stack);
              break;
            case 'help':
              result = this.handleHELP(stack);
              break;
            default: 
              // custom macro or error
              result = this.handleCUSTOM(stack);
              break;
          }

          stack.stepCount--;
        }
        else {
          result = new EvalResult(false, '', 
            '% '+firstWord+': maximum recursion limit ('+stack.stepCount+') reached.\n');
        }
      }
      else {
        // The first word was empty, quoted or prefixed with spaces, 
        // but was no macro nor command for sure. Bypass.
        result = new EvalResult(true, myContext.cmd + '\n', '');
      }

      return result;
    }

    /**
     * Resolves a single user command (single line or just a command).
     * @param stack stack to use
     * @returns evaluation result
     */
    private resolveSingle(stack : Stack) : EvalResult {
      let result : EvalResult;
  
      if (!stack) throw new Error('Argument stack must not be null.');
      if (!stack.getCContext()) throw new Error('Argument stack must not be empty.');

      if (stack.getCContext().isMacro()) {
        // Expand macro.
        result = this.expandMacro(stack);
      }
      else {
        // No '/' prefix or just a single '/', just bypass.
        result = new EvalResult(true, stack.getCCmd() + '\n', '');
      }
  
       return result;
    }

    /**
     * Function resolve() takes a user input and returns a 
     * 3-tuple of: [alternative command, user message] 
     * The user input may consist of multiple lines, because
     * of copy&paste. So we split the input into separate lines
     * and concatenate the result(s).
     * @param text single or multiline string to resolve
     * @returns evaluation result
     */
    public resolve(text : string) : EvalResult {
      let result = new EvalResult(false, '', '');

      // Split text into lines. (no matter if LF or CRLF)
      let lines = text.split(/\r?\n/);
      for (let i = 0; i < lines.length; i++) {
        // resolve every single line and append results
        result.append(this.resolveSingle(new Stack(new EvaluationContext(lines[i]))));
      }

      return result;
    }
  }
}
