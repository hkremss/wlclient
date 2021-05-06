/* 
 * The tiny macro processor of Wunderland Client.
 *
 * Written in TypeScript and compiled to ECMAScript.
 *
 * Build: tsc --sourceMap macros.ts
 */
 
class MacroProcessor {

  // constants
  static readonly VERSION = '0.1';
  static readonly MACRO_KEY = '/';
  static readonly STORAGE_KEY = 'Macros.List';
  
  // fields
  private customMacros: { [key: string]: string } = {};

  //constructor 
  constructor() { 
    let storedMacros = localStorage.getItem(MacroProcessor.STORAGE_KEY);  
    if (storedMacros) {
      this.customMacros = JSON.parse(storedMacros);
    }
  }

  // Return version number
  public getVersion() : string {
    return MacroProcessor.VERSION;
  }

  // Get Macro name or null, if there is none.
  private getFirstWord(cmd:string) : string {
    let name:string = null;
    if (cmd && cmd.length>0) {
      let splitted = cmd.split(" ");
      if (splitted.length > 0) {
        name = splitted[0].toLowerCase();
      }
    }
    return name;
  }

  // Function resolve() takes a user input and returns a 
  // 3-tuple of: [alternative command, user message] 
  // The user input may consist of multiple lines, because
  // of copy&paste. So we split the input into separate lines
  // and concatenate the result(s).
  public resolve(cmd : string) : [boolean, string, string] {
    let doSend : boolean = false;
    let newCmd : string = '';
    let userMessage : string = '';

    let lines = cmd.split('\n');
    for (let i = 0; i < lines.length; i++) {
      let result = this.resolveSingle(lines[i]);
      if (result[0] === true) doSend = true;
      newCmd += result[1];
      userMessage += result[2];
    }

     return [doSend, newCmd, userMessage];
  }

  // Function resolve() takes a single user command and returns a 
  // 3-tuple of: [alternative command, user message] 
  public resolveSingle(cmd : string) : [boolean, string, string] {
    let doSend : boolean = false;
    let newCmd : string = '';
    let userMessage : string = '';

    if (cmd && cmd.length>0 && cmd.charAt(0) == MacroProcessor.MACRO_KEY) {
      cmd = cmd.substr(1);
      console.log('MacroProcessor resolve: ' + cmd);
      let firstWord = this.getFirstWord(cmd);
      switch(firstWord) {
        case 'def': // define a named macro
        {
          let body = cmd.substr(4);
          let eqSign = body.indexOf("=");
          if (eqSign > 0) {
            let mName = body.substring(0, eqSign).trim();
            let mBody = body.substring(eqSign+1).trim();
            if (mName.length > 0 && mBody.length > 0) {
              if (this.customMacros[mName] && this.customMacros[mName] !== mBody) {
                userMessage = '% '+firstWord+': Redefined macro ' + mName + '\n';
              }
              this.customMacros[mName] = mBody;
              localStorage.setItem(MacroProcessor.STORAGE_KEY, JSON.stringify(this.customMacros));
            }
            else if (mName.length == 0) {
              userMessage = '% '+firstWord+': &lt;name&gt; must not be empty\n';
            }
            else {
              userMessage = '% '+firstWord+': &lt;body&gt; must not be empty\n';
            }
          }
          else if (eqSign == 0) {
            userMessage = '% '+firstWord+': &lt;name&gt; missing, try: /def &lt;name&gt; = &lt;body&gt;\n';
          }
          else {
            userMessage = '% '+firstWord+': \'=\' missing, try: /def &lt;name&gt; = &lt;body&gt;\n';
          }
          break;
        }
        case 'undef': // undefine a named macro
        {
          let body = cmd.substr(6);
          let mNames = body.split(' ');
          for (let i = 0; i < mNames.length; i++) {
            if (mNames[i].length > 0) {
              if (!this.customMacros[mNames[i]]) {
                userMessage += '% '+firstWord+': Macro "' + mNames[i] + '" was not defined.\n';
              } else {
                delete this.customMacros[mNames[i]];
                localStorage.setItem(MacroProcessor.STORAGE_KEY, JSON.stringify(this.customMacros));
              }
            }
          }
          break;
        }
        case 'list': // display a list of macros
          for (let mName in this.customMacros) {
            let mBody = this.customMacros[mName];
            userMessage += '/def '+mName+' = '+mBody+'\n';
          }
          break;
        case 'help': // Displays help on the topic specified, or displays a quick summary of available topics if no topic is given.
        {
          let topic = cmd.substr(5).trim().toLowerCase();
          if (topic === 'def' || topic  === '/def') {
            userMessage = 
              '\n'+
              'Help on: /def\n'+
              '\n'+
              'Usage: /def &lt;name&gt; = &lt;body&gt;\n'+
              '\n'+
              'Defines a named macro. No options provided. The &lt;name&gt; can be anything, but must not '+
              'contain whitespaces. The &lt;body&gt; is the text to be executed as a user command. Multiple '+
              'commands can be separated by token \'%;\'. For example, if you define a macro like:\n'+
              '\n'+
              '  /def time_warp = :jumps to the left!%;:steps to the right!\n'+
              '\n'+
              'and call it by typing\n'+
              '\n'+
              '  /time_warp\n'+
              '\n'+
              'you will execute the commands\n'+
              '\n'+
              ':jumps to the left!\n'+
              ':steps to the right!\n'+
              '\n'+
              'You can execute a macro by typing \'/\' followed by the name of the macro. At the moment '+
              'macros cannot call other macros. You can define as much commands as you want, but at the '+
              'moment, the number of executed steps is arbitrary limited. Sorry.\n';
          }
          else if (topic === 'undef' || topic  === '/undef') {
            userMessage = 
              '\n'+
              'Help on: /undef\n'+
              '\n'+
              'Usage: /undef <name>\n'+
              '\n'+
              'Undefines a named macro. No options provided. It is the counterpart to /def. I have no '+
              'idea, why you would ever need it, but it exists. For you.\n';
          }
          else if (topic === 'list' || topic  === '/list') {
            userMessage = 
              '\n'+
              'Help on: /list\n'+
              '\n'+
              'Usage: /list\n'+
              '\n'+
              'Lists all currently defined macros. No options provided. The list is in a copy&paste '+
              'friendly format. So it may be used to copy all defined macros into a local text file, '+
              'to save macros for your next session.\n';
          }
          else {
            userMessage = 
              '\n'+
              'Tiny Macro Processor V' + MacroProcessor.VERSION + '\n'+
              '~~~~~~~~~~~~~~~~~~~~~~~~~~\n'+
              'The macro processor is an optional and experimental component of the Wunderland '+
              'web-client and provides tools to define and excute macros. These macros '+
              'may define scripts to do complex or repetetive tasks. One typical use case is '+
              'the definition of long routes to walk through the MUD. The number of commands per '+
              'macro is limited. Any feature may change anytime and the whole processor may '+
              'disappear completely in the future, without further notice.\n'+
              '\n'+
              'Commands:\n'+
              ' /def   - define a named macro\n'+
              ' /undef - undefine a named macro\n'+
              ' /list  - display a list of macros\n'+
              ' /help &lt;command&gt; - help for any command (without \'/\')\n'+
              '\n'+
              'The macros are stored in your browsers localStorage only and not saved permanently, '+
              'yet! So try copy&paste of /list for now!\n';
          }
          break;
        }
        default: // custom macro or error
          if (this.customMacros[firstWord]) {
            let steps = this.customMacros[firstWord].split('%;'); // '%;' is the TF separator token
            let stepNums = steps.length;
            if (stepNums > 42) {
              userMessage = '% '+firstWord+': command list truncated to 42 for some reason, sorry\n';
              stepNums = 42;
            }
            for (let i = 0; i < stepNums; i++) {
              newCmd += (steps[i] + '\n');
            }
            doSend = true;
          }
          else {
            userMessage = '% '+firstWord+': no such command or macro\n';
          }
      }
    }
    else {
      // This was no macro.
      doSend = true;
      newCmd = cmd;
    }

     return [doSend, newCmd, userMessage];
  }
}
