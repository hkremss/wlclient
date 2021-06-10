/*
 * The Wunderland Creators Editor.
 *
 * Written in TypeScript and compiled to ECMAScript.
 *
 * Build: tsc --sourceMap editor.ts
 *
 * Ideas:
 *  -
 */
var wlClient;
(function (wlClient) {
    var WLEditor = /** @class */ (function () {
        function WLEditor() {
            // We need to know the client window and socket
            this.clientWindow = null;
            this.clientInstance = null;
            // Handlers
            this.resizeHandler = null;
            this.tabsHandler = null;
            this.gmcpHandler = null;
            this.filetreeHandler = null;
        }
        // Update client window/socket to use
        WLEditor.prototype.updateClient = function (clientWin, clientInst) {
            this.clientWindow = clientWin;
            this.clientInstance = clientInst;
        };
        WLEditor.prototype.isClientConnected = function () {
            return this.clientWindow && this.clientInstance && this.clientInstance.getSocket().connected;
        };
        WLEditor.prototype.getClientSocket = function () {
            if (this.clientWindow && this.clientInstance)
                return this.clientInstance.getSocket();
            else
                return null;
        };
        WLEditor.prototype.isClientWindowClosed = function () {
            return !this.clientWindow || this.clientWindow.closed;
        };
        WLEditor.prototype.focusClientWindow = function () {
            if (!this.isClientWindowClosed())
                this.clientWindow.focus();
        };
        // Part of document body to handle storage events
        WLEditor.prototype.handle_storage = function (event) {
            console.log("STORAGE EVENT: " + event.key);
            // file list received  
            if (/^WL\.File\.List list/.test(event.key))
                this.filetreeHandler.refreshFiletree();
            // file has been transferred
            if (/^WL\.File\.Transfer path/.test(event.key))
                this.tabsHandler.refreshEditpart();
        };
        ;
        // Called once from app.js, when all required modules are loaded.
        WLEditor.prototype.startEditor = function () {
            this.resizeHandler = new wlClient.WLEditorResizeHandler();
            this.filetreeHandler = new wlClient.WLEditorFiletreeHandler();
            this.tabsHandler = new wlClient.WLEditorTabsHandler();
            this.gmcpHandler = new wlClient.WLEditorGMCPHandler();
            this.resizeHandler.initialize();
            this.gmcpHandler.initialize(this);
            this.tabsHandler.initialize(this, this.gmcpHandler);
            // rebuild existing tabs from storage items
            this.tabsHandler.refreshEditpart();
            // react on storage events
            window.addEventListener('storage', this.handle_storage, false);
        };
        WLEditor.prototype.logMessage = function (msg) {
            document.getElementById('messages').append("<span style=\"display: block;\">" + new Date().toJSON() + ": " + msg + "</span>");
            document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
        };
        return WLEditor;
    }());
    wlClient.WLEditor = WLEditor;
})(wlClient || (wlClient = {}));
/*
 * The Wunderland Creators Editor, FiletreeHandler.
 *
 * Written in TypeScript and compiled to ECMAScript.
 *
 */
