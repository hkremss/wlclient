// all the GMCP handling is done here!
//
// requires main.js
//

// New: GMCP support (Holger)
function getGMCPHello(){
  return 'Core.Hello { \"client\": \"WL@Web\", \"version\": \"1.0.1\" }';
}

// remember these values, if player dies and becomes alive again
var living_room_image = '';
var living_room_name = '';

// Debug flags
var debug_GMCP = false;

// We need to know the editor window globally.
var editorWindow = null;

// Modify this line, if you need a different base URL
// or leave it blank to use a pure relative path.
var staticContentBase = '/webclient/';

function doGMCPReceive(sock, data) {
  if(data.length>0) {

    // handle JSON data here and update UI!
    if(debug_GMCP) writeToScreen('GMCP: ' + data + '<br>');

    var module = data.split(' ', 1)[0];
    var payload = data.substr(module.length);

    switch (module) {
      case 'Core.Ping':
        HandleGMCP_Core_Ping(module, payload);
        break;
      case 'Core.Goodbye':
        HandleGMCP_Core_Goodbye(module, payload);
        break;
      case 'Char.Vitals':
        HandleGMCP_Char_Vitals(module, payload);
        break;
      case 'Room.Info':
        HandleGMCP_Room_Info(module, payload);
        break;
      case 'WL.File.List':
        HandleGMCP_WL_File_List(module, payload);
        break;
      case 'WL.File.Transfer':
        HandleGMCP_WL_File_Transfer(module, payload);
        break;
      default:
        console.log('Unknown GMCP module: ' + module + '.');
    }
  }
}

// Handle GMCP Core.Ping
function HandleGMCP_Core_Ping(module, payload) {
  // This should be the response of our ping, so ignore it!
}

// Handle GMCP Core.Goodbye
function HandleGMCP_Core_Goodbye(module, payload) {
  // The server tells us, we will be disconnected now.
  var value = JSON.parse(payload);

  if(value!=0) {
    $('span#room_name').text(value);
  }

  $('img#room_image').attr('src', staticContentBase + 'img/aaa_no_signal.jpg');
  $('img#room_image').attr('alt', 'Bildstoerung');
  $('a#room_image_a').attr('href', staticContentBase + 'img/aaa_no_signal.jpg');
  $('a#room_image_a').attr('data-title', 'Bildstoerung');

}

// Handle GMCP Char.Vitals
function HandleGMCP_Char_Vitals(module, payload) {
  var values = JSON.parse(payload);

  // if dead
  if('ghost' in values && values['ghost']=='1'){
    var img_a = $('a#room_image_a');
    var img = $('img#room_image');
    img.attr('src', staticContentBase + 'img/std/tod.jpg');
    img.attr('alt', 'DU BIST TOT!');
    img_a.attr('href', staticContentBase + 'img/std/tod.jpg');
    img_a.attr('data-title', 'DU BIST TOT!');
    $('span#room_name').text('DU BIST TOT!');
  }

  // if alive again
  if('ghost' in values && values['ghost']=='0'){
    var img_a = $('a#room_image_a');
    var img = $('img#room_image');
    if(living_room_image == '') {
      img.attr('src', staticContentBase + 'img/aaa_no_signal.jpg');
      img.attr('alt', 'Bildstoerung');
      img_a.attr('href', staticContentBase + 'img/aaa_no_signal.jpg');
      img_a.attr('data-title', 'Bildstoerung');
    }
    else {
      img.attr('src', staticContentBase + living_room_image);
      img.attr('alt', living_room_name);
      img_a.attr('href', staticContentBase + living_room_image);
      img_a.attr('data-title', living_room_name);
    }
    $('span#room_name').text(living_room_name);
  }

  // XP
  if('xp' in values){
    $('span#xp.info').text(numberWithDots(values['xp']));
  }

  // HP
  if('hp' in values){
    $('span#hp.info').text(values['hp']);
  }
  if('max_hp' in values){
    $('span#max_hp.info').text(values['max_hp']);
  }

  // SP
  if('sp' in values){
    $('span#sp.info').text(values['sp']);
  }
  if('max_sp' in values){
    $('span#max_sp.info').text(values['max_sp']);
  }

  // QP
  if('questpoints' in values){
    $('span#questpoints.info').text(values['questpoints']);
  }
  if('max_questpoints' in values){
    $('span#max_questpoints.info').text(values['max_questpoints']);
  }

  // Wimpy
  if('wimpy' in values){
    $('span#wimpy.info').text(values['wimpy']);
  }
  if('wimpy_dir' in values){
    if(values['wimpy_dir']=='' || values['wimpy_dir']=='0')
      $('span#wimpy_dir.info').text('keine');
    else
      $('span#wimpy_dir.info').text(values['wimpy_dir']);
  }

  // INT, STR, DEX, CON
  if('int' in values){
    $('span#int.info').text(values['int']);
  }
  if('str' in values){
    $('span#str.info').text(values['str']);
  }
  if('dex' in values){
    $('span#dex.info').text(values['dex']);
  }
  if('con' in values){
    $('span#con.info').text(values['con']);
  }
}

