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

namespace wlClient {

    export class WLClient {

        // Local echo setting.
        public localEcho = false;

        // Handle window close
        public isConnected = false;

        // Called on connection
        public connected() {
            this.isConnected = true; 
            console.log('Connected.');
        }

        public disconnected() {
            this.isConnected = false;
            console.log('Disconnected.');
        }

        // Since ansi_up API 2.0 we need an instance of AnsiUp!
        private ansi_up = null;//new AnsiUp;

        // Init MenuHandler
        private menuHandler: MenuHandler = null;

        // Init GMCPHandler
        private gmcpHandler: GMCPHandler = null;

        // Init macro processor
        private macros: wlMacros.MacroProcessor = null;//new MacroProcessor;

        // micromodal = require('micromodal')
        private micromodal = null; // MicroModal

        // ansiRegex = require('ansi-regex');
        private ansiRegex = null;

        private sock = null;

        // `pending` stores partial telnet negotiations that cross message boundaries
        private pending = '';

        // reset to 0 on each WO/WILL TELOPT_TTYPE, see tty_neg_types below
        private tty_neg_index = 0;

        // pwMode + pw store local input, if cmd is in 'password' mode
        private pwMode = false;

        // input-history
        private inputHistoryIdx = -1; // current position in history array
        private inputHistoryMax = 20; // max size of history
        private inputHistoryTmp = ''; // remember current input
        private inputHistory = [];     // the history array

        // Initial command buttons.
        private initDefaultCmdButtons() {
            return {
                "cmdbt8" : {type : 1,order: 0,cmds : {'1': {'label':'wer', 'cmd':'wer', 'send':true}}},
                "cmdbt7" : {type : 1,order: 1,cmds : {'1': {'label':'schau', 'cmd':'schau', 'send':true}}},
                "cmdbt6" : {type : 1,order: 2,cmds : {'1': {'label':'inventar', 'cmd':'inv', 'send':true}}},
                "cmdbt5" : {type : 1,order: 3,cmds : {'1': {'label':'info', 'cmd':'info', 'send':true}}},
                "cmdbt4" : {type : 1,order: 4,cmds : {'1': {'label':'- ...', 'cmd':'- ', 'send':false}}},
                "cmdbt3" : {type : 1,order: 5,cmds : {'1': {'label':'oben', 'cmd':'oben', 'send':true}}},
                "cmdbt2" : {type : 4,order: 6,cmds : {'1': {'label':'n', 'cmd':'n', 'send':true},'2': {'label':'s', 'cmd':'s', 'send':true},'3': {'label':'o', 'cmd':'o', 'send':true},'4': {'label':'w', 'cmd':'w', 'send':true},}},
                "cmdbt1" : {type : 1,order: 7,cmds : {'1': {'label':'unten', 'cmd':'unten', 'send':true}}},
            }
        };

        // get all labels of the command button(s)
        private getCmdButtonLabels(buttonId) {
            var primaryId = buttonId.split('.')[0];
            if (this.cmdButtons[primaryId] != null) {
                return Object.keys(this.cmdButtons[primaryId].cmds).map(
                function(cmdId) { 
                    return this.cmdButtons[primaryId].cmds[cmdId].label; 
                }.bind(this));
            } else {
                return [];
            }
        }

        // remove button from model
        private removeCmdButton(buttonId) {
            var primaryId = buttonId.split('.')[0];
            var secondaryId = buttonId.split('.')[1];
            if (this.cmdButtons[primaryId] != null && this.cmdButtons[primaryId].cmds[secondaryId]!=null) {
                //delete cmdButtons[primaryId].cmds[secondaryId];
                //if (Object.keys(cmdButtons[primaryId].cmds).length==0) {
                delete this.cmdButtons[primaryId];
                //}
                this.saveSettings();
            } else {
                console.log('Unknown button to remove: ' + buttonId + '');
            }
        }

        // edit button in model
        private editCmdButton(buttonId, label, cmd, send) {
            var primaryId = buttonId.split('.')[0];
            var secondaryId = buttonId.split('.')[1];
            if (this.cmdButtons[primaryId] != null && this.cmdButtons[primaryId].cmds[secondaryId]!=null) {
                this.cmdButtons[primaryId].cmds[secondaryId].label = label;
                this.cmdButtons[primaryId].cmds[secondaryId].cmd = cmd;
                this.cmdButtons[primaryId].cmds[secondaryId].send = send;
                this.saveSettings();
            } else {
                console.log('Unknown button to edit: ' + buttonId + ' ('+label+','+cmd+','+send+')');
            }
        }

        // get the highest (last) order value from cmdButtons
        private getHighestCmdButtonOrderValue() {
            var highest = 0;
            // find free id and add new button at end of the list.
            var cmdIds = Object.keys(this.cmdButtons);
            for (var i = 0; i < cmdIds.length; i++) {
                var tmpOrder = this.cmdButtons[cmdIds[i]].order;
                if (tmpOrder > highest) highest = tmpOrder;
            }
            return highest;
        }

