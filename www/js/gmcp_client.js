// All the GMCP handling is done here.
//
// requires client.js
//

"use strict";

// remember these values, if player dies and becomes alive again
var living_room_image = '';
var living_room_name = '';

// Debug flags
var debug_GMCP = false;

// Modify this line, if you need a different base URL
// or leave it blank to use a pure relative path.
var staticContentBase = '/webclient/';

function pad(str, pad_str, max) {
  str = str.toString();
  return str.length < max ? pad(pad_str.toString() + str, pad_str, max) : str;
}

function numberWithDots(x) {
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// New: GMCP support (Holger)
function getGMCPHello(){
  return 'Core.Hello { \"client\": \"WL@Web\", \"version\": \"1.2.1\" }';
}

function doGMCPReceive(sock, data) {
  if(data.length>0) {

    // handle JSON data here and update UI!
    if(debug_GMCP) writeToScreen('GMCP: ' + data + '<br>');

    // if editor is open (for wizards), update the client/socket
    if (editorWindow && !editorWindow.closed) {
      editorWindow.updateClient(window, sock);
    }

    var module = data.split(' ', 1)[0];
    var payload = data.substr(module.length);

    switch (module) {
      //////////////////////////////////////////////
      // Game modules for all players.
      case 'Core.Ping':
        HandleGMCP_Core_Ping(sock, module, payload);
        break;
      case 'Core.Goodbye':
        HandleGMCP_Core_Goodbye(sock, module, payload);
        break;
      case 'Char.Vitals':
        HandleGMCP_Char_Vitals(sock, module, payload);
        break;
      case 'Room.Info':
        HandleGMCP_Room_Info(sock, module, payload);
        break;
      //////////////////////////////////////////////
      // Editor modules, for creators only.
      case 'WL.File.List':
        HandleGMCP_WL_File_List(sock, module, payload);
        break;
      case 'WL.File.Transfer':
        HandleGMCP_WL_File_Transfer(sock, module, payload);
        break;
      //////////////////////////////////////////////
      // Everything else.
      default:
        console.log('Unknown GMCP module: ' + module + '.');
    }
  }
}

// Handle GMCP Core.Ping
function HandleGMCP_Core_Ping(sock, module, payload) {
  // This should be the response of our ping, so ignore it!
}

// Handle GMCP Core.Goodbye
function HandleGMCP_Core_Goodbye(sock, module, payload) {
  // The server tells us, we will be disconnected now.
  var value = JSON.parse(payload);

  if(value!=0) {
    document.querySelector('span#room_name').textContent = value;
  }

  document.querySelector('img#room_image').setAttribute('src', staticContentBase + 'img/aaa_no_signal.jpg');
  document.querySelector('img#room_image').setAttribute('alt', 'Bildstoerung');
  document.querySelector('a#room_image_a').setAttribute('href', staticContentBase + 'img/aaa_no_signal.jpg');
  document.querySelector('a#room_image_a').setAttribute('data-title', 'Bildstoerung');

  // if editor is open (for wizards), update the client window/socket
  if (editorWindow && !editorWindow.closed) {
    editorWindow.updateClient(window, null);
  }
}

// Handle GMCP Char.Vitals
function HandleGMCP_Char_Vitals(sock, module, payload) {
  var values = JSON.parse(payload);

  // if dead
  if('ghost' in values && values['ghost']=='1'){
    var img_a = document.querySelector('a#room_image_a');
    var img = document.querySelector('img#room_image');
    img.setAttribute('src', staticContentBase + 'img/std/tod.jpg');
    img.setAttribute('alt', 'DU BIST TOT!');
    img_a.setAttribute('href', staticContentBase + 'img/std/tod.jpg');
    img_a.setAttribute('data-title', 'DU BIST TOT!');
    document.querySelector('span#room_name').textContent = 'DU BIST TOT!';
  }

  // if alive again
  if('ghost' in values && values['ghost']=='0'){
    var img_a = document.querySelector('a#room_image_a');
    var img = document.querySelector('img#room_image');
    if(living_room_image == '') {
      img.setAttribute('src', staticContentBase + 'img/aaa_no_signal.jpg');
      img.setAttribute('alt', 'Bildstoerung');
      img_a.setAttribute('href', staticContentBase + 'img/aaa_no_signal.jpg');
      img_a.setAttribute('data-title', 'Bildstoerung');
    }
    else {
      img.setAttribute('src', staticContentBase + living_room_image);
      img.setAttribute('alt', living_room_name);
      img_a.setAttribute('href', staticContentBase + living_room_image);
      img_a.setAttribute('data-title', living_room_name);
    }
    document.querySelector('span#room_name').textContent = living_room_name;
  }

  // XP
  if('xp' in values){
    document.querySelector('span#xp.info').textContent = numberWithDots(values['xp']);
  }

  // HP
  if('hp' in values){
    document.querySelector('span#hp.info').textContent = values['hp'];
  }
  if('max_hp' in values){
    document.querySelector('span#max_hp.info').textContent = values['max_hp'];
  }

  // SP
  if('sp' in values){
    document.querySelector('span#sp.info').textContent = values['sp'];
  }
  if('max_sp' in values){
    document.querySelector('span#max_sp.info').textContent = values['max_sp'];
  }

  // QP
  if('questpoints' in values){
    document.querySelector('span#questpoints.info').textContent = values['questpoints'];
  }
  if('max_questpoints' in values){
    document.querySelector('span#max_questpoints.info').textContent = values['max_questpoints'];
  }

  // Wimpy
  if('wimpy' in values){
    document.querySelector('span#wimpy.info').textContent = values['wimpy'];
  }
  if('wimpy_dir' in values){
    if(values['wimpy_dir']=='' || values['wimpy_dir']=='0')
    document.querySelector('span#wimpy_dir.info').textContent = 'keine';
    else
    document.querySelector('span#wimpy_dir.info').textContent = values['wimpy_dir'];
  }

  // INT, STR, DEX, CON
  if('int' in values){
    document.querySelector('span#int.info').textContent = values['int'];
  }
  if('str' in values){
    document.querySelector('span#str.info').textContent = values['str'];
  }
  if('dex' in values){
    document.querySelector('span#dex.info').textContent = values['dex'];
  }
  if('con' in values){
    document.querySelector('span#con.info').textContent = values['con'];
  }
}

// Handle GMCP Room.Info
function HandleGMCP_Room_Info(sock, module, payload) {
  var values = JSON.parse(payload);

  // name
  if('name' in values){
    living_room_name = values['name'];
    document.querySelector('span#room_name').textContent = living_room_name;
  }

  // image
  if('image' in values){
    living_room_image = values['image'];
    var img_a = document.querySelector('a#room_image_a');
    var img = document.querySelector('img#room_image');
    if(living_room_image == '') {
      img.setAttribute('src', staticContentBase + 'img/aaa_no_signal.jpg');
      img.setAttribute('alt', 'Bildstoerung');
      img_a.setAttribute('href', staticContentBase + 'img/aaa_no_signal.jpg');
      img_a.setAttribute('data-title', 'Bildstoerung');
    }
    else {
      img.setAttribute('src', staticContentBase + living_room_image);
      img_a.setAttribute('href', staticContentBase + living_room_image);
      if('name' in values) {
        img.setAttribute('alt', living_room_name);
        img_a.setAttribute('data-title', living_room_name);
      }
    }
  }
}

/****************************************************************************
* Editor/Creator relevant code below                                        *
****************************************************************************/

// We need to know the editor window globally.
var editorWindow = null;

// Receive buffer for WL.File.List and WL.File.Transfer.
// Format is: {"file/dir": { "type": (file/list), "lastUpdate": (millis), "chunks": {(offset): {"content":(list/string), "eof":(true/false)}}}}
// - file/dir: a fqn of a file or directory list being transferred
//   - type: either "file" or "list" (see content below)
//   - lastUpdate: a timestamp in milliseconds of the last update (for cleanup)
//   - chunks: contains partial messages, of the following format:
//     - offset: the offset of the list, which defines the order of the chunks
//       - content: either a data block string (for file) or a (json encoded) part of a list
//       - eof: either true or false for the final message
var WLFileReceiveBuffer = {};

// anonymous self-executing function
(function() {
  window.onunload = function(event) { 
    // if editor is open (for wizards), update the client/socket
    if (editorWindow && !editorWindow.closed) {
      editorWindow.updateClient(null, null);
    }
  };

  //WLFileReceiveBuffer["foo.c"] = { "type": "file", "lastUpdate": Date.now(), "chunks": {0: {"content":"das ist der inhalt", "eof":false}}};

  var cleanupWLFileReceiveBufferTimer = 
    setInterval( CleanupWLFileReceiveBuffer, 10000);
})();

function CleanupWLFileReceiveBuffer() {
  var allEntries = Object.keys(WLFileReceiveBuffer);

  for (var i = 0; i < allEntries.length; i++) {
    if (WLFileReceiveBuffer[allEntries[i]]["lastUpdate"] + 30000 < Date.now()) {
      delete WLFileReceiveBuffer[allEntries[i]];
      console.log('Timeout reached for reception of: ' + allEntries[i]);
    }
  }
}

// Handle GMCP WL.File.List
function HandleGMCP_WL_File_List(sock, module, payload) {
  var values = JSON.parse(payload);

  // try opening new window, if it does not exist (yet)
  if (!editorWindow || editorWindow.closed) {
    editorWindow = popupCenter({url: 'editor/', title: 'Editor', w: 900, h: 500});
  }

  // don't care, if the window has opened successfully for now!

  // put tree list in local storage and inform tree view to refresh content
  var path = values['path'];
  var list = values['list'];

  // put path and list into local storage
  localStorage.setItem('WL.File.List path', path);
  localStorage.setItem('WL.File.List list', JSON.stringify(list));

  // Tell the editor, what socket we use and try to bring it to front
  if (editorWindow && !editorWindow.closed) {
    editorWindow.addEventListener('load', function (){
      editorWindow.updateClient(window, sock);
      editorWindow.focus();
    });
  }

  // Now let the user know, if there is an issue with the window
  if (!editorWindow || editorWindow.closed) {
    document.getElementById('infoModalDlg-title').innerHTML = 'Fehler!';
    document.getElementById('infoModalDlg-content').innerHTML = 'Editor-Fenster konnte nicht '+
      'ge&ouml;ffnet werden oder ist nicht sichtbar! Pr&uuml;fe Deinen Browser oder Popup-Blocker!';
    MicroModal.show('infoModalDlg');
  }
}

// Handle GMCP WL.File.Transfer
function HandleGMCP_WL_File_Transfer(sock, module, payload) {
  var values = JSON.parse(payload);

  // try opening new window, if it does not exist (yet)
  if (!editorWindow || editorWindow.closed) {
    editorWindow = popupCenter({url: 'editor/', title: 'Editor', w: 900, h: 500});
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
    console.log("Received invalid WL.File.Transfer without 'path'.")
    return;
  }

  // WLFileReceiveBuffer["foo.c"] = { "type": "file", "lastUpdate": Date.now(), "chunks": {0: {"content":"das ist der inhalt", "eof":false}}};
  if (!WLFileReceiveBuffer[path]) {
    // first (create entry)
    WLFileReceiveBuffer[path] = { "type": "file", "lastUpdate": Date.now(), "chunks": {}};
    console.log('WL.File.Transfer first chunk: ' + path + ' with ' + content.length + ' chars');
 } else {
    // next (update lastUpdate)
    WLFileReceiveBuffer[path]["lastUpdate"] = Date.now();
    console.log('WL.File.Transfer next chunk: ' + path + ' with ' + content.length + ' chars');
  }

  WLFileReceiveBuffer[path]["chunks"][offset] = {"content":content, "eof":eof};

  // EOF reached?
  if (eof) {
          
    // now re-assemble the chunks to a single file!   
    var allOffsets = Object.keys(WLFileReceiveBuffer[path]["chunks"]);
    // sort offsets in correct order
    allOffsets.sort(function(a, b){return a-b});
    // reset content
    content='';

    for (var i = 0; i < allOffsets.length; i++) {
      var offset = allOffsets[i];

      // sanity check (no offset/chunk lost?!)
      if (content.length != offset) {
        console.log('WL.File.Transfer chunk lost for: ' + path + '. Transfer failed/incomplete!');
        alert('WL.File.Transfer chunk lost for: ' + path + '. Transfer failed/incomplete!');
        delete WLFileReceiveBuffer[path];
        return;
      }

      content += WLFileReceiveBuffer[path]["chunks"][offset]["content"];
    }
         
    // put path and list into local storage
    localStorage.setItem('WL.File.Transfer path', path);
    localStorage.setItem('WL.File.Transfer content', content);

    console.log('WL.File.Transfer reception complete: ' + path);
    
    // clear entry from buffer
    delete WLFileReceiveBuffer[path];
  }

  // Tell the editor, what socket we use and try to bring it to front
  if (editorWindow && !editorWindow.closed) {
    editorWindow.addEventListener('load', function (){
      editorWindow.updateClient(window, sock);
      editorWindow.focus();
    });
  }

  // Now let the user know, if there is an issue with the window
  if (!editorWindow || editorWindow.closed) {
    document.getElementById('infoModalDlg-title').innerHTML = 'Fehler!';
    document.getElementById('infoModalDlg-content').innerHTML = 'Editor-Fenster konnte nicht '+
      'ge&ouml;ffnet werden oder ist nicht sichtbar! Pr&uuml;fe Deinen Browser oder Popup-Blocker!';
    MicroModal.show('infoModalDlg');
  }
}

// Stolen from: https://stackoverflow.com/questions/4068373/center-a-popup-window-on-screen
// Credits to: http://www.xtf.dk/2011/08/center-new-popup-window-even-on.html
const popupCenter = ({url, title, w, h}) => {
    // Fixes dual-screen position                             Most browsers      Firefox
    const dualScreenLeft = window.screenLeft !==  undefined ? window.screenLeft : window.screenX;
    const dualScreenTop = window.screenTop !==  undefined   ? window.screenTop  : window.screenY;

    const width = window.innerWidth ? window.innerWidth : document.documentElement.clientWidth ? document.documentElement.clientWidth : screen.width;
    const height = window.innerHeight ? window.innerHeight : document.documentElement.clientHeight ? document.documentElement.clientHeight : screen.height;

    const systemZoom = width / window.screen.availWidth;
    const left = (width - w) / 2 / systemZoom + dualScreenLeft
    const top = (height - h) / 2 / systemZoom + dualScreenTop

    var windowHandle = window.open(url, title,
      `
      toolbar=no,
      scrollbars=yes,
      width=w / systemZoom,
      height=h / systemZoom,
      top=top,
      left=left
      `
    )

    return windowHandle;
}
