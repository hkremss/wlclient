/* 
 * The Wunderland Creators Editor, TabsHandler.
 *
 * Written in TypeScript and compiled to ECMAScript.
 * 
 */

namespace wlClient {

    export class WLEditorTabsHandler {

        // micromodal = require('micromodal')
        private micromodal = null; // MicroModal

        // count 'change' events per document to know, if autosave is necessary or not
        private editpart_changes = {};

        // the Editor, the GMCHandler, given on initialize
        private wlEditor: WLEditor = null;
        private gmcpHandler: WLEditorGMCPHandler = null;

        private myTabClicks(tabClickEvent) {
            // store tabs variable
            let myTabs = document.querySelectorAll("ul.nav-tabs > li");

            for (let i = 0; i < myTabs.length; i++) {
                myTabs[i].classList.remove("active");
            }
            let clickedTab = tabClickEvent.currentTarget;
            clickedTab.classList.add("active");
            tabClickEvent.preventDefault();
            let myContentPanes = document.querySelectorAll(".tab-pane");
            for (let i = 0; i < myContentPanes.length; i++) {
                myContentPanes[i].classList.remove("active");
            }
            let anchorReference = tabClickEvent.target;
            let activePaneId = anchorReference.getAttribute("href") || anchorReference.children[0].getAttribute("href"); // clicked tab or link
            let activePane = document.querySelector(activePaneId);
            activePane.classList.add("active");

            let cm = this.getActiveTabCM();
            if (cm) cm.refresh();
        }

        // Close icon: removing the tab on click
        private tabCloseIconClicked(tabCloseEvent) {
            //
            // TODO: Ask user, if he wants to do this, if editor is dirty!
            //
            let closeIcon = tabCloseEvent.target;
            let closeTab = closeIcon.parentNode;
            let editPaneId = closeTab.children[0].getAttribute("href"); // clicked tab or link
            let editPane = document.querySelector(editPaneId);

            var id = this.getNumFromId(editPaneId);

            // close/remove edit pane + tab
            editPane.remove();
            closeTab.remove();

            // remove file from local file list
            var localFileList = localStorage.getItem('wl.editor.localFileList');

            if (localFileList) {
                localFileList = JSON.parse(localFileList);

                // remove item in local storage and in file list
                if (localFileList[id]) {
                    localStorage.removeItem('wl.editor.localFile.'+id);
                    delete localFileList[id];
                    localStorage.setItem('wl.editor.localFileList', JSON.stringify(localFileList));
                }

                // refresh buttons
                this.refresh_edit_buttons(Object.keys(localFileList).length > 0);
            }

            // prevent other event handlers
            tabCloseEvent.preventDefault();
        }

        public initialize(editor: WLEditor, gmcpHandler : WLEditorGMCPHandler) {

            this.wlEditor = editor;
            this.gmcpHandler = gmcpHandler;

            if (this.micromodal == null) {
                this.micromodal = require('micromodal');
                this.micromodal.init();
            }
    
            // store tabs variable
            let myTabs = document.querySelectorAll("ul.nav-tabs > li");

            for (let i = 0; i < myTabs.length; i++) {
                myTabs[i].addEventListener('click', this.myTabClicks.bind(this));
                myTabs[i].querySelector('.ui-icon-close').addEventListener('click', this.tabCloseIconClicked.bind(this));
            }

            var autosaveTimer = setInterval( () => {
                var activeTab = this.getActiveTab();
                if (activeTab) {
                    var cm = activeTab.children[0]['CodeMirror'];
                    if (cm && this.editpart_changes[activeTab.id] && this.editpart_changes[activeTab.id]>0) {
                        this.wlEditor.logMessage("Autosave...");
                        var content = cm.getDoc().getValue();
                        var num = this.getNumFromId(activeTab.id);
                        localStorage.setItem('wl.editor.localFile.'+num, content);
                        this.editpart_changes[activeTab.id] = 0;
                    }
                }
            }, 30000);

        }

        /* helper to extract number from ids, eg. editor-tab-3, editor-fname-3 would return 3 */
        private getNumFromId(tabId: String) : string {
            return tabId.replace(/^.*[-]/, '');
        }

