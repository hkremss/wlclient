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

namespace TMP {

  class MacroProps {
    public body : string;
    public trigger : TriggerProps;
  }

  class TriggerProps {
    public pattern : string;
  }

  export class EvaluationContext {
    public cmd : string;
    public parameters : Array<string> = [];
    public localVariables : { [key: string]: string } = {};
  }

  export class MacroProcessor {
  
    // constants
    static readonly VERSION = '0.3';
    static readonly MACRO_KEY = '/';
    static readonly STORAGE_KEY_LIST = 'Macros.List';
    static readonly STORAGE_KEY_LISTVAR = 'Macros.ListVar';
    static readonly MAX_RECUR = 42;
    
    // All custom macros we know.
    private customMacros: { [key: string]: MacroProps } = {};

    // All global variables we know. (and some are default + special)
    private globalVariables: { [key: string]: string } = { 'borg':'1', 'matching':'glob' };
  
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
      // 'matching' must exist, set it to 'glob', if unset or invalid value.
      if (this.globalVariables['matching']!='simple' && this.globalVariables['matching']!='glob' && this.globalVariables['matching']!='regexp') {
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
  
    // Handle a single key-down event.
    // Returns 3-tuple: [doSend, new command, user message]
    public handleKey(event : KeyboardEvent) : [boolean, string, string]
    {
      let result: [boolean, string, string] = [false, '', ''];

      // Build a key name (similar to TF)
      let keyName = this.getNamedKey(event);
        
      if (keyName.length > 0) {       
        // Try to handle this.
        result = this.expandMacro(keyName, []);
  
        // If we can not?
        if (!result[0]) {
          // Reset new command and user message.
          result[1] = ''; result[2] = '';
          // Give a hint for function keys only.
          if (['F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12',
            'F13','F14','F15','F16','F17','F18','F19','F20','F21','F22','F23','F24',
            ].indexOf(event.key) != -1) {
            result[2] = '% The key "' + keyName + '" is undefined; you may use "/def ' + keyName + ' = <commands>" to define it.\n';
          }
        }
      }

      return result;
    }
/*   
    // Find and return an unescaped char in source from startPosition and return 
    // position or -1, if not found.'"\"'
    private searchUnescapedChar(source : string, startPosition : number, searchChar : string) : number {
      let foundPosition : number = -1;
      
      // search for the closing quote.
      for (let i=startPosition;i<source.length;i++) {
        if (source.charAt(i) == searchChar) {
          // We have found one. But it must not be escaped, so
          // count '\' chars in front of quote. If it's an uneven
          // uneven number, it is escaped and we must continue!
          let bs = 0;
          for (let k = i-1;k>=startPosition;k--) {
            if (source.charAt(k) == '\\') {
              bs++;
              continue;
            }
            break;
          }
          if (bs % 2 == 0) {
            // even number of backslashes == closing quote found! 
            foundPosition = i;
            break;
          }
        }
      }
      
      return foundPosition;
    }
 */  
    /*
     * Get all spaces separated parts of string, respect double-quotes ("")
     * and escaped spaces/quotes, eg.:
     * Source of    : '/def -t"bla \\" blu" abc'
     * Should return: [ '/def', '-t', 'bla \\" blu', 'abc' ]
     */
/*     private getWords(source : string) : Array<string> {
      let allWords : Array<string> = [];
      
      let firstSpace = this.searchUnescapedChar(source, 0, ' ');
      let firstQuote = this.searchUnescapedChar(source, 0, '"');
      
      if (firstSpace > -1 && (firstQuote == -1 || firstSpace < firstQuote)) {
        // We found a real space first
        if (firstSpace>0) allWords.push( source.substr(0, firstSpace) );
        allWords = allWords.concat(this.getWords(source.substr(firstSpace+1)));
      }
      else if (firstQuote > -1 && (firstSpace == -1 || firstQuote < firstSpace)) {
        // We found a first quote, lets see, if there is a word in front.
        if (firstQuote > 0) {
          allWords.push( source.substr(0, firstQuote) );
          allWords = allWords.concat(this.getWords(source.substr(firstQuote)));
        }
        else {
          // The quote begins a [0], look for closing quote.
          let lastQuote = this.searchUnescapedChar(source, firstQuote+1, '"');
          if (lastQuote > -1) {
            // We have a quoted string
            allWords.push( source.substr(0, lastQuote+1) );
            allWords = allWords.concat(this.getWords(source.substr(lastQuote+1)));
          }
          else {
            // We found an opening quote, but no closing quote, this is an error.
            throw {name : 'ParseError', message : 'Open quote detected, cannot continue to parse'};
          }
        }
      }
      else {
        // We found no space and no quote
        allWords.push( source );
      }

      return allWords;
    } */

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
    // Returns 3-tuple: [doSend, new command, user message]
    private handleDEF(firstWord : string, stack : Array<EvaluationContext>) : [boolean, string, string]
    {
      let doSend : boolean = false;
      let newCmd : string = '';
      let userMessage : string = '';

      let topContext = stack[stack.length-1];
      let mTrigger = '';
      let body = topContext.cmd.substr(4).trim();
      
      if (body.length>0 && body.charAt(0)=='-') {
        if (body.length<2) {
          userMessage = '% '+firstWord+': missing option -\n';
          return [doSend, newCmd, userMessage];
        } else if(body.charAt(1)!='t') {
          userMessage = '% '+firstWord+': unknown option -'+body.charAt(1)+'\n';
          return [doSend, newCmd, userMessage];
        }
        mTrigger = this.getQuotedString(body.substr(2), '"');
        if (!mTrigger || mTrigger.length==0) {
          userMessage = '% '+firstWord+': invalid/incomplete trigger option, quotes missing?\n';
          return [doSend, newCmd, userMessage];            
        } 
        else if (mTrigger.length==2) {
          userMessage = '% '+firstWord+': empty trigger found\n';
          return [doSend, newCmd, userMessage];            
        }
        else { // found a quoted trigger string!
          // cut trigger part off the body. +2 for the '-t' option.
          body = body.substr(mTrigger.length + 2);
          // trim the quotes off on both sides.
          mTrigger = mTrigger.substr(1, mTrigger.length-2);
          //console.log('TMP '+firstWord+': found trigger:\''+mTrigger+'\'.');          
        }
      }
      
      let eqSign = body.indexOf("=");
      if (eqSign > 0) {
        let mName = body.substring(0, eqSign).trim();
        let mBody = body.substring(eqSign+1).trim();
        if (mName.length > 0) {
          if (this.customMacros[mName]!=null && this.customMacros[mName].body !== mBody) {
            userMessage = '% '+firstWord+': redefined macro ' + mName + '\n';
          }
          let macro = new MacroProps;
          macro.body = mBody;
          macro.trigger = new TriggerProps;
          macro.trigger.pattern = mTrigger;
          this.customMacros[mName] = macro;
          this.saveSettings();
        }
        else {
          userMessage = '% '+firstWord+': &lt;name&gt; must not be empty\n';
        }
      }
      else if (eqSign == 0) {
        userMessage = '% '+firstWord+': &lt;name&gt; missing, try: /def &lt;name&gt; = &lt;body&gt;\n';
      }
      else {
        userMessage = '% '+firstWord+': \'=\' missing, try: /def &lt;name&gt; = &lt;body&gt;\n';
      }

      return [doSend, newCmd, userMessage];
    }

    // Handle /UNDEF command - undefine a named macro
    // Returns 3-tuple: [doSend, new command, user message]
    private handleUNDEF(firstWord : string, stack : Array<EvaluationContext>) : [boolean, string, string]
    {
      let doSend : boolean = false;
      let newCmd : string = '';
      let userMessage : string = '';

      let topContext = stack[stack.length-1];
      for (let i = 1; i < topContext.parameters.length; i++) {
        if (topContext.parameters[i].length > 0) {
          if (!this.customMacros[topContext.parameters[i]]) {
            userMessage += '% '+firstWord+': macro "' + topContext.parameters[i] + '" was not defined.\n';
          } else {
            delete this.customMacros[topContext.parameters[i]];
            this.saveSettings();
          }
        }
      }

      return [doSend, newCmd, userMessage];
    }

    // Handle /LIST command - display a list of macros
    // Returns 3-tuple: [doSend, new command, user message]
    private handleLIST(firstWord : string, stack : Array<EvaluationContext>) : [boolean, string, string]
    {
      let doSend : boolean = false;
      let newCmd : string = '';
      let userMessage : string = '';

      var picomatch = null;
      
      let topContext = stack[stack.length-1];
      if (topContext.parameters.length > 1) {
        picomatch = require('picomatch');
      }
      
      var sortedKeys = Object.keys(this.customMacros).sort();
      for (var i = 0; i<sortedKeys.length; i++) {
        if (!picomatch || picomatch.isMatch(sortedKeys[i], topContext.parameters.slice(1))) {
          let macroProps = this.customMacros[sortedKeys[i]];
          userMessage += '/def ';
          if (macroProps.trigger != null && macroProps.trigger.pattern!=null && macroProps.trigger.pattern.length > 0) {
            userMessage += '-t"' + macroProps.trigger.pattern + '" ';
          }
          userMessage += (sortedKeys[i]+' = '+macroProps.body+'\n');
        }
      }
      
      if (userMessage.length == 0) userMessage = '% '+firstWord+': no macros found.\n';

      return [doSend, newCmd, userMessage];
    }

    // Search the variable in stack, beginning from the end /current. If nothing
    // found, return null.
    private searchVariable(stack : Array<EvaluationContext>, vName : string) : string {
      let vValue : string = null;
      for (let i = stack.length-1; i>=0; i--) {
        vValue = stack[i].localVariables[vName]
        if (vValue!=null) break;
      }
      return vValue;
    }

    // Substitute in 'text' in this order:
    // 1. given parameters     : %{#}, %{*}, %{0}, %{1}, %{2} and so on
    // 2. given local variables: %{whatever} in local scoped defined is
    // 3. global variables     : %{borg}, %{matching} and so on 
    private substituteVariables(text : string, stack : Array<EvaluationContext>) : string
    {
      let oldBody = text;
      let newBody = '';

      let deadEndLimit = 42; // limit number of substitution loops
      
      let topContext = stack[stack.length-1];
      let globVars = this.globalVariables;
      var myThis = this;

      while (deadEndLimit--) {
        newBody = oldBody.replace(/(%{[^ -]*?})/, function(m) { 
          var strippedM = m.substr(2, m.length-3);
          
          if (strippedM == '#') {
            return ''+topContext.parameters.length+'';
          }
          else if (strippedM == '*') {
            return ''+topContext.parameters.slice(1).join(' ')+'';
          }
          else {
            const parsedM = parseInt(strippedM);
            // if this is not a numbered parameter
            if (isNaN(parsedM)) { 
              // local variables may shadow global
              let vValue = myThis.searchVariable(stack, strippedM);
              if (vValue != null) return vValue;
              // global variables as fallback
              vValue = globVars[strippedM];
              if (vValue != null) return vValue;
              // or just empty
              return ''; 
            }
            // it is a numbered parameter
            else {
              if (parsedM < topContext.parameters.length) {
                return topContext.parameters[parsedM];
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
    // Returns 3-tuple: [doSend, new command, user message]
    private handleSET(firstWord : string, stack : Array<EvaluationContext>) : [boolean, string, string]
    {
      let doSend : boolean = false;
      let newCmd : string = '';
      let userMessage : string = '';

      let topContext = stack[stack.length-1];
      let body = topContext.cmd.substr(4).trim();
      
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
            userMessage = '% '+firstWord+': redefined variable ' + vName + '\n';
        }
        this.globalVariables[vName] = vValue;
        this.saveSettings();
      }
      else if (vName.length == 0 && vValue != null && vValue.length > 0) {
        userMessage = '% '+firstWord+': &lt;name&gt; must not be empty\n';
      }
      else if (vName.length == 0) {
        return this.handleLISTVAR('listvar', stack);
      }
      else {
        if (this.globalVariables[vName]!=null) {
            userMessage = '% '+vName+'='+this.globalVariables[vName]+'\n';
        }
        else {
          userMessage = '% '+vName+' not set globally\n';
        }
      }

      return [doSend, newCmd, userMessage];
    }

    // Handle /UNSET command - unset variable(s)
    // Returns 3-tuple: [doSend, new command, user message]
    private handleUNSET(firstWord : string, stack : Array<EvaluationContext>) : [boolean, string, string]
    {
      let doSend : boolean = false;
      let newCmd : string = '';
      let userMessage : string = '';

      let topContext = stack[stack.length-1];
      for (let i = 1; i < topContext.parameters.length; i++) {
        if (topContext.parameters[i].length > 0) {
          if (!this.globalVariables[topContext.parameters[i]]) {
            userMessage += '% '+firstWord+': global variable "' + topContext.parameters[i] + '" was not defined.\n';
          } else {
            delete this.globalVariables[topContext.parameters[i]];
            this.saveSettings();
          }
        }
      }

      return [doSend, newCmd, userMessage];
    }

    // Handle /LISTVAR command - list values of variables
    // Returns 3-tuple: [doSend, new command, user message]
    private handleLISTVAR(firstWord : string, stack : Array<EvaluationContext>) : [boolean, string, string]
    {
      let doSend : boolean = false;
      let newCmd : string = '';
      let userMessage : string = '';

      var picomatch = null;
      
      let topContext = stack[stack.length-1];
      if (topContext.parameters.length > 1) {
        picomatch = require('picomatch');
      }
      
      var sortedKeys = Object.keys(this.globalVariables).sort();
      for (var i = 0; i<sortedKeys.length; i++) {
        if (!picomatch || picomatch.isMatch(sortedKeys[i], topContext.parameters.slice(1))) {
          let vValue = this.globalVariables[sortedKeys[i]];
          userMessage += '/set '+sortedKeys[i]+'='+vValue+'\n';
        }
      }
      
      if (userMessage.length == 0) userMessage = '% '+firstWord+': no global variables found.\n';

      return [doSend, newCmd, userMessage];
    }

    // Handle /LET command - set the value of a local variable in the parent (!) 
    // context, because our local context will disappear after the macro expansion has finished.
    // Returns 3-tuple: [doSend, new command, user message]
    private handleLET(firstWord : string, stack : Array<EvaluationContext>) : [boolean, string, string]
    {
      let doSend : boolean = false;
      let newCmd : string = '';
      let userMessage : string = '';

      let topContext = stack[stack.length-1];

      // It would not make sense to create a local variable in the current (top)
      // context, because this will only exist for this macro lifecycle. Even 
      // sibling macros would not be able to access it. So we create the local 
      // variable in the parent context. If there is no parent context, this 'let' 
      // will be completely useless...
      let parentContext : EvaluationContext = null;
      if (stack.length > 1) {
        parentContext = stack[stack.length-2];
      } else {
        parentContext = stack[stack.length-1];
        userMessage = '% '+topContext.cmd+' is of no use in this context...\n';
      }

      let body = topContext.cmd.substr(4).trim();
      
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
        parentContext.localVariables[vName] = vValue;
      }
      else if (vName.length == 0) {
        userMessage = '% '+firstWord+': &lt;name&gt; must not be empty\n';
      }
      else {
        userMessage = '% '+firstWord+': &lt;value&gt; must not be empty\n';
      }

      return [doSend, newCmd, userMessage];
    }

    // Handle /HELP command - display the help text
    // Returns 3-tuple: [doSend, new command, user message]
    private handleHELP(firstWord : string, stack : Array<EvaluationContext>) : [boolean, string, string]
    {
      let doSend : boolean = false;
      let newCmd : string = '';
      let userMessage : string = '';

      let topContext = stack[stack.length-1];
      let topic = topContext.parameters.length > 1 ? topContext.parameters[1].toLowerCase() : '';

      userMessage = new MacroHelp(topic).getHelp();

      return [doSend, newCmd, userMessage];
    }

    // Handle default case, custom macro or just do nothing.
    // Returns 3-tuple: [doSend, new command, user message]
    private handleDEFAULT(firstWord : string, stack : Array<EvaluationContext>) : [boolean, string, string]
    {
      let doSend : boolean = false;
      let newCmd : string = '';
      let userMessage : string = '';

      if (this.customMacros[firstWord]!=null) {
        let body = this.customMacros[firstWord].body;
        let steps = body.split('%;'); // split by '%;' TF separator token
        let stepNums = steps.length;
        if (stepNums > 42) {
          userMessage = '% '+firstWord+': command list truncated to 42 for some reason, sorry\n';
          stepNums = 42;
        }
        for (let i = 0; i < stepNums; i++) {
          // substitute variables in this step
          let step = this.substituteVariables(steps[i], stack); // substitute variables
          // Macro calls macro? Do not check substituted 'step' here because this
          // may be (mis-)used for 'macro injection' through subsituted '/'.
          if (steps[i].length>0 && steps[i].charAt(0) == MacroProcessor.MACRO_KEY) {
            // resolve nested macro
            let result = this.resolveSingle(step, stack);
            if (result[0] === true) doSend = true;
            newCmd += result[1];
            userMessage += result[2];
          }
          else {
            // otherwise just append to list of new cmd
            newCmd += (step + '\n');
          }
        }
        doSend = true;
      }
      else {
        userMessage = '% '+firstWord+': no such command or macro\n';
      }
      return [doSend, newCmd, userMessage];
    }

    private expandMacro(cmd : string, stack : Array<EvaluationContext> ) : [boolean, string, string] {
      let result: [boolean, string, string];

      // If there is no stack yet, create a new.
      if (stack==null) stack = [];

      if (cmd.length > 0) {
        //console.log('MacroProcessor expand: ' + cmd);

        // Create a context, which will be used for expansion of 
        // the macro containing the command line, the splittet
        // command line and the and local variables.
        let context = new EvaluationContext();
        context.cmd = cmd;
        context.parameters = cmd.split(' ');
        context.localVariables = {};

        let firstWord = cmd.split(' ')[0].toLowerCase();

        // recursion check
        if (stack.length <= MacroProcessor.MAX_RECUR) {
          // push to recursion stack
          stack.push(context);

          switch(firstWord) {
            case 'def':
              result = this.handleDEF(firstWord, stack);
              break;
            case 'undef':
              result = this.handleUNDEF(firstWord, stack);
              break;
            case 'list':
              result = this.handleLIST(firstWord, stack);
              break;
            case 'set':
              result = this.handleSET(firstWord, stack);
              break;
            case 'unset':
              result = this.handleUNSET(firstWord, stack);
              break;
            case 'listvar':
              result = this.handleLISTVAR(firstWord, stack);
              break;
            case 'let':
              result = this.handleLET(firstWord, stack);
              break;
            case 'help':
              result = this.handleHELP(firstWord, stack);
              break;
            default: // custom macro or error
              result = this.handleDEFAULT(firstWord, stack);
          }

          // pop from recursion stack
          stack.pop();
        }
        else {
          result = [true, cmd + '\n', ''];
          result[2] = '% '+firstWord+': maximum recursion reached, stack size: '+stack.length+'\n';
        }
      }
      else {
        // The first word was empty, quoted or prefixed with spaces, 
        // but was no macro nor command for sure. Bypass.
        result = [true, cmd + '\n', ''];
      }

      return result;
    }

    // Resolves a single user command (single line or just a command).
    // Returns 3-tuple: [doSend, new command, user message]
    private resolveSingle(cmd : string, stack : Array<EvaluationContext>) : [boolean, string, string] {
      let result: [boolean, string, string];
  
      if (cmd!=null && cmd.length>0 && cmd.charAt(0) == MacroProcessor.MACRO_KEY) {
        // Chop off leading '/' and expand macro.
        result = this.expandMacro(cmd.substr(1), stack);
      }
      else {
        // No '/' prefix or just a single '/', just bypass.
        result = [true, cmd + '\n', ''];
      }
  
       return result;
    }

    // Function resolve() takes a user input and returns a 
    // 3-tuple of: [alternative command, user message] 
    // The user input may consist of multiple lines, because
    // of copy&paste. So we split the input into separate lines
    // and concatenate the result(s).
    // Returns 3-tuple: [doSend, new command, user message]
    public resolve(cmd : string) : [boolean, string, string] {
      let doSend : boolean = false;
      let newCmd : string = '';
      let userMessage : string = '';

      let lines = cmd.split('\n');
      for (let i = 0; i < lines.length; i++) {
        let result = this.resolveSingle(lines[i], []);
        if (result[0] === true) doSend = true;
        newCmd += result[1];
        userMessage += result[2];
      }

      return [doSend, newCmd, userMessage];
    }
  }

}
