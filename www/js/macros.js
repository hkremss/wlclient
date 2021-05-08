/*
 * The tiny macro processor of Wunderland Client.
 *
 * Written in TypeScript and compiled to ECMAScript.
 *
 * Build: tsc --sourceMap macros.ts
 */
var TMP;
(function (TMP) {
    var MacroProcessor = /** @class */ (function () {
        // Constructor loads settings from localStorage
        function MacroProcessor() {
            // fields
            this.customMacros = {};
            this.recursionStack = [];
            this.ReloadSettings();
        }
        // Return version number
        MacroProcessor.prototype.getVersion = function () {
            return MacroProcessor.VERSION;
        };
        // Try to reload settings from localStorage
        MacroProcessor.prototype.ReloadSettings = function () {
            var storedMacros = localStorage.getItem(MacroProcessor.STORAGE_KEY);
            if (storedMacros) {
                try {
                    this.customMacros = JSON.parse(storedMacros);
                }
                catch (e) {
                    console.log('Macro processor: ' + e.name + ': ' + e.message);
                }
            }
        };
        // Get Macro name or null, if there is none.
        MacroProcessor.prototype.getFirstWord = function (cmd) {
            var name = null;
            if (cmd && cmd.length > 0) {
                var splitted = cmd.split(" ");
                if (splitted.length > 0) {
                    name = splitted[0].toLowerCase();
                }
            }
            return name;
        };
        // Handle /DEF command - define a named macro
        MacroProcessor.prototype.handleDEF = function (firstWord, cmd) {
            var doSend = false;
            var newCmd = '';
            var userMessage = '';
            var body = cmd.substr(4);
            var eqSign = body.indexOf("=");
            if (eqSign > 0) {
                var mName = body.substring(0, eqSign).trim();
                var mBody = body.substring(eqSign + 1).trim();
                if (mName.length > 0 && mBody.length > 0) {
                    if (this.customMacros[mName] && this.customMacros[mName] !== mBody) {
                        userMessage = '% ' + firstWord + ': Redefined macro ' + mName + '\n';
                    }
                    this.customMacros[mName] = mBody;
                    localStorage.setItem(MacroProcessor.STORAGE_KEY, JSON.stringify(this.customMacros));
                }
                else if (mName.length == 0) {
                    userMessage = '% ' + firstWord + ': &lt;name&gt; must not be empty\n';
                }
                else {
                    userMessage = '% ' + firstWord + ': &lt;body&gt; must not be empty\n';
                }
            }
            else if (eqSign == 0) {
                userMessage = '% ' + firstWord + ': &lt;name&gt; missing, try: /def &lt;name&gt; = &lt;body&gt;\n';
            }
            else {
                userMessage = '% ' + firstWord + ': \'=\' missing, try: /def &lt;name&gt; = &lt;body&gt;\n';
            }
            return [doSend, newCmd, userMessage];
        };
        // Handle /UNDEF command - undefine a named macro
        MacroProcessor.prototype.handleUNDEF = function (firstWord, cmd) {
            var doSend = false;
            var newCmd = '';
            var userMessage = '';
            var body = cmd.substr(6);
            var mNames = body.split(' ');
            for (var i = 0; i < mNames.length; i++) {
                if (mNames[i].length > 0) {
                    if (!this.customMacros[mNames[i]]) {
                        userMessage += '% ' + firstWord + ': Macro "' + mNames[i] + '" was not defined.\n';
                    }
                    else {
                        delete this.customMacros[mNames[i]];
                        localStorage.setItem(MacroProcessor.STORAGE_KEY, JSON.stringify(this.customMacros));
                    }
                }
            }
            return [doSend, newCmd, userMessage];
        };
        // Handle /LIST command - display a list of macros
        MacroProcessor.prototype.handleLIST = function (firstWord, cmd) {
            var doSend = false;
            var newCmd = '';
            var userMessage = '';
            for (var mName in this.customMacros) {
                var mBody = this.customMacros[mName];
                userMessage += '/def ' + mName + ' = ' + mBody + '\n';
            }
            return [doSend, newCmd, userMessage];
        };
        // Handle /HELP command - display the help text
        MacroProcessor.prototype.handleHELP = function (firstWord, cmd) {
            var doSend = false;
            var newCmd = '';
            var userMessage = '';
            var topic = cmd.substr(5).trim().toLowerCase();
            if (topic === 'def' || topic === '/def') {
                userMessage =
                    '\n' +
                        'Help on: /def\n' +
                        '\n' +
                        'Usage: /def &lt;name&gt; = &lt;body&gt;\n' +
                        '\n' +
                        'Defines a named macro. No options provided. The &lt;name&gt; can be anything, but must not ' +
                        'contain whitespaces. The &lt;body&gt; is the text to be executed as a user command. Multiple ' +
                        'commands can be separated by token \'%;\'. For example, if you define a macro like:\n' +
                        '\n' +
                        '  /def time_warp = :jumps to the left!%;:steps to the right!\n' +
                        '\n' +
                        'and call it by typing\n' +
                        '\n' +
                        '  /time_warp\n' +
                        '\n' +
                        'you will execute the commands\n' +
                        '\n' +
                        ':jumps to the left!\n' +
                        ':steps to the right!\n' +
                        '\n' +
                        'You can execute a macro by typing \'/\' followed by the name of the macro. Macros can call ' +
                        'other macros, but self recursion will be treated as error. You can define as much macros as ' +
                        'you want, but the number of executed steps is arbitrary limited. Sorry.\n';
            }
            else if (topic === 'undef' || topic === '/undef') {
                userMessage =
                    '\n' +
                        'Help on: /undef\n' +
                        '\n' +
                        'Usage: /undef <name>\n' +
                        '\n' +
                        'Undefines a named macro. No options provided. It is the counterpart to /def. I have no ' +
                        'idea, why you would ever need it, but it exists. For you.\n';
            }
            else if (topic === 'list' || topic === '/list') {
                userMessage =
                    '\n' +
                        'Help on: /list\n' +
                        '\n' +
                        'Usage: /list\n' +
                        '\n' +
                        'Lists all currently defined macros. No options provided. The list is in a copy&paste ' +
                        'friendly format. So it may be used to copy all defined macros into a local text file, ' +
                        'to save macros for your next session.\n';
            }
            else {
                userMessage =
                    '\n' +
                        'Tiny Macro Processor V' + MacroProcessor.VERSION + '\n' +
                        '~~~~~~~~~~~~~~~~~~~~~~~~~~\n' +
                        'The macro processor is an optional and experimental component of the Wunderland ' +
                        'web-client and provides tools to define and excute macros. These macros ' +
                        'may define scripts to do complex or repetetive tasks. One typical use case is ' +
                        'the definition of long routes to walk through the MUD. The number of commands per ' +
                        'macro is limited. Any feature may change anytime and the whole processor may ' +
                        'disappear completely in the future, without further notice.\n' +
                        '\n' +
                        'Commands:\n' +
                        ' /def   - define a named macro\n' +
                        ' /undef - undefine a named macro\n' +
                        ' /list  - display a list of macros\n' +
                        ' /help &lt;command&gt; - help for any command (without \'/\')\n' +
                        '\n' +
                        'The macros are stored in your browsers localStorage only and not saved permanently, ' +
                        'yet! So try copy&paste of /list for now!\n';
            }
            return [doSend, newCmd, userMessage];
        };
        // Handle default, custom macro or error
        MacroProcessor.prototype.handleDEFAULT = function (firstWord, cmd) {
            var doSend = false;
            var newCmd = '';
            var userMessage = '';
            if (this.customMacros[firstWord]) {
                // recursion check
                if (this.recursionStack.indexOf(firstWord) < 0) {
                    // push to recursion stack
                    this.recursionStack.push(firstWord);
                    var steps = this.customMacros[firstWord].split('%;'); // '%;' is the TF separator token
                    var stepNums = steps.length;
                    if (stepNums > 42) {
                        userMessage = '% ' + firstWord + ': command list truncated to 42 for some reason, sorry\n';
                        stepNums = 42;
                    }
                    for (var i = 0; i < stepNums; i++) {
                        // Macro calls macro?
                        if (steps[i].length > 0 && steps[i].charAt(0) == MacroProcessor.MACRO_KEY) {
                            // resolve the nested macro
                            var result = this.resolveSingle(steps[i]);
                            if (result[0] === true)
                                doSend = true;
                            newCmd += result[1];
                            userMessage += result[2];
                        }
                        else {
                            // otherwise just append to list of new cmd
                            newCmd += (steps[i] + '\n');
                        }
                    }
                    doSend = true;
                    // pop from recursion stack
                    this.recursionStack.pop();
                }
                else {
                    userMessage = '% ' + firstWord + ': macro self recursion detected, stack: ' + this.recursionStack.toString() + '\n';
                }
            }
            else {
                userMessage = '% ' + firstWord + ': no such command or macro\n';
            }
            return [doSend, newCmd, userMessage];
        };
        // Function resolve() takes a single user command and returns a 
        // 3-tuple of: [doSend, new command, user message] 
        MacroProcessor.prototype.resolveSingle = function (cmd) {
            var result;
            if (cmd && cmd.length > 0 && cmd.charAt(0) == MacroProcessor.MACRO_KEY) {
                cmd = cmd.substr(1);
                console.log('MacroProcessor resolve: ' + cmd);
                var firstWord = this.getFirstWord(cmd);
                switch (firstWord) {
                    case 'def':
                        result = this.handleDEF(firstWord, cmd);
                        break;
                    case 'undef':
                        result = this.handleUNDEF(firstWord, cmd);
                        break;
                    case 'list':
                        result = this.handleLIST(firstWord, cmd);
                        break;
                    case 'help':
                        result = this.handleHELP(firstWord, cmd);
                        break;
                    default: // custom macro or error
                        result = this.handleDEFAULT(firstWord, cmd);
                }
            }
            else {
                // This was no macro, just bypass.
                result = [true, cmd, ''];
            }
            return result;
        };
        // Function resolve() takes a user input and returns a 
        // 3-tuple of: [alternative command, user message] 
        // The user input may consist of multiple lines, because
        // of copy&paste. So we split the input into separate lines
        // and concatenate the result(s).
        MacroProcessor.prototype.resolve = function (cmd) {
            var doSend = false;
            var newCmd = '';
            var userMessage = '';
            // clear recursion stack
            this.recursionStack = [];
            var lines = cmd.split('\n');
            for (var i = 0; i < lines.length; i++) {
                var result = this.resolveSingle(lines[i]);
                if (result[0] === true)
                    doSend = true;
                newCmd += result[1];
                userMessage += result[2];
            }
            return [doSend, newCmd, userMessage];
        };
        // constants
        MacroProcessor.VERSION = '0.1';
        MacroProcessor.MACRO_KEY = '/';
        MacroProcessor.STORAGE_KEY = 'Macros.List';
        return MacroProcessor;
    }());
    TMP.MacroProcessor = MacroProcessor;
})(TMP || (TMP = {}));
//# sourceMappingURL=macros.js.map