var wlClient;
(function (wlClient) {
    var WLEditorFiletreeHandler = /** @class */ (function () {
        function WLEditorFiletreeHandler() {
            // micromodal = require('micromodal')
            this.micromodal = null; // MicroModal
            // the Editor, the GMCHandler, given on initialize
            this.wlEditor = null;
            this.gmcpHandler = null;
            this.currentPath = '';
            this.selectedEntry = '';
        }
        WLEditorFiletreeHandler.prototype.initialize = function (editor, gmcpHandler) {
            this.wlEditor = editor;
            this.gmcpHandler = gmcpHandler;
            if (this.micromodal == null) {
                this.micromodal = require('micromodal');
                this.micromodal.init();
            }
            /*
                        $( "ul#fileslist" ).selectable({
                            stop: function() {
                                var result = $( "#select-result" ).empty();
                                $( ".ui-selected", this ).each(function() {
                                    var index = $( "ul#fileslist li" ).index( this );
                                    if (index>=0) {
                                    index++;
                                    // from messagelist.js
                                    var path = $( "ul#fileslist" ).find('li:nth-child('+index+')').text();
                                    if (path == this.selectedEntry) {
                                        // if selected 'again', do something (kind of double click behavior)
                                        if (path.lastIndexOf('/') == -1) {
                                        // double click on a file
                                        this.gmcpHandler.SendGMCP_WL_File_Transfer(this.currentPath + "/" + path, 0); // it's a request
                                        this.wlEditor.logMessage( "Open file: " + this.currentPath + "/" + path);
                                        } else {
                                            this.gmcpHandler.SendGMCP_WL_File_List(this.currentPath + "/" + path + "*");
                                        this.wlEditor.logMessage( "Get file list for: " + this.currentPath + "/" + path);
                                        }
                                        this.selectedEntry = '';
                                    }
                                    else {
                                        // first selection
                                        this.selectedEntry = path;
                                        this.wlEditor.logMessage( "Element '" + path + "' selected.");
                                    }
                                    }
                                });
                            }
                        });
            */
        };
        WLEditorFiletreeHandler.prototype.refreshFiletree = function () {
            /*
                        var path = localStorage.getItem('WL.File.List path');
                        var list = localStorage.getItem('WL.File.List list');
            
                        if (path!=null) {
                            var currentFilename = path.replace(/^.*[\\\/]/, '');
                            this.currentPath = path.substring(0, (path.length-currentFilename.length)-1);
                        }
                        
                        // from messagelist.js
                        this.wlEditor.logMessage("Received WL.File.List update for: " + path);
            
                        $('ul#fileslist').empty();
            
                        if (list != null && list.length > 0) {
                            var fileList = JSON.parse(list);
            
                            // sort by name
                            fileList.sort(function(a, b){ return a[0] > b[0] });
            
                            if (fileList.length > 0) {
                                for (var i = 0; i < fileList.length; i++)
                                {
                                    if (fileList[i][0] == '.') continue;
                                    if (fileList[i][0] == '..' && this.currentPath == "") continue;
                                    var il = document.createElement('li');
                                    il.class='ui-widget-content';
                                    if (fileList[i][1] >= 0) {
                                    il.appendChild(document.createTextNode(fileList[i][0]));
                                    } else {
                                    il.appendChild(document.createTextNode(fileList[i][0] + '/'));
                                    }
                                    $('ul#fileslist').append(il);
                                }
                            }
                        }
            */
        };
        return WLEditorFiletreeHandler;
    }());
    wlClient.WLEditorFiletreeHandler = WLEditorFiletreeHandler;
})(wlClient || (wlClient = {}));
/*
 * The Wunderland Creators Editor, GMCPHandler.
 *
 * Written in TypeScript and compiled to ECMAScript.
 *
 */
var wlClient;
(function (wlClient) {
    // TELNET protocol
    var IAC = '\xff'; // 255
    var SB = '\xfa'; // 250 sub negotiation
    var SE = '\xf0'; // 240 end sub negotiation
    // TELNET options (WL relevant)
    var TELOPT_GMCP = '\xc9'; // 201 -> http://www.gammon.com.au/gmcp
    var WLEditorGMCPHandler = /** @class */ (function () {
        function WLEditorGMCPHandler() {
            // micromodal = require('micromodal')
            this.micromodal = null; // MicroModal
            // We need to know the editor
            this.wlEditor = null;
            // check connection status regularly
            this.connectionStatusTimer = null;
        }
        // Update client window/socket to use
        WLEditorGMCPHandler.prototype.initialize = function (editor) {
            this.wlEditor = editor;
            if (this.micromodal == null) {
                this.micromodal = require('micromodal');
                this.micromodal.init();
            }
            this.connectionStatusTimer = setInterval(function () {
                if (!this.wlEditor || !this.wlEditor.isClientConnected()) {
                    //document.querySelector<HTMLElement>('connectionStatus  .ui-icon').style.backgroundImage = "url(css/images/ui-icons_ff0000_256x240.png)";
                    document.getElementById('connectionStatus').title = "Getrennt. Bitte neu einloggen!";
                    document.getElementById('connectionStatus').textContent = "Offline";
                }
                else {
                    //document.querySelector<HTMLElement>('connectionStatus  .ui-icon').style.backgroundImage = "url(css/images/ui-icons_00ff00_256x240.png)";
                    document.getElementById('connectionStatus').title = "Verbunden mit " + this.clientWindow.location;
                    document.getElementById('connectionStatus').textContent = "Online";
                }
            }, 1000);
        };
        WLEditorGMCPHandler.prototype.tryBringClientToFront = function () {
            if (this.wlEditor.isClientWindowClosed()) {
                var windowHandle = window.open("https://wl.mud.de/client/");
                windowHandle.focus();
            }
            else {
                this.wlEditor.focusClientWindow();
            }
        };
        WLEditorGMCPHandler.prototype.SendGMCP_WL_File_List = function (path) {
            if (this.wlEditor && this.wlEditor.isClientConnected()) {
                var msg = 'WL.File.List { \"path\":' + JSON.stringify(path) + ' }';
                this.wlEditor.getClientSocket().emit('stream', IAC + SB + TELOPT_GMCP + msg + IAC + SE);
            }
            else {
                document.getElementById('infoModalDlg-title').innerHTML = 'Verbindungsfehler!';
                document.getElementById('infoModalDlg-content').innerHTML = 'Es besteht momentan keine Verbindung zum MUD, melde Dich erst wieder an!';
                this.micromodal.show('infoModalDlg');
            }
        };
        WLEditorGMCPHandler.prototype.SendGMCP_WL_File_Transfer = function (path, content) {
            if (this.wlEditor && this.wlEditor.isClientConnected()) {
                if (!content) {
                    // Request a file
                    var msg = 'WL.File.Transfer { \"path\":' + JSON.stringify(path) + ' }';
                    this.wlEditor.getClientSocket().emit('stream', IAC + SB + TELOPT_GMCP + msg + IAC + SE);
                }
                else if (content.length < 2000) {
                    // Send a file at once, offset is always 0, eof always 1 (true).
                    var msg = 'WL.File.Transfer {\"path\":' + JSON.stringify(path) + ',\"offset\":0,\"content\":' +
                        JSON.stringify(content) + ',\"eof\":1}';
                    this.wlEditor.getClientSocket().emit('stream', IAC + SB + TELOPT_GMCP + msg + IAC + SE);
                }
                else {
                    // The mud cannot handle messages bigger 5000, because this is the 
                    // maximum array size. Because we do not know about the used encoding
                    // we chop all files longer than 2048 chars into 2000 char slices
                    // for WL.File.Transfer. The mud needs to re-assemble these parts, 
                    // when eof:1 (true) is received.
                    for (var i = 0; i < content.length; i += 2000) {
                        var isEof = i + 2000 < content.length ? '0' : '1';
                        var msg = 'WL.File.Transfer {\"path\":' + JSON.stringify(path) +
                            ',\"offset\":' + JSON.stringify(i) +
                            ',\"content\":' + JSON.stringify(content.substring(i, i + 2000)) +
                            ',\"eof\":' + isEof + '}';
                        this.wlEditor.getClientSocket().emit('stream', IAC + SB + TELOPT_GMCP + msg + IAC + SE);
                    }
                }
            }
            else {
                document.getElementById('infoModalDlg-title').innerHTML = 'Verbindungsfehler!';
                document.getElementById('infoModalDlg-content').innerHTML = 'Es besteht momentan keine Verbindung zum MUD, melde Dich erst wieder an!';
                this.micromodal.show('infoModalDlg');
            }
        };
        return WLEditorGMCPHandler;
    }());
    wlClient.WLEditorGMCPHandler = WLEditorGMCPHandler;
})(wlClient || (wlClient = {}));
/*
 * The Wunderland Creators Editor, ResizeHandler.
 *
 * Written in TypeScript and compiled to ECMAScript.
 *
 */