        // get a new order number, which can be inserted 'before' previousCmdButtonId
        private getInsertableCmdButtonOrderValue(followingCmdButtonId) {
            var primaryId = followingCmdButtonId.split('.')[0];
            var insOrder = -1;
            // find free id and add new button at end of the list. Sort it first, ascending.
            var cmdIds = Object.keys(this.cmdButtons).sort((c1, c2) => this.cmdButtons[c1].order - this.cmdButtons[c2].order);
            for (var i = 0; i < cmdIds.length; i++) {
                if (cmdIds[i]==primaryId) {
                // found!
                insOrder = this.cmdButtons[primaryId].order;
                }
                // increment order number of all following buttons
                if (insOrder >= 0) this.cmdButtons[cmdIds[i]].order++;
            }
            // make sure, its never below 0
            if (insOrder<0) insOrder=0;
            return insOrder;
        }

        // add 1-cmd button in model
        private add1CmdButton(selectedButtonId) {
            var num = 1;
            // find free id and add new button at end of the list.
            while (this.cmdButtons['cmdbt'+num] != null) num++;
            var newId = 'cmdbt'+num;
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
                type : 1,
                order: order,
                cmds : {'1': {'label':'neu', 'cmd':'neu', 'send':true}}
            };
            this.saveSettings();
        }