        /* helper to get the active tab */
        private getActiveTab() : Element {
            //return document.querySelector("tabs div.ui-tabs-panel[aria-hidden='false']");
            return document.querySelector("div.tab-content div.tab-pane.active");
        }

        /* helper to get active code mirror */
        private getActiveTabCM() : any {
            let cm;
            let activeTab = this.getActiveTab();
            if (activeTab) {
                cm = activeTab.children[0]['CodeMirror'];
            }
            return cm;
        }

        /* helper to get the localFileList from storage as associated array */
        private getLocalFileList() : any {
            let localFileListStr = localStorage.getItem('wl.editor.localFileList');
            let localFileList = {};

            if (localFileListStr) {
                localFileList = JSON.parse(localFileListStr);
            }

            return localFileList;
        }

        /* helper to put localFileList into storage */
        private setLocalFileList(localFileList: string) {
            localStorage.setItem('wl.editor.localFileList', JSON.stringify(localFileList));
        }

        /* helper to get the active internal file number - index of wl.editor.localFileList */
        private getActiveFileNum() : string {
            var num;
            let activeTab = this.getActiveTab();
            if (activeTab) {
                num = this.getNumFromId(activeTab.id);
            }
            return num;
        }

        private transferActiveTabFileToServer() {
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
                document.getElementById('infoModalDlg-content').innerHTML = 'Datei wurde gesendet, aber keine Empfangsbestätigung empfangen! '+
                'Hier ist etwas noch nicht ganz fertig.<br>Oder kaputt? :-/';
                this.micromodal.show('infoModalDlg');
            }
        }