var wlClient;
(function (wlClient) {
    var WLEditorResizeHandler = /** @class */ (function () {
        function WLEditorResizeHandler() {
        }
        WLEditorResizeHandler.prototype.initialize = function () {
            var resizable = function (resizer) {
                var direction = resizer.getAttribute('data-direction') || 'horizontal';
                var prevSibling = resizer.previousElementSibling;
                var nextSibling = resizer.nextElementSibling;
                // The current position of mouse
                var x = 0;
                var y = 0;
                var prevSiblingHeight = 0;
                var prevSiblingWidth = 0;
                var nextSiblingHeight = 0;
                var nextSiblingWidth = 0;
                // Handle the mousedown event
                // that's triggered when user drags the resizer
                var mouseDownHandler = function (e) {
                    // Get the current mouse position
                    x = e.clientX;
                    y = e.clientY;
                    var rect1 = prevSibling.getBoundingClientRect();
                    prevSiblingHeight = rect1.height;
                    prevSiblingWidth = rect1.width;
                    var rect2 = prevSibling.getBoundingClientRect();
                    nextSiblingHeight = rect2.height;
                    nextSiblingWidth = rect2.width;
                    // Attach the listeners to `document`
                    document.addEventListener('mousemove', mouseMoveHandler);
                    document.addEventListener('mouseup', mouseUpHandler);
                };
                var mouseMoveHandler = function (e) {
                    // How far the mouse has been moved
                    var dx = e.clientX - x;
                    var dy = e.clientY - y;
                    switch (direction) {
                        case 'vertical':
                            var h = (prevSiblingHeight + dy) * 100 / resizer.parentNode.getBoundingClientRect().height;
                            prevSibling.style.height = h + "%";
                            break;
                        case 'horizontal':
                        default:
                            //const w = (prevSiblingWidth + dx) * 100 / resizer.parentNode.getBoundingClientRect().width;
                            //prevSibling.style.width = `${w}%`;
                            var w1 = (prevSiblingWidth + dx);
                            prevSibling.style.width = w1 + "px";
                            var w2 = (nextSiblingWidth - dx);
                            nextSibling.style.width = w2 + "px";
                            break;
                    }
                    var cursor = direction === 'horizontal' ? 'col-resize' : 'row-resize';
                    resizer.style.cursor = cursor;
                    document.body.style.cursor = cursor;
                    prevSibling.style.userSelect = 'none';
                    prevSibling.style.pointerEvents = 'none';
                    nextSibling.style.userSelect = 'none';
                    nextSibling.style.pointerEvents = 'none';
                };
                var mouseUpHandler = function () {
                    resizer.style.removeProperty('cursor');
                    document.body.style.removeProperty('cursor');
                    prevSibling.style.removeProperty('user-select');
                    prevSibling.style.removeProperty('pointer-events');
                    nextSibling.style.removeProperty('user-select');
                    nextSibling.style.removeProperty('pointer-events');
                    // Remove the handlers of `mousemove` and `mouseup`
                    document.removeEventListener('mousemove', mouseMoveHandler);
                    document.removeEventListener('mouseup', mouseUpHandler);
                };
                // Attach the handler
                resizer.addEventListener('mousedown', mouseDownHandler);
            };
            // Query all resizers
            document.querySelectorAll('.resizer').forEach(function (ele) {
                resizable(ele);
            });
            // called on any window resize
            window.addEventListener('resize', this.adjustLayout);
        };
        // adjust layout (especially editor div sizes)
        WLEditorResizeHandler.prototype.adjustLayout = function () {
            var thePage = document.getElementById('page');
            var theFiletree = document.getElementById('filetree');
            var theTabs = document.getElementById('tabs');
            var theMessages = document.getElementById('messages');
            var pWidth = thePage.clientWidth;
            var tWidth = theFiletree.clientWidth;
            //theTabs.style.width = (pWidth-(tWidth+10)) + 'px';
            //theMessages.style.width = (pWidth-(tWidth+10)) + 'px';
        };
        return WLEditorResizeHandler;
    }());
    wlClient.WLEditorResizeHandler = WLEditorResizeHandler;
})(wlClient || (wlClient = {}));
/*
 * The Wunderland Creators Editor, TabsHandler.
 *
 * Written in TypeScript and compiled to ECMAScript.
 *
 */
