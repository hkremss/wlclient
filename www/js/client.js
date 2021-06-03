/*
 * The Wunderland Client.
 *
 * Written in TypeScript and compiled to ECMAScript.
 *
 * Build: tsc --sourceMap client.ts
 *
 * Ideas:
 *  -
 */
var wlClient;
(function (wlClient) {
    var WLClient = /** @class */ (function () {
        function WLClient() {
            // Local echo setting.
            this.localEcho = false;
            // Handle window close
            this.isConnected = false;
            // Since ansi_up API 2.0 we need an instance of AnsiUp!
            this.ansi_up = null; //new AnsiUp;
            // Init MenuHandler
            this.menuHandler = null;
            // Init GMCPHandler
            this.gmcpHandler = null;
            // Init macro processor
            this.macros = null; //new MacroProcessor;
            // micromodal = require('micromodal')
            this.micromodal = null; // MicroModal
            // ansiRegex = require('ansi-regex');
            this.ansiRegex = null;
            this.sock = null;
            // `pending` stores partial telnet negotiations that cross message boundaries
            this.pending = '';
            // reset to 0 on each WO/WILL TELOPT_TTYPE, see tty_neg_types below
            this.tty_neg_index = 0;
            // pwMode + pw store local input, if cmd is in 'password' mode
            this.pwMode = false;
            // input-history
            this.inputHistoryIdx = -1; // current position in history array
            this.inputHistoryMax = 20; // max size of history
            this.inputHistoryTmp = ''; // remember current input
            this.inputHistory = []; // the history array
            // Try loading buttons first, see loadSettings()
            this.cmdButtons = {};
        }
        // Called on connection
        WLClient.prototype.connected = function () {
            this.isConnected = true;
            console.log('Connected.');
        };
        WLClient.prototype.disconnected = function () {
            this.isConnected = false;
            console.log('Disconnected.');
        };
        // Initial command buttons.
        WLClient.prototype.initDefaultCmdButtons = function () {
            return {
                "cmdbt8": { type: 1, order: 0, cmds: { '1': { 'label': 'wer', 'cmd': 'wer', 'send': true } } },
                "cmdbt7": { type: 1, order: 1, cmds: { '1': { 'label': 'schau', 'cmd': 'schau', 'send': true } } },
                "cmdbt6": { type: 1, order: 2, cmds: { '1': { 'label': 'inventar', 'cmd': 'inv', 'send': true } } },
                "cmdbt5": { type: 1, order: 3, cmds: { '1': { 'label': 'info', 'cmd': 'info', 'send': true } } },
                "cmdbt4": { type: 1, order: 4, cmds: { '1': { 'label': '- ...', 'cmd': '- ', 'send': false } } },
                "cmdbt3": { type: 1, order: 5, cmds: { '1': { 'label': 'oben', 'cmd': 'oben', 'send': true } } },
                "cmdbt2": { type: 4, order: 6, cmds: { '1': { 'label': 'n', 'cmd': 'n', 'send': true }, '2': { 'label': 's', 'cmd': 's', 'send': true }, '3': { 'label': 'o', 'cmd': 'o', 'send': true }, '4': { 'label': 'w', 'cmd': 'w', 'send': true }, } },
                "cmdbt1": { type: 1, order: 7, cmds: { '1': { 'label': 'unten', 'cmd': 'unten', 'send': true } } },
            };
        };
        ;
        // get all labels of the command button(s)
        WLClient.prototype.getCmdButtonLabels = function (buttonId) {
            var primaryId = buttonId.split('.')[0];
            if (this.cmdButtons[primaryId] != null) {
                return Object.keys(this.cmdButtons[primaryId].cmds).map(function (cmdId) {
                    return this.cmdButtons[primaryId].cmds[cmdId].label;
                }.bind(this));
            }
            else {
                return [];
            }
        };
        // remove button from model
        WLClient.prototype.removeCmdButton = function (buttonId) {
            var primaryId = buttonId.split('.')[0];
            var secondaryId = buttonId.split('.')[1];
            if (this.cmdButtons[primaryId] != null && this.cmdButtons[primaryId].cmds[secondaryId] != null) {
                //delete cmdButtons[primaryId].cmds[secondaryId];
                //if (Object.keys(cmdButtons[primaryId].cmds).length==0) {
                delete this.cmdButtons[primaryId];
                //}
                this.saveSettings();
            }
            else {
                console.log('Unknown button to remove: ' + buttonId + '');
            }
        };
        // edit button in model
        WLClient.prototype.editCmdButton = function (buttonId, label, cmd, send) {
            var primaryId = buttonId.split('.')[0];
            var secondaryId = buttonId.split('.')[1];
            if (this.cmdButtons[primaryId] != null && this.cmdButtons[primaryId].cmds[secondaryId] != null) {
                this.cmdButtons[primaryId].cmds[secondaryId].label = label;
                this.cmdButtons[primaryId].cmds[secondaryId].cmd = cmd;
                this.cmdButtons[primaryId].cmds[secondaryId].send = send;
                this.saveSettings();
            }
            else {
                console.log('Unknown button to edit: ' + buttonId + ' (' + label + ',' + cmd + ',' + send + ')');
            }
        };
        // get the highest (last) order value from cmdButtons
        WLClient.prototype.getHighestCmdButtonOrderValue = function () {
            var highest = 0;
            // find free id and add new button at end of the list.
            var cmdIds = Object.keys(this.cmdButtons);
            for (var i = 0; i < cmdIds.length; i++) {
                var tmpOrder = this.cmdButtons[cmdIds[i]].order;
                if (tmpOrder > highest)
                    highest = tmpOrder;
            }
            return highest;
        };
        // get a new order number, which can be inserted 'before' previousCmdButtonId
        WLClient.prototype.getInsertableCmdButtonOrderValue = function (followingCmdButtonId) {
            var _this = this;
            var primaryId = followingCmdButtonId.split('.')[0];
            var insOrder = -1;
            // find free id and add new button at end of the list. Sort it first, ascending.
            var cmdIds = Object.keys(this.cmdButtons).sort(function (c1, c2) { return _this.cmdButtons[c1].order - _this.cmdButtons[c2].order; });
            for (var i = 0; i < cmdIds.length; i++) {
                if (cmdIds[i] == primaryId) {
                    // found!
                    insOrder = this.cmdButtons[primaryId].order;
                }
                // increment order number of all following buttons
                if (insOrder >= 0)
                    this.cmdButtons[cmdIds[i]].order++;
            }
            // make sure, its never below 0
            if (insOrder < 0)
                insOrder = 0;
            return insOrder;
        };
        // add 1-cmd button in model
        WLClient.prototype.add1CmdButton = function (selectedButtonId) {
            var num = 1;
            // find free id and add new button at end of the list.
            while (this.cmdButtons['cmdbt' + num] != null)
                num++;
            var newId = 'cmdbt' + num;
            var order = 1000;
            if (selectedButtonId == 'settings') {
                // easy case append button to the list
                order = this.getHighestCmdButtonOrderValue() + 1;
            }
            else {
                // insert new button(s) before selectedButtonId
                order = this.getInsertableCmdButtonOrderValue(selectedButtonId);
            }
            this.cmdButtons[newId] = {
                type: 1,
                order: order,
                cmds: { '1': { 'label': 'neu', 'cmd': 'neu', 'send': true } }
            };
            this.saveSettings();
        };
        // add 4-cmd button in model
        WLClient.prototype.add4CmdButton = function (selectedButtonId) {
            var num = 1;
            // find free id and add new button at end of the list.
            while (this.cmdButtons['cmdbt' + num] != null)
                num++;
            var newId = 'cmdbt' + num;
            var order = 1000;
            if (selectedButtonId == 'settings') {
                // easy case append button to the list
                order = this.getHighestCmdButtonOrderValue() + 1;
            }
            else {
                // insert new button(s) before selectedButtonId
                order = this.getInsertableCmdButtonOrderValue(selectedButtonId);
            }
            this.cmdButtons[newId] = {
                type: 4,
                order: order,
                cmds: {
                    '1': { 'label': 'n', 'cmd': 'n', 'send': true },
                    '2': { 'label': 's', 'cmd': 's', 'send': true },
                    '3': { 'label': 'o', 'cmd': 'o', 'send': true },
                    '4': { 'label': 'w', 'cmd': 'w', 'send': true },
                }
            };
            this.saveSettings();
        };
        /// Split the query-string into key-value pairs and return a map.
        // Stolen from: http://stackoverflow.com/questions/2090551/parse-query-string-in-javascript
        WLClient.prototype.parseQuery = function (qstr) {
            var query = {};
            var a = qstr.substr(1).split('&');
            for (var i = 0; i < a.length; i++) {
                var b = a[i].split('=');
                query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
            }
            return query;
        };
        // Handle image loading errors here!
        WLClient.prototype.bildstoerung = function () {
            var img_a = document.querySelector('a#room_image_a');
            var img = document.querySelector('img#room_image');
            var brokenPath = img.getAttribute('src');
            if (brokenPath != 'img/aaa_no_signal.jpg') {
                img.setAttribute('src', 'img/aaa_no_signal.jpg');
                img.setAttribute('alt', 'Bildstoerung: ' + brokenPath + ' is broken!');
                img_a.setAttribute('href', 'img/aaa_no_signal.jpg');
                img_a.setAttribute('data-title', 'Bildstoerung: ' + brokenPath + ' is broken!');
            }
        };
        // Write something to the screen, scroll to bottom and limit number of rows.
        WLClient.prototype.writeToScreen = function (str) {
            if (str && str.length > 0) {
                var out = document.getElementById('out');
                out.insertAdjacentHTML('beforeend', str);
                out.scrollTop = out.scrollHeight;
                while (out.childNodes.length > 1000)
                    out.childNodes[0].remove();
            }
        };
        // Do telnet negotiations for 'buf' and return the plain text only.
        WLClient.prototype.doTelnetNegotions = function (sock, buf) {
            // TELNET protocol
            var IAC = '\xff'; // 255
            var DONT = '\xfe'; // 254
            var DO = '\xfd'; // 253
            var WONT = '\xfc'; // 252
            var WILL = '\xfb'; // 251
            var SB = '\xfa'; // 250 sub negotiation
            var SE = '\xf0'; // 240 end sub negotiation
            var EOR = '\xef'; // 239 End Of Record
            // TELNET options (WL relevant)
            var TELOPT_ECHO = '\x01'; //  1
            var TELOPT_STATUS = '\x05'; //  5
            var TELOPT_TTYPE = '\x18'; // 24
            var TELOPT_EOR = '\x19'; // 25
            var TELOPT_TSPEED = '\x20'; // 32
            var TELOPT_LINEMODE = '\x22'; // 34
            var TELOPT_XDISPLOC = '\x23'; // 35
            var TELOPT_ENVIRON = '\x24'; // 36
            var TELOPT_CHARSET = '\x2a'; // 42
            var TELOPT_GMCP = '\xc9'; // 201 -> http://www.gammon.com.au/gmcp
            // sub-option qualifiers
            var TELQUAL_IS = '\x00'; // IS option
            var TELQUAL_SEND = '\x01'; // SEND option
            // TTYPE negotiaion
            var tty_neg_types = ['dumb', 'ansi', 'xterm', 'xterm-256color', 'xterm-direct'];
            // receive buffer
            var strippedBuf = '';
            buf = this.pending + buf;
            this.pending = '';
            var len = buf.length;
            if (len > 0) {
                var oldIacIdx = 0;
                var newIacIdx = 0;
                while ((newIacIdx = buf.indexOf(IAC, oldIacIdx)) >= 0) {
                    // Copy first part of strippedBuf and skip IACs
                    strippedBuf += buf.substr(oldIacIdx, newIacIdx - oldIacIdx);
                    // IAC+EOR is only 2 bytes 
                    if (newIacIdx < len && buf[newIacIdx + 1] == EOR) {
                        var startOfPrompt = strippedBuf.lastIndexOf('\n', len);
                        var prmpt = strippedBuf.substr(startOfPrompt + 1);
                        if (prmpt.length > 0) {
                            // truncate strippedBuf
                            if (startOfPrompt < 0)
                                strippedBuf = '';
                            else
                                strippedBuf = strippedBuf.substr(0, startOfPrompt + 1);
                            //console.log('PRMPT [' + prmpt+']\n');
                            this.setPrompt(this.ansi_up.ansi_to_html(prmpt));
                        }
                        // Skip the IAC+EOR in the buffer
                        oldIacIdx = newIacIdx + 2;
                    }
                    // Everything should be (at least) 3 bytes long.
                    else if (newIacIdx + 2 >= len) {
                        // save incomplete telnet negotiation for later processing
                        this.pending = buf.substr(newIacIdx);
                        oldIacIdx = len;
                    }
                    // do all complete messages
                    else {
                        switch (buf[newIacIdx + 1]) {
                            case DONT:
                                oldIacIdx = newIacIdx + 3;
                                break;
                            case DO:
                                switch (buf[newIacIdx + 2]) {
                                    // we are 'xterm' and will use this (see SB below)
                                    case TELOPT_TTYPE:
                                        if (sock)
                                            sock.emit('stream', IAC + WILL + TELOPT_TTYPE);
                                        this.tty_neg_index = 0; // reset
                                        break;
                                    // not yet
                                    //case TELOPT_CHARSET:
                                    //  if(sock) sock.emit('stream', IAC+WILL+TELOPT_CHARSET);
                                    //  break;
                                    case TELOPT_TSPEED:
                                    case TELOPT_LINEMODE:
                                    case TELOPT_XDISPLOC:
                                    case TELOPT_ENVIRON:
                                    default:
                                        // we WONT do anything else. So just reply all DO by WONT
                                        if (sock)
                                            sock.emit('stream', IAC + WONT + buf.substr(newIacIdx + 2, 1));
                                        break;
                                }
                                oldIacIdx = newIacIdx + 3;
                                break;
                            case WONT:
                                switch (buf[newIacIdx + 2]) {
                                    case TELOPT_ECHO:
                                        // enable local echo!
                                        this.leavePWMode();
                                        if (sock)
                                            sock.emit('stream', IAC + DONT + TELOPT_ECHO);
                                        break;
                                    default:
                                        // if the server WONT to do something anymore, tell it, this is fine.
                                        if (sock)
                                            sock.emit('stream', IAC + DONT + buf.substr(newIacIdx + 2, 1));
                                        break;
                                }
                                oldIacIdx = newIacIdx + 3;
                                break;
                            case WILL:
                                switch (buf[newIacIdx + 2]) {
                                    case TELOPT_EOR:
                                        // No EOR support!
                                        //if(sock) sock.emit('stream', IAC+DONT+TELOPT_EOR);
                                        if (sock)
                                            sock.emit('stream', IAC + DO + TELOPT_EOR);
                                        break;
                                    case TELOPT_ECHO:
                                        // disable local echo!
                                        this.enterPWMode();
                                        if (sock)
                                            sock.emit('stream', IAC + DO + TELOPT_ECHO);
                                        break;
                                    case TELOPT_GMCP:
                                        // use GMCP
                                        if (sock)
                                            sock.emit('stream', IAC + DO + TELOPT_GMCP);
                                        // send Hello immediately
                                        if (sock)
                                            sock.emit('stream', IAC + SB + TELOPT_GMCP + this.gmcpHandler.getGMCPHello() + IAC + SE);
                                        break;
                                    default:
                                        // we DONT accept anything else. So just reply all WILL by DONT
                                        if (sock)
                                            sock.emit('stream', IAC + DONT + buf.substr(newIacIdx + 2, 1));
                                        break;
                                }
                                oldIacIdx = newIacIdx + 3;
                                break;
                            case SB:
                                var endSubNegIdx = buf.indexOf(SE, newIacIdx + 2);
                                if (endSubNegIdx < 0) {
                                    // save incomplete telnet negotiation for later processing
                                    this.pending = buf.substr(newIacIdx);
                                    oldIacIdx = len;
                                }
                                else {
                                    if (buf[newIacIdx + 2] == TELOPT_GMCP) {
                                        // Received GMCP message!
                                        this.gmcpHandler.doGMCPReceive(this, sock, buf.substr(newIacIdx + 3, endSubNegIdx - (newIacIdx + 4)));
                                    }
                                    else if (buf[newIacIdx + 2] == TELOPT_TTYPE && buf[newIacIdx + 3] == TELQUAL_SEND) {
                                        // Server wants us to send TTYPE, we count up tty_neg_index until it's end
                                        if (sock)
                                            sock.emit('stream', IAC + SB + TELOPT_TTYPE + TELQUAL_IS + tty_neg_types[this.tty_neg_index] + IAC + SE);
                                        if (this.tty_neg_index + 1 < tty_neg_types.length)
                                            this.tty_neg_index = this.tty_neg_index + 1;
                                    }
                                    else {
                                        console.log('Don\'t understand: [IAC+SB+(' + buf.charCodeAt(newIacIdx + 2) + ')...]');
                                    }
                                    oldIacIdx = endSubNegIdx + 1;
                                }
                                break;
                            default:
                                console.log('Don\'t understand: [IAC+(' + buf.charCodeAt(newIacIdx + 1) + ')+(' + buf.charCodeAt(newIacIdx + 2) + ')...]\n');
                                oldIacIdx = newIacIdx + 3;
                                break;
                        }
                    }
                }
                // if there something left (or no IAC at all), append rest of buffer
                if (oldIacIdx + 1 < len)
                    strippedBuf += buf.substr(oldIacIdx, len - oldIacIdx);
            }
            return strippedBuf;
        };
        // Do ANSI conversion, before writing to screen.
        WLClient.prototype.writeServerData = function (buf) {
            var line = this.ansi_up.ansi_to_html(buf);
            this.writeToScreen(line);
        };
        // Adjust the UI layout.
        WLClient.prototype.adjustLayout = function () {
            var thePage = document.getElementById('page');
            var theOut = document.getElementById('out');
            var theInfo = document.getElementById('info');
            var theIn = document.getElementById('in');
            var page_width = thePage.clientWidth;
            var page_height = thePage.clientHeight;
            var info_width = theInfo.clientWidth;
            /* update input div width */
            theIn.style.width = (page_width - (info_width + 6)) + 'px';
            /* update output div size */
            var in_outerheight = theIn.clientHeight;
            theOut.style.width = (page_width - (info_width + 6)) + 'px';
            theOut.style.height = (page_height - in_outerheight - 10) + 'px';
            /* scroll to bottom, important for mobile and virtual keyboard */
            theOut.scrollTo(0, theOut.scrollHeight);
        };
        // Save settings to localStorage.
        WLClient.prototype.saveSettings = function () {
            localStorage.setItem('Client.Setting.LocalEcho', JSON.stringify(this.localEcho));
            localStorage.setItem('Client.Setting.CmdButtons', JSON.stringify(this.cmdButtons));
        };
        // Re-/Load settings from localStorage.
        WLClient.prototype.loadSettings = function () {
            // Macro Processor re-/load
            this.macros.reloadSettings();
            // Re-/load other client settings.
            var localEchoSetting = localStorage.getItem('Client.Setting.LocalEcho');
            if (localEchoSetting) {
                try {
                    this.localEcho = JSON.parse(localEchoSetting);
                }
                catch (error) {
                    this.writeToScreen('' + error.name + ' beim Verarbeiten der LocalEcho Einstellung: ' + error.message + '\n');
                    this.localEcho = false;
                }
            }
            else {
                console.log('Verwende Standard-Einstellungen für LocalEcho.');
                this.localEcho = false;
            }
            var cmdButtonsSetting = localStorage.getItem('Client.Setting.CmdButtons');
            if (cmdButtonsSetting) {
                try {
                    this.cmdButtons = JSON.parse(cmdButtonsSetting);
                }
                catch (error) {
                    this.writeToScreen('' + error.name + ' beim Verarbeiten der CmdButtons Einstellungen: ' + error.message + '\n');
                    this.cmdButtons = this.initDefaultCmdButtons();
                }
            }
            else {
                console.log('Verwende Standard-Einstellungen für CmdButtons.');
                this.cmdButtons = this.initDefaultCmdButtons();
            }
            // Refresh UI
            document.querySelector('button#localecho').innerHTML = 'Local Echo: ' + (this.localEcho == true ? 'an' : 'aus');
        };
        // Maybe the user wants other colors? Here we go.
        WLClient.prototype.processQueryParams = function () {
            var queryParams = this.parseQuery(document.location.search);
            var debugGMCP = queryParams['debug'];
            if (debugGMCP == 'true')
                this.gmcpHandler.debug_GMCP = true;
            var bgColor = queryParams['bg'];
            if (bgColor != null) {
                document.body.style.backgroundColor = '#' + bgColor;
            }
            var fgColor = queryParams['fg'];
            if (fgColor != null) {
                document.body.style.color = '#' + fgColor;
            }
            var infoBgColor = queryParams['ibg'];
            if (infoBgColor != null) {
                document.querySelector('div#info').style.backgroundColor = '#' + infoBgColor;
            }
            var infoFgColor = queryParams['ifg'];
            if (infoFgColor != null) {
                document.querySelector('div#info').style.color = '#' + infoFgColor;
                document.querySelector('div#info').style.borderColor = '#' + infoFgColor;
            }
            var infoBorderColor = queryParams['ibc'];
            if (infoBorderColor != null) {
                document.querySelector('div#info').style.borderColor = '#' + infoBorderColor;
            }
            var infoPanel = queryParams['infopanel'];
            if (infoPanel == null || infoPanel != 'hidden')
                document.querySelector('div#info').style.visibility = 'visible';
            else
                document.querySelector('div#info').style.visibility = 'hidden';
            console.log('URL-Paramters for infoPanel = ' + infoPanel);
        };
        // Popup the cookie warning.
        WLClient.prototype.doCookiePopup = function () {
            if (!document.cookie.split('; ').find(function (row) { return row.startsWith('didAcceptCookies'); })) {
                document.querySelector('.cookie-bar').style.display = 'inline-block';
            }
        };
        // Called whenever the user closes the cookie warning.
        WLClient.prototype.doCookieAccept = function () {
            var cookieDate = new Date();
            cookieDate.setTime(new Date().getTime() + 2592000000); // 30 days in ms
            document.cookie = "didAcceptCookies=true; path=/; expires=" + cookieDate.toUTCString();
        };
        // Import settings from local file
        WLClient.prototype.importSettings = function (event) {
            // Some tricks required here, to open local files. Most of it comes from here:
            // https://stackoverflow.com/questions/3582671/how-to-open-a-local-disk-file-with-javascript
            // What happens: We have an invisible input element in the document (importButtonHiddenInput),
            // which we must use as tool to open a file selection dialog. So we attach a file read handler
            // on this element and emit a 'click' event. 
            var hiddenInputElement = document.getElementById('importButtonHiddenInput');
            hiddenInputElement.onchange = this.uploadSettingsFile.bind(this);
            hiddenInputElement.click();
        };
        // Helper for importSettings()
        WLClient.prototype.uploadSettingsFile = function (e) {
            var file = e.target.files[0];
            if (!file)
                return;
            var reader = new FileReader();
            reader.onload = function (e) {
                var settingsStr = e.target.result;
                if (settingsStr && settingsStr.length > 0) {
                    var settings;
                    try {
                        settings = JSON.parse(settingsStr);
                    }
                    catch (e) {
                        this.writeToScreen('' + e.name + ': ' + e.message + '\n');
                    }
                    if (settings && Object.keys(settings).length > 0) {
                        if (settings['#VERSION'] == 1) {
                            // Remove all existing Client.* and Macros.* keys.
                            for (var i = 0; i < localStorage.length; i++) {
                                var key = localStorage.key(i);
                                if (key.substr(0, 7) == 'Client.' || key.substr(0, 7) == 'Macros.') {
                                    localStorage.removeItem(key);
                                }
                            }
                            // Restore keys from imported file.
                            var keys = Object.keys(settings);
                            for (var i = 0; i < keys.length; i++) {
                                var key = keys[i];
                                if (key != '#VERSION') {
                                    localStorage.setItem(key, settings[key]);
                                }
                            }
                            this.writeToScreen('Einstellungen (V' + settings['#VERSION'] + ', #' + (keys.length - 1) + ') importiert.\n');
                            this.loadSettings(); // to refresh UI
                        }
                        else {
                            this.writeToScreen('Einstellungen haben falsche Version.\n');
                        }
                    }
                    else {
                        this.writeToScreen('Einstellungen leer.\n');
                    }
                }
                else {
                    this.writeToScreen('Einstellungen konnten nicht importiert werden.\n');
                }
                this.setFocusToInput();
            }.bind(this);
            reader.readAsText(file);
        };
        // Export settings to local file
        WLClient.prototype.exportSettings = function (event) {
            // Some tricks required here, to open local files. Most of it comes from here:
            // https://ourcodeworld.com/articles/read/189/how-to-create-a-file-and-generate-a-download-with-javascript-in-the-browser-without-a-server
            // What happens: We have an invisible anchor element in the dockument (exportButtonHiddenAnchor),
            // which we must use as tool to open a file download dialog. So we attach our file data on this 
            // element and emit a 'click' event. 
            var hiddenAnchorElement = document.getElementById('exportButtonHiddenAnchor');
            var settings = { '#VERSION': 1 };
            for (var i = 0; i < localStorage.length; i++) {
                var key = localStorage.key(i);
                if (key.substr(0, 7) == 'Client.' || key.substr(0, 7) == 'Macros.') {
                    settings[key] = localStorage.getItem(key);
                }
            }
            var settingsStr = JSON.stringify(settings);
            hiddenAnchorElement.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(settingsStr));
            hiddenAnchorElement.click();
            this.writeToScreen('Einstellungen (V' + settings['#VERSION'] + ', #' + (Object.keys(settings).length - 1) + ') exportiert.\n');
            this.setFocusToInput();
        };
        // Call to enter into pw mode.
        WLClient.prototype.enterPWMode = function () {
            this.pwMode = true;
            this.menuHandler.closeAllDropDowns();
            document.getElementById('cmd').style.display = 'none'; // hide
            document.querySelector('.dropbtn').style.display = 'none'; // hide
            document.getElementById('pwd').style.display = 'block'; // show
            this.setFocusToInput();
        };
        // Call to leave pw mode.
        WLClient.prototype.leavePWMode = function () {
            this.pwMode = false;
            document.getElementById('pwd').style.display = 'none'; // hide
            document.querySelector('.dropbtn').style.display = 'block'; // show
            document.getElementById('cmd').style.display = 'block'; // show
            this.setFocusToInput();
        };
        // Give the focus to the input field.
        WLClient.prototype.setFocusToInput = function () {
            if (this.pwMode)
                document.getElementById('pwd').focus();
            else
                document.getElementById('cmd').focus();
        };
        // Set the content of the input field.
        WLClient.prototype.setInput = function (cmd) {
            if (this.pwMode)
                document.getElementById('pwd').value = cmd;
            else
                document.getElementById('cmd').value = cmd;
        };
        // Set the prompt value.
        WLClient.prototype.setPrompt = function (prompt) {
            document.getElementById('prompt').innerHTML = prompt;
        };
        // Called, whenever a key is pressed in the window. We'd like to treat
        // everything as input to the client, but this would prevent copy&paste 
        // shortcuts or other special keys from working. So we try to skip these
        // and only care about the rest.
        WLClient.prototype.handleKeyDown = function (event) {
            // if a modal dialog is shown, don't intercept anything.
            if (document.querySelector('.modal.is-open') != null)
                return;
            if (!this.pwMode) {
                // If macro processor handles the key, don't continue.
                var result = this.macros.keyTrigger(event);
                var doSend = result.send;
                var msg = result.message;
                if (doSend) {
                    var cmd = result.cmd;
                    // Append a LF, if the last character is not a LF yet.
                    if (cmd.length == 0 || cmd.charAt(cmd.length - 1) != '\n')
                        cmd += '\n';
                    this.send(cmd, this.pwMode);
                    event.preventDefault();
                    return true;
                }
                // If there is nothing to send, but the input contains '/def key_', append the 
                // pressed named key now as a convenience function.
                else {
                    var namedKey = this.macros.getNamedKey(event);
                    if (namedKey.length > 0) {
                        var cmd_1 = document.getElementById('cmd');
                        if (cmd_1.value && cmd_1.value.substr(0, 4).toLowerCase() == '/def' && cmd_1.value.substr(cmd_1.value.length - 4) == 'key_') {
                            cmd_1.value += (namedKey.substr(4) + ' = ');
                            event.preventDefault();
                            return true;
                        }
                    }
                }
                if (msg.length > 0)
                    this.writeToScreen(msg);
            }
            // Don't intercept Ctrl/Cmd + C  for copy
            if (event.key == 'c' && (event.ctrlKey || event.metaKey))
                return true;
            // Don't intercept control/meta/function keys
            if ([
                'CapsLock',
                'Shift',
                'Tab',
                'Escape',
                'Control',
                'Meta',
                'Pause',
                'Alt',
                'PageUp', 'PageDown',
                'Home', 'End', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowUp',
                'Insert',
                'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12', 'F13', 'F14', 'F15', 'F16', 'F17', 'F18', 'F19', 'F20',
                'NumLock', 'ScrollLock' /* Num Lock, Scroll Lock */
            ].indexOf(event.key) != -1)
                return true;
            // Everything else is supposed to be input, so focus to the right place.
            this.setFocusToInput();
            return true;
        };
        // Get user input from UI elements (either cmd or pwd),
        // add it to the history and call send(). See above.
        WLClient.prototype.sendInput = function () {
            var elem = (this.pwMode === true ? document.getElementById('pwd') : document.getElementById('cmd'));
            var cmd = elem.value;
            // Push this line to the history, if it's not a pwd
            if (cmd.length > 0 && this.inputHistory.indexOf(cmd) != 0) {
                // add cmd to history, if it's not a password
                if (!this.pwMode)
                    this.inputHistory.unshift(cmd);
                // limit length of history
                if (this.inputHistory.length > this.inputHistoryMax)
                    this.inputHistory.pop();
            }
            this.inputHistoryIdx = -1;
            // The MacroProcessor may not send anything.
            var doSend = true;
            // Macro handling
            if (!this.pwMode) {
                var result = this.macros.resolve(cmd);
                doSend = result.send;
                cmd = result.cmd;
                var msg = result.message;
                if (msg.length > 0)
                    this.writeToScreen(msg);
            }
            // Append a LF, if the last character is not a LF yet.
            if (cmd.length == 0 || cmd.charAt(cmd.length - 1) != '\n')
                cmd += '\n';
            // Now send, if noone opted out.
            if (doSend)
                this.send(cmd, this.pwMode);
            // Clear input element
            elem.value = '';
            elem.dispatchEvent(new Event('change'));
        };
        // Create and configure the game command buttons from 'cmdButtons'.
        WLClient.prototype.configureCmdButtons = function () {
            var _this = this;
            // remove existing buttons first.
            var mainDropdown = document.querySelector('div#mainDropdown');
            while (mainDropdown.firstChild != null && mainDropdown.firstChild.id != 'settings') {
                mainDropdown.removeChild(mainDropdown.firstChild);
            }
            // sort button keys by order descending, because they are inserted bottom->top
            var buttonKeys = Object.keys(this.cmdButtons).sort(function (c1, c2) { return _this.cmdButtons[c2].order - _this.cmdButtons[c1].order; });
            // add new buttons.
            var newButton = null;
            for (var i = 0; i < buttonKeys.length; i++) {
                if (this.cmdButtons[buttonKeys[i]].type == 1) {
                    // <button id="who" class="drp">wer</button>;
                    newButton = document.createElement("button");
                    newButton.id = buttonKeys[i] + '.1';
                    newButton.className = 'drp';
                    newButton.addEventListener('contextmenu', this.menuHandler.cmdButtonContextFunction, false);
                    newButton.innerHTML = this.cmdButtons[buttonKeys[i]]['cmds']['1'].label;
                    newButton.dataset.send = this.cmdButtons[buttonKeys[i]]['cmds']['1'].send;
                    newButton.dataset.cmd = this.cmdButtons[buttonKeys[i]]['cmds']['1'].cmd;
                    newButton.addEventListener('click', function (e) {
                        var currentTarget = e.currentTarget;
                        this.setInput(currentTarget.dataset.cmd);
                        if (currentTarget.dataset.send == 'true')
                            this.sendInput();
                        this.setFocusToInput();
                    }.bind(this));
                }
                else if (this.cmdButtons[buttonKeys[i]].type == 4) {
                    // <div class="drp nohover" style="white-space: nowrap;overflow:hidden;">
                    //   <button id="north" class="drp drpssub41">n</button>
                    //   <button id="south" class="drp drpssub42">s</button>
                    //   <button id="east"  class="drp drpssub43">o</button>
                    //   <button id="west"  class="drp drpssub44">w</button>
                    // </div>
                    newButton = document.createElement("div");
                    newButton.className = 'drp nohover';
                    newButton.style.whiteSpace = 'nowrap';
                    newButton.style.overflow = 'hidden';
                    for (var k = 1; k <= 4; k++) {
                        // Sub button k (1-4)
                        var subButton = document.createElement("button");
                        subButton.id = buttonKeys[i] + '.' + k;
                        subButton.className = 'drp drpssub4' + k;
                        subButton.addEventListener('contextmenu', this.menuHandler.cmdButtonContextFunction, false);
                        subButton.innerHTML = this.cmdButtons[buttonKeys[i]]['cmds']['' + k].label;
                        subButton.dataset.send = this.cmdButtons[buttonKeys[i]]['cmds']['' + k].send;
                        subButton.dataset.cmd = this.cmdButtons[buttonKeys[i]]['cmds']['' + k].cmd;
                        newButton.insertBefore(subButton, null);
                        subButton.addEventListener('click', function (e) {
                            var currentTarget = e.currentTarget;
                            this.setInput(currentTarget.dataset.cmd);
                            if (currentTarget.dataset.send == 'true')
                                this.sendInput();
                            this.setFocusToInput();
                        }.bind(this));
                    }
                }
                mainDropdown.insertBefore(newButton, mainDropdown.firstChild);
            }
        };
        WLClient.prototype.cmdEditButtonClicked = function (params) {
            var ctxMenuButton = params.target;
            var cmdButtonId = ctxMenuButton.dataset.cmdButtonId;
            document.getElementById('cmdButtonEditModalDlg-saveButton').dataset.cmdButtonId = cmdButtonId;
            var cmdButton = document.getElementById(cmdButtonId);
            document.querySelector('input#buttonName').value = cmdButton.innerHTML;
            document.querySelector('input#buttonCmd').value = cmdButton.dataset.cmd;
            document.querySelector('input#buttonSend').checked = (cmdButton.dataset.send == 'true');
            this.micromodal.show('cmdButtonEditModalDlg');
        };
        WLClient.prototype.cmdRemoveButtonClicked = function (params) {
            var ctxMenuButton = params.currentTarget;
            var cmdButtonId = ctxMenuButton.dataset.cmdButtonId;
            if (cmdButtonId != "settings") {
                //var cmdButton = document.getElementById(cmdButtonId);
                var labels = this.getCmdButtonLabels(cmdButtonId);
                if (labels.length == 1) {
                    document.getElementById('yesnoModalDlg-title').innerHTML = 'Kommando-Button entfernen?';
                    document.getElementById('yesnoModalDlg-content').innerHTML = 'Willst Du den Button <br><div class="fakedrp">' + labels[0] + '</div><br> wirklich entfernen?';
                }
                else {
                    document.getElementById('yesnoModalDlg-title').innerHTML = 'Kommando-Buttons entfernen?';
                    var content = 'Willst Du die Button-Zeile<br><div class="fakedrp" style="white-space: nowrap;overflow:hidden;background-color:transparent;width: auto;">';
                    for (var i = 0; i < labels.length; i++) {
                        content += '<div class="fakedrp fakedrpssub4' + (i + 1) + '">' + labels[i] + '</div>';
                    }
                    content += '</div><br>wirklich entfernen?';
                    document.getElementById('yesnoModalDlg-content').innerHTML = content;
                }
                var yesButton = document.getElementById('yesnoModalDlg-yesButton');
                yesButton.dataset.cmdButtonId = cmdButtonId;
                yesButton.addEventListener('click', function name(params) {
                    var yesButton = params.target;
                    var cmdButtonId = yesButton.dataset.cmdButtonId;
                    this.removeCmdButton(cmdButtonId);
                    this.configureCmdButtons();
                    this.micromodal.close('yesnoModalDlg');
                }.bind(this));
                this.micromodal.show('yesnoModalDlg');
            }
            else {
                document.getElementById('infoModalDlg-title').innerHTML = 'Hinweis';
                document.getElementById('infoModalDlg-content').innerHTML = 'Der \'Optionen\' Button darf nicht entfernt werden.';
                this.micromodal.show('infoModalDlg');
            }
        };
        WLClient.prototype.cmdAdd1ButtonClicked = function (params) {
            var ctxMenuButton = params.target;
            var cmdButtonId = ctxMenuButton.dataset.cmdButtonId;
            this.add1CmdButton(cmdButtonId);
            this.configureCmdButtons();
        };
        WLClient.prototype.cmdAdd4ButtonClicked = function (params) {
            var ctxMenuButton = params.target;
            var cmdButtonId = ctxMenuButton.dataset.cmdButtonId;
            this.add4CmdButton(cmdButtonId);
            this.configureCmdButtons();
        };
        // Handle history (cursor buttons) and Input 'Enter'.
        WLClient.prototype.handleInputKeyDowns = function (e) {
            var target = e.currentTarget;
            // cursor up/down history
            // keypress event does not work in IE/Edge!
            switch (e.key) {
                case 'ArrowLeft':
                    // Do nothing
                    break;
                case 'ArrowUp':
                    // Go back in history
                    if (this.inputHistory.length >= 0 && (this.inputHistoryIdx + 1) < this.inputHistory.length) {
                        if (this.inputHistoryIdx < 0) {
                            this.inputHistoryTmp = target.value;
                        }
                        this.inputHistoryIdx++;
                        target.value = this.inputHistory[this.inputHistoryIdx];
                    }
                    break;
                case 'ArrowRight':
                    // Do nothing
                    break;
                case 'ArrowDown':
                    // Fo forward in history
                    if (this.inputHistoryIdx >= 0) {
                        this.inputHistoryIdx--;
                        if (this.inputHistoryIdx < 0) {
                            target.value = this.inputHistoryTmp;
                        }
                        else {
                            if (this.inputHistoryIdx < this.inputHistory.length) {
                                target.value = this.inputHistory[this.inputHistoryIdx];
                            }
                        }
                    }
                    break;
                case 'Enter':
                    e.preventDefault();
                    this.sendInput();
                    break;
            }
        };
        // Send a string to the remote server, echos it locally, if
        // localEcho is true. If isPassword is true, the string will
        // be masked as **** for local echo.
        WLClient.prototype.send = function (str, isPassword) {
            if (this.localEcho === true) {
                var viewStr;
                // if password, print stars into the console
                if (str.length > 0 && isPassword)
                    viewStr = new Array(str.length + 1).join('*');
                else
                    viewStr = str;
                this.writeToScreen(viewStr);
            }
            if (this.sock)
                this.sock.emit('stream', str);
        };
        // Remove all backspaces and chars 'in front', called recursively.
        // Will destroy ANSI-Codes in front, if there are more '\b' than real
        // chars. But this is something, which cannot be avoided effectively.
        // We must trust the responsibility of the creators.
        WLClient.prototype.handleBackspace = function (str) {
            var bs = str.indexOf('\b');
            if (bs >= 0) {
                var newstr = str.substr(0, (bs - 1)) + str.substr(bs + 1);
                return this.handleBackspace(newstr);
            }
            return str;
        };
        // Strip all ansi codes from string.
        WLClient.prototype.stripAnsi = function (str) {
            return str.replace(this.ansiRegex(), '');
        };
        // Called once from app.js, when all required modules are loaded.
        WLClient.prototype.startClient = function () {
            this.micromodal = require('micromodal');
            this.micromodal.init();
            this.ansiRegex = require('ansi-regex');
            var AnsiUp = require('ansi_up').default;
            //console.log('Found:' + AnsiUp);
            this.ansi_up = new AnsiUp;
            this.menuHandler = new wlClient.MenuHandler();
            this.gmcpHandler = new wlClient.GMCPHandler();
            // Init macro processor
            this.macros = new wlMacros.MacroProcessor();
            console.log(this.macros);
            var io = require("socket.io");
            //console.log('Found:' + io);
            // need to adjust layout after resize
            window.addEventListener('resize', this.adjustLayout);
            // don't close immediately, if connected
            window.addEventListener("beforeunload", function (e) {
                if (this.isConnected) {
                    // Cancel the event
                    e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
                    // Chrome requires returnValue to be set
                    e.returnValue = '';
                }
            }.bind(this));
            // Intercept all keys.
            window.addEventListener('keydown', this.handleKeyDown.bind(this));
            // if mouse is released and nothing is marked, set 
            // the focus to the input element(s)
            window.addEventListener('mouseup', function (e) {
                // if a modal dialog is shown, don't intercept anything.
                if (document.querySelector('.modal.is-open') != null)
                    return;
                if (!window.getSelection() || window.getSelection().toString().length == 0) {
                    this.setFocusToInput();
                }
            }.bind(this));
            // enable ANSI classes
            this.ansi_up.use_classes = true;
            // load settings from localStorage
            this.loadSettings();
            // adjust layout colors, etc.
            this.processQueryParams();
            // show help text
            var httpRequest = new XMLHttpRequest();
            httpRequest.onreadystatechange = function (event) {
                var req = event.currentTarget;
                if (req.readyState === XMLHttpRequest.DONE) {
                    if (req.responseText) {
                        var lines = req.responseText.split('\n');
                        for (var i = 0; i < lines.length; i++) {
                            this.writeToScreen(lines[i] + '<br/>');
                        }
                    }
                    else {
                        console.log('XMLHttpRequest.responseText is empty!');
                    }
                }
            }.bind(this);
            httpRequest.open('GET', 'help.txt');
            httpRequest.send();
            // handle image errors
            document.getElementById('room_image').addEventListener('error', this.bildstoerung.bind(this), false);
            // websocket
            // use page location and truncate off tailing /index.html
            var baseUri = location.pathname.substring(0, location.pathname.lastIndexOf("/"));
            this.sock = io.connect('', { path: baseUri + '/socket.io', closeOnBeforeunload: false });
            // see: https://github.com/socketio/socket.io-client/issues/1451 (with lower 'u')
            // We received something!
            this.sock.on('stream', function (buf) {
                // telnet negs first (telnet!)
                buf = this.doTelnetNegotions(this.sock, buf);
                // treat backspace (might be evil)
                buf = this.handleBackspace(buf);
                // write into UI (after ansi2html)
                this.writeServerData(buf);
                // finally strip ansi and feed triggers
                var result = this.macros.textTrigger(this.stripAnsi(buf));
                var doSend = result.send;
                var msg = result.message;
                if (doSend) {
                    var cmd = result.cmd;
                    // Append a LF, if the last character is not a LF yet.
                    if (cmd.length == 0 || cmd.charAt(cmd.length - 1) != '\n')
                        cmd += '\n';
                    this.send(cmd, this.pwMode);
                }
                if (msg.length > 0)
                    this.writeToScreen(msg);
            }.bind(this));
            this.sock.on('connected', function () {
                this.writeToScreen('Verbindung zum Wunderland hergestellt.\n');
                this.connected();
            }.bind(this));
            this.sock.on('disconnected', function () {
                this.writeToScreen('Verbindung zum Wunderland verloren. (Enter: neu verbinden)\n');
                this.leavePWMode();
                this.setPrompt('&gt; ');
                this.disconnected();
            }.bind(this));
            // make sure, contextmenu gets closed, if clicked somewhere else
            window.addEventListener('click', this.menuHandler.closeAllButtonContextFunction);
            // Show cookie popup
            document.getElementById('checkbox-cb').addEventListener('click', this.doCookieAccept.bind(this), false);
            this.doCookiePopup();
            // Initially it's always #cmd
            this.setFocusToInput();
            // Both cmd and pwd can be active input elements.
            document.getElementById('cmd').addEventListener('keydown', this.handleInputKeyDowns.bind(this), false);
            document.getElementById('pwd').addEventListener('keydown', this.handleInputKeyDowns.bind(this), false);
            // 'Enter'
            //document.querySelector('button#send').addEventListener('click', function(e) { sendInput(); setFocusToInput(); });
            // Configure 'settings' button.
            document.querySelector('button#settings').addEventListener('click', this.menuHandler.settingsDropDownFunction.bind(this), false);
            document.querySelector('button#settings').addEventListener('contextmenu', this.menuHandler.settingsButtonContextFunction.bind(this), false);
            // Create configurable command buttons.
            this.configureCmdButtons();
            // Register cmdButtons context menu actions
            document.getElementById('cmdEdit').addEventListener('click', this.cmdEditButtonClicked.bind(this), false);
            document.getElementById('cmdRemove').addEventListener('click', this.cmdRemoveButtonClicked.bind(this), false);
            document.getElementById('cmdAdd1').addEventListener('click', this.cmdAdd1ButtonClicked.bind(this), false);
            document.getElementById('cmdAdd4').addEventListener('click', this.cmdAdd4ButtonClicked.bind(this), false);
            document.getElementById('settingsAdd1').addEventListener('click', this.cmdAdd1ButtonClicked.bind(this), false);
            document.getElementById('settingsAdd4').addEventListener('click', this.cmdAdd4ButtonClicked.bind(this), false);
            // Register action for cmdButtonEditDlg dialog save button
            document.getElementById('cmdButtonEditModalDlg-saveButton').addEventListener('click', function name(params) {
                var dlgSaveButton = params.target;
                var cmdButtonId = dlgSaveButton.dataset.cmdButtonId;
                var cmdButton = document.getElementById(cmdButtonId);
                var label = document.querySelector('input#buttonName').value;
                cmdButton.innerHTML = label;
                var cmd = document.querySelector('input#buttonCmd').value;
                cmdButton.dataset.cmd = cmd;
                var send = document.querySelector('input#buttonSend').checked;
                cmdButton.dataset.send = send.toString();
                this.editCmdButton(cmdButtonId, label, cmd, send);
                this.micromodal.close('cmdButtonEditModalDlg');
            }.bind(this));
            // Settings
            // import settings
            document.querySelector('button#importButton').addEventListener('click', this.importSettings.bind(this), false);
            document.querySelector('button#exportButton').addEventListener('click', this.exportSettings.bind(this), false);
            // colors dialog
            document.querySelector('button#colors').addEventListener('click', function (e) {
                this.writeToScreen('Farbeinstellungen: (geht noch nicht)\n');
                this.setFocusToInput();
            }.bind(this), false);
            // toggle local echo
            document.querySelector('button#localecho').addEventListener('click', function (e) {
                this.localEcho = !this.localEcho;
                this.saveSettings();
                this.writeToScreen('Lokales Echo ist jetzt ' + (this.localEcho == true ? 'an' : 'aus') + '.\n');
                document.querySelector('button#localecho').innerHTML = 'Local Echo: ' + (this.localEcho == true ? 'an' : 'aus') + '';
                this.setFocusToInput();
            }.bind(this), false);
            // open help in new tab
            document.querySelector('button#helpButton').addEventListener('click', function (e) {
                window.open('/webclient/help.html', '_blank');
            }, false);
            // clear screen
            document.querySelector('button#clear').addEventListener('click', function (e) {
                var out = document.getElementById('out');
                while (out.firstChild)
                    out.removeChild(out.lastChild);
                this.setFocusToInput();
            }.bind(this), false);
            document.getElementById('out').click();
            setTimeout(function () {
                this.adjustLayout();
                this.send('\n', false);
            }.bind(this), 200);
        };
        return WLClient;
    }());
    wlClient.WLClient = WLClient;
})(wlClient || (wlClient = {}));
/// <reference path="client.ts" />
/*
 * The Wunderland Client - GMCP handler.
 *
 * Written in TypeScript and compiled to ECMAScript.
 *
 * Build: tsc --sourceMap client_gmcp.ts
 *
 */