        public refreshEditpart() {

            const MAX_SLOTS = 5;

            var path = localStorage.getItem('WL.File.Transfer path');
            var content = localStorage.getItem('WL.File.Transfer content');
            var localFileList = this.getLocalFileList();

            // received new file, note: content can be an empty string!
            if (typeof(path) === 'string' && path.length>0 && typeof(content) === 'string') {
                // find free ID
                var numberSlots = Object.keys(localFileList).length;
                var freeID = 1;
                for (; freeID < numberSlots+1; freeID++) {
                    if (!localFileList[freeID]) break;
                }

                // use freeID to transfer new file to free slot
                if (freeID <= MAX_SLOTS) {
                    localFileList[freeID] = [ path, content.length, webtoolkit.MD5.md5(content) ];
                    this.setLocalFileList(localFileList);
                    localStorage.setItem('wl.editor.localFile.'+freeID, content);
                    localStorage.removeItem('WL.File.Transfer path');
                    localStorage.removeItem('WL.File.Transfer content');
                    this.wlEditor.logMessage("New file transferred to slot " + freeID + ".");
                }
                else {
                    localStorage.removeItem('WL.File.Transfer path');
                    localStorage.removeItem('WL.File.Transfer content');
                    this.wlEditor.logMessage("Can't transfer new file to free slot! (max "+MAX_SLOTS+" allowed)");

                    document.getElementById('infoModalDlg-title').innerHTML = 'Zu viele offene Dateien!';
                    document.getElementById('infoModalDlg-content').innerHTML = 'Es sind bereits ' + MAX_SLOTS + ' Dateien ge&ouml;ffnet! Du musst erst ' +
                            'eine schlie&szlig;en, bevor Du eine weitere &ouml;ffnen kannst.';
                    this.micromodal.show('infoModalDlg');
                }
            }

            // check if there is a tab for each slot and create new
            var allIDs = Object.keys(localFileList);
            var tabToActivate = -1;
            for (let i = 0; i < allIDs.length; i++) {
                var tab = document.getElementById('editor-fname-' + allIDs[i]);

                tabToActivate = i;

                // check if tab exists (editor element not found)
                if (tab == null) {
                    let path = localFileList[allIDs[i]][0];
                    let fname = path.replace(/^.*[\\\/]/, '');
                    let fext = (path.match(/[^\.]+$/))[0];
                    let content = localStorage.getItem('wl.editor.localFile.'+allIDs[i]);

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
                    let tabDiv = document.createElement<"div">('div');
                    tabDiv.id = "editor-tab-" + allIDs[i];
                    tabDiv.classList.add('tab-pane');
                    if (i===0) tabDiv.classList.add('active');
                    //tabDiv.style.padding = "0 0 0 1px";
                    //tabDiv.style.height = "height:calc(100% - 32px)";
                    //tabDiv.style.fontSize = "1.1em";
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
                    let tabLi = document.createElement<"li">('li');
                    if (i===0)
                        tabLi.className = 'active';
                    else
                        tabLi.className = '';

                    let tabLiA = document.createElement<'a'>('a');
                    tabLi.appendChild(tabLiA);
                    tabLi.addEventListener("click", this.myTabClicks.bind(this));
                    tabLiA.href="#editor-tab-" + allIDs[i];
                    tabLiA.appendChild(document.createTextNode(fname));
                    tabLiA.title = path;
                    let dirtySpan = document.createElement<'span'>('span');
                    tabLi.appendChild(dirtySpan);
                    dirtySpan.title = "File is modified";
                    let iconSpan = document.createElement<'span'>('span');
                    tabLi.appendChild(iconSpan);
                    iconSpan.classList.add("ui-icon","ui-icon-close");
                    iconSpan.title = "Close tab";
                    iconSpan.addEventListener('click', this.tabCloseIconClicked.bind(this));
                    document.querySelector("ul.nav.nav-tabs").appendChild(tabLi);

                    var editMode = "htmlmixed";

                    switch (fext.toLowerCase()) {
                        case "c":    editMode = "text/x-csrc"; break;
                        case "h":    editMode = "text/x-csrc"; break;
                        case "css":  editMode = "text/css"; break;
                        case "html": editMode = "text/html"; break;
                        case "js":   editMode = "text/javascript"; break;
                        case "json": editMode = "text/javascript"; break;
                        case "xml":  editMode = "text/xml"; break;
                        default:     editMode = "text/x-csrc";
                    }

                    // finally create CodeMirror in this div and fill it's content
                    const CodeMirror = require('lib/codemirror');
                    var editor = new CodeMirror(tabDiv, {
                        height: "100%",
                        lineNumbers: true,
                        autoRefresh:true,
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
                        if (activeTab) {
                            if (!this.editpart_changes[activeTab.id])
                                this.editpart_changes[activeTab.id]=1;
                            else
                                this.editpart_changes[activeTab.id]+=1;
                            if (cm.getDoc().isClean()) {
                                //document.querySelector('tabs .ui-tabs-active span:first').textContent = "";
                                document.querySelector('ul.nav.nav-tabs > li.active > span:first-of-type').textContent = "";
                            } else {
                                //document.querySelector('#tabs .ui-tabs-active span:first').textContent = "*";
                                document.querySelector('ul.nav.nav-tabs > li.active > span:first-of-type').textContent = "*";
                            }
                        }
                    }.bind(this));
                    editor.getDoc().setValue(content);
                    setTimeout(function() { editor.refresh(); }, 100);
                    //editor.refresh();
                }
            }

            // refresh layout
            //document.getElementById( "tabs" ).tabs( "refresh" );

            // if we have tabs, activate the last
            //document.getElementById( "tabs" ).tabs( "option", "active", tabToActivate );

            // refresh buttons
            this.refresh_edit_buttons(tabToActivate>=0);
        }

        // Refresh save/undo/redo buttons state
        private refresh_edit_buttons(canEditSomething: boolean) {
            if (canEditSomething) {
                (<HTMLInputElement> document.getElementById( "save" )).disabled = false;
                (<HTMLInputElement> document.getElementById( "saveas" )).disabled = false;
                (<HTMLInputElement> document.getElementById( "undo" )).disabled = false;
                (<HTMLInputElement> document.getElementById( "redo" )).disabled = false;
            } else {
                (<HTMLInputElement> document.getElementById( "save" )).disabled = true;
                (<HTMLInputElement> document.getElementById( "saveas" )).disabled = true;
                (<HTMLInputElement> document.getElementById( "undo" )).disabled = true;
                (<HTMLInputElement> document.getElementById( "redo" )).disabled = true;
            }
        }
    }
}
