/*
 * The tiny macro processor of Wunderland Client.
 *
 * Written in TypeScript and compiled to ECMAScript.
 *
 * Build: tsc --sourceMap macros.ts
 *
 * Requires:
 *  picomatch ^2.2.3
 *
 * Ideas:
 *  Fuchur: Fuchur denkt .o( makros mit / im Namen sind auch doof ) <- Holger: zumindest am Anfang!
 *  Fuchur: Fuchur sagt: Oh und ich denke, dass man leere Makros durchaus gebrauchen koennte.
 *  Holger: also es soll nichts passieren, aber auch keine fehlermeldung kommen, meinst du?
 *  Fuchur sagt: man kann  /def wasanders=%;  machen, aber das erzeugt halt 2! Leerzeilen
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
        // Constructor loads settings from localStorage
        function MacroProcessor() {
            // All custom macros we know.
            this.customMacros = {};
            // All global variables we know. (and some are default + special)
            this.globalVariables = { 'borg': '1', 'matching': 'glob' };
            this.recursionStack = [];
            //  this.ReloadSettings();
        }
        // Return version number
        MacroProcessor.prototype.getVersion = function () {
            return MacroProcessor.VERSION;
        };
        // Sanity checks! Someone may have deleted/corrupted special variables
        MacroProcessor.prototype.MaintainSpecialVariables = function () {
            var fixed = false;
            // 'borg' must exist, set it to '0' or '1' if unset or modified.
            if (this.globalVariables['borg'] == null || this.globalVariables['borg'] == '') {
                this.globalVariables['borg'] = '0';
                fixed = true;
            }
            else if (this.globalVariables['borg'] != '0') {
                this.globalVariables['borg'] = '1';
                fixed = true;
            }
            // 'matching' must exist, set it to 'glob', if unset or invalid value.
            if (this.globalVariables['matching'] != 'simple' && this.globalVariables['matching'] != 'glob' && this.globalVariables['matching'] != 'regexp') {
                this.globalVariables['matching'] = 'glob';
                fixed = true;
            }
            return fixed;
        };
        // Save all settings to localStorage.
        MacroProcessor.prototype.SaveSettings = function () {
            this.MaintainSpecialVariables();
            localStorage.setItem(MacroProcessor.STORAGE_KEY_LIST, JSON.stringify(this.customMacros));
            localStorage.setItem(MacroProcessor.STORAGE_KEY_LISTVAR, JSON.stringify(this.globalVariables));
        };
        // Try to (re-)load settings from localStorage.
        MacroProcessor.prototype.ReloadSettings = function () {
            var updateRequired = false;
            try {
                var storedMacrosString = localStorage.getItem(MacroProcessor.STORAGE_KEY_LIST);
                if (storedMacrosString) {
                    var storedMacros = JSON.parse(storedMacrosString);
                    // the first iteration of the save format had a cmd as string value,
                    // but now its a dictionary, so we convert old saved data into new.
                    this.customMacros = {};
                    var updateRequired_1 = false;
                    if (storedMacros) {
                        for (var mName in storedMacros) {
                            var mBody = storedMacros[mName];
                            if (typeof mBody === 'string') {
                                var props = new MacroProps;
                                props.body = mBody;
                                this.customMacros[mName] = props;
                                updateRequired_1 = true;
                            }
                            else {
                                this.customMacros[mName] = mBody;
                            }
                        }
                    }
                    else {
                        updateRequired_1 = true;
                    }
                }
                var storedGlobalVarsString = localStorage.getItem(MacroProcessor.STORAGE_KEY_LISTVAR);
                if (storedGlobalVarsString) {
                    var storedGlobalVars = JSON.parse(storedGlobalVarsString);
                    // the first iteration of the save format had a cmd as string value,
                    // but now its a dictionary, so we convert old saved data into new.
                    this.globalVariables = {};
                    if (storedGlobalVars) {
                        this.globalVariables = storedGlobalVars;
                    }
                }
                if (this.MaintainSpecialVariables())
                    updateRequired = true;
                // We updated the save format?
                if (updateRequired)
                    this.SaveSettings();
            }
            catch (e) {
                console.log('Macro processor: ' + e.name + ': ' + e.message);
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
                result = this.handleDEFAULT(keyName, [keyName]);
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
        // Find and return an unescaped char in source from startPosition and return 
        // position or -1, if not found.'"\"'
        MacroProcessor.prototype.searchUnescapedChar = function (source, startPosition, searchChar) {
            var foundPosition = -1;
            // search for the closing quote.
            for (var i = startPosition; i < source.length; i++) {
                if (source.charAt(i) == searchChar) {
                    // We have found one. But it must not be escaped, so
                    // count '\' chars in front of quote. If it's an uneven
                    // uneven number, it is escaped and we must continue!
                    var bs = 0;
                    for (var k = i - 1; k >= startPosition; k--) {
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
        };
        /*
         * Get all spaces separated parts of string, respect double-quotes ("")
         * and escaped spaces/quotes, eg.:
         * Source of    : '/def -t"bla \\" blu" abc'
         * Should return: [ '/def', '-t', 'bla \\" blu', 'abc' ]
         */
        MacroProcessor.prototype.getWords = function (source) {
            var allWords = [];
            var firstSpace = this.searchUnescapedChar(source, 0, ' ');
            var firstQuote = this.searchUnescapedChar(source, 0, '"');
            if (firstSpace > -1 && (firstQuote == -1 || firstSpace < firstQuote)) {
                // We found a real space first
                if (firstSpace > 0)
                    allWords.push(source.substr(0, firstSpace));
                allWords = allWords.concat(this.getWords(source.substr(firstSpace + 1)));
            }
            else if (firstQuote > -1 && (firstSpace == -1 || firstQuote < firstSpace)) {
                // We found a first quote, lets see, if there is a word in front.
                if (firstQuote > 0) {
                    allWords.push(source.substr(0, firstQuote));
                    allWords = allWords.concat(this.getWords(source.substr(firstQuote)));
                }
                else {
                    // The quote begins a [0], look for closing quote.
                    var lastQuote = this.searchUnescapedChar(source, firstQuote + 1, '"');
                    if (lastQuote > -1) {
                        // We have a quoted string
                        allWords.push(source.substr(0, lastQuote + 1));
                        allWords = allWords.concat(this.getWords(source.substr(lastQuote + 1)));
                    }
                    else {
                        // We found an opening quote, but no closing quote, this is an error.
                        throw { name: 'ParseError', message: 'Open quote detected, cannot continue to parse' };
                    }
                }
            }
            else {
                // We found no space and no quote
                allWords.push(source);
            }
            return allWords;
        };
        // Find and return a double-quoted string from source.
        // Return empty string, if not found.
        MacroProcessor.prototype.getQuotedString = function (source, quoteChar) {
            var quoted = '';
            // charAt(0) must be the opening quote.
            if (source.charAt(0) != quoteChar)
                return quoted;
            // search for the closing quote.
            for (var i = 1; i < source.length; i++) {
                if (source.charAt(i) == quoteChar) {
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
        // Handle /DEF command - define a named macro, do NOT pass words array, 
        // but the whole cmd line, because char position is relevant here!
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
                mTrigger = this.getQuotedString(body.substr(2), '"');
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
                    if (this.customMacros[mName] != null && this.customMacros[mName].body !== mBody) {
                        userMessage = '% ' + firstWord + ': redefined macro ' + mName + '\n';
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
        MacroProcessor.prototype.handleUNDEF = function (firstWord, cmdWords) {
            var doSend = false;
            var newCmd = '';
            var userMessage = '';
            for (var i = 1; i < cmdWords.length; i++) {
                if (cmdWords[i].length > 0) {
                    if (!this.customMacros[cmdWords[i]]) {
                        userMessage += '% ' + firstWord + ': macro "' + cmdWords[i] + '" was not defined.\n';
                    }
                    else {
                        delete this.customMacros[cmdWords[i]];
                        this.SaveSettings();
                    }
                }
            }
            return [doSend, newCmd, userMessage];
        };
        // Handle /LIST command - display a list of macros
        // Returns 3-tuple: [doSend, new command, user message]
        MacroProcessor.prototype.handleLIST = function (firstWord, cmdWords) {
            var doSend = false;
            var newCmd = '';
            var userMessage = '';
            var picomatch = null;
            if (cmdWords.length > 1) {
                picomatch = require('picomatch');
            }
            var sortedKeys = Object.keys(this.customMacros).sort();
            for (var i = 0; i < sortedKeys.length; i++) {
                if (!picomatch || picomatch.isMatch(sortedKeys[i], cmdWords.slice(1))) {
                    var macroProps = this.customMacros[sortedKeys[i]];
                    userMessage += '/def ' + sortedKeys[i] + ' = ' + macroProps.body + '\n';
                }
            }
            if (userMessage.length == 0)
                userMessage = '% ' + firstWord + ': no macros found.\n';
            return [doSend, newCmd, userMessage];
        };
        // Substitute in 'text' in this order:
        // 1. given parameters     : %{#}, %{*}, %{0}, %{1}, %{2} and so on
        // 2. given local variables: %{whatever} in local scoped defined is
        // 3. global variables     : %{borg}, %{matching} and so on 
        MacroProcessor.prototype.substituteVariables = function (text, parameters, localVariables) {
            var oldBody = text;
            var newBody = '';
            var deadEndLimit = 42; // limit number of substitution loops
            var globVars = this.globalVariables;
            while (deadEndLimit--) {
                newBody = oldBody.replace(/(%{[^ -]*?})/, function (m) {
                    var strippedM = m.substr(2, m.length - 3);
                    if (strippedM == '#') {
                        return '' + parameters.length + '';
                    }
                    else if (strippedM == '*') {
                        return '' + parameters.join(' ') + '';
                    }
                    else {
                        var parsedM = parseInt(strippedM);
                        // if this is not a numbered parameter
                        if (isNaN(parsedM)) {
                            // local variables may shadow global
                            var vValue = localVariables[strippedM];
                            if (vValue != null)
                                return vValue;
                            // global variables as fallback
                            vValue = globVars[strippedM];
                            if (vValue != null)
                                return vValue;
                            // or just empty
                            return '';
                        }
                        // it is a numbered parameter
                        else {
                            if (parsedM < parameters.length) {
                                return parameters[parsedM];
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
                else
                    break;
            }
            return newBody;
        };
        // Handle /SET command - set the value of a global variable, do NOT pass words array, 
        // but the whole cmd line, because spaces are relevant here!
        // Returns 3-tuple: [doSend, new command, user message]
        MacroProcessor.prototype.handleSET = function (firstWord, cmd) {
            var doSend = false;
            var newCmd = '';
            var userMessage = '';
            var body = cmd.substr(4).trim();
            var wsSign = body.indexOf(" ");
            var eqSign = body.indexOf("=");
            var vName = '';
            var vValue = null;
            // there is an '=' and no ' ' or the '=' is the first
            if (eqSign >= 0 && (wsSign < 0 || eqSign < wsSign)) {
                vName = body.substring(0, eqSign).trim();
                vValue = body.substring(eqSign + 1); // do not trim!
                // no value is valid!
            }
            // maybe there is at least a ' '?
            else if (wsSign > 0) {
                vName = body.substring(0, wsSign).trim();
                vValue = body.substring(wsSign + 1).trim(); // trim!
                if (vValue.length == 0)
                    vValue = null; // no value is not valid!
            }
            // no '=' and no ' ' found.
            else {
                vName = body;
            }
            if (vName.length > 0 && vValue != null) {
                if (this.globalVariables[vName] != null && this.globalVariables[vName] !== vValue) {
                    userMessage = '% ' + firstWord + ': redefined variable ' + vName + '\n';
                }
                this.globalVariables[vName] = vValue;
                this.SaveSettings();
            }
            else if (vName.length == 0 && vValue != null && vValue.length > 0) {
                userMessage = '% ' + firstWord + ': &lt;name&gt; must not be empty\n';
            }
            else if (vName.length == 0) {
                return this.handleLISTVAR('listvar', ['listvar']);
            }
            else {
                if (this.globalVariables[vName] != null) {
                    userMessage = '% ' + vName + '=' + this.globalVariables[vName] + '\n';
                }
                else {
                    userMessage = '% ' + vName + ' not set globally\n';
                }
            }
            return [doSend, newCmd, userMessage];
        };
        // Handle /UNSET command - unset variable(s)
        // Returns 3-tuple: [doSend, new command, user message]
        MacroProcessor.prototype.handleUNSET = function (firstWord, cmdWords) {
            var doSend = false;
            var newCmd = '';
            var userMessage = '';
            for (var i = 1; i < cmdWords.length; i++) {
                if (cmdWords[i].length > 0) {
                    if (!this.globalVariables[cmdWords[i]]) {
                        userMessage += '% ' + firstWord + ': global variable "' + cmdWords[i] + '" was not defined.\n';
                    }
                    else {
                        delete this.globalVariables[cmdWords[i]];
                        this.SaveSettings();
                    }
                }
            }
            return [doSend, newCmd, userMessage];
        };
        // Handle /LISTVAR command - list values of variables
        // Returns 3-tuple: [doSend, new command, user message]
        MacroProcessor.prototype.handleLISTVAR = function (firstWord, cmdWords) {
            var doSend = false;
            var newCmd = '';
            var userMessage = '';
            var picomatch = null;
            if (cmdWords.length > 1) {
                picomatch = require('picomatch');
            }
            var sortedKeys = Object.keys(this.globalVariables).sort();
            for (var i = 0; i < sortedKeys.length; i++) {
                if (!picomatch || picomatch.isMatch(sortedKeys[i], cmdWords.slice(1))) {
                    var vValue = this.globalVariables[sortedKeys[i]];
                    userMessage += '/set ' + sortedKeys[i] + '=' + vValue + '\n';
                }
            }
            if (userMessage.length == 0)
                userMessage = '% ' + firstWord + ': no global variables found.\n';
            return [doSend, newCmd, userMessage];
        };
        // Handle /LET command - set the value of a local variable, do NOT pass words array, 
        // but the whole cmd line, because spaces are relevant here!
        // Returns 3-tuple: [doSend, new command, user message]
        MacroProcessor.prototype.handleLET = function (firstWord, cmd) {
            var doSend = false;
            var newCmd = '';
            var userMessage = '';
            throw { name: 'NotImplementedError', message: 'Not implemented yet!' };
            return [doSend, newCmd, userMessage];
        };
        // Handle /HELP command - display the help text
        // Returns 3-tuple: [doSend, new command, user message]
        MacroProcessor.prototype.handleHELP = function (firstWord, cmdWords) {
            var doSend = false;
            var newCmd = '';
            var userMessage = '';
            var topic = cmdWords[1].toLowerCase();
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
                        'Usage: /list [pattern]\n' +
                        '\n' +
                        'Lists all currently defined macros, sorted alphabetically. If [pattern] is provided, only ' +
                        'macros with a matching name are listed. \n';
            }
            else if (topic === 'set' || topic === '/set') {
                userMessage =
                    '\n' +
                        'TODO: Handle /SET command - set the value of a global variable\n';
            }
            else if (topic === 'unset' || topic === '/unset') {
                '\n' +
                    'TODO: Handle /UNSET command - unset one or more variable(s)\n';
            }
            else if (topic === 'listvar' || topic === '/listvar') {
                '\n' +
                    'TODO: Handle /LISTVAR command - list values of variables\n';
            }
            else if (topic === 'let' || topic === '/let') {
                '\n' +
                    'TODO: Handle /LET command - set the value of a local variable\n';
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
        MacroProcessor.prototype.handleDEFAULT = function (firstWord, cmdWords) {
            var doSend = false;
            var newCmd = '';
            var userMessage = '';
            if (this.customMacros[firstWord] != null) {
                // recursion check
                if (this.recursionStack.indexOf(firstWord) < 0) {
                    // push to recursion stack
                    this.recursionStack.push(firstWord);
                    var body = this.customMacros[firstWord].body;
                    body = this.substituteVariables(body, cmdWords, {}); // substitute variables TODO: LOCAL VARIABLES NOT IMPLEMENTED YET!
                    var steps = body.split('%;'); // split by '%;' TF separator token
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
                var words = this.getWords(cmd);
                var firstWord = words[0].toLowerCase();
                if (firstWord.length > 0 && firstWord == cmd.substr(0, firstWord.length).toLowerCase()) {
                    switch (firstWord) {
                        case 'def':
                            result = this.handleDEF(firstWord, cmd);
                            break;
                        case 'undef':
                            result = this.handleUNDEF(firstWord, words);
                            break;
                        case 'list':
                            result = this.handleLIST(firstWord, words);
                            break;
                        case 'set':
                            result = this.handleSET(firstWord, cmd);
                            break;
                        case 'unset':
                            result = this.handleUNSET(firstWord, words);
                            break;
                        case 'listvar':
                            result = this.handleLISTVAR(firstWord, words);
                            break;
                        case 'let':
                            result = this.handleLET(firstWord, cmd);
                            break;
                        case 'help':
                            result = this.handleHELP(firstWord, words);
                            break;
                        default: // custom macro or error
                            result = this.handleDEFAULT(firstWord, words);
                    }
                }
                else {
                    // The first word was empty, quoted or prefixed with spaces, 
                    // but was no macro nor command for sure. Bypass.
                    result = [true, cmd + '\n', ''];
                }
            }
            else {
                // No '/' prefix, just bypass.
                result = [true, cmd + '\n', ''];
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
        MacroProcessor.VERSION = '0.3';
        MacroProcessor.MACRO_KEY = '/';
        MacroProcessor.STORAGE_KEY_LIST = 'Macros.List';
        MacroProcessor.STORAGE_KEY_LISTVAR = 'Macros.ListVar';
        return MacroProcessor;
    }());
    TMP.MacroProcessor = MacroProcessor;
})(TMP || (TMP = {}));
//# sourceMappingURL=macros.js.map