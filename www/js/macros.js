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
    var EvaluationContext = /** @class */ (function () {
        /**
         * Constructor to pass command in
         */
        function EvaluationContext(cmd) {
            this.parameters = [];
            this.localVariables = {};
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
        EvaluationContext.prototype.isMacro = function () {
            return (this.cmd != null && this.cmd.length > 0 && this.cmd.charAt(0) == MacroProcessor.MACRO_KEY);
        };
        /**
         * getFirstWord returns the first word of the macro/command
         * @returns the first word of the command without leading '/'
         */
        EvaluationContext.prototype.getFirstWord = function () {
            if (this.parameters.length == 0)
                return '';
            var firstWord = this.parameters[0];
            return this.isMacro ? firstWord.substr(1) : firstWord;
        };
        return EvaluationContext;
    }());
    TMP.EvaluationContext = EvaluationContext;
    /**
     * Stack holding a list of execution context and a step
     * counter for recursion detection.
     */
    var Stack = /** @class */ (function () {
        /**
         * Constructor to pass initial EvaluationContext in
         */
        function Stack(firstContext) {
            this.content = [];
            this.stepCount = 0;
            if (!firstContext)
                firstContext = new EvaluationContext(null);
            this.content.push(firstContext);
        }
        /**
         * getContext - return current context, if there is none, create one
         */
        Stack.prototype.getCContext = function () {
            if (this.content.length == 0) {
                this.content.push(new EvaluationContext(null));
            }
            return this.content[this.content.length - 1];
        };
        /**
         * getCCmd - get current command
         */
        Stack.prototype.getCCmd = function () {
            return this.content.length > 0 ? this.content[this.content.length - 1].cmd : '';
        };
        Stack.prototype.push = function (context) {
            this.content.push(context);
        };
        Stack.prototype.pop = function () {
            return this.content.pop();
        };
        /**
         * Search the variable in stack, beginning from the end /current.
         * If nothing found, return null.
         * @param vName name of the variable to search
         * @returns a value string or ```null```
         */
        Stack.prototype.searchVariable = function (vName) {
            var vValue = null;
            for (var i = this.content.length - 1; i >= 0; i--) {
                vValue = this.content[i].localVariables[vName];
                if (vValue != null)
                    break;
            }
            return vValue;
        };
        return Stack;
    }());
    TMP.Stack = Stack;
    /**
     * MacroResult contains the result of a macro evaluation.
     */
    var EvalResult = /** @class */ (function () {
        /**
         * Constructor to initialze class
         * @param send ```true``` if the cmd should be send remote, otherwise ```false```
         * @param cmd the command to send remote
         * @param message a message to output locally, may be multiline, but must end with '\n'
         */
        function EvalResult(send, cmd, message) {
            this.send = send;
            this.cmd = cmd;
            this.message = message;
        }
        /**
         * Append another EvalResult to this one
         * @param next another EvalResult, which content should be appended
         */
        EvalResult.prototype.append = function (next) {
            if (next) {
                if (next.send === true)
                    this.send = true;
                this.cmd += next.cmd;
                this.message += next.message;
            }
        };
        return EvalResult;
    }());
    TMP.EvalResult = EvalResult;
    var MacroProcessor = /** @class */ (function () {
        // Constructor loads settings from localStorage
        function MacroProcessor() {
            // All custom macros we know.
            this.customMacros = {};
            // All global variables we know. (and some are default + special)
            this.globalVariables = { 'borg': '1', 'matching': 'glob' };
            // Triggers need complete lines to match. If we received a partial 
            // line, store it here and use it, as soon as it completes.
            this.partialLineBufferForTrigger = '';
            //  this.reloadSettings();
        }
        // Return version number
        MacroProcessor.prototype.getVersion = function () {
            return MacroProcessor.VERSION;
        };
        // Sanity checks! Someone may have deleted/corrupted special variables
        MacroProcessor.prototype.maintainSpecialVariables = function () {
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
            // 'matching' must exist and be lower case ...
            var mMatching = this.globalVariables['matching'].toLowerCase();
            // correct regex -> regexp ...
            if (mMatching == 'regex') {
                this.globalVariables['matching'] = 'regexp';
            }
            // ... or set it to 'glob', if unset or invalid value.
            else if (mMatching != 'simple' && mMatching != 'glob' && mMatching != 'regexp') {
                this.globalVariables['matching'] = 'glob';
                fixed = true;
            }
            return fixed;
        };
        // Save all settings to localStorage.
        MacroProcessor.prototype.saveSettings = function () {
            this.maintainSpecialVariables();
            localStorage.setItem(MacroProcessor.STORAGE_KEY_LIST, JSON.stringify(this.customMacros));
            localStorage.setItem(MacroProcessor.STORAGE_KEY_LISTVAR, JSON.stringify(this.globalVariables));
        };
        // Try to (re-)load settings from localStorage.
        MacroProcessor.prototype.reloadSettings = function () {
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
                if (this.maintainSpecialVariables())
                    updateRequired = true;
                // We updated the save format?
                if (updateRequired)
                    this.saveSettings();
            }
            catch (e) {
                console.log('Macro processor: ' + e.name + ': ' + e.message);
            }
        };
        // Build a key name (similar to TF) from event.
        MacroProcessor.prototype.getNamedKey = function (event) {
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
        /**
         * Handle a single key-down event.
         * @param event a ```KeyboardEvent``` raised on the client
         * @returns evaluation result
         */
        MacroProcessor.prototype.keyTrigger = function (event) {
            var result = new EvalResult(false, '', '');
            // Build a key name (similar to TF)
            var keyName = this.getNamedKey(event);
            if (keyName.length > 0) {
                // Try to handle this, can only be a custom macro, so check it first.
                if (this.customMacros[keyName]) {
                    result = this.expandMacro(new Stack(new EvaluationContext('/' + keyName)));
                }
                // If we can not?
                if (!result.send) {
                    // Reset new command and user message.
                    result.cmd = '';
                    result.message = '';
                    // Give a hint for function keys only.
                    if (['F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
                        'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19', 'F20', 'F21', 'F22', 'F23', 'F24',
                    ].indexOf(event.key) != -1) {
                        result.message = '% The key "' + keyName + '" is undefined; you may use "/def ' + keyName + ' = <commands>" to define it.\n';
                    }
                }
            }
            return result;
        };
        /**
         * Handle a single text line trigger event.
         * @param text a single text line received from the server
         * @returns evaluation result
         */
        MacroProcessor.prototype.textTrigger = function (text) {
            var result = new EvalResult(false, '', '');
            // triggers are switched off globally.
            if (this.globalVariables['borg'] == '0') {
                this.partialLineBufferForTrigger = '';
                return result;
            }
            if (text.length > 0) {
                // Prefix the new text with the old buffer and reset buffer.
                text = this.partialLineBufferForTrigger.concat(text);
                this.partialLineBufferForTrigger = '';
                // Split text into lines. (no matter if LF or CRLF)
                var lines = text.split(/\r?\n/);
                // There last element on 'lines' contains the rest after the 
                // last '\n'. It might be empty anyway, but we need to chop
                // it off the array and append it to the 'partialLineBuffer'
                // for the next run.
                this.partialLineBufferForTrigger = lines.pop();
                var picomatch = require('picomatch');
                // the rest of the array was complete lines, so test 
                // all triggers now.
                for (var i = 0; i < lines.length; i++) {
                    for (var mName in this.customMacros) {
                        var mProps = this.customMacros[mName];
                        if (mProps.trigger != null && mProps.trigger.pattern != null && mProps.trigger.pattern.length > 0) {
                            if (mProps.trigger.matching == 'simple') {
                                if (lines[i] == mProps.trigger.pattern) {
                                    console.log('% trigger match simple pattern of: ' + mName);
                                    var context = new EvaluationContext('/' + mName);
                                    context.parameters.push(lines[i]); // the triggering line is the only additional parameter
                                    context.localVariables['P0'] = lines[i]; // in addition populate the P0 variable
                                    result.append(this.expandMacro(new Stack(context)));
                                }
                            }
                            else if (mProps.trigger.matching == 'glob') {
                                // pm.compileRe(pm.parse("(*) has arrived.")).exec("Gast1 has arrived.")[1] == 'Gast1'
                                var mResult = picomatch.compileRe(picomatch.parse(mProps.trigger.pattern)).exec(lines[i]);
                                if (mResult) {
                                    console.log('% trigger match glob pattern of: ' + mName);
                                    var context = new EvaluationContext('/' + mName);
                                    for (var p = 0;; p++) {
                                        if (!mResult[p])
                                            break;
                                        context.parameters.push(mResult[p]);
                                        context.localVariables['P' + p] = mResult[p];
                                    }
                                    context.localVariables['PL'] = lines[i].substr(0, mResult.index);
                                    context.localVariables['PR'] = lines[i].substr(mResult.index + mResult[0].length);
                                    result.append(this.expandMacro(new Stack(context)));
                                }
                            }
                            else if (mProps.trigger.matching == 'regexp') {
                                var regex = new RegExp(mProps.trigger.pattern);
                                var mResult = regex.exec(lines[i]);
                                if (mResult) {
                                    console.log('% trigger match regexp pattern of: ' + mName);
                                    var context = new EvaluationContext('/' + mName);
                                    for (var p = 0;; p++) {
                                        if (!mResult[p])
                                            break;
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
                                throw new Error("Unknown matching type!");
                            }
                        }
                    }
                }
            }
            return result;
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
        // @returns evaluation result
        MacroProcessor.prototype.handleDEF = function (stack) {
            var result = new EvalResult(false, '', '');
            var myContext = stack.getCContext();
            var firstWord = myContext.getFirstWord();
            var mPattern = '';
            var mMatching = '';
            var body = myContext.cmd.substr(4).trim();
            // collect options
            while (body.length > 0 && body.charAt(0) == '-') {
                if (body.length < 2) {
                    result.message = '% ' + firstWord + ': missing option -\n';
                    return result;
                }
                // -t trigger option
                if (body.charAt(1) == 't') {
                    mPattern = this.getQuotedString(body.substr(2), '"');
                    if (!mPattern || mPattern.length == 0) {
                        result.message = '% ' + firstWord + ': invalid/incomplete trigger option, quotes missing?\n';
                        return result;
                    }
                    else if (mPattern.length == 2) {
                        result.message = '% ' + firstWord + ': empty trigger found\n';
                        return result;
                    }
                    else { // found a quoted trigger string!
                        // cut trigger part off the body. +2 for the '-t' option and trim.
                        body = body.substr(mPattern.length + 2).trim();
                        // chop off the quotes off from trigger on both sides.
                        mPattern = mPattern.substr(1, mPattern.length - 2);
                        //console.log('TMP '+firstWord+': found trigger:\''+mPattern+'\'.');
                    }
                }
                // -m matching option
                else if (body.charAt(1) == 'm') {
                    if (body.indexOf('-msimple ') == 0) {
                        mMatching = 'simple';
                        body = body.substr(9).trim();
                    }
                    else if (body.indexOf('-mglob ') == 0) {
                        mMatching = 'glob';
                        body = body.substr(7).trim();
                    }
                    else if (body.indexOf('-mregexp ') == 0) {
                        mMatching = 'regexp';
                        body = body.substr(9).trim();
                    }
                    else {
                        result.message = '% ' + firstWord + ': matching option must be: -msimple, -mglob or -mregexp\n';
                        return result;
                    }
                }
                else {
                    result.message = '% ' + firstWord + ': unknown option -' + body.charAt(1) + '\n';
                    return result;
                }
            }
            var eqSign = body.indexOf("=");
            if (eqSign > 0) {
                var mName = body.substring(0, eqSign).trim();
                var mBody = body.substring(eqSign + 1).trim();
                if (mName.length > 0) {
                    // sanity checks
                    if (mPattern.length > 0) {
                        if (mMatching.length == 0)
                            mMatching = this.globalVariables['matching']; // default
                        if (mMatching == 'glob') {
                            var picomatch = require('picomatch');
                            try {
                                var regex = picomatch.compileRe(picomatch.parse(mPattern));
                            }
                            catch (error) {
                                result.message = '% ' + firstWord + ': glob error: ' + error + '\n';
                                return result;
                            }
                        }
                        else if (mMatching == 'regexp') {
                            try {
                                var regex = new RegExp(mPattern);
                            }
                            catch (error) {
                                result.message = '% ' + firstWord + ': regexp error: ' + error + '\n';
                                return result;
                            }
                        }
                        // else don't check simple
                    }
                    else {
                        // if no pattern, no matching required
                        mMatching = '';
                    }
                    // wser wants to know
                    if (this.customMacros[mName] != null && this.customMacros[mName].body !== mBody) {
                        result.message = '% ' + firstWord + ': redefined macro ' + mName + '\n';
                    }
                    // create/update macro
                    var macro = new MacroProps;
                    macro.body = mBody;
                    macro.trigger = new TriggerProps;
                    macro.trigger.pattern = mPattern;
                    macro.trigger.matching = mMatching;
                    this.customMacros[mName] = macro;
                    this.saveSettings();
                }
                else {
                    result.message = '% ' + firstWord + ': &lt;name&gt; must not be empty\n';
                }
            }
            else if (eqSign == 0) {
                result.message = '% ' + firstWord + ': &lt;name&gt; missing, try: /def &lt;name&gt; = &lt;body&gt;\n';
            }
            else {
                result.message = '% ' + firstWord + ': \'=\' missing, try: /def &lt;name&gt; = &lt;body&gt;\n';
            }
            return result;
        };
        // Handle /UNDEF command - undefine a named macro
        // @returns evaluation result
        MacroProcessor.prototype.handleUNDEF = function (stack) {
            var result = new EvalResult(false, '', '');
            var myContext = stack.getCContext();
            var firstWord = myContext.getFirstWord();
            for (var i = 1; i < myContext.parameters.length; i++) {
                if (myContext.parameters[i].length > 0) {
                    if (!this.customMacros[myContext.parameters[i]]) {
                        result.message += '% ' + firstWord + ': macro "' + myContext.parameters[i] + '" was not defined.\n';
                    }
                    else {
                        delete this.customMacros[myContext.parameters[i]];
                        this.saveSettings();
                    }
                }
            }
            return result;
        };
        // Handle /LIST command - display a list of macros
        // @returns evaluation result
        MacroProcessor.prototype.handleLIST = function (stack) {
            var result = new EvalResult(false, '', '');
            var myContext = stack.getCContext();
            var firstWord = myContext.getFirstWord();
            var picomatch = null;
            if (myContext.parameters.length > 1) {
                picomatch = require('picomatch');
            }
            var sortedKeys = Object.keys(this.customMacros).sort();
            for (var i = 0; i < sortedKeys.length; i++) {
                if (!picomatch || picomatch.isMatch(sortedKeys[i], myContext.parameters.slice(1))) {
                    var macroProps = this.customMacros[sortedKeys[i]];
                    result.message += '/def ';
                    if (macroProps.trigger != null && macroProps.trigger.pattern != null && macroProps.trigger.pattern.length > 0) {
                        result.message += '-m' + macroProps.trigger.matching + ' ';
                        result.message += '-t"' + macroProps.trigger.pattern + '" ';
                    }
                    result.message += (sortedKeys[i] + ' = ' + macroProps.body + '\n');
                }
            }
            if (result.message.length == 0)
                result.message = '% ' + firstWord + ': no macros found.\n';
            return result;
        };
        // Substitute in 'text' in this order:
        // 1. given parameters     : %{#}, %{*}, %{0}, %{1}, %{2} and so on
        // 2. given local variables: %{whatever} in local scoped defined is
        // 3. global variables     : %{borg}, %{matching} and so on 
        MacroProcessor.prototype.substituteVariables = function (text, stack) {
            var oldBody = text;
            var newBody = '';
            var deadEndLimit = 42; // limit number of substitution loops
            var myContext = stack.getCContext();
            var globVars = this.globalVariables;
            while (deadEndLimit--) {
                newBody = oldBody.replace(/(%{[^ -]*?})/, function (m) {
                    var strippedM = m.substr(2, m.length - 3);
                    if (strippedM == '#') {
                        return '' + myContext.parameters.length + '';
                    }
                    else if (strippedM == '*') {
                        return '' + myContext.parameters.slice(1).join(' ') + '';
                    }
                    else {
                        var parsedM = parseInt(strippedM);
                        // if this is not a numbered parameter
                        if (isNaN(parsedM)) {
                            // local variables may shadow global
                            var vValue = stack.searchVariable(strippedM);
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
                else
                    break;
            }
            return newBody;
        };
        // Handle /SET command - set the value of a global variable, do NOT pass words array, 
        // but the whole cmd line, because spaces are relevant here!
        // @returns evaluation result
        MacroProcessor.prototype.handleSET = function (stack) {
            var result = new EvalResult(false, '', '');
            var myContext = stack.getCContext();
            var firstWord = myContext.getFirstWord();
            var body = myContext.cmd.substr(4).trim();
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
                    result.message = '% ' + firstWord + ': redefined variable ' + vName + '\n';
                }
                this.globalVariables[vName] = vValue;
                this.saveSettings();
            }
            else if (vName.length == 0 && vValue != null && vValue.length > 0) {
                result.message = '% ' + firstWord + ': &lt;name&gt; must not be empty\n';
            }
            else if (vName.length == 0) {
                return this.handleLISTVAR(stack);
            }
            else {
                if (this.globalVariables[vName] != null) {
                    result.message = '% ' + vName + '=' + this.globalVariables[vName] + '\n';
                }
                else {
                    result.message = '% ' + vName + ' not set globally\n';
                }
            }
            return result;
        };
        // Handle /UNSET command - unset variable(s)
        // @returns evaluation result
        MacroProcessor.prototype.handleUNSET = function (stack) {
            var result = new EvalResult(false, '', '');
            var myContext = stack.getCContext();
            var firstWord = myContext.getFirstWord();
            for (var i = 1; i < myContext.parameters.length; i++) {
                if (myContext.parameters[i].length > 0) {
                    if (!this.globalVariables[myContext.parameters[i]]) {
                        result.message += '% ' + firstWord + ': global variable "' + myContext.parameters[i] + '" was not defined.\n';
                    }
                    else {
                        delete this.globalVariables[myContext.parameters[i]];
                        this.saveSettings();
                    }
                }
            }
            return result;
        };
        // Handle /LISTVAR command - list values of variables
        // @returns evaluation result
        MacroProcessor.prototype.handleLISTVAR = function (stack) {
            var result = new EvalResult(false, '', '');
            var picomatch = null;
            var myContext = stack.getCContext();
            var firstWord = myContext.getFirstWord();
            if (myContext.parameters.length > 1) {
                picomatch = require('picomatch');
            }
            var sortedKeys = Object.keys(this.globalVariables).sort();
            for (var i = 0; i < sortedKeys.length; i++) {
                if (!picomatch || picomatch.isMatch(sortedKeys[i], myContext.parameters.slice(1))) {
                    var vValue = this.globalVariables[sortedKeys[i]];
                    result.message += '/set ' + sortedKeys[i] + '=' + vValue + '\n';
                }
            }
            if (result.message.length == 0)
                result.message = '% ' + firstWord + ': no global variables found.\n';
            return result;
        };
        // Handle /LET command - set the value of a local variable in the parent (!) 
        // context, because our local context will disappear after the macro expansion has finished.
        // @returns evaluation result
        MacroProcessor.prototype.handleLET = function (stack) {
            var result = new EvalResult(false, '', '');
            var myContext = stack.getCContext();
            var firstWord = myContext.getFirstWord();
            // Create a local variable in the current context.
            var body = myContext.cmd.substr(4).trim();
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
                myContext.localVariables[vName] = vValue;
            }
            else if (vName.length == 0) {
                result.message = '% ' + firstWord + ': &lt;name&gt; must not be empty\n';
            }
            else {
                result.message = '% ' + firstWord + ': &lt;value&gt; must not be empty\n';
            }
            return result;
        };
        // Handle /HELP command - display the help text
        // @returns evaluation result
        MacroProcessor.prototype.handleHELP = function (stack) {
            var result = new EvalResult(false, '', '');
            var myContext = stack.getCContext();
            var topic = myContext.parameters.length > 1 ? myContext.parameters[1].toLowerCase() : '';
            result.message = new TMP.MacroHelp(topic).getHelp();
            return result;
        };
        /**
         * Handle custom macro.
         * @param stack stack to use
         * @returns evaluation result
         */
        // Handle default case, custom macro or just do nothing.
        // @returns evaluation result
        MacroProcessor.prototype.handleCUSTOM = function (stack) {
            var result = new EvalResult(false, '', '');
            var myContext = stack.getCContext();
            var firstWord = myContext.getFirstWord();
            if (this.customMacros[firstWord] != null) {
                var body = this.customMacros[firstWord].body;
                var steps = body.split(MacroProcessor.TF_SEPARATOR_TOKEN);
                var stepNums = steps.length;
                if (stepNums > 42) {
                    result.message = '% ' + firstWord + ': command list truncated to 42 for some reason, sorry\n';
                    stepNums = 42;
                }
                for (var i = 0; i < stepNums; i++) {
                    // substitute variables in this step
                    var step = this.substituteVariables(steps[i], stack); // substitute variables
                    // Macro calls macro? Do not check substituted 'step' here because this
                    // may be (mis-)used for 'macro injection' through subsituted '/'.
                    if (steps[i].length > 0 && steps[i].charAt(0) == MacroProcessor.MACRO_KEY) {
                        // create child context and resolve nested step
                        stack.push(new EvaluationContext(step));
                        var childResult = this.resolveSingle(stack);
                        if (childResult.send === true)
                            result.send = true;
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
                result.message = '% ' + firstWord + ': no such command or macro\n';
            }
            return result;
        };
        /**
         * Expand any macro, and maybe sub macros, so this may be called recursively.
         * @param stack stack to use
         * @returns evaluation result
         */
        MacroProcessor.prototype.expandMacro = function (stack) {
            var result;
            // If there is no stack, we have nothing to execute.
            if (stack == null)
                throw new Error("Argument 'stack' must not be null.");
            var myContext = stack.getCContext();
            var firstWord = myContext.getFirstWord();
            if (firstWord.length > 0) {
                // recursion check
                if (stack.stepCount < MacroProcessor.MAX_RECUR) {
                    stack.stepCount++;
                    switch (firstWord.toLowerCase()) {
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
                    result = new EvalResult(false, '', '% ' + firstWord + ': maximum recursion limit (' + stack.stepCount + ') reached.\n');
                }
            }
            else {
                // The first word was empty, quoted or prefixed with spaces, 
                // but was no macro nor command for sure. Bypass.
                result = new EvalResult(true, myContext.cmd + '\n', '');
            }
            return result;
        };
        /**
         * Resolves a single user command (single line or just a command).
         * @param stack stack to use
         * @returns evaluation result
         */
        MacroProcessor.prototype.resolveSingle = function (stack) {
            var result;
            if (!stack)
                throw new Error('Argument stack must not be null.');
            if (!stack.getCContext())
                throw new Error('Argument stack must not be empty.');
            if (stack.getCContext().isMacro()) {
                // Expand macro.
                result = this.expandMacro(stack);
            }
            else {
                // No '/' prefix or just a single '/', just bypass.
                result = new EvalResult(true, stack.getCCmd() + '\n', '');
            }
            return result;
        };
        /**
         * Function resolve() takes a user input and returns a
         * 3-tuple of: [alternative command, user message]
         * The user input may consist of multiple lines, because
         * of copy&paste. So we split the input into separate lines
         * and concatenate the result(s).
         * @param text single or multiline string to resolve
         * @returns evaluation result
         */
        MacroProcessor.prototype.resolve = function (text) {
            var result = new EvalResult(false, '', '');
            // Split text into lines. (no matter if LF or CRLF)
            var lines = text.split(/\r?\n/);
            for (var i = 0; i < lines.length; i++) {
                // resolve every single line and append results
                result.append(this.resolveSingle(new Stack(new EvaluationContext(lines[i]))));
            }
            return result;
        };
        // constants
        MacroProcessor.VERSION = '0.4';
        MacroProcessor.MACRO_KEY = '/';
        MacroProcessor.STORAGE_KEY_LIST = 'Macros.List';
        MacroProcessor.STORAGE_KEY_LISTVAR = 'Macros.ListVar';
        MacroProcessor.MAX_RECUR = 42;
        MacroProcessor.TF_SEPARATOR_TOKEN = '%;';
        return MacroProcessor;
    }());
    TMP.MacroProcessor = MacroProcessor;
})(TMP || (TMP = {}));
/// <reference path="macros.ts" />
/*
 * The tiny macro processor of Wunderland Client - HELP texts.
 *
 * Written in TypeScript and compiled to ECMAScript.
 *
 * Build: tsc --sourceMap macros__help.ts
 *
 */
var TMP;
(function (TMP) {
    var MacroHelp = /** @class */ (function () {
        // Constructor
        function MacroHelp(topic) {
            this.topic = '';
            this.topic = topic.trim().toLowerCase();
            if (this.topic.charAt(0) == TMP.MacroProcessor.MACRO_KEY)
                this.topic = topic.substr(1);
        }
        // Returns a help text for the given topic or at least a hint.
        MacroHelp.prototype.getHelp = function () {
            switch (this.topic) {
                case 'def':
                    return '\n' +
                        'Help on: /def\n' +
                        '\n' +
                        'Usage: /def [-m&lt;matching&gt;] [-t"&lt;pattern&gt;"] &lt;name&gt; = &lt;body&gt;\n' +
                        '\n' +
                        'Defines a named macro. The &lt;name&gt; can be anything, but must not ' +
                        'contain whitespaces. The &lt;body&gt; is the text to be executed as a user command. Multiple ' +
                        'commands can be separated by token \'%;\'. An optional trigger pattern may be defined to ' +
                        'automatically execute the body on a certain message. The optional matching type defines the ' +
                        'pattern style. Default is \'glob\' style. Simple macro without triggers:\n' +
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
                        'other macros, including itself, but recursion is limited to avoid eternal loops.\n\n' +
                        'See: /list, /undef, substitution, triggers\n';
                    break;
                case 'undef':
                    return '\n' +
                        'Help on: /undef\n' +
                        '\n' +
                        'Usage: /undef &lt;name&gt;\n' +
                        '\n' +
                        'Undefines a named macro. No options provided. It is the counterpart to /def. I have no ' +
                        'idea, why you would ever need it, but it exists. For you.\n\n' +
                        'See: /def, /list, substitution\n';
                    break;
                case 'list':
                    return '\n' +
                        'Help on: /list\n' +
                        '\n' +
                        'Usage: /list [pattern]\n' +
                        '\n' +
                        'Lists all currently defined macros, sorted alphabetically. If [pattern] is provided, only ' +
                        'macros with a matching name are listed.\n\n' +
                        'See: /def, /undef, substitution\n';
                    break;
                case 'trigger':
                case 'triggers': return '\n' +
                    'Help on: triggers\n' +
                    '\n' +
                    'Example 1: /def -msimple -t"Gast1 kommt an." greet1 kicher\n' +
                    '           Defines a simple trigger macro with name \'greet1\', which body will be\n' +
                    '           evaluated, whenever the client receives a matching line, like (e.g.):\n' +
                    '           Gast1 kommt an.\n' +
                    '           As a result the player will just giggle.\n\n' +
                    'Example 2: /def -mglob -t"(*) kommt an." greet2 winke %{P1}\n' +
                    '           Defines a glob-style trigger macro with name \'greet2\', which body will be\n' +
                    '           evaluated, whenever the client receives a matching line, like (e.g.):\n' +
                    '           Gast1 kommt an. (or) Twinsen kommt an. (or) Fuchur kommt an.\n' +
                    '           As a result the player will wave Gast1, Twinsen or Fuchur.\n\n' +
                    'Example 3: /def -mregexp -t"^(\w+) geht nach (\w+)." greet3 = teile %{P1} mit Viel Spass im %{P2}!\n' +
                    '           Defines a regexp-style trigger macro with name \'greet3\', which body will\n' +
                    '           be evaluated, whenever the client receives a matching line, like (e.g.):\n' +
                    '           Elvira geht nach Osten. (or) Fiona geht nach Norden.\n' +
                    '           As a result the player will tell Elvira to have much fun in the \'Osten\'.\n' +
                    '           or Fiona to have much fun in the \'Norden\'.\n\n' +
                    '\n' +
                    'More coming soon!\n\n' +
                    'See: /def, /undef, /list\n';
                case 'set':
                    return '\n' +
                        'Help on: /set\n' +
                        '\n' +
                        'Usage: /set &lt;name&gt;=&lt;value&gt;\n' +
                        '       /set [&lt;name&gt; [&lt;value&gt;]]\n' +
                        '\n' +
                        'Sets the value of a globale variable (first syntax) or displays the value of a global ' +
                        'variable, if no value is provided. If no value and no name is provided is provided, all ' +
                        'global variables will be listed.\n\n' +
                        'See: /listvar, /unset, /let, variables\n';
                    break;
                case 'unset':
                    return '\n' +
                        'Help on: /unset\n' +
                        '\n' +
                        'Usage: /unset &lt;name&gt;\n' +
                        '\n' +
                        'Removes the value of a globale variable.\n\n' +
                        'See: /listvar, /set, /let, variables\n';
                    break;
                case 'listvar':
                    return '\n' +
                        'Help on: /listvar\n' +
                        '\n' +
                        'Usage: /listvar [&lt;name&gt;]\n' +
                        '\n' +
                        'Lists global variables and displays their values. A glob pattern may be used to filter the ' +
                        'displayes variables.\n\n' +
                        'See: /set, /unset, /let, variables\n';
                    break;
                case 'let':
                    return '\n' +
                        'Help on: /let\n' +
                        '\n' +
                        'Usage: /let &lt;name&gt;=&lt;value&gt;\n' +
                        '       /let &lt;name&gt; &lt;value&gt;\n' +
                        '\n' +
                        'Assigns a value to a local variable, which exists only while another macro is evaluated ' +
                        'and in child evaluation contexts. So it may be used for temporary data, while macros are ' +
                        'cascaded. Local variables shadow global variables and local variables, which were defined ' +
                        'in a higher context.\n\n' +
                        'See: /listvar, /set, /unset, variables\n';
                    break;
                case 'variables':
                    return '\n' +
                        'Help on: variables\n' +
                        '\n' +
                        'There are global variables, special global variables, local variables and macro parameters. ' +
                        'Global variables may be defined by /set anytime and will be stored in the localStorage of ' +
                        'your browser. Local variables are defined with /let and exist only during macro evaluation. ' +
                        'Macro parameters may be used by substitution to pass arguments to macros. Special global ' +
                        'variables have default values and usually can only be set to predefined values.\n\n' +
                        'Special variables:\n\n' +
                        'borg=1\n' +
                        '    If set to 1, triggers are enabled, is set to 0 all triggers are disabled.\n\n' +
                        'matching=glob\n' +
                        '    Sets the default trigger matching style, when creating new triggers:\n' +
                        '    One of: \'simple\', \'glob\' (default) or \'regexp\'\n\n' +
                        'NOTE: Special global variables may be reserved in the future for special purpose settings.\n' +
                        'Export your client settings to save your custom macros and variables permanently!\n\n' +
                        'See: /listvar, /set, /unset, /let, substitution, triggers\n';
                    break;
                case 'substitution':
                    return '\n' +
                        'Help on: substitution\n' +
                        '\n' +
                        'Macros may use global or local variables or parameters for substitute portions of the macro ' +
                        'body. The substitution pattern has always the form (brackets are not optional!):\n\n' +
                        ' %{selector}\n\n' +
                        'The <i>selector</i> may be:\n' +
                        ' name          - the name of a global or local variable, e.g. %{foo}\n' +
                        ' #             - the the number of existing macro parameters\n' +
                        ' 0             - the name of the current evaluated macro\n' +
                        ' 1, 2, 3, etc. - positional macro parameters, e.g. %{1}\n' +
                        ' *             - selects all positional parameters except 0 (1 2 3 etc.)\n' +
                        ' Pn            - Result of the last successful RegExp or Glob subexpression,\n' +
                        '                 n is a positive number. %{P0} expands to the complete text\n' +
                        '                 matched, %{P1} matches the first parenthesised subexpression,\n' +
                        '                 %{P2} the second etc. If \'n\' exceeds the number of matched\n' +
                        '                 subexpressions, it expands to an empty string.\n' +
                        ' PL            - expands to the text left of matched text (%{P0}).\n' +
                        ' PR            - expands to the text left of matched text (%{P0}).\n' +
                        '\n' +
                        'More selectors may be available in the future.\n\n' +
                        'See: /listvar, /set, /unset, /let, variables\n';
                    break;
                default: return '\n' +
                    'Tiny Macro Processor V' + TMP.MacroProcessor.VERSION + '\n' +
                    '~~~~~~~~~~~~~~~~~~~~~~~~~~\n' +
                    'The macro processor is an optional and experimental component of the Wunderland ' +
                    'web-client and provides tools to define and execute macros. These macros ' +
                    'may define scripts to do complex or repetetive tasks. One typical use case is ' +
                    'the definition of long routes to walk through the MUD. The number of commands per ' +
                    'macro and the number of recursion steps is limited. Any feature may change anytime ' +
                    'and the processor may disappear completely in the future, without further notice.\n' +
                    '\n' +
                    'Additional help pages: /help &lt;command/topic &gt; (without \'/\')\n\n' +
                    'Commands:\n' +
                    ' /def     - define a named macro\n' +
                    ' /undef   - undefine a named macro\n' +
                    ' /list    - display a list of macros\n' +
                    ' /set     - set a global variable\n' +
                    ' /unset   - unset a global variable\n' +
                    ' /listvar - list all global variables, including special variables\n' +
                    ' /let     - set the value of a local variable\n\n' +
                    'Other topics:\n' +
                    ' variables    - \n' +
                    ' substitution - \n' +
                    ' triggers     - \n\n' +
                    'NOTE: The macros are stored in your browsers localStorage only. Export your client settings ' +
                    'to save them permanently!\n\n' +
                    'See: /def, /undef, /list, /set, /unset, /listvar, /let, variables, substitution, triggers\n';
            }
        };
        return MacroHelp;
    }());
    TMP.MacroHelp = MacroHelp;
})(TMP || (TMP = {}));
//# sourceMappingURL=macros.js.map