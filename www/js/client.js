// The WL client main code.

'use strict';

// Local echo setting.
var localEcho = false;

// Handle window close
var isConnected = false;

// Called on connection
function connected() {
  isConnected = true; 
  console.log('Connected.');
}

function disconnected() {
  isConnected = false;
  console.log('Disconnected.');
}

// Since ansi_up API 2.0 we need an instance of AnsiUp!
var ansi_up = null;//new AnsiUp;

// Init macro processor
var macros = null;//new MacroProcessor;

// `pending` stores partial telnet negotiations that cross message boundaries
var pending = '';

// reset to 0 on each WO/WILL TELOPT_TTYPE, see tty_neg_types below
var tty_neg_index = 0;

// pwMode + pw store local input, if cmd is in 'password' mode
var pwMode = false;

/// Split the query-string into key-value pairs and return a map.
// Stolen from: http://stackoverflow.com/questions/2090551/parse-query-string-in-javascript
function parseQuery(qstr) {
  var query = {};
  var a = qstr.substr(1).split('&');
  for (var i = 0; i < a.length; i++) {
     var b = a[i].split('=');
     query[decodeURIComponent(b[0])] = decodeURIComponent(b[1] || '');
  }
  return query;
}

// Handle image loading errors here!
function bildstoerung(){
  var img_a = $('a#room_image_a');
  var img = $('img#room_image');
  var brokenPath = img.attr('src');
  if(brokenPath!='img/aaa_no_signal.jpg') {
    img.attr('src', 'img/aaa_no_signal.jpg');
    img.attr('alt', 'Bildstoerung: ' + brokenPath + ' is broken!');
    img_a.attr('href', 'img/aaa_no_signal.jpg');
    img_a.attr('data-title', 'Bildstoerung: ' + brokenPath + ' is broken!');
  }
}

// Write something to the screen, scroll to bottom and limit number of rows.
function writeToScreen(str) {
  if (str && str.length > 0) {
    var out = document.getElementById('out');
    out.insertAdjacentHTML('beforeend', str);
    out.scrollTop = out.scrollHeight;
    while(out.childNodes.length > 1000) out.childNodes[0].remove();
  }
}

// Do telnet negotiations for 'buf' and return the plain text only.
function doTelnetNegotions(sock, buf) {

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
  buf = pending + buf;
  pending = '';
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
          $('#prompt').html(ansi_up.ansi_to_html(prmpt));
        }
        // Skip the IAC+EOR in the buffer
        oldIacIdx = newIacIdx+2;
      } 
      // Everything should be (at least) 3 bytes long.
      else if(newIacIdx+2 >= len) {
        // save incomplete telnet negotiation for later processing
        pending = buf.substr(newIacIdx);
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
                tty_neg_index = 0; // reset
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
                leavePWMode();
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
                enterPWMode();
                if(sock) sock.emit('stream', IAC+DO+TELOPT_ECHO);
                break;
              case TELOPT_GMCP:
                // use GMCP
                if(sock) sock.emit('stream', IAC+DO+TELOPT_GMCP);
                // send Hello immediately
                if(sock) sock.emit('stream', IAC+SB+TELOPT_GMCP+getGMCPHello()+IAC+SE);
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
              pending = buf.substr(newIacIdx);
              oldIacIdx = len;
            } else {
              if (buf[newIacIdx+2]==TELOPT_GMCP){
                // Received GMCP message!
                doGMCPReceive(sock, buf.substr(newIacIdx+3, endSubNegIdx-(newIacIdx+4)));
              }
              else if (buf[newIacIdx+2]==TELOPT_TTYPE && buf[newIacIdx+3]==TELQUAL_SEND){
                // Server wants us to send TTYPE, we count up tty_neg_index until it's end
                if(sock) sock.emit('stream', IAC+SB+TELOPT_TTYPE+TELQUAL_IS+tty_neg_types[tty_neg_index]+IAC+SE);
                if (tty_neg_index+1 < tty_neg_types.length) tty_neg_index = tty_neg_index + 1;
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
function writeServerData(buf) {
  var line = ansi_up.ansi_to_html(buf);
  writeToScreen(line);
}

// Adjust the UI layout.
function adjustLayout() {
  var page_elem = $('div#page');
  var out_elem = $('div#out');
  var in_elem = $('div#in');

  var w = page_elem.width(), h = page_elem.height();
  var w0 = in_elem.width();
  var w1 = $('button#send').outerWidth(true);
  var w2 = $('div#menu').outerWidth(true)+25;
  var w3 = $('div#info').width();

  /* update input div width */
  in_elem.css({
    width: (w-(w3+6)) + 'px',
  });

  /* update output div size */
  var h0 = in_elem.outerHeight(true);
  out_elem.css({
    width: (w-(w3+6)) + 'px',
    height: (h - h0 -2) + 'px',
  });

  /* scroll to bottom, important for mobile and virtual keyboard */
  out_elem.scrollTop(out_elem.prop("scrollHeight"));
}

// Save settings to localStorage.
function saveSettings() {
  localStorage.setItem('Client.Setting.LocalEcho', JSON.stringify(localEcho));
}

// Re-/Load settings from localStorage.
function loadSettings() {
  // Macro Processor re-/load
  macros.reloadSettings();

  // Re-/load other client settings.
  var localEchoSetting = localStorage.getItem('Client.Setting.LocalEcho');
  if (localEchoSetting) {
    localEcho = JSON.parse(localEchoSetting);
  } else {
    localEcho = false;
  }

  // Refresh UI
  $('button#localecho').html('Local Echo: ' + (localEcho==true ? 'an' : 'aus') + '');
}

// Maybe the user wants other colors? Here we go.
function processQueryParams() {
  var queryParams=parseQuery(document.location.search);

  var debugGMCP = queryParams['debug'];
  if (debugGMCP=='true') debug_GMCP = true;

  var bgColor = queryParams['bg'];
  if(bgColor!=null) { $(document).get(0).body.style.backgroundColor='#'+bgColor; }

  var fgColor = queryParams['fg'];
  if(fgColor!=null){ $(document).get(0).body.style.color='#'+fgColor; }

  var infoBgColor = queryParams['ibg'];
  if(infoBgColor!=null) { $('div#info').get(0).style.backgroundColor='#'+infoBgColor; }

  var infoFgColor = queryParams['ifg'];
  if(infoFgColor!=null) { 
    $('div#info').get(0).style.color='#'+infoFgColor; 
    $('div#info').get(0).style.borderColor='#'+infoFgColor; 
  }

  var infoBorderColor = queryParams['ibc'];
  if(infoBorderColor!=null) { $('div#info').get(0).style.borderColor='#'+infoBorderColor; }

  var infoPanel = queryParams['infopanel'];
  if (infoPanel==null || infoPanel!='hidden') 
    $('div#info').get(0).style.visibility = 'visible'
  else
    $('div#info').get(0).style.visibility = 'hidden'
  console.log('infoPanel = ' + infoPanel);
}

// Popup the cookie warning.
function doCookiePopup() {
  if (!document.cookie.split('; ').find(row => row.startsWith('didAcceptCookies'))) {
    $(".cookie-bar").css("display", "inline-block");
  }
}

// Called whenever the user closes the cookie warning.
function doCookieAccept() {
  var cookieDate = new Date();
  cookieDate.setTime(new Date().getTime() + 2592000000); // 30 days in ms
  document.cookie = "didAcceptCookies=true; path=/; expires=" + cookieDate.toUTCString();
}

// Import settings from local file
function importSettings(event) {
  // Some tricks required here, to open local files. Most of it comes from here:
  // https://stackoverflow.com/questions/3582671/how-to-open-a-local-disk-file-with-javascript
  // What happens: We have an invisible input element in the document (importButtonHiddenInput),
  // which we must use as tool to open a file selection dialog. So we attach a file read handler
  // on this element and emit a 'click' event. 
  var hiddenInputElement = document.getElementById('importButtonHiddenInput');
  hiddenInputElement.onchange=uploadSettingsFile;
  hiddenInputElement.click();
}

// Helper for importSettings()
function uploadSettingsFile(e) {
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
        writeToScreen('' + e.name + ': ' + e.message + '\n');
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
          writeToScreen('Einstellungen (V' + settings['#VERSION'] + ', #' + (keys.length - 1) + ') importiert.\n');
          loadSettings(); // to refresh UI
        }
        else {
          writeToScreen('Einstellungen haben falsche Version.\n');
        }
      }
      else {
        writeToScreen('Einstellungen leer.\n');
      }
    }
    else {
      writeToScreen('Einstellungen konnten nicht importiert werden.\n');
    }
    $("#cmd").focus();
  }
  reader.readAsText(file)
}

// Export settings to local file
function exportSettings(event) {
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
  writeToScreen('Einstellungen (V' + settings['#VERSION'] + ', #' + (Object.keys(settings).length - 1) + ') exportiert.\n');
  $("#cmd").focus();
}

// Call to enter into pw mode.
function enterPWMode() {
  pwMode = true;
  $("#cmd").hide();
  closeAllDropDowns();
  $(".dropbtn").hide();
  $("#pwd").show();
  $("#pwd").focus();
}

// Call to leave pw mode.
function leavePWMode() {
  pwMode = false;
  $("#pwd").hide();
  $(".dropbtn").show();
  $("#cmd").show();
  $("#cmd").focus();
}

// Give the focus to the input field.
function setFocusToInput() {
  if (pwMode)
    document.getElementById('pwd').focus();
  else 
    document.getElementById('cmd').focus();
}

// Called once, when UI is loaded and ready to go.
//$(document).ready(startClientFunction);

// Called once from app.js, when all required modules are loaded.
function startClientFunction() {
    
  const AnsiUp = require('ansi_up').default;
  //console.log('Found:' + AnsiUp);
  ansi_up = new AnsiUp;

  const MacroProcessor = require('js/macros');
  //console.log('Found:' + TMP.MacroProcessor);
  // Init macro processor
  macros = new TMP.MacroProcessor;
  
  const io = require("socket.io");
  //console.log('Found:' + io);
    
  // need to adjust layout after resize
  window.addEventListener('resize', adjustLayout);

  // don't close immediately, if connected
  window.addEventListener("beforeunload", function (e) {
    if (isConnected) {
      // Cancel the event
      e.preventDefault(); // If you prevent default behavior in Mozilla Firefox prompt will always be shown
      // Chrome requires returnValue to be set
      e.returnValue = '';
    }
  });

  // Called, whenever a key is pressed in the window. We'd like to treat
  // everything as input to the client, but this would prevent copy&paste 
  // shortcuts or other special keys from working. So we try to skip these
  // and only care about the rest.
  function handleKeyDown(event)
  {
    if (!pwMode) {
      // If macro processor handles the key, don't continue.
      var result = macros.keyTrigger(event);
      var doSend = result.send;
      var msg = result.message;
      if (doSend) {
        var cmd = result.cmd;
        // Append a LF, if the last character is not a LF yet.
        if (cmd.length == 0 || cmd.charAt(cmd.length-1) != '\n') cmd += '\n';
        send(cmd, pwMode);
        event.preventDefault();
        return true;
      }
      // If there is nothing to send, but the input contains '/def key_', append the 
      // pressed named key now as a convenience function.
      else {
        var namedKey = macros.getNamedKey(event);
        if (namedKey.length>0) {
          var cmd = document.getElementById('cmd');
          if (cmd.value && cmd.value.substr(0, 4).toLowerCase() == '/def' && cmd.value.substr(cmd.value.length-4) == 'key_') {
            cmd.value += (namedKey.substr(4) + ' = ');
            event.preventDefault();
            return true;
          }
        }
      }
      if (msg.length > 0) writeToScreen(msg);
    }
    
    // Don't intercept Ctrl/Cmd + C  for copy
    if (event.key == 'c' && (event.ctrlKey || event.metaKey)) return true;
  
    // Don't intercept control/meta/function keys
    if ($.inArray(event.key, [
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
      ]) != -1) return true;
  
    // Everything else is supposed to be input, so focus to the right place.
    setFocusToInput();
  
    return true;
  }

  // Intercept all keys.
  window.addEventListener('keydown', handleKeyDown);

  // if mouse is released and nothing is marked, set 
  // the focus to the input element(s)
  window.addEventListener('mouseup', function (e) {
    if (!window.getSelection() || window.getSelection().toString().length == 0) {
      setFocusToInput();
    }
  });

  // enable ANSI classes
  ansi_up.use_classes = true;

  // load settings from localStorage
  loadSettings();

  // adjust layout colors, etc.
  processQueryParams();

  // show help text
  jQuery.get('help.txt', function(data) {
    var lines = data.split('\n');
    for(var i=0; i<lines.length; i++) {
      writeToScreen(lines[i] + '<br/>');
    }
  });

  // Remove all backspaces and chars 'in front', called recursively.
  // Will destroy ANSI-Codes in front, if there are more '\b' than real
  // chars. But this is something, which cannot be avoided effectively.
  // We must trust the responsibility of the creators.
  function handleBackspace(str) {
    var bs = str.indexOf('\b');
    if (bs>=0) {
      var newstr = str.substr(0, (bs-1)) + str.substr(bs+1);
      return handleBackspace(newstr);
    }
    return str;
  }

  // Strip all ansi codes from string.
  const ansiRegex = require('ansi-regex');
  function stripAnsi(str) {
    return str.replace(ansiRegex(), '');
  }

  // websocket
  // use page location and truncate off tailing /index.html
  var baseUri = location.pathname.substring(0, location.pathname.lastIndexOf("/"))
  var sock = io.connect('', {path:baseUri+'/socket.io'});

  // We received something!
  sock.on('stream', function(buf) {
    // telnet negs first (telnet!)
    buf = doTelnetNegotions(sock, buf); 

    // treat backspace (might be evil)
    buf = handleBackspace(buf);

    // write into UI (after ansi2html)
    writeServerData(buf);

    // finally strip ansi and feed triggers
    var result = macros.textTrigger(stripAnsi(buf));
    var doSend = result.send;
    var msg = result.message;
    if (doSend) {
      var cmd = result.cmd;
      // Append a LF, if the last character is not a LF yet.
      if (cmd.length == 0 || cmd.charAt(cmd.length-1) != '\n') cmd += '\n';
      send(cmd, pwMode);
    }
    if (msg.length > 0) writeToScreen(msg);
  });

  sock.on('connected', function(){
    writeToScreen('Verbindung zum Wunderland hergestellt.\n');
    connected();
  });
  sock.on('disconnected', function(){
    writeToScreen('Verbindung zum Wunderland verloren. (Enter: neu verbinden)\n');
    leavePWMode();
    $('#prompt').html('&gt; ');
    disconnected();
  });

  // Send a string to the remote server, echos it locally, if
  // localEcho is true. If isPassword is true, the string will
  // be masked as **** for local echo.
  function send(str, isPassword) {
    if (localEcho === true) {
      var viewStr;
      // if password, print stars into the console
      if(str.length>0 && isPassword)
        viewStr=new Array(str.length+1).join('*');
      else
        viewStr=str;
      writeToScreen(viewStr);
    }
    if(sock) sock.emit('stream', str);
  }

  var history_idx = -1; // current position in history array
  var history_max = 20; // max size of history
  var history_tmp = ''; // remember current input
  var history = [];     // the history array

  // Get user input from UI elements (either cmd or pwd),
  // add it to the history and call send(). See above.
  function sendInput() {
    var elem = (pwMode === true ? $('#pwd') : $('#cmd'));
    var cmd = elem.val();

    // Push this line to the history, if it's not a pwd
    if(cmd.length>0 && history.indexOf(cmd)!=0) {
      // add cmd to history, if it's not a password
      if(!pwMode) history.unshift(cmd);
      // limit length of history
      if (history.length > history_max) history.pop();
    }
    history_idx=-1;

    // The MacroProcessor may not send anything.
    var doSend = true;

    // Macro handling
    if (!pwMode) {
      var result = macros.resolve(cmd);
      doSend = result.send;
      cmd = result.cmd;
      var msg = result.message;
      if (msg.length > 0) writeToScreen(msg);
    }

    // Append a LF, if the last character is not a LF yet.
    if (cmd.length == 0 || cmd.charAt(cmd.length-1) != '\n') cmd += '\n';

    // Now send, if noone opted out.
    if (doSend) send(cmd, pwMode);

    // Clear input element
    elem.val('').change();
  }

  // Show cookie popup
  doCookiePopup();

  // Initially it's always #cmd
  $("#cmd").focus();

  // UI events
  $('#cmd, #pwd').keypress(function(e) {
    if(e.key == 'Enter') {
      e.preventDefault();
      sendInput();
    }
  });

  $('#cmd, #pwd').keydown(function(e) {

    // cursor up/down history
    // keypress event does not work in IE/Edge!
    switch (e.key) {
      case 'ArrowLeft':
        // Do nothing
        break;
      case 'ArrowUp':
        // Go back in history
        if(history.length>=0 && (history_idx+1)<history.length) {
          if(history_idx<0) { history_tmp = $(this).val().trim(); }
          history_idx++;
          $(this).val(history[history_idx]);
        }
        break;
      case 'ArrowRight':
        // Do nothing
        break;
      case 'ArrowDown':
        // Fo forward in history
        if(history_idx>=0) {
          history_idx--;
          if(history_idx<0) {
            $(this).val(history_tmp);
          }
          else {
            if(history_idx<history.length) {
              $(this).val(history[history_idx]);
            }
          }
        }
        break;
    }
  });

  // 'Enter'
  $('button#send').click(function(e) { sendInput(); setFocusToInput(); });

  // some basic commands
  $('button#channel').click(function(e) { $('#cmd').val('- '); $("#cmd").focus(); });
  $('button#who').click(function(e) { $('#cmd').val('wer'); sendInput(); $("#cmd").focus(); });
  $('button#look').click(function(e) { $('#cmd').val('schau'); sendInput(); $("#cmd").focus(); });
  $('button#inv').click(function(e) { $('#cmd').val('inv'); sendInput(); $("#cmd").focus(); });
  $('button#score').click(function(e) { $('#cmd').val('info'); sendInput(); $("#cmd").focus(); });

  // some basic move commands
  $('button#up').click(function(e) { $('#cmd').val('o'); sendInput(); $("#cmd").focus(); });
  $('button#north').click(function(e) { $('#cmd').val('n'); sendInput(); $("#cmd").focus(); });
  $('button#east').click(function(e) { $('#cmd').val('o'); sendInput(); $("#cmd").focus(); });
  $('button#south').click(function(e) { $('#cmd').val('s'); sendInput(); $("#cmd").focus(); });
  $('button#west').click(function(e) { $('#cmd').val('w'); sendInput(); $("#cmd").focus(); });
  $('button#down').click(function(e) { $('#cmd').val('u'); sendInput(); $("#cmd").focus(); });

  // Settings

  // import settings
  document.querySelector('button#importButton').addEventListener('click', importSettings);
  document.querySelector('button#exportButton').addEventListener('click', exportSettings);

  // colors dialog
  $('button#colors').click(function(e) { writeToScreen('Farbeinstellungen: (geht noch nicht)\n'); $("#cmd").focus(); });

  // toggle local echo
  $('button#localecho').click(function(e) {
    localEcho = !localEcho;
    saveSettings();
    writeToScreen('Lokales Echo ist jetzt '+(localEcho==true ? 'an' : 'aus')+'.\n'); 
    $('button#localecho').html('Local Echo: ' + (localEcho==true ? 'an' : 'aus') + '');
    $("#cmd").focus(); 
  });

  // open help in new tab
  $('button#helpButton').click(function(e) { window.open('/webclient/help.html','_blank'); });

  // clear screen
  $('button#clear').click(function(e) { $('div#out').html(''); $("#cmd").focus(); });

  $( "#infoDialog" ).dialog({
      modal: true,
      autoOpen: false,
      buttons: {
        Ok: function() {
          $(this).dialog("close");
        }
      }
    });

$("#out").click(); 

  setTimeout(function(){
    adjustLayout();    
    send('\n', false);
  },200)
}
