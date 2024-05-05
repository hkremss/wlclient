// Part of document body to handle the editor tabs functionality

"use strict";

// micromodal = require('micromodal')
var micromodal = null; // MicroModal

/* helper to extract number from ids, eg. editor-tab-3, editor-fname-3 would return 3 */
function getNumFromId(id) {
  return id.replace(/^.*[-]/, '');
}

/* helper to get the active tab */
function getActiveTab() {
  return document.querySelector("#tabs div.ui-tabs-panel[aria-hidden='false']");
}

/* helper to get active code mirror */
function getActiveTabCM() {
  var cm;
  var activeTab = getActiveTab();
  if (activeTab) {
    cm = activeTab.children[0].CodeMirror;
  }
  return cm;
}

/* helper to get the localFileList from storage as associated array */
function getLocalFileList() {
  var localFileList = localStorage.getItem('wl.editor.localFileList');

  if (localFileList) {
    localFileList = JSON.parse(localFileList);
  } else {
    localFileList = {};
  }

  return localFileList;
}

/* helper to put localFileList into storage */
function setLocalFileList(localFileList) {
  localStorage.setItem('wl.editor.localFileList', JSON.stringify(localFileList));
}

/* helper to get the active internal file number - index of wl.editor.localFileList */
function getActiveFileNum() {
  var num;
  var activeTab = getActiveTab();
  if (tab) {
    num = getNumFromId(activeTab.id);
  }
  return num;
}

function initialize_editpart() {
  var tabs = $( "#tabs" ).tabs();

  if (micromodal == null) {
    micromodal = require('micromodal');
    micromodal.init();
  }

  // Close icon: removing the tab on click
  tabs.on( "click", "span.ui-icon-close", function() {

    //
    // TODO: Ask user, if he wants to do this, if editor is dirty!
    //

    var panelId = $( this ).closest( "li" ).remove().attr( "aria-controls" );
    $( "#" + panelId ).remove();
    tabs.tabs( "refresh" );

    var id = getNumFromId(panelId);

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
      refresh_edit_buttons(Object.keys(localFileList).length > 0);
    }
  });

  tabs.on( "keyup", function( event ) {
    if ( event.altKey && event.keyCode === $.ui.keyCode.BACKSPACE ) {
      var panelId = tabs.find( ".ui-tabs-active" ).remove().attr( "aria-controls" );
      $( "#" + panelId ).remove();
      tabs.tabs( "refresh" );
    }
  });

  var autosaveTimer = setInterval( function() {
      var activeTab = getActiveTab();
      if (activeTab) {
        var cm = activeTab.children[0].CodeMirror;
        if (cm && editpart_changes[activeTab.id] && editpart_changes[activeTab.id]>0) {
          log_message("Autosave...");
          var content = cm.getDoc().getValue();
          var num = getNumFromId(activeTab.id);
          localStorage.setItem('wl.editor.localFile.'+num, content);
          editpart_changes[activeTab.id] = 0;
        }
      }
  }, 30000);
}

function transferActiveTabFileToServer() {
  var activeTab = getActiveTab();
  if (activeTab) {
    var cm = activeTab.children[0].CodeMirror;
    var content = cm.getDoc().getValue();
    var num = getNumFromId(activeTab.id);
    var localFileList = getLocalFileList();
    var path = localFileList[num][0];

    var oldMD5 = localFileList[num][2];
    var newMD5 = md5(content);


    //if (oldMD5 == newMD5) {
    //document.getElementById('infoModalDlg-title').innerHTML = 'Hinweis!';
    //document.getElementById('infoModalDlg-content').innerHTML = 'Es wurden keine Änderungen festgestellt.';
    //micromodal.show('infoModalDlg');
    //}

    //  localFileList[freeID] = [ path, content.length, md5(content) ];
    //  setLocalFileList(localFileList);

    SendGMCP_WL_File_Transfer(path, content);

    document.getElementById('infoModalDlg-title').innerHTML = 'Hinweis!';
    document.getElementById('infoModalDlg-content').innerHTML = 'Datei wurde gesendet, aber keine Empfangsbestätigung empfangen! '+
      'Hier ist etwas noch nicht ganz fertig.<br>Oder kaputt? :-/';
    micromodal.show('infoModalDlg');
  }
}

// count 'change' events per document to know, if autosave is necessary or not
var editpart_changes = {};