// Handle GMCP Room.Info
function HandleGMCP_Room_Info(module, payload) {
  var values = JSON.parse(payload);

  // name
  if('name' in values){
    living_room_name = values['name'];
    $('span#room_name').text(living_room_name);
  }

  // image
  if('image' in values){
    living_room_image = values['image'];
    var img_a = $('a#room_image_a');
    var img = $('img#room_image');
    if(living_room_image == '') {
      img.attr('src', staticContentBase + 'img/aaa_no_signal.jpg');
      img.attr('alt', 'Bildstoerung');
      img_a.attr('href', staticContentBase + 'img/aaa_no_signal.jpg');
      img_a.attr('data-title', 'Bildstoerung');
    }
    else {
      img.attr('src', staticContentBase + living_room_image);
      img_a.attr('href', staticContentBase + living_room_image);
      if('name' in values) {
        img.attr('alt', living_room_name);
        img_a.attr('data-title', living_room_name);
      }
    }
  }
}

// Handle GMCP WL.File.List
function HandleGMCP_WL_File_List(module, payload) {
  var values = JSON.parse(payload);

  // try opening new window, if it does not exist (yet)
  if (!editorWindow || editorWindow.closed) {
    popupCenter({url: 'editor/', title: 'Editor', w: 900, h: 500});
  }

  // don't care, if the window has opened successfully for now!

  // put tree list in local storage and inform tree view to refresh content
  var path = '';
  var list = {};

  if (Array.isArray(values)) {
    if (values.length > 0) {
      // values[0] contains the path
      path = values[0];
    }
    if (values.length > 1) {
      // values[1] contains an array list with the content of the path
      // values[1][0] - entry name
      // values[1][1] - entry size (or -2 for directory)
      // values[1][2] - entry date (unix millis)
      list = values[1];
    }
  }
  // put path and list into local storage
  localStorage.setItem('WL.File.List path', path);
  localStorage.setItem('WL.File.List list', JSON.stringify(list));

  // Try to bring editor to front
  if (editorWindow && !editorWindow.closed) editorWindow.focus();

  // Now let the user know, if there is an issue with the window
  if (!editorWindow || editorWindow.closed) {
     $( "#infoDialog" ).dialog( "option", "title", "Fehler" );
     $( "#infoDialog" ).html( "Editor-Fenster konnte nicht ge&ouml;ffnet werden oder ist " +
       "nicht sichtbar! Pr&uuml;fe Deinen Browser oder Popup-Blocker!" );
     $( "#infoDialog" ).dialog( "open" );
  }
}

// Handle GMCP WL.File.Transfer
function HandleGMCP_WL_File_Transfer(module, payload) {
  var values = JSON.parse(payload);

  // try opening new window, if it does not exist (yet)
  if (!editorWindow || editorWindow.closed) {
    popupCenter({url: 'editor/', title: 'Editor', w: 900, h: 500});
  }

  // don't care, if the window has opened successfully for now!

  // put tree list in local storage and inform tree view to refresh content
  var path = '';
  var content = '';

  if (Array.isArray(values)) {
    if (values.length > 0) {
      // values[0] contains the file path
      path = values[0];
    }
    if (values.length > 1) {
      // values[1] contains the file content
      content = values[1];
    }
  }

  // put path and list into local storage
  localStorage.setItem('WL.File.Transfer path', path);
  localStorage.setItem('WL.File.Transfer content', content);

  // Try to bring editor to front
  if (editorWindow && !editorWindow.closed) editorWindow.focus();

  // Now let the user know, if there is an issue with the window
  if (!editorWindow || editorWindow.closed) {
     $( "#infoDialog" ).dialog( "option", "title", "Fehler" );
     $( "#infoDialog" ).html( "Editor-Fenster konnte nicht ge&ouml;ffnet werden oder ist " +
       "nicht sichtbar! Pr&uuml;fe Deinen Browser oder Popup-Blocker!" );
     $( "#infoDialog" ).dialog( "open" );
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

    editorWindow = window.open(url, title, 
      `
      toolbar=no,
      scrollbars=yes,
      width=${w / systemZoom}, 
      height=${h / systemZoom}, 
      top=${top}, 
      left=${left}
      `
    )

    if (window.focus) editorWindow.focus();
}