        // add 4-cmd button in model
        private add4CmdButton(selectedButtonId) {
            var num = 1;
            // find free id and add new button at end of the list.
            while (this.cmdButtons['cmdbt'+num] != null) num++;
            var newId = 'cmdbt'+num;
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
                type : 4,
                order: order,
                cmds : {
                '1': {'label':'n', 'cmd':'n', 'send':true},
                '2': {'label':'s', 'cmd':'s', 'send':true},
                '3': {'label':'o', 'cmd':'o', 'send':true},
                '4': {'label':'w', 'cmd':'w', 'send':true},
                }
            };
            this.saveSettings();
        }

        // Try loading buttons first, see loadSettings()
        private cmdButtons = {};

        /// Split the query-string into key-value pairs and return a map.
        // Stolen from: http://stackoverflow.com/questions/2090551/parse-query-string-in-javascript
        private parseQuery(qstr) {
            var query = {};
            var a = qstr.substr(1).split('&');
            for (var i = 0; i < a.length; i++) {
                var b = a[i].split('=');
                query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
            }
            return query;
        }

        // Handle image loading errors here!
        private bildstoerung(){
            var img_a = document.querySelector('a#room_image_a');
            var img = document.querySelector('img#room_image');
            var brokenPath = img.getAttribute('src');
            if(brokenPath != 'img/aaa_no_signal.jpg') {
                img.setAttribute('src', 'img/aaa_no_signal.jpg');
                img.setAttribute('alt', 'Bildstoerung: ' + brokenPath + ' is broken!');
                img_a.setAttribute('href', 'img/aaa_no_signal.jpg');
                img_a.setAttribute('data-title', 'Bildstoerung: ' + brokenPath + ' is broken!');
            }
        }

        // Write something to the screen, scroll to bottom and limit number of rows.
        public writeToScreen(str) {
            if (str && str.length > 0) {
                var out = document.getElementById('out');
                out.insertAdjacentHTML('beforeend', str);
                out.scrollTop = out.scrollHeight;
                while(out.childNodes.length > 1000) out.childNodes[0].remove();
            }
        }

        // Do telnet negotiations for 'buf' and return the plain text only.
        private doTelnetNegotions(sock, buf) {
            // TELNET protocol
            var IAC  = '\xff'; // 255
            var DONT = '\xfe'; // 254
            var DO   = '\xfd'; // 253
            var WONT = '\xfc'; // 252
            var WILL = '\xfb'; // 251
            var SB   = '\xfa'; // 250 sub negotiation
            var SE   = '\xf0'; // 240 end sub negotiation
            var EOR  = '\xef'; // 239 End Of Record

            // TELNET options (WL relevant)
            var TELOPT_ECHO     = '\x01'; //  1
            var TELOPT_STATUS   = '\x05'; //  5
            var TELOPT_TTYPE    = '\x18'; // 24
            var TELOPT_EOR      = '\x19'; // 25
            var TELOPT_TSPEED   = '\x20'; // 32
            var TELOPT_LINEMODE = '\x22'; // 34
            var TELOPT_XDISPLOC = '\x23'; // 35
            var TELOPT_ENVIRON  = '\x24'; // 36
            var TELOPT_CHARSET  = '\x2a'; // 42
            var TELOPT_GMCP     = '\xc9'; // 201 -> http://www.gammon.com.au/gmcp

            // sub-option qualifiers
            var TELQUAL_IS      = '\x00'; // IS option
            var TELQUAL_SEND    = '\x01'; // SEND option

            // TTYPE negotiaion
            var tty_neg_types = ['dumb','ansi','xterm','xterm-256color','xterm-direct'];

            // receive buffer
            var strippedBuf = '';
            buf = this.pending + buf;
            this.pending = '';
            var len = buf.length;

            if(len>0){
                var oldIacIdx = 0;
                var newIacIdx = 0;
                while((newIacIdx=buf.indexOf(IAC,oldIacIdx))>=0){

                // Copy first part of strippedBuf and skip IACs
                strippedBuf+=buf.substr(oldIacIdx, newIacIdx-oldIacIdx);

                // IAC+EOR is only 2 bytes 
                if (newIacIdx < len && buf[newIacIdx + 1] == EOR) {
                    var startOfPrompt = strippedBuf.lastIndexOf('\n', len);
                    var prmpt = strippedBuf.substr(startOfPrompt+1);
                    if (prmpt.length > 0) {
                        // truncate strippedBuf
                        if (startOfPrompt<0) strippedBuf = '';
                        else strippedBuf = strippedBuf.substr(0, startOfPrompt+1);
                        //console.log('PRMPT [' + prmpt+']\n');
                        this.setPrompt(this.ansi_up.ansi_to_html(prmpt));
                    }
                    // Skip the IAC+EOR in the buffer
                    oldIacIdx = newIacIdx+2;
                } 
                // Everything should be (at least) 3 bytes long.
                else if(newIacIdx+2 >= len) {
                    // save incomplete telnet negotiation for later processing
                    this.pending = buf.substr(newIacIdx);
                    oldIacIdx = len;
                }
                // do all complete messages
                else {
                    switch(buf[newIacIdx+1]){
                    case DONT:
                        oldIacIdx = newIacIdx+3;
                        break;
                    case DO:
                        switch(buf[newIacIdx+2]){
                        // we are 'xterm' and will use this (see SB below)
                        case TELOPT_TTYPE:
                            if(sock) sock.emit('stream', IAC+WILL+TELOPT_TTYPE);
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
                            if(sock) sock.emit('stream', IAC+WONT+buf.substr(newIacIdx+2,1));
                            break;
                        }
                        oldIacIdx = newIacIdx+3;
                        break;
                    case WONT:
                        switch(buf[newIacIdx+2]){
                        case TELOPT_ECHO:
                            // enable local echo!
                            this.leavePWMode();
                            if(sock) sock.emit('stream', IAC+DONT+TELOPT_ECHO);
                            break;
                        default:
                            // if the server WONT to do something anymore, tell it, this is fine.
                            if(sock) sock.emit('stream', IAC+DONT+buf.substr(newIacIdx+2,1));
                            break;
                        }
                        oldIacIdx = newIacIdx+3;
                        break;
                    case WILL:
                        switch(buf[newIacIdx+2]){
                        case TELOPT_EOR:
                            // No EOR support!
                            //if(sock) sock.emit('stream', IAC+DONT+TELOPT_EOR);
                            if(sock) sock.emit('stream', IAC+DO+TELOPT_EOR);
                            break;
                        case TELOPT_ECHO:
                            // disable local echo!
                            this.enterPWMode();
                            if(sock) sock.emit('stream', IAC+DO+TELOPT_ECHO);
                            break;
                        case TELOPT_GMCP:
                            // use GMCP
                            if(sock) sock.emit('stream', IAC+DO+TELOPT_GMCP);
                            // send Hello immediately
                            if(sock) sock.emit('stream', IAC+SB+TELOPT_GMCP+this.gmcpHandler.getGMCPHello()+IAC+SE);
                            break;
                        default:
                            // we DONT accept anything else. So just reply all WILL by DONT
                            if(sock) sock.emit('stream', IAC+DONT+buf.substr(newIacIdx+2,1));
                            break;
                        }
                        oldIacIdx = newIacIdx+3;
                        break;
                    case SB:
                        var endSubNegIdx=buf.indexOf(SE, newIacIdx+2);
                        if(endSubNegIdx<0) {
                        // save incomplete telnet negotiation for later processing
                        this.pending = buf.substr(newIacIdx);
                        oldIacIdx = len;
                        } else {
                        if (buf[newIacIdx+2]==TELOPT_GMCP){
                            // Received GMCP message!
                            this.gmcpHandler.doGMCPReceive(this, sock, buf.substr(newIacIdx+3, endSubNegIdx-(newIacIdx+4)));
                        }
                        else if (buf[newIacIdx+2]==TELOPT_TTYPE && buf[newIacIdx+3]==TELQUAL_SEND){
                            // Server wants us to send TTYPE, we count up tty_neg_index until it's end
                            if(sock) sock.emit('stream', IAC+SB+TELOPT_TTYPE+TELQUAL_IS+tty_neg_types[this.tty_neg_index]+IAC+SE);
                            if (this.tty_neg_index+1 < tty_neg_types.length) this.tty_neg_index = this.tty_neg_index + 1;
                        }
                        else {
                            console.log('Don\'t understand: [IAC+SB+('+buf.charCodeAt(newIacIdx+2)+')...]');
                        }
                        oldIacIdx = endSubNegIdx+1;
                        }
                        break;
                    default:
                        console.log('Don\'t understand: [IAC+('+buf.charCodeAt(newIacIdx+1)+')+('+buf.charCodeAt(newIacIdx+2)+')...]\n');
                        oldIacIdx = newIacIdx+3;
                        break;
                    }
                }
                }

                // if there something left (or no IAC at all), append rest of buffer
                if(oldIacIdx+1<len) strippedBuf+=buf.substr(oldIacIdx, len-oldIacIdx);
            }

            return strippedBuf;
        }

        // Do ANSI conversion, before writing to screen.
        private writeServerData(buf) {
            var line = this.ansi_up.ansi_to_html(buf);
            this.writeToScreen(line);
        }

        // Adjust the UI layout.
        private adjustLayout() {
            var thePage = document.getElementById('page');
            var theOut = document.getElementById('out');
            var theInfo = document.getElementById('info');
            var theIn = document.getElementById('in');

            var page_width = thePage.clientWidth;
            var page_height = thePage.clientHeight;
            var info_width = theInfo.clientWidth;

            /* update input div width */
            theIn.style.width = (page_width-(info_width+6)) + 'px';

            /* update output div size */
            var in_outerheight = theIn.clientHeight;
            theOut.style.width = (page_width-(info_width+6)) + 'px';
            theOut.style.height = (page_height - in_outerheight - 10) + 'px';

            /* scroll to bottom, important for mobile and virtual keyboard */
            theOut.scrollTo(0, theOut.scrollHeight);
        }

        // Save settings to localStorage.
        private saveSettings() {
            localStorage.setItem('Client.Setting.LocalEcho', JSON.stringify(this.localEcho));
            localStorage.setItem('Client.Setting.CmdButtons', JSON.stringify(this.cmdButtons));
        }

        // Re-/Load settings from localStorage.
        private loadSettings() {
            // Macro Processor re-/load
            this.macros.reloadSettings();

            // Re-/load other client settings.
            var localEchoSetting = localStorage.getItem('Client.Setting.LocalEcho');
            if (localEchoSetting) {
                try {
                    this.localEcho = JSON.parse(localEchoSetting);
                } catch (error) {
                    this.writeToScreen('' + error.name + ' beim Verarbeiten der LocalEcho Einstellung: ' + error.message + '\n');
                    this.localEcho = false;
                }
            } else {
                console.log('Verwende Standard-Einstellungen für LocalEcho.');
                this.localEcho = false;
            }
            var cmdButtonsSetting = localStorage.getItem('Client.Setting.CmdButtons');
            if (cmdButtonsSetting) {
                try {
                    this.cmdButtons = JSON.parse(cmdButtonsSetting);
                } catch (error) {
                    this.writeToScreen('' + error.name + ' beim Verarbeiten der CmdButtons Einstellungen: ' + error.message + '\n');
                    this.cmdButtons = this.initDefaultCmdButtons();
                }
            } else {
                console.log('Verwende Standard-Einstellungen für CmdButtons.');
                this.cmdButtons = this.initDefaultCmdButtons();
            }

            // Refresh UI
            document.querySelector('button#localecho').innerHTML = 'Local Echo: ' + (this.localEcho==true ? 'an' : 'aus');
        }

        // Maybe the user wants other colors? Here we go.
        private processQueryParams() {
            var queryParams = this.parseQuery(document.location.search);

            var debugGMCP = queryParams['debug'];
            if (debugGMCP=='true') this.gmcpHandler.debug_GMCP = true;

            var bgColor = queryParams['bg'];
            if(bgColor!=null) { document.body.style.backgroundColor = '#'+bgColor; }

            var fgColor = queryParams['fg'];
            if(fgColor!=null){ document.body.style.color = '#'+fgColor; }

            var infoBgColor = queryParams['ibg'];
            if(infoBgColor!=null) { document.querySelector<HTMLElement>('div#info').style.backgroundColor = '#'+infoBgColor; }

            var infoFgColor = queryParams['ifg'];
            if(infoFgColor!=null) { 
                document.querySelector<HTMLElement>('div#info').style.color = '#'+infoFgColor; 
                document.querySelector<HTMLElement>('div#info').style.borderColor = '#'+infoFgColor; 
            }

            var infoBorderColor = queryParams['ibc'];
            if(infoBorderColor!=null) { document.querySelector<HTMLElement>('div#info').style.borderColor = '#'+infoBorderColor; }

            var infoPanel = queryParams['infopanel'];
            if (infoPanel==null || infoPanel!='hidden') 
                document.querySelector<HTMLElement>('div#info').style.visibility = 'visible'
            else
                document.querySelector<HTMLElement>('div#info').style.visibility = 'hidden'
            console.log('URL-Paramters for infoPanel = ' + infoPanel);
        }

        // Popup the cookie warning.
        private doCookiePopup() {
            if (!document.cookie.split('; ').find(row => row.startsWith('didAcceptCookies'))) {
                document.querySelector<HTMLElement>('.cookie-bar').style.display = 'inline-block';
            }
        }

        // Called whenever the user closes the cookie warning.
        private doCookieAccept() {
            var cookieDate = new Date();
            cookieDate.setTime(new Date().getTime() + 2592000000); // 30 days in ms
            document.cookie = "didAcceptCookies=true; path=/; expires=" + cookieDate.toUTCString();
        }

        // Import settings from local file
        private importSettings(event) {
            // Some tricks required here, to open local files. Most of it comes from here:
            // https://stackoverflow.com/questions/3582671/how-to-open-a-local-disk-file-with-javascript
            // What happens: We have an invisible input element in the document (importButtonHiddenInput),
            // which we must use as tool to open a file selection dialog. So we attach a file read handler
            // on this element and emit a 'click' event. 
            var hiddenInputElement = document.getElementById('importButtonHiddenInput');
            hiddenInputElement.onchange = this.uploadSettingsFile.bind(this);
            hiddenInputElement.click();
        }

        // Helper for importSettings()
        private uploadSettingsFile(e) {
            var file = e.target.files[0];
            if (!file) return;
            var reader = new FileReader();
            reader.onload = function(e) {
                var settingsStr = e.target.result;
                if (settingsStr && settingsStr.length > 0) {
                var settings;
                try {
                    settings = JSON.parse(settingsStr);
                } catch (e) {
                    this.writeToScreen('' + e.name + ': ' + e.message + '\n');
                }
                if (settings && Object.keys(settings).length>0) {
                    if (settings['#VERSION'] == 1) {
                        // Remove all existing Client.* and Macros.* keys.
                        for (var i = 0; i < localStorage.length; i++){
                            var key = localStorage.key(i);
                            if (key.substr(0,7)=='Client.' || key.substr(0,7)=='Macros.') {
                            localStorage.removeItem(key);
                            }
                        }
                        // Restore keys from imported file.
                        var keys = Object.keys(settings);
                        for (var i = 0; i < keys.length; i++) {
                            var key = keys[i];
                            if (key!='#VERSION') {
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
        }

        // Export settings to local file
        private exportSettings(event) {
            // Some tricks required here, to open local files. Most of it comes from here:
            // https://ourcodeworld.com/articles/read/189/how-to-create-a-file-and-generate-a-download-with-javascript-in-the-browser-without-a-server
            // What happens: We have an invisible anchor element in the dockument (exportButtonHiddenAnchor),
            // which we must use as tool to open a file download dialog. So we attach our file data on this 
            // element and emit a 'click' event. 
            var hiddenAnchorElement = document.getElementById('exportButtonHiddenAnchor');
            var settings = { '#VERSION' : 1 };
            for (var i = 0; i < localStorage.length; i++){
                var key = localStorage.key(i);
                if (key.substr(0,7)=='Client.' || key.substr(0,7)=='Macros.') {
                settings[key] = localStorage.getItem(key);
                }
            }
            var settingsStr = JSON.stringify(settings);
            hiddenAnchorElement.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(settingsStr));
            hiddenAnchorElement.click();
            this.writeToScreen('Einstellungen (V' + settings['#VERSION'] + ', #' + (Object.keys(settings).length - 1) + ') exportiert.\n');
            this.setFocusToInput();
        }

        // Call to enter into pw mode.
        private enterPWMode() {
            this.pwMode = true;
            this.menuHandler.closeAllDropDowns();
            document.getElementById('cmd').style.display = 'none'; // hide
            document.querySelector<HTMLElement>('.dropbtn').style.display = 'none'; // hide
            document.getElementById('pwd').style.display = 'block'; // show
            this.setFocusToInput();
        }

        // Call to leave pw mode.
        private leavePWMode() {
            this.pwMode = false;
            document.getElementById('pwd').style.display = 'none'; // hide
            document.querySelector<HTMLElement>('.dropbtn').style.display = 'block'; // show
            document.getElementById('cmd').style.display = 'block'; // show
            this.setFocusToInput();
        }

        // Give the focus to the input field.
        private setFocusToInput() {
            if (this.pwMode)
                document.getElementById('pwd').focus();
            else 
                document.getElementById('cmd').focus();
        }

        // Set the content of the input field.
        private setInput(cmd) {
            if (this.pwMode)
                (<HTMLInputElement>document.getElementById('pwd')).value = cmd;
            else 
                (<HTMLInputElement>document.getElementById('cmd')).value = cmd;
        }

        // Set the prompt value.
        private setPrompt(prompt) {
            document.getElementById('prompt').innerHTML = prompt;
        }

        // Called, whenever a key is pressed in the window. We'd like to treat
        // everything as input to the client, but this would prevent copy&paste 
        // shortcuts or other special keys from working. So we try to skip these
        // and only care about the rest.
        private handleKeyDown(event)
        {
            // if a modal dialog is shown, don't intercept anything.
            if (document.querySelector('.modal.is-open') != null) return;

            if (!this.pwMode) {
                // If macro processor handles the key, don't continue.
                var result = this.macros.keyTrigger(event);
                var doSend = result.send;
                var msg = result.message;
                if (doSend) {
                    var cmd = result.cmd;
                    // Append a LF, if the last character is not a LF yet.
                    if (cmd.length == 0 || cmd.charAt(cmd.length-1) != '\n') cmd += '\n';
                    this.send(cmd, this.pwMode);
                    event.preventDefault();
                    return true;
                }
                // If there is nothing to send, but the input contains '/def key_', append the 
                // pressed named key now as a convenience function.
                else {
                    var namedKey = this.macros.getNamedKey(event);
                    if (namedKey.length>0) {
                        let cmd = <HTMLInputElement>document.getElementById('cmd');
                        if (cmd.value && cmd.value.substr(0, 4).toLowerCase() == '/def' && cmd.value.substr(cmd.value.length-4) == 'key_') {
                            cmd.value += (namedKey.substr(4) + ' = ');
                            event.preventDefault();
                            return true;
                        }
                    }
                    }
                if (msg.length > 0) this.writeToScreen(msg);
            }
            
            // Don't intercept Ctrl/Cmd + C  for copy
            if (event.key == 'c' && (event.ctrlKey || event.metaKey)) return true;
        
            // Don't intercept control/meta/function keys
            if ([
            'CapsLock', /* Caps lock */
            'Shift',    /* Shift */
            'Tab',      /* Tab */
            'Escape',   /* Escape Key */
            'Control',  /* Control Key */
            'Meta',     /* Windows Command Key */
            'Pause',    /* Pause Break */
            'Alt',      /* Alt Key */
            'PageUp', 'PageDown', /*Page Down, Page Up */
            'Home','End','ArrowDown','ArrowLeft','ArrowRight','ArrowUp', /* Home, End, Arrow Keys */
            'Insert',   /* Insert Key */
            'F1','F2','F3','F4','F5','F6','F7','F8','F9','F10','F11','F12','F13','F14','F15','F16','F17','F18','F19','F20', /* F1 - F20 */
            'NumLock','ScrollLock' /* Num Lock, Scroll Lock */
            ].indexOf(event.key) != -1) return true;
        
            // Everything else is supposed to be input, so focus to the right place.
            this.setFocusToInput();
        
            return true;
        }

        // Get user input from UI elements (either cmd or pwd),
        // add it to the history and call send(). See above.
        private sendInput() {
            var elem = <HTMLInputElement>(this.pwMode === true ? document.getElementById('pwd') : document.getElementById('cmd'));
            var cmd = elem.value;

            // Push this line to the history, if it's not a pwd
            if(cmd.length>0 && this.inputHistory.indexOf(cmd)!=0) {
            // add cmd to history, if it's not a password
            if(!this.pwMode) this.inputHistory.unshift(cmd);
            // limit length of history
            if (this.inputHistory.length > this.inputHistoryMax) this.inputHistory.pop();
            }
            this.inputHistoryIdx=-1;

            // The MacroProcessor may not send anything.
            var doSend = true;

            // Macro handling
            if (!this.pwMode) {
            var result = this.macros.resolve(cmd);
            doSend = result.send;
            cmd = result.cmd;
            var msg = result.message;
            if (msg.length > 0) this.writeToScreen(msg);
            }

            // Append a LF, if the last character is not a LF yet.
            if (cmd.length == 0 || cmd.charAt(cmd.length-1) != '\n') cmd += '\n';

            // Now send, if noone opted out.
            if (doSend) this.send(cmd, this.pwMode);

            // Clear input element
            elem.value = '';
            elem.dispatchEvent(new Event('change'));
        }

        // Create and configure the game command buttons from 'cmdButtons'.
        private configureCmdButtons() {
            // remove existing buttons first.
            var mainDropdown = document.querySelector<HTMLDivElement>('div#mainDropdown');
            while (mainDropdown.firstChild != null && (<HTMLElement>mainDropdown.firstChild).id != 'settings') {
                mainDropdown.removeChild(mainDropdown.firstChild);
            }
            // sort button keys by order descending, because they are inserted bottom->top
            var buttonKeys = Object.keys(this.cmdButtons).sort((c1, c2) => this.cmdButtons[c2].order - this.cmdButtons[c1].order);
            // add new buttons.
            let newButton: HTMLElement = null;
            for (var i=0; i < buttonKeys.length; i++) {
                if (this.cmdButtons[buttonKeys[i]].type == 1) {
                    // <button id="who" class="drp">wer</button>;
                    newButton = document.createElement("button");
                    newButton.id = buttonKeys[i] + '.1';
                    newButton.className = 'drp';
                    newButton.addEventListener('contextmenu', this.menuHandler.cmdButtonContextFunction, false);
                    newButton.innerHTML = this.cmdButtons[buttonKeys[i]]['cmds']['1'].label;
                    newButton.dataset.send = this.cmdButtons[buttonKeys[i]]['cmds']['1'].send;
                    newButton.dataset.cmd = this.cmdButtons[buttonKeys[i]]['cmds']['1'].cmd;
                    newButton.addEventListener('click', function(e) { 
                        let currentTarget = e.currentTarget;
                        this.setInput(currentTarget.dataset.cmd); 
                        if (currentTarget.dataset.send == 'true') this.sendInput(); 
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
                    for (var k=1;k<=4;k++) {
                        // Sub button k (1-4)
                        var subButton = document.createElement("button");
                        subButton.id = buttonKeys[i] + '.'+k;
                        subButton.className = 'drp drpssub4'+k;
                        subButton.addEventListener('contextmenu', this.menuHandler.cmdButtonContextFunction, false);
                        subButton.innerHTML = this.cmdButtons[buttonKeys[i]]['cmds'][''+k].label;
                        subButton.dataset.send = this.cmdButtons[buttonKeys[i]]['cmds'][''+k].send;
                        subButton.dataset.cmd = this.cmdButtons[buttonKeys[i]]['cmds'][''+k].cmd;
                        newButton.insertBefore(subButton, null);
                        subButton.addEventListener('click', function(e) { 
                            let currentTarget = e.currentTarget;
                            this.setInput(currentTarget.dataset.cmd); 
                            if (currentTarget.dataset.send == 'true') this.sendInput(); 
                            this.setFocusToInput(); 
                        }.bind(this));
                    }
                }
                mainDropdown.insertBefore(newButton, mainDropdown.firstChild);
            }
        }

        private cmdEditButtonClicked(params) {
            var ctxMenuButton = params.target;
            var cmdButtonId = ctxMenuButton.dataset.cmdButtonId;
            document.getElementById('cmdButtonEditModalDlg-saveButton').dataset.cmdButtonId = cmdButtonId;
            var cmdButton = document.getElementById(cmdButtonId);
            document.querySelector<HTMLInputElement>('input#buttonName').value = cmdButton.innerHTML;
            document.querySelector<HTMLInputElement>('input#buttonCmd').value = cmdButton.dataset.cmd;
            document.querySelector<HTMLInputElement>('input#buttonSend').checked = (cmdButton.dataset.send == 'true');
            this.micromodal.show('cmdButtonEditModalDlg');
        }

        private cmdRemoveButtonClicked(params) {
            var ctxMenuButton = params.currentTarget;
            var cmdButtonId = ctxMenuButton.dataset.cmdButtonId;
            if (cmdButtonId != "settings") {
                //var cmdButton = document.getElementById(cmdButtonId);
                var labels = this.getCmdButtonLabels(cmdButtonId);
                if (labels.length == 1) {
                    document.getElementById('yesnoModalDlg-title').innerHTML = 'Kommando-Button entfernen?';
                    document.getElementById('yesnoModalDlg-content').innerHTML = 'Willst Du den Button <br><div class="fakedrp">'+labels[0]+'</div><br> wirklich entfernen?';
                } else {
                    document.getElementById('yesnoModalDlg-title').innerHTML = 'Kommando-Buttons entfernen?';
                    var content = 'Willst Du die Button-Zeile<br><div class="fakedrp" style="white-space: nowrap;overflow:hidden;background-color:transparent;width: auto;">'
                    for (var i=0;i<labels.length;i++) {
                    content += '<div class="fakedrp fakedrpssub4'+(i+1)+'">'+labels[i]+'</div>';
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
        }

        private cmdAdd1ButtonClicked(params) {
            var ctxMenuButton = params.target;
            var cmdButtonId = ctxMenuButton.dataset.cmdButtonId;
            this.add1CmdButton(cmdButtonId);
            this.configureCmdButtons();
        }

        private cmdAdd4ButtonClicked(params) {
            var ctxMenuButton = params.target;
            var cmdButtonId = ctxMenuButton.dataset.cmdButtonId;
            this.add4CmdButton(cmdButtonId);
            this.configureCmdButtons();
        }

        // Handle history (cursor buttons) and Input 'Enter'.
        private handleInputKeyDowns(e) {
            let target = <HTMLInputElement>e.currentTarget;
            // cursor up/down history
            // keypress event does not work in IE/Edge!
            switch (e.key) {
            case 'ArrowLeft':
                // Do nothing
                break;
            case 'ArrowUp':
                // Go back in history
                if(this.inputHistory.length>=0 && (this.inputHistoryIdx+1)<this.inputHistory.length) {
                if(this.inputHistoryIdx<0) { this.inputHistoryTmp = target.value; }
                this.inputHistoryIdx++;
                target.value = this.inputHistory[this.inputHistoryIdx];
                }
                break;
            case 'ArrowRight':
                // Do nothing
                break;
            case 'ArrowDown':
                // Fo forward in history
                if(this.inputHistoryIdx>=0) {
                this.inputHistoryIdx--;
                if(this.inputHistoryIdx<0) {
                    target.value = this.inputHistoryTmp;
                }
                else {
                    if(this.inputHistoryIdx<this.inputHistory.length) {
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
        }

        // Send a string to the remote server, echos it locally, if
        // localEcho is true. If isPassword is true, the string will
        // be masked as **** for local echo.
        private send(str, isPassword) {
            if (this.localEcho === true) {
                var viewStr;
                // if password, print stars into the console
                if(str.length>0 && isPassword)
                    viewStr=new Array(str.length+1).join('*');
                else
                    viewStr=str;
                this.writeToScreen(viewStr);
            }
            if(this.sock) this.sock.emit('stream', str);
        }


        // Remove all backspaces and chars 'in front', called recursively.
        // Will destroy ANSI-Codes in front, if there are more '\b' than real
        // chars. But this is something, which cannot be avoided effectively.
        // We must trust the responsibility of the creators.
        private handleBackspace(str) {
            var bs = str.indexOf('\b');
            if (bs>=0) {
            var newstr = str.substr(0, (bs-1)) + str.substr(bs+1);
            return this.handleBackspace(newstr);
            }
            return str;
        }

        // Strip all ansi codes from string.
        private stripAnsi(str) {
            return str.replace(this.ansiRegex(), '');
        }

        // Called once from app.js, when all required modules are loaded.
        public startClient() {

            this.micromodal = require('micromodal');
            this.micromodal.init();

            this.ansiRegex = require('ansi-regex');

            const AnsiUp = require('ansi_up').default;
            //console.log('Found:' + AnsiUp);
            this.ansi_up = new AnsiUp;

            this.menuHandler = new MenuHandler();

            this.gmcpHandler = new GMCPHandler();

            // Init macro processor
            this.macros = new wlMacros.MacroProcessor();
            console.log(this.macros);

            const io = require("socket.io");
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
                if (document.querySelector('.modal.is-open') != null) return;

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
            let httpRequest = new XMLHttpRequest();
            httpRequest.onreadystatechange = function (event) {
                let req = <XMLHttpRequest>event.currentTarget;
                if(req.readyState === XMLHttpRequest.DONE) {
                    if(req.responseText) {
                        var lines = req.responseText.split('\n');
                        for(var i=0; i<lines.length; i++) {
                            this.writeToScreen(lines[i] + '<br/>');
                        }
                    } else {
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
            let baseUri = location.pathname.substring(0, location.pathname.lastIndexOf("/"))
            this.sock = io.connect('', {path:baseUri+'/socket.io',closeOnBeforeunload:false});
            // see: https://github.com/socketio/socket.io-client/issues/1451 (with lower 'u')

            // We received something!
            this.sock.on('stream', function(buf) {
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
                    if (cmd.length == 0 || cmd.charAt(cmd.length-1) != '\n') cmd += '\n';
                    this.send(cmd, this.pwMode);
                }
                if (msg.length > 0) this.writeToScreen(msg);
            }.bind(this));

            this.sock.on('connected', function(){
                this.writeToScreen('Verbindung zum Wunderland hergestellt.\n');
                this.connected();
            }.bind(this));
            this.sock.on('disconnected', function(){
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
                var label = document.querySelector<HTMLInputElement>('input#buttonName').value;
                cmdButton.innerHTML = label;
                var cmd = document.querySelector<HTMLInputElement>('input#buttonCmd').value;
                cmdButton.dataset.cmd = cmd;
                var send = document.querySelector<HTMLInputElement>('input#buttonSend').checked;
                cmdButton.dataset.send = send.toString();
                this.editCmdButton(cmdButtonId, label, cmd, send);
                this.micromodal.close('cmdButtonEditModalDlg');
            }.bind(this));

            // Settings

            // import settings
            document.querySelector('button#importButton').addEventListener('click', this.importSettings.bind(this), false);
            document.querySelector('button#exportButton').addEventListener('click', this.exportSettings.bind(this), false);

            // colors dialog
            document.querySelector('button#colors').addEventListener('click', function(e) {
                this.writeToScreen('Farbeinstellungen: (geht noch nicht)\n'); 
                this.setFocusToInput(); 
            }.bind(this), false);

            // toggle local echo
            document.querySelector('button#localecho').addEventListener('click', function(e) {
                this.localEcho = !this.localEcho;
                this.saveSettings();
                this.writeToScreen('Lokales Echo ist jetzt '+(this.localEcho==true ? 'an' : 'aus')+'.\n'); 
                document.querySelector('button#localecho').innerHTML = 'Local Echo: ' + (this.localEcho==true ? 'an' : 'aus') + '';
                this.setFocusToInput(); 
            }.bind(this),false );

            // open help in new tab
            document.querySelector('button#helpButton').addEventListener('click', function(e) { 
                window.open('/webclient/help.html','_blank'); 
            }, false);

            // clear screen
            document.querySelector('button#clear').addEventListener('click', function(e) { 
                var out = document.getElementById('out'); 
                while(out.firstChild) out.removeChild(out.lastChild);
                this.setFocusToInput(); 
            }.bind(this), false);

            document.getElementById('out').click(); 

            setTimeout(function(){
                this.adjustLayout();    
                this.send('\n', false);
            }.bind(this), 200);
        }
    }
}