function refresh_editpart() {

  const MAX_SLOTS = 5;

  var path = localStorage.getItem('WL.File.Transfer path');
  var content = localStorage.getItem('WL.File.Transfer content');
  var localFileList = getLocalFileList();

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
      localFileList[freeID] = [ path, content.length, md5(content) ];
      setLocalFileList(localFileList);
      localStorage.setItem('wl.editor.localFile.'+freeID, content);
      localStorage.removeItem('WL.File.Transfer path');
      localStorage.removeItem('WL.File.Transfer content');
      log_message("New file transferred to slot " + freeID + ".");
    }
    else {
      localStorage.removeItem('WL.File.Transfer path');
      localStorage.removeItem('WL.File.Transfer content');
      log_message("Can't transfer new file to free slot! (max "+MAX_SLOTS+" allowed)");

      document.getElementById('infoModalDlg-title').innerHTML = 'Zu viele offene Dateien!';
      document.getElementById('infoModalDlg-content').innerHTML = 'Es sind bereits ' + MAX_SLOTS + ' Dateien ge&ouml;ffnet! Du musst erst ' +
	        'eine schlie&szlig;en, bevor Du eine weitere &ouml;ffnen kannst.';
      micromodal.show('infoModalDlg');
    }
  }

  // check if there is a tab for each slot and create new
  var allIDs = Object.keys(localFileList);
  var tabToActivate = -1;
  for (var i = 0; i < allIDs.length; i++) {
    var tab = $('#editor-fname-' + allIDs[i]);

    tabToActivate = i;

    // check if tab exists (selector has 0 length)
    if (tab.length == 0) {
      var path = localFileList[allIDs[i]][0];
      var fname = path.replace(/^.*[\\\/]/, '');
      var fext = (path.match(/[^\.]+$/))[0];
      var content = localStorage.getItem('wl.editor.localFile.'+allIDs[i]);

      log_message("Create new tab for: " + localFileList[allIDs[i]][0]);

      // create tab handle first:
      //
      // <li style="margin-top:0">
      //   <a id="editor-fname-1" href="#editor-tab-1">One</a>
      //   <span class="ui-icon ui-icon-close" role="presentation">Close</span>
      // </li>
      var modifiedSpan = document.createElement('span');
      modifiedSpan.title="File is modified";
      modifiedSpan.appendChild(document.createTextNode(""));

      var closeSpan = document.createElement('span');
      closeSpan.className="ui-icon ui-icon-close";
      closeSpan.role="presentation";
      closeSpan.title="Close tab";
      closeSpan.appendChild(document.createTextNode("Close"));

      var a = document.createElement('a');
      a.id = "editor-fname-" + allIDs[i];
      a.href = "#editor-tab-" + allIDs[i];
      var textNode = document.createTextNode(fname);
      a.appendChild(textNode);

      var li = document.createElement('li');
/*      li.className="ui-tabs-tab ui-corner-top ui-state-default ui-tab";*/
      li.style="margin-top:0";
      li.role="tab";
      li.title=path;
      li.appendChild(a);
      li.appendChild(modifiedSpan);
      li.appendChild(closeSpan);

      $('div#tabs').find("ul:first").append(li);

      // create tab content div:
      //
      // <div id="editor-tab-11" style="padding:0 0 0 1px;height:calc(100% - 32px)"></div>
      var div = document.createElement('div');
      div.id = "editor-tab-" + allIDs[i];
      div.style="padding:0 0 0 1px;height:calc(100% - 32px);font-size:1.1em";
      $('div#tabs').append(div);


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
      var editor = CodeMirror(document.querySelector('div#editor-tab-'+allIDs[i]), {
        height: "100%",
        lineNumbers: true,
        value: content,
        // tabSize: 2,
        //mode: "clike",
        mode: editMode,
        matchBrackets: true,
      });
      // detect changes from now on and mark the tab with a asterisk
      editor.changeGeneration();
      editor.on("change", function (cm, change) {
        var activeTab = getActiveTab();
        if (!editpart_changes[activeTab.id])
          editpart_changes[activeTab.id]=1;
        else
          editpart_changes[activeTab.id]+=1;
        if (cm.getDoc().isClean()) {
          $('#tabs .ui-tabs-active span:first').text("");
        } else {
          $('#tabs .ui-tabs-active span:first').text("*");
        }
      });
    }
  }

  // refresh layout
  $( "#tabs" ).tabs( "refresh" );

  // if we have tabs, activate the last
  $( "#tabs" ).tabs( "option", "active", tabToActivate );

  // refresh buttons
  refresh_edit_buttons(tabToActivate>=0);
}

// Refresh save/undo/redo buttons state
function refresh_edit_buttons(canEditSomething) {
  if (canEditSomething) {
    $( "#save" ).button( "enable" );
    $( "#saveas" ).button( "enable" );
    $( "#undo" ).button( "enable" );
    $( "#redo" ).button( "enable" );
  } else {
    $( "#save" ).button( "disable" );
    $( "#saveas" ).button( "disable" );
    $( "#undo" ).button( "disable" );
    $( "#redo" ).button( "disable" );
  }
}