var wlClient;
(function (wlClient) {
    var GMCPHandler = /** @class */ (function () {
        function GMCPHandler() {
            // Debug flags
            this.debug_GMCP = false;
            // remember these values, if player dies and becomes alive again
            this.living_room_image = '';
            this.living_room_name = '';
            // Modify this line, if you need a different base URL
            // or leave it blank to use a pure relative path.
            this.staticContentBase = '/webclient/';
            // micromodal = require('micromodal')
            this.micromodal = null; // MicroModal
            // the client instance
            this.clientInstance = null;
            // the current socket instance
            this.socketInstance = null;
            /****************************************************************************
            * Editor/Creator relevant code below                                        *
            ****************************************************************************/
            // We need to know the editor window globally.
            this.editorWindow = null;
            // Receive buffer for WL.File.List and WL.File.Transfer.
            // Format is: {"file/dir": { "type": (file/list), "lastUpdate": (millis), "chunks": {(offset): {"content":(list/string), "eof":(true/false)}}}}
            // - file/dir: a fqn of a file or directory list being transferred
            //   - type: either "file" or "list" (see content below)
            //   - lastUpdate: a timestamp in milliseconds of the last update (for cleanup)
            //   - chunks: contains partial messages, of the following format:
            //     - offset: the offset of the list, which defines the order of the chunks
            //       - content: either a data block string (for file) or a (json encoded) part of a list
            //       - eof: either true or false for the final message
            this.WLFileReceiveBuffer = {};
            // Stolen from: https://stackoverflow.com/questions/4068373/center-a-popup-window-on-screen
            // Credits to: http://www.xtf.dk/2011/08/center-new-popup-window-even-on.html
            this.popupCenter = function (_a) {
                var url = _a.url, title = _a.title, w = _a.w, h = _a.h;
                // Fixes dual-screen position                             Most browsers      Firefox
                var dualScreenLeft = window.screenLeft !== undefined ? window.screenLeft : window.screenX;
                var dualScreenTop = window.screenTop !== undefined ? window.screenTop : window.screenY;
                var width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
                var height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;
                var systemZoom = width / window.screen.availWidth;
                var left = (width - w) / 2 / systemZoom + dualScreenLeft;
                var top = (height - h) / 2 / systemZoom + dualScreenTop;
                var windowHandle = window.open(url, title, "\n                toolbar=no,\n                scrollbars=yes,\n                width=w / systemZoom,\n                height=h / systemZoom,\n                top=top,\n                left=left\n                ");
                return windowHandle;
            };
            this.micromodal = require('micromodal');
            this.micromodal.init();
            window.onunload = function (event) {
                // if editor is open (for wizards), update the client/socket
                if (this.editorWindow && !this.editorWindow.closed) {
                    this.editorWindow.updateClient(null, null);
                }
            }.bind(this);
            var cleanupWLFileReceiveBufferTimer = setInterval(this.CleanupWLFileReceiveBuffer.bind(this), 10000);
        }
        GMCPHandler.prototype.getSocket = function () {
            return this.socketInstance;
        };
        GMCPHandler.prototype.pad = function (str, pad_str, max) {
            str = str.toString();
            return str.length < max ? this.pad(pad_str.toString() + str, pad_str, max) : str;
        };
        GMCPHandler.prototype.numberWithDots = function (x) {
            return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
        };
        // New: GMCP support (Holger)
        GMCPHandler.prototype.getGMCPHello = function () {
            return 'Core.Hello { \"client\": \"WL@Web\", \"version\": \"1.3.0\" }';
        };
        GMCPHandler.prototype.doGMCPReceive = function (client, sock, data) {
            // always update client and socket instances
            this.clientInstance = client;
            this.socketInstance = sock;
            if (data.length > 0) {
                // handle JSON data here and update UI!
                if (this.debug_GMCP)
                    client.writeToScreen('GMCP: ' + data + '<br>');
                // if editor is open (for wizards), update window and client
                if (this.editorWindow && !this.editorWindow.closed) {
                    this.editorWindow.updateClient(window, this);
                }
                var module = data.split(' ', 1)[0];
                var payload = data.substr(module.length);
                switch (module) {
                    //////////////////////////////////////////////
                    // Game modules for all players.
                    case 'Core.Ping':
                        this.HandleGMCP_Core_Ping(sock, module, payload);
                        break;
                    case 'Core.Goodbye':
                        this.HandleGMCP_Core_Goodbye(sock, module, payload);
                        break;
                    case 'Char.Vitals':
                        this.HandleGMCP_Char_Vitals(sock, module, payload);
                        break;
                    case 'Room.Info':
                        this.HandleGMCP_Room_Info(sock, module, payload);
                        break;
                    //////////////////////////////////////////////
                    // Editor modules, for creators only.
                    case 'WL.File.List':
                        this.HandleGMCP_WL_File_List(sock, module, payload);
                        break;
                    case 'WL.File.Transfer':
                        this.HandleGMCP_WL_File_Transfer(sock, module, payload);
                        break;
                    //////////////////////////////////////////////
                    // Everything else.
                    default:
                        console.log('Unknown GMCP module: ' + module + '.');
                }
            }
        };
        // Handle GMCP Core.Ping
        GMCPHandler.prototype.HandleGMCP_Core_Ping = function (sock, module, payload) {
            // This should be the response of our ping, so ignore it!
        };
        // Handle GMCP Core.Goodbye
        GMCPHandler.prototype.HandleGMCP_Core_Goodbye = function (sock, module, payload) {
            // The server tells us, we will be disconnected now.
            var value = JSON.parse(payload);
            if (value != 0) {
                document.querySelector('span#room_name').textContent = value;
            }
            document.querySelector('img#room_image').setAttribute('src', this.staticContentBase + 'img/aaa_no_signal.jpg');
            document.querySelector('img#room_image').setAttribute('alt', 'Bildstoerung');
            document.querySelector('a#room_image_a').setAttribute('href', this.staticContentBase + 'img/aaa_no_signal.jpg');
            document.querySelector('a#room_image_a').setAttribute('data-title', 'Bildstoerung');
            // if editor is open (for wizards), update the client window/socket
            if (this.editorWindow && !this.editorWindow.closed) {
                this.editorWindow.updateClient(window, this);
            }
        };
        // Handle GMCP Char.Vitals
        GMCPHandler.prototype.HandleGMCP_Char_Vitals = function (sock, module, payload) {
            var values = JSON.parse(payload);
            // if dead
            if ('ghost' in values && values['ghost'] == '1') {
                var img_a = document.querySelector('a#room_image_a');
                var img = document.querySelector('img#room_image');
                img.setAttribute('src', this.staticContentBase + 'img/std/tod.jpg');
                img.setAttribute('alt', 'DU BIST TOT!');
                img_a.setAttribute('href', this.staticContentBase + 'img/std/tod.jpg');
                img_a.setAttribute('data-title', 'DU BIST TOT!');
                document.querySelector('span#room_name').textContent = 'DU BIST TOT!';
            }
            // if alive again
            if ('ghost' in values && values['ghost'] == '0') {
                var img_a = document.querySelector('a#room_image_a');
                var img = document.querySelector('img#room_image');
                if (this.living_room_image == '') {
                    img.setAttribute('src', this.staticContentBase + 'img/aaa_no_signal.jpg');
                    img.setAttribute('alt', 'Bildstoerung');
                    img_a.setAttribute('href', this.staticContentBase + 'img/aaa_no_signal.jpg');
                    img_a.setAttribute('data-title', 'Bildstoerung');
                }
                else {
                    img.setAttribute('src', this.staticContentBase + this.living_room_image);
                    img.setAttribute('alt', this.living_room_name);
                    img_a.setAttribute('href', this.staticContentBase + this.living_room_image);
                    img_a.setAttribute('data-title', this.living_room_name);
                }
                document.querySelector('span#room_name').textContent = this.living_room_name;
            }
            // XP
            if ('xp' in values) {
                document.querySelector('span#xp.info').textContent = this.numberWithDots(values['xp']);
            }
            // HP
            if ('hp' in values) {
                document.querySelector('span#hp.info').textContent = values['hp'];
            }
            if ('max_hp' in values) {
                document.querySelector('span#max_hp.info').textContent = values['max_hp'];
            }
            // SP
            if ('sp' in values) {
                document.querySelector('span#sp.info').textContent = values['sp'];
            }
            if ('max_sp' in values) {
                document.querySelector('span#max_sp.info').textContent = values['max_sp'];
            }
            // QP
            if ('questpoints' in values) {
                document.querySelector('span#questpoints.info').textContent = values['questpoints'];
            }
            if ('max_questpoints' in values) {
                document.querySelector('span#max_questpoints.info').textContent = values['max_questpoints'];
            }
            // Wimpy
            if ('wimpy' in values) {
                document.querySelector('span#wimpy.info').textContent = values['wimpy'];
            }
            if ('wimpy_dir' in values) {
                if (values['wimpy_dir'] == '' || values['wimpy_dir'] == '0')
                    document.querySelector('span#wimpy_dir.info').textContent = 'keine';
                else
                    document.querySelector('span#wimpy_dir.info').textContent = values['wimpy_dir'];
            }
            // INT, STR, DEX, CON
            if ('int' in values) {
                document.querySelector('span#int.info').textContent = values['int'];
            }
            if ('str' in values) {
                document.querySelector('span#str.info').textContent = values['str'];
            }
            if ('dex' in values) {
                document.querySelector('span#dex.info').textContent = values['dex'];
            }
            if ('con' in values) {
                document.querySelector('span#con.info').textContent = values['con'];
            }
        };
        // Handle GMCP Room.Info
        GMCPHandler.prototype.HandleGMCP_Room_Info = function (sock, module, payload) {
            var values = JSON.parse(payload);
            // name
            if ('name' in values) {
                this.living_room_name = values['name'];
                document.querySelector('span#room_name').textContent = this.living_room_name;
            }
            // image
            if ('image' in values) {
                this.living_room_image = values['image'];
                var img_a = document.querySelector('a#room_image_a');
                var img = document.querySelector('img#room_image');
                if (this.living_room_image == '') {
                    img.setAttribute('src', this.staticContentBase + 'img/aaa_no_signal.jpg');
                    img.setAttribute('alt', 'Bildstoerung');
                    img_a.setAttribute('href', this.staticContentBase + 'img/aaa_no_signal.jpg');
                    img_a.setAttribute('data-title', 'Bildstoerung');
                }
                else {
                    img.setAttribute('src', this.staticContentBase + this.living_room_image);
                    img_a.setAttribute('href', this.staticContentBase + this.living_room_image);
                    if ('name' in values) {
                        img.setAttribute('alt', this.living_room_name);
                        img_a.setAttribute('data-title', this.living_room_name);
                    }
                }
            }
        };
        GMCPHandler.prototype.CleanupWLFileReceiveBuffer = function () {
            var allEntries = Object.keys(this.WLFileReceiveBuffer);
            for (var i = 0; i < allEntries.length; i++) {
                if (this.WLFileReceiveBuffer[allEntries[i]]["lastUpdate"] + 30000 < Date.now()) {
                    delete this.WLFileReceiveBuffer[allEntries[i]];
                    console.log('Timeout reached for reception of: ' + allEntries[i]);
                }
            }
        };
        // Handle GMCP WL.File.List
        GMCPHandler.prototype.HandleGMCP_WL_File_List = function (sock, module, payload) {
            var _this = this;
            var values = JSON.parse(payload);
            // try opening new window, if it does not exist (yet)
            if (!this.editorWindow || this.editorWindow.closed) {
                // open new editor window
                this.editorWindow = this.popupCenter({ url: 'editor/', title: 'Editor', w: 900, h: 500 });
                //this.editorWindow.addEventListener('load', function (){
                //  this.editorWindow.updateClient(window, this);
                //  this.editorWindow.focus();
                //}.bind(this));
                this.editorWindow.setTimeout(function () {
                    _this.editorWindow.updateClient(window, _this);
                    _this.editorWindow.focus();
                }, 3000);
            }
            else {
                // or inform existing editor window
                this.editorWindow.updateClient(window, this);
            }
            // don't care, if the window has opened successfully for now!
            // put tree list in local storage and inform tree view to refresh content
            var path = values['path'];
            var list = values['list'];
            // put path and list into local storage
            localStorage.setItem('WL.File.List path', path);
            localStorage.setItem('WL.File.List list', JSON.stringify(list));
            // Now let the user know, if there is an issue with the window
            if (!this.editorWindow || this.editorWindow.closed) {
                document.getElementById('infoModalDlg-title').innerHTML = 'Fehler!';
                document.getElementById('infoModalDlg-content').innerHTML = 'Editor-Fenster konnte nicht ' +
                    'ge&ouml;ffnet werden oder ist nicht sichtbar! Pr&uuml;fe Deinen Browser oder Popup-Blocker!';
                this.micromodal.show('infoModalDlg');
            }
        };
        // Handle GMCP WL.File.Transfer
        GMCPHandler.prototype.HandleGMCP_WL_File_Transfer = function (sock, module, payload) {
            var _this = this;
            var values = JSON.parse(payload);
            // try opening new window, if it does not exist (yet)
            if (!this.editorWindow || this.editorWindow.closed) {
                // open new editor window
                this.editorWindow = this.popupCenter({ url: 'editor/', title: 'Editor', w: 900, h: 500 });
                //this.editorWindow.addEventListener('load', function (){
                //  this.editorWindow.updateClient(window, this);
                //  this.editorWindow.focus();
                //}.bind(this));
                this.editorWindow.setTimeout(function () {
                    _this.editorWindow.updateClient(window, _this);
                    _this.editorWindow.focus();
                }, 3000);
            }
            else {
                // or inform existing editor window
                this.editorWindow.updateClient(window, this);
            }
            // don't care, if the window has opened successfully for now!
            // The mud cannot handle messages bigger 5000, because this is the 
            // maximum array size. Because we do not know about the used encoding
            // all files or directory lists longer than 2048 chars are chopped into 
            // 2000 char slices while sending. We need to re-assemble them here, 
            // when eof:true is received.
            // put tree list in local storage and inform tree view to refresh content
            var path = values['path'];
            var offset = values['offset'];
            var eof = values['eof'];
            var content = values['content'];
            if (!path) {
                console.log("Received invalid WL.File.Transfer without 'path'.");
                return;
            }
            // WLFileReceiveBuffer["foo.c"] = { "type": "file", "lastUpdate": Date.now(), "chunks": {0: {"content":"das ist der inhalt", "eof":false}}};
            if (!this.WLFileReceiveBuffer[path]) {
                // first (create entry)
                this.WLFileReceiveBuffer[path] = { "type": "file", "lastUpdate": Date.now(), "chunks": {} };
                console.log('WL.File.Transfer first chunk: ' + path + ' with ' + content.length + ' chars');
            }
            else {
                // next (update lastUpdate)
                this.WLFileReceiveBuffer[path]["lastUpdate"] = Date.now();
                console.log('WL.File.Transfer next chunk: ' + path + ' with ' + content.length + ' chars');
            }
            this.WLFileReceiveBuffer[path]["chunks"][offset] = { "content": content, "eof": eof };
            // EOF reached?
            if (eof) {
                // now re-assemble the chunks to a single file!   
                var allOffsets = Object.keys(this.WLFileReceiveBuffer[path]["chunks"]);
                // sort offsets in correct order
                allOffsets.sort(function (a, b) { return parseInt(a) - parseInt(b); });
                // reset content
                content = '';
                for (var i = 0; i < allOffsets.length; i++) {
                    var offset_1 = allOffsets[i];
                    // sanity check (no offset/chunk lost?!)
                    if (content.length != offset_1) {
                        console.log('WL.File.Transfer chunk lost for: ' + path + '. Transfer failed/incomplete!');
                        alert('WL.File.Transfer chunk lost for: ' + path + '. Transfer failed/incomplete!');
                        delete this.WLFileReceiveBuffer[path];
                        return;
                    }
                    content += this.WLFileReceiveBuffer[path]["chunks"][offset_1]["content"];
                }
                // put path and list into local storage
                localStorage.setItem('WL.File.Transfer path', path);
                localStorage.setItem('WL.File.Transfer content', content);
                console.log('WL.File.Transfer reception complete: ' + path);
                // clear entry from buffer
                delete this.WLFileReceiveBuffer[path];
            }
            // Now let the user know, if there is an issue with the window
            if (!this.editorWindow || this.editorWindow.closed) {
                document.getElementById('infoModalDlg-title').innerHTML = 'Fehler!';
                document.getElementById('infoModalDlg-content').innerHTML = 'Editor-Fenster konnte nicht ' +
                    'ge&ouml;ffnet werden oder ist nicht sichtbar! Pr&uuml;fe Deinen Browser oder Popup-Blocker!';
                this.micromodal.show('infoModalDlg');
            }
        };
        return GMCPHandler;
    }());
    wlClient.GMCPHandler = GMCPHandler;
})(wlClient || (wlClient = {}));
/// <reference path="client.ts" />
/*
 * The Wunderland Client - Menus handler.
 *
 * Written in TypeScript and compiled to ECMAScript.
 *
 * Build: tsc --sourceMap client_menus.ts
 *
 */