var wlClient;
(function (wlClient) {
    var WLEditorTabsHandler = /** @class */ (function () {
        function WLEditorTabsHandler() {
            // micromodal = require('micromodal')
            this.micromodal = null; // MicroModal
            // count 'change' events per document to know, if autosave is necessary or not
            this.editpart_changes = {};
            // the Editor, the GMCHandler, given on initialize
            this.wlEditor = null;
            this.gmcpHandler = null;
        }
        WLEditorTabsHandler.prototype.myTabClicks = function (tabClickEvent) {
            // store tabs variable
            var myTabs = document.querySelectorAll("ul.nav-tabs > li");
            for (var i = 0; i < myTabs.length; i++) {
                myTabs[i].classList.remove("active");
            }
            var clickedTab = tabClickEvent.currentTarget;
            clickedTab.classList.add("active");
            tabClickEvent.preventDefault();
            var myContentPanes = document.querySelectorAll(".tab-pane");
            for (var i = 0; i < myContentPanes.length; i++) {
                myContentPanes[i].classList.remove("active");
            }
            var anchorReference = tabClickEvent.target;
            var activePaneId = anchorReference.getAttribute("href");
            var activePane = document.querySelector(activePaneId);
            activePane.classList.add("active");
            var cm = this.getActiveTabCM();
            if (cm)
                cm.refresh();
        };
        // Close icon: removing the tab on click
        WLEditorTabsHandler.prototype.tabCloseIconClicked = function () {
            //
            // TODO: Ask user, if he wants to do this, if editor is dirty!
            //
            /*
                        var panelId = $( this ).closest( "li" ).remove().attr( "aria-controls" );
                        $( "#" + panelId ).remove();
                        tabs.tabs( "refresh" );
            
                        var id = this.getNumFromId(panelId);
            
                        var localFileList = localStorage.getItem('wl.editor.localFileList');
            
                        if (localFileList) {
                            localFileList = JSON.parse(localFileList);
            
                            // remove item in local storage and in file list
                            if (localFileList[id]) {
                                localStorage.removeItem('wl.editor.localFile.'+id);
                                delete this.localFileList[id];
                                localStorage.setItem('wl.editor.localFileList', JSON.stringify(localFileList));
                            }
            
                            // refresh buttons
                            this.refresh_edit_buttons(Object.keys(localFileList).length > 0);
                        }
            */
        };
        WLEditorTabsHandler.prototype.initialize = function (editor, gmcpHandler) {
            var _this = this;
            this.wlEditor = editor;
            this.gmcpHandler = gmcpHandler;
            if (this.micromodal == null) {
                this.micromodal = require('micromodal');
                this.micromodal.init();
            }
            // store tabs variable
            var myTabs = document.querySelectorAll("ul.nav-tabs > li > a");
            for (var i = 0; i < myTabs.length; i++) {
                myTabs[i].addEventListener("click", this.myTabClicks.bind(this));
                //tabs.on( "click", "span.ui-icon-close", this.tabCloseIconClicked()
            }
            var autosaveTimer = setInterval(function () {
                var activeTab = _this.getActiveTab();
                if (activeTab) {
                    var cm = activeTab.children[0]['CodeMirror'];
                    if (cm && _this.editpart_changes[activeTab.id] && _this.editpart_changes[activeTab.id] > 0) {
                        _this.wlEditor.logMessage("Autosave...");
                        var content = cm.getDoc().getValue();
                        var num = _this.getNumFromId(activeTab.id);
                        localStorage.setItem('wl.editor.localFile.' + num, content);
                        _this.editpart_changes[activeTab.id] = 0;
                    }
                }
            }, 30000);
        };
        /* helper to extract number from ids, eg. editor-tab-3, editor-fname-3 would return 3 */
        WLEditorTabsHandler.prototype.getNumFromId = function (tabId) {
            return tabId.replace(/^.*[-]/, '');
        };
        /* helper to get the active tab */
        WLEditorTabsHandler.prototype.getActiveTab = function () {
            //return document.querySelector("tabs div.ui-tabs-panel[aria-hidden='false']");
            return document.querySelector("div.tab-content div.tab-pane.active");
        };
        /* helper to get active code mirror */
        WLEditorTabsHandler.prototype.getActiveTabCM = function () {
            var cm;
            var activeTab = this.getActiveTab();
            if (activeTab) {
                cm = activeTab.children[0]['CodeMirror'];
            }
            return cm;
        };
        /* helper to get the localFileList from storage as associated array */
        WLEditorTabsHandler.prototype.getLocalFileList = function () {
            var localFileListStr = localStorage.getItem('wl.editor.localFileList');
            var localFileList = {};
            if (localFileListStr) {
                localFileList = JSON.parse(localFileListStr);
            }
            return localFileList;
        };
        /* helper to put localFileList into storage */
        WLEditorTabsHandler.prototype.setLocalFileList = function (localFileList) {
            localStorage.setItem('wl.editor.localFileList', JSON.stringify(localFileList));
        };
        /* helper to get the active internal file number - index of wl.editor.localFileList */
        WLEditorTabsHandler.prototype.getActiveFileNum = function () {
            var num;
            var activeTab = this.getActiveTab();
            if (activeTab) {
                num = this.getNumFromId(activeTab.id);
            }
            return num;
        };
        WLEditorTabsHandler.prototype.transferActiveTabFileToServer = function () {
            var activeTab = this.getActiveTab();
            if (activeTab) {
                var cm = activeTab.children[0]['CodeMirror'];
                var content = cm.getDoc().getValue();
                var num = this.getNumFromId(activeTab.id);
                var localFileList = this.getLocalFileList();
                var path = localFileList[num][0];
                var oldMD5 = localFileList[num][2];
                var newMD5 = webtoolkit.MD5.md5(content);
                //if (oldMD5 == newMD5) {
                //document.getElementById('infoModalDlg-title').innerHTML = 'Hinweis!';
                //document.getElementById('infoModalDlg-content').innerHTML = 'Es wurden keine Änderungen festgestellt.';
                //micromodal.show('infoModalDlg');
                //}
                //  localFileList[freeID] = [ path, content.length, md5(content) ];
                //  setLocalFileList(localFileList);
                this.gmcpHandler.SendGMCP_WL_File_Transfer(path, content);
                document.getElementById('infoModalDlg-title').innerHTML = 'Hinweis!';
                document.getElementById('infoModalDlg-content').innerHTML = 'Datei wurde gesendet, aber keine Empfangsbestätigung empfangen! ' +
                    'Hier ist etwas noch nicht ganz fertig.<br>Oder kaputt? :-/';
                this.micromodal.show('infoModalDlg');
            }
        };
        WLEditorTabsHandler.prototype.refreshEditpart = function () {
            var MAX_SLOTS = 5;
            var path = localStorage.getItem('WL.File.Transfer path');
            var content = localStorage.getItem('WL.File.Transfer content');
            var localFileList = this.getLocalFileList();
            // received new file, note: content can be an empty string!
            if (typeof (path) === 'string' && path.length > 0 && typeof (content) === 'string') {
                // find free ID
                var numberSlots = Object.keys(localFileList).length;
                var freeID = 1;
                for (; freeID < numberSlots + 1; freeID++) {
                    if (!localFileList[freeID])
                        break;
                }
                // use freeID to transfer new file to free slot
                if (freeID <= MAX_SLOTS) {
                    localFileList[freeID] = [path, content.length, webtoolkit.MD5.md5(content)];
                    this.setLocalFileList(localFileList);
                    localStorage.setItem('wl.editor.localFile.' + freeID, content);
                    localStorage.removeItem('WL.File.Transfer path');
                    localStorage.removeItem('WL.File.Transfer content');
                    this.wlEditor.logMessage("New file transferred to slot " + freeID + ".");
                }
                else {
                    localStorage.removeItem('WL.File.Transfer path');
                    localStorage.removeItem('WL.File.Transfer content');
                    this.wlEditor.logMessage("Can't transfer new file to free slot! (max " + MAX_SLOTS + " allowed)");
                    document.getElementById('infoModalDlg-title').innerHTML = 'Zu viele offene Dateien!';
                    document.getElementById('infoModalDlg-content').innerHTML = 'Es sind bereits ' + MAX_SLOTS + ' Dateien ge&ouml;ffnet! Du musst erst ' +
                        'eine schlie&szlig;en, bevor Du eine weitere &ouml;ffnen kannst.';
                    this.micromodal.show('infoModalDlg');
                }
            }
            // check if there is a tab for each slot and create new
            var allIDs = Object.keys(localFileList);
            var tabToActivate = -1;
            for (var i = 0; i < allIDs.length; i++) {
                var tab = document.getElementById('editor-fname-' + allIDs[i]);
                tabToActivate = i;
                // check if tab exists (editor element not found)
                if (tab == null) {
                    var path_1 = localFileList[allIDs[i]][0];
                    var fname = path_1.replace(/^.*[\\\/]/, '');
                    var fext = (path_1.match(/[^\.]+$/))[0];
                    var content_1 = localStorage.getItem('wl.editor.localFile.' + allIDs[i]);
                    this.wlEditor.logMessage("Create new tab for: " + localFileList[allIDs[i]][0]);
                    // create tab handle first:
                    //
                    // <li style="margin-top:0">
                    //   <a id="editor-fname-1" href="#editor-tab-1">One</a>
                    //   <span class="ui-icon ui-icon-close" role="presentation">Close</span>
                    // </li>
                    /*
                                        {
                                            var modifiedSpan = document.createElement('span');
                                            modifiedSpan.title="File is modified";
                                            modifiedSpan.appendChild(document.createTextNode(""));
                    
                                            var closeSpan = document.createElement('span');
                                            closeSpan.className="ui-icon ui-icon-close";
                                            closeSpan.setAttribute("role", "presentation");
                                            closeSpan.title="Close tab";
                                            closeSpan.appendChild(document.createTextNode("Close"));
                    
                                            var a = document.createElement('a');
                                            a.id = "editor-fname-" + allIDs[i];
                                            a.href = "#editor-tab-" + allIDs[i];
                                            var textNode = document.createTextNode(fname);
                                            a.appendChild(textNode);
                    
                                            var li = document.createElement('li');
                                            //li.className="ui-tabs-tab ui-corner-top ui-state-default ui-tab";
                                            li.style.marginTop = "0";
                                            li.setAttribute("role", "tab");
                                            li.title=path;
                                            li.appendChild(a);
                                            li.appendChild(modifiedSpan);
                                            li.appendChild(closeSpan);
                    
                                            document.querySelector('tabs ul:first').append(li);
                    
                                            // create tab content div:
                                            //
                                            // <div id="editor-tab-11" style="padding:0 0 0 1px;height:calc(100% - 32px)"></div>
                                            var div = document.createElement('div');
                                            div.id = "editor-tab-" + allIDs[i];
                                            div.style.padding = "0 0 0 1px";
                                            div.style.height = "calc(100% - 32px)";
                                            div.style.fontSize = "1.1em";
                                            document.getElementById( 'tabs').append(div);
                                        }
                    */
                    //<div id="tab-1" class="tab-pane active"> 
                    //  <span class="glyphicon glyphicon-leaf glyphicon--home--feature two columns text-center"></span>
                    //  <span class="col-md-10">
                    //    <h3>Feature 1</h3>
                    //    <p>Lorem ipsum dolor sit amet, consectetur adipisicing elit.</p>
                    //  </span>
                    //</div> 
                    var tabDiv = document.createElement('div');
                    tabDiv.id = "editor-tab-" + allIDs[i];
                    tabDiv.classList.add("tab-pane");
                    tabDiv.style.padding = "0 0 0 1px";
                    tabDiv.style.height = "height:calc(100% - 32px)";
                    tabDiv.style.fontSize = "1.1em";
                    //var span1 = document.createElement('span');
                    //span1.className = "glyphicon glyphicon-leaf glyphicon--home--feature two columns text-center";
                    //tabDiv.appendChild(span1);
                    //var span2 = document.createElement('span');
                    //span2.className = "col-md-10";
                    //tabDiv.appendChild(span2);
                    //var body = document.createElement('p');
                    //span2.appendChild(body);                    
                    //body.appendChild(document.createTextNode(content));
                    document.querySelector("div .tab-content").append(tabDiv);
                    //<ul class="nav nav-tabs">
                    //  <li class="active"><a href="#tab-1">Tab 1</a></li>
                    //  <li class=""><a href="#tab-2">Tab 2</a></li>
                    //  <li class=""><a href="#tab-3">Tab 3</a></li>
                    //</ul>
                    var tabLi = document.createElement('li');
                    tabLi.className = "";
                    var tabLiA = document.createElement('a');
                    tabLi.appendChild(tabLiA);
                    tabLiA.addEventListener("click", this.myTabClicks.bind(this));
                    tabLiA.href = "#editor-tab-" + allIDs[i];
                    tabLiA.appendChild(document.createTextNode(fname));
                    tabLiA.title = path_1;
                    var dirtySpan = document.createElement('span');
                    tabLi.appendChild(dirtySpan);
                    dirtySpan.title = "File is modified";
                    var iconSpan = document.createElement('span');
                    tabLi.appendChild(iconSpan);
                    iconSpan.classList.add("ui-icon", "ui-icon-close");
                    iconSpan.title = "Close tab";
                    document.querySelector("ul.nav.nav-tabs").appendChild(tabLi);
                    var editMode = "htmlmixed";
                    switch (fext.toLowerCase()) {
                        case "c":
                            editMode = "text/x-csrc";
                            break;
                        case "h":
                            editMode = "text/x-csrc";
                            break;
                        case "css":
                            editMode = "text/css";
                            break;
                        case "html":
                            editMode = "text/html";
                            break;
                        case "js":
                            editMode = "text/javascript";
                            break;
                        case "json":
                            editMode = "text/javascript";
                            break;
                        case "xml":
                            editMode = "text/xml";
                            break;
                        default: editMode = "text/x-csrc";
                    }
                    // finally create CodeMirror in this div and fill it's content
                    var CodeMirror = require('lib/codemirror');
                    var editor = new CodeMirror(tabDiv, {
                        height: "100%",
                        lineNumbers: true,
                        autoRefresh: true,
                        //                        value: content,
                        // tabSize: 2,
                        //mode: "clike",
                        mode: editMode,
                        matchBrackets: true,
                    });
                    // detect changes from now on and mark the tab with a asterisk
                    editor.changeGeneration();
                    editor.on("change", function (cm, change) {
                        var activeTab = this.getActiveTab();
                        if (!this.editpart_changes[activeTab.id])
                            this.editpart_changes[activeTab.id] = 1;
                        else
                            this.editpart_changes[activeTab.id] += 1;
                        if (cm.getDoc().isClean()) {
                            //document.querySelector('tabs .ui-tabs-active span:first').textContent = "";
                            document.querySelector('ul.nav.nav-tabs > li.active > span:first-of-type').textContent = "";
                        }
                        else {
                            //document.querySelector('#tabs .ui-tabs-active span:first').textContent = "*";
                            document.querySelector('ul.nav.nav-tabs > li.active > span:first-of-type').textContent = "*";
                        }
                    }.bind(this));
                    editor.getDoc().setValue(content_1);
                    setTimeout(function () { editor.refresh(); }, 100);
                    //editor.refresh();
                }
            }
            // refresh layout
            //document.getElementById( "tabs" ).tabs( "refresh" );
            // if we have tabs, activate the last
            //document.getElementById( "tabs" ).tabs( "option", "active", tabToActivate );
            // refresh buttons
            this.refresh_edit_buttons(tabToActivate >= 0);
        };
        // Refresh save/undo/redo buttons state
        WLEditorTabsHandler.prototype.refresh_edit_buttons = function (canEditSomething) {
            if (canEditSomething) {
                document.getElementById("save").disabled = false;
                document.getElementById("saveas").disabled = false;
                document.getElementById("undo").disabled = false;
                document.getElementById("redo").disabled = false;
            }
            else {
                document.getElementById("save").disabled = true;
                document.getElementById("saveas").disabled = true;
                document.getElementById("undo").disabled = true;
                document.getElementById("redo").disabled = true;
            }
        };
        return WLEditorTabsHandler;
    }());
    wlClient.WLEditorTabsHandler = WLEditorTabsHandler;
})(wlClient || (wlClient = {}));
/**
*
*  MD5 (Message-Digest Algorithm)
*  Original: http://www.webtoolkit.info/
*
**/
var webtoolkit;
(function (webtoolkit) {
    var MD5 = /** @class */ (function () {
        function MD5() {
        }
        MD5.md5 = function (str) {
            var RotateLeft = function (lValue, iShiftBits) {
                return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits));
            };
            var AddUnsigned = function (lX, lY) {
                var lX4, lY4, lX8, lY8, lResult;
                lX8 = (lX & 0x80000000);
                lY8 = (lY & 0x80000000);
                lX4 = (lX & 0x40000000);
                lY4 = (lY & 0x40000000);
                lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
                if (lX4 & lY4) {
                    return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
                }
                if (lX4 | lY4) {
                    if (lResult & 0x40000000) {
                        return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
                    }
                    else {
                        return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
                    }
                }
                else {
                    return (lResult ^ lX8 ^ lY8);
                }
            };
            var F = function (x, y, z) { return (x & y) | ((~x) & z); };
            var G = function (x, y, z) { return (x & z) | (y & (~z)); };
            var H = function (x, y, z) { return (x ^ y ^ z); };
            var I = function (x, y, z) { return (y ^ (x | (~z))); };
            var FF = function (a, b, c, d, x, s, ac) {
                a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac));
                return AddUnsigned(RotateLeft(a, s), b);
            };
            var GG = function (a, b, c, d, x, s, ac) {
                a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac));
                return AddUnsigned(RotateLeft(a, s), b);
            };
            var HH = function (a, b, c, d, x, s, ac) {
                a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac));
                return AddUnsigned(RotateLeft(a, s), b);
            };
            var II = function (a, b, c, d, x, s, ac) {
                a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac));
                return AddUnsigned(RotateLeft(a, s), b);
            };
            var Utf8Encode = function (str) {
                str = str.replace(/\r\n/g, "\n");
                var utftext = "";
                for (var n = 0; n < str.length; n++) {
                    var c = str.charCodeAt(n);
                    if (c < 128) {
                        utftext += String.fromCharCode(c);
                    }
                    else if ((c > 127) && (c < 2048)) {
                        utftext += String.fromCharCode((c >> 6) | 192);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }
                    else {
                        utftext += String.fromCharCode((c >> 12) | 224);
                        utftext += String.fromCharCode(((c >> 6) & 63) | 128);
                        utftext += String.fromCharCode((c & 63) | 128);
                    }
                }
                return utftext;
            };
            var ConvertToWordArray = function (str) {
                var lWordCount;
                var lMessageLength = str.length;
                var lNumberOfWords_temp1 = lMessageLength + 8;
                var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
                var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
                var lWordArray = Array(lNumberOfWords - 1);
                var lBytePosition = 0;
                var lByteCount = 0;
                while (lByteCount < lMessageLength) {
                    lWordCount = (lByteCount - (lByteCount % 4)) / 4;
                    lBytePosition = (lByteCount % 4) * 8;
                    lWordArray[lWordCount] = (lWordArray[lWordCount] | (str.charCodeAt(lByteCount) << lBytePosition));
                    lByteCount++;
                }
                lWordCount = (lByteCount - (lByteCount % 4)) / 4;
                lBytePosition = (lByteCount % 4) * 8;
                lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
                lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
                lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
                return lWordArray;
            };
            var WordToHex = function (lValue) {
                var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
                for (lCount = 0; lCount <= 3; lCount++) {
                    lByte = (lValue >>> (lCount * 8)) & 255;
                    WordToHexValue_temp = "0" + lByte.toString(16);
                    WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
                }
                return WordToHexValue;
            };
            var x = Array();
            var k, AA, BB, CC, DD, a, b, c, d;
            var S11 = 7, S12 = 12, S13 = 17, S14 = 22;
            var S21 = 5, S22 = 9, S23 = 14, S24 = 20;
            var S31 = 4, S32 = 11, S33 = 16, S34 = 23;
            var S41 = 6, S42 = 10, S43 = 15, S44 = 21;
            str = Utf8Encode(str);
            x = ConvertToWordArray(str);
            a = 0x67452301;
            b = 0xEFCDAB89;
            c = 0x98BADCFE;
            d = 0x10325476;
            for (k = 0; k < x.length; k += 16) {
                AA = a;
                BB = b;
                CC = c;
                DD = d;
                a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478);
                d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756);
                c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB);
                b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
                a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF);
                d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A);
                c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613);
                b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
                a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8);
                d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF);
                c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1);
                b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
                a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122);
                d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193);
                c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E);
                b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
                a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562);
                d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340);
                c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51);
                b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
                a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D);
                d = GG(d, a, b, c, x[k + 10], S22, 0x2441453);
                c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681);
                b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
                a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6);
                d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6);
                c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87);
                b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
                a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905);
                d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8);
                c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9);
                b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
                a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942);
                d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681);
                c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122);
                b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
                a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44);
                d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9);
                c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60);
                b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
                a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6);
                d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA);
                c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085);
                b = HH(b, c, d, a, x[k + 6], S34, 0x4881D05);
                a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039);
                d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5);
                c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8);
                b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
                a = II(a, b, c, d, x[k + 0], S41, 0xF4292244);
                d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97);
                c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7);
                b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
                a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3);
                d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92);
                c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D);
                b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
                a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F);
                d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0);
                c = II(c, d, a, b, x[k + 6], S43, 0xA3014314);
                b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
                a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82);
                d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235);
                c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB);
                b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
                a = AddUnsigned(a, AA);
                b = AddUnsigned(b, BB);
                c = AddUnsigned(c, CC);
                d = AddUnsigned(d, DD);
            }
            var temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d);
            return temp.toLowerCase();
        };
        return MD5;
    }());
    webtoolkit.MD5 = MD5;
})(webtoolkit || (webtoolkit = {}));
//# sourceMappingURL=editor.js.map