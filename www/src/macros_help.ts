/// <reference path="macros.ts" />
/* 
 * The tiny macro processor of Wunderland Client - HELP texts.
 *
 * Written in TypeScript and compiled to ECMAScript.
 *
 * Build: tsc --sourceMap macros__help.ts
 * 
 */

namespace TMP {

  export class MacroHelp {

    private topic : string = '';

    // Constructor
    constructor(topic : string) { 
      this.topic = topic.trim().toLowerCase();
      if (this.topic.charAt(0) == MacroProcessor.MACRO_KEY) this.topic = topic.substr(1);
    }

    // Returns a help text for the given topic or at least a hint.
    public getHelp() : string
    {
      switch (this.topic) {
        case 'def': return '\n'+
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
          'You can execute a macro by typing \'/\' followed by the name of the macro. Macros can call '+
          'other macros, but self recursion will be treated as error. You can define as much macros as '+
          'you want, but the number of executed steps is arbitrary limited. Sorry.\n';
          break;
        case 'undef': return '\n'+
          'Help on: /undef\n'+
          '\n'+
          'Usage: /undef &lt;name&gt;\n'+
          '\n'+
          'Undefines a named macro. No options provided. It is the counterpart to /def. I have no '+
          'idea, why you would ever need it, but it exists. For you.\n';
          break;
        case 'list': return '\n'+
          'Help on: /list\n'+
          '\n'+
          'Usage: /list [pattern]\n'+
          '\n'+
          'Lists all currently defined macros, sorted alphabetically. If [pattern] is provided, only '+
          'macros with a matching name are listed. \n';
          break;
        case 'set': return '\n'+
          'Help on: /set\n'+
          '\n'+
          'Usage: /set &lt;name&gt;=&lt;value&gt;\n'+
          '       /set [&lt;name&gt; [&lt;value&gt;]]\n'+
          '\n'+
          'Sets the value of a globale variable (first syntax) or displays the value of a global '+
          'variable, if no value is provided. If no value and no name is provided is provided, all '+
          'global variables will be listed.\n\n'+
          'See: /listvar, /unset, /let\n';
          break;
        case 'unset': return '\n'+
          'Help on: /unset\n'+
          '\n'+
          'Usage: /unset &lt;name&gt;\n'+
          '\n'+
          'Removes the value of a globale variable.\n\n'+
          'See: /listvar, /set, /let\n';
          break;
        case 'listvar': return '\n'+
          'Help on: /listvar\n'+
          '\n'+
          'Usage: /listvar [&lt;name&gt;]\n'+
          '\n'+
          'Lists global variables and displays their values. A glob pattern may be used to filter the '+
          'displayes variables.\n\n'+
          'See: /set, /unset, /let\n';
          break;
        case 'let': return '\n'+
          'Help on: /let\n'+
          '\n'+
          'Usage: /let &lt;name&gt;=&lt;value&gt;\n'+
          '       /let &lt;name&gt; &lt;value&gt;\n'+
          '\n'+
          'Assigns a value to a local variable, which exists only while another macro is evaluated '+
          'and in child evaluation contexts. So it may be used for temporary data, while macros are '+
          'cascaded. Local variables shadow global variables and local variables, which were defined '+
          'in a higher context.\n\n'+
          'See: /listvar, /set, /unset\n';
          break;
        default: return '\n'+
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
    }
  }
}