var wlClient;
(function (wlClient) {
    var MenuHandler = /** @class */ (function () {
        function MenuHandler() {
            document.querySelector('.dropbtn').addEventListener('click', this.mainDropDownFunction.bind(this), false);
        }
        MenuHandler.prototype.mainDropDownFunction = function () {
            var mainDropdown = document.getElementById('mainDropdown');
            // if the main dropdown is going to be closed, close ALL dropdowns
            if (mainDropdown.classList.contains('dropshow')) {
                this.closeAllDropDowns();
            }
            // otherwise just toggle the main dropdown visibility
            else {
                mainDropdown.classList.toggle('dropshow');
            }
            document.getElementById('cmd').focus();
        };
        /* When called, toggle between hiding and showing the settings dropdown */
        MenuHandler.prototype.settingsDropDownFunction = function () {
            document.getElementById('settingsDropdown').classList.toggle('dropshow');
            document.getElementById('cmd').focus();
        };
        /* When called, all open dropdowns are closed immediately */
        MenuHandler.prototype.closeAllDropDowns = function () {
            var dropdowns = document.getElementsByClassName('dropdown-content');
            var i;
            for (i = 0; i < dropdowns.length; i++) {
                var openDropdown = dropdowns[i];
                if (openDropdown.classList.contains('dropshow')) {
                    openDropdown.classList.remove('dropshow');
                }
            }
        };
        MenuHandler.prototype.cmdButtonContextFunction = function (event) {
            // put the event target into the editButton data to use it later
            document.getElementById('cmdEdit').dataset.cmdButtonId = event.target.id;
            document.getElementById('cmdRemove').dataset.cmdButtonId = event.target.id;
            document.getElementById('cmdAdd1').dataset.cmdButtonId = event.target.id;
            document.getElementById('cmdAdd4').dataset.cmdButtonId = event.target.id;
            // open the context menu
            var ctxMenu = document.getElementById('cmdButtonsCtxMenu');
            ctxMenu.style.left = (event.pageX - 150) + "px";
            ctxMenu.style.top = (event.pageY - 40) + "px";
            ctxMenu.classList.toggle('dropshow');
            event.preventDefault();
        };
        MenuHandler.prototype.settingsButtonContextFunction = function (event) {
            // put the event target into the editButton data to use it later
            document.getElementById('settingsAdd1').dataset.cmdButtonId = event.target.id;
            document.getElementById('settingsAdd4').dataset.cmdButtonId = event.target.id;
            // open the context menu
            var ctxMenu = document.getElementById('settingsButtonsCtxMenu');
            ctxMenu.style.left = (event.pageX - 150) + "px";
            ctxMenu.style.top = (event.pageY - 40) + "px";
            ctxMenu.classList.toggle('dropshow');
            event.preventDefault();
        };
        MenuHandler.prototype.closeAllButtonContextFunction = function () {
            document.getElementById('cmdButtonsCtxMenu').classList.remove('dropshow');
            document.getElementById('settingsButtonsCtxMenu').classList.remove('dropshow');
        };
        return MenuHandler;
    }());
    wlClient.MenuHandler = MenuHandler;
})(wlClient || (wlClient = {}));
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
var wlMacros;
(function (wlMacros) {
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
    wlMacros.EvaluationContext = EvaluationContext;
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
    wlMacros.Stack = Stack;
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
    wlMacros.EvalResult = EvalResult;
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
                                console.log('MacroProcessor macro \'' + mName + '\' invalid trigger matching: ' + mProps.trigger.matching + ' detected');
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
            result.message = new wlMacros.MacroHelp(topic).getHelp();
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
    wlMacros.MacroProcessor = MacroProcessor;
})(wlMacros || (wlMacros = {}));
/// <reference path="macros.ts" />
/*
 * The tiny macro processor of Wunderland Client - HELP texts.
 *
 * Written in TypeScript and compiled to ECMAScript.
 *
 * Build: tsc --sourceMap macros__help.ts
 *
 */
var wlMacros;
(function (wlMacros) {
    var MacroHelp = /** @class */ (function () {
        // Constructor
        function MacroHelp(topic) {
            this.topic = '';
            this.topic = topic.trim().toLowerCase();
            if (this.topic.charAt(0) == wlMacros.MacroProcessor.MACRO_KEY)
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
                    'Example 3: /def -mregexp -t"^(\\w+) geht nach (\\w+)." greet3 = teile %{P1} mit Viel Spass im %{P2}!\n' +
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
                    'Tiny Macro Processor V' + wlMacros.MacroProcessor.VERSION + '\n' +
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
    wlMacros.MacroHelp = MacroHelp;
})(wlMacros || (wlMacros = {}));
//# sourceMappingURL=client.js.map