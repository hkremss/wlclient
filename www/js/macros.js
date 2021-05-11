/*
 * The tiny macro processor of Wunderland Client.
 *
 * Written in TypeScript and compiled to ECMAScript.
 *
 * Build: tsc --sourceMap macros.ts
 */
var TMP;
(function (TMP) {
    var MacroProps = /** @class */ (function () {
        function MacroProps() {
        }
        return MacroProps;
    }());
    var TriggerProps = /** @class */ (function () {
        function TriggerProps() {
        }
        return TriggerProps;
    }());
    var MacroProcessor = /** @class */ (function () {
        function MacroProcessor() {
            // fields
            this.customMacros = {};
            this.recursionStack = [];
        }
        // Constructor loads settings from localStorage
        //constructor() { 
        //  this.ReloadSettings();
        //}
        // Return version number
        MacroProcessor.prototype.getVersion = function () {
            return MacroProcessor.VERSION;
        };
        // Save all settings to localStorage.
        MacroProcessor.prototype.SaveSettings = function () {
            localStorage.setItem(MacroProcessor.STORAGE_KEY, JSON.stringify(this.customMacros));
        };
        // Try to (re-)load settings from localStorage.
        MacroProcessor.prototype.ReloadSettings = function () {
            var storedMacrosString = localStorage.getItem(MacroProcessor.STORAGE_KEY);
            if (storedMacrosString) {
                try {
                    var storedMacros = JSON.parse(storedMacrosString);
                    // the first iteration of the save format had a cmd as string value,
                    // but now its a dictionary, so we convert old saved data into new.
                    this.customMacros = {};
                    var updateRequired = false;
                    if (storedMacros) {
                        for (var mName in storedMacros) {
                            var mBody = storedMacros[mName];
                            if (typeof mBody === 'string') {
                                var props = new MacroProps;
                                props.body = mBody;
                                this.customMacros[mName] = props;
                                updateRequired = true;
                            }
                            else {
                                this.customMacros[mName] = mBody;
                            }
                        }
                    }
                    else {
                        updateRequired = true;
                    }
                    // We updated the save format. 
                    if (updateRequired)
                        this.SaveSettings();
                }
                catch (e) {
                    console.log('Macro processor: ' + e.name + ': ' + e.message);
                }
            }
        };
        // Build a key name (similar to TF) from event.
        MacroProcessor.prototype.GetNamedKey = function (event) {
            var keyName = '';
            // If the key is ONLY unidentified or a modifier key, skip it.
            // see: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key/Key_Values
            // NOTE: IE and Firefox report 'OS' for 'Meta', see: https://bugzilla.mozilla.org/show_bug.cgi?id=1232918
            if (['Unidentified', 'Alt', 'AltGraph', 'CapsLock', 'Control', 'Fn', 'FnLock', 'Hyper', 'Meta',
                'NumLock', 'ScrollLock', 'Shift', 'Super', 'Symbol', 'SymbolLock', 'OS',
                'Insert', 'Backspace', 'Delete'].indexOf(event.key) == -1) {
                keyName = 'key_';
                if (event.ctrlKey)
                    keyName += 'ctrl_';
                if (event.altKey)
                    keyName += 'alt_';
                if (event.shiftKey)
                    keyName += 'shift_';
                if (event.metaKey)
                    keyName += 'meta_';
                keyName += event.key == ' ' ? 'Space' : event.key;
            }
            return keyName;
        };
        // Handle a single key-down event.
        // Returns 3-tuple: [doSend, new command, user message]
        MacroProcessor.prototype.HandleKey = function (event) {
            var result = [false, '', ''];
            // Build a key name (similar to TF)
            var keyName = this.GetNamedKey(event);
            if (keyName.length > 0) {
                // Try to handle this.
                result = this.handleDEFAULT(keyName, '');
                // If we can not?
                if (!result[0]) {
                    // Reset new command and user message.
                    result[1] = '';
                    result[2] = '';
                    // Give a hint for function keys only.
                    if (['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
                        'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19', 'F20', 'F21', 'F22', 'F23', 'F24',
                    ].indexOf(event.key) != -1) {
                        result[2] = '% The key "' + keyName + '" is undefined; you may use "/def ' + keyName + ' = <commands>" to define it.\n';
                    }
                }
            }
            return result;
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
        // Find and return a double-quoted string from source.
        // Return empty string, if not found.
        MacroProcessor.prototype.getQuotedString = function (source) {
            var quoted = '';
            // charAt(0) must be the opening quote.
            if (source.charAt(0) != '"')
                return quoted;
            // search for the closing quote.
            for (var i = 1; i < source.length; i++) {
                if (source.charAt(i) == '"') {
                    // We have found one. But it must not be escaped, so
                    // count '\' chars in front of quote. If it's an uneven
                    // uneven number, it is escaped and we must continue!
                    var bs = 0;
                    for (var k = i - 1; k > 0; k--) {
                        if (source.charAt(k) == '\\') {
                            bs++;
                            continue;
                        }
                        break;
                    }
                    if (bs % 2 == 0) {
                        // even number of backslashes == closing quote found! 
                        quoted = source.substr(0, i + 1);
                        break;
                    }
                }
            }
            return quoted;
        };
        // Handle /DEF command - define a named macro
        // Returns 3-tuple: [doSend, new command, user message]
        MacroProcessor.prototype.handleDEF = function (firstWord, cmd) {
            var doSend = false;
            var newCmd = '';
            var userMessage = '';
            var mTrigger = '';
            var body = cmd.substr(4).trim();
            if (body.length > 0 && body.charAt(0) == '-') {
                if (body.length < 2) {
                    userMessage = '% ' + firstWord + ': missing option -\n';
                    return [doSend, newCmd, userMessage];
                }
                else if (body.charAt(1) != 't') {
                    userMessage = '% ' + firstWord + ': unknown option -' + body.charAt(1) + '\n';
                    return [doSend, newCmd, userMessage];
                }
                mTrigger = this.getQuotedString(body.substr(2));
                if (!mTrigger || mTrigger.length == 0) {
                    userMessage = '% ' + firstWord + ': invalid/incomplete trigger option, quotes missing?\n';
                    return [doSend, newCmd, userMessage];
                }
                else if (mTrigger.length == 2) {
                    userMessage = '% ' + firstWord + ': empty trigger found\n';
                    return [doSend, newCmd, userMessage];
                }
                else { // found a quoted trigger string!
                    // cut trigger part off the body. +2 for the '-t' option.
                    body = body.substr(mTrigger.length + 2);
                    // trim the quotes off on both sides.
                    mTrigger = mTrigger.substr(1, mTrigger.length - 2);
                    console.log('TMP ' + firstWord + ': found trigger:\'' + mTrigger + '\'.');
                }
            }
            var eqSign = body.indexOf("=");
            if (eqSign > 0) {
                var mName = body.substring(0, eqSign).trim();
                var mBody = body.substring(eqSign + 1).trim();
                if (mName.length > 0 && mBody.length > 0) {
                    if (this.customMacros[mName] && this.customMacros[mName].body !== mBody) {
                        userMessage = '% ' + firstWord + ': Redefined macro ' + mName + '\n';
                    }
                    var macro = new MacroProps;
                    macro.body = mBody;
                    macro.trigger = new TriggerProps;
                    macro.trigger.pattern = mTrigger;
                    this.customMacros[mName] = macro;
                    this.SaveSettings();
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
        // Returns 3-tuple: [doSend, new command, user message]
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
                        this.SaveSettings();
                    }
                }
            }
            return [doSend, newCmd, userMessage];
        };
        // Handle /LIST command - display a list of macros
        // Returns 3-tuple: [doSend, new command, user message]
        MacroProcessor.prototype.handleLIST = function (firstWord, cmd) {
            var doSend = false;
            var newCmd = '';
            var userMessage = '';
            for (var mName in this.customMacros) {
                var macroProps = this.customMacros[mName];
                userMessage += '/def ' + mName + ' = ' + macroProps.body + '\n';
            }
            return [doSend, newCmd, userMessage];
        };
        // Handle /HELP command - display the help text
        // Returns 3-tuple: [doSend, new command, user message]
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
                        'Usage: /undef &lt;name&gt;\n' +
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
        // Handle default case, custom macro or just do nothing.
        // Returns 3-tuple: [doSend, new command, user message]
        MacroProcessor.prototype.handleDEFAULT = function (firstWord, cmd) {
            var doSend = false;
            var newCmd = '';
            var userMessage = '';
            if (this.customMacros[firstWord]) {
                // recursion check
                if (this.recursionStack.indexOf(firstWord) < 0) {
                    // push to recursion stack
                    this.recursionStack.push(firstWord);
                    var steps = this.customMacros[firstWord].body.split('%;'); // '%;' is the TF separator token
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
        // Resolves a single user command (single line or just a command).
        // Returns 3-tuple: [doSend, new command, user message]
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
        // Returns 3-tuple: [doSend, new command, user message]
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
        MacroProcessor.VERSION = '0.2';
        MacroProcessor.MACRO_KEY = '/';
        MacroProcessor.STORAGE_KEY = 'Macros.List';
        return MacroProcessor;
    }());
    TMP.MacroProcessor = MacroProcessor;
})(TMP || (TMP = {}));
//# sourceMappingURL=macros.js.map