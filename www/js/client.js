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

function writeToScreen(str) {
  var out = $('div#out');
//  out.append('<span class="out">' + str + '</span>');
  out.append(str);
  out.scrollTop(out.prop("scrollHeight"));
  while(out.children().length>5000) out.children().first().remove();
}

function pad(str, pad_str, max) {
  str = str.toString();
  return str.length < max ? pad(pad_str.toString() + str, pad_str, max) : str;
}

function numberWithDots(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

// Since ansi_up API 2.0 we need an instance of AnsiUp!
var ansi_up = new AnsiUp;

// `pending` stores partial telnet negotiations that cross message boundaries
var pending = '';

// pwMode + pw store local input, if cmd is in 'password' mode
var pwMode = false;


// New: Telnet negotiations (Holger).
function doTelnetNegotions(sock, buf) {

  // TELNET protocol
  var IAC  = '\xff'; // 255
  var DONT = '\xfe'; // 254
  var DO   = '\xfd'; // 253
  var WONT = '\xfc'; // 252
  var WILL = '\xfb'; // 251
  var SB   = '\xfa'; // 250 sub negotiation
  var SE   = '\xf0'; // 240 end sub negotiation

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

      if(newIacIdx+2 >= len) {
        // save incomplete telnet negotiation for later processing
        pending = buf.substr(newIacIdx);
        oldIacIdx = len;
      } else {
        switch(buf[newIacIdx+1]){
          case DONT:
            oldIacIdx = newIacIdx+3;
            break;
          case DO:
            switch(buf[newIacIdx+2]){
              // we are 'xterm' and will use this (see SB below)
              case TELOPT_TTYPE:
                if(sock) sock.emit('stream', IAC+WILL+TELOPT_TTYPE);
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
                pwMode = false;
                $("#pwd").hide();
                $("#cmd").show();
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
                if(sock) sock.emit('stream', IAC+DONT+TELOPT_EOR);
                break;
              case TELOPT_ECHO:
                // disable local echo!
                pwMode = true;
                $("#cmd").hide();
                $("#pwd").show();
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
                // Server wants us to send TTYPE, we say: xterm
                if(sock) sock.emit('stream', IAC+SB+TELOPT_TTYPE+TELQUAL_IS+'xterm'+IAC+SE);
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

function writeServerData(buf) {

//  var lines = buf.split('\r\n');

//  for(var i=0; i<lines.length; i++) {

//    var line = lines[i];

//    line = ansi_up.escape_for_html(line);
//    line = ansi_up.ansi_to_html(line);
    line = ansi_up.ansi_to_html(buf);

//    if (line.length>0) {
//      if(i < lines.length-1) line += '<br/>';

      writeToScreen(line);
//    }
//  }
}

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

$(window).resize(adjustLayout);

$(document).ready(function(){

  // enable ANSI classes
  ansi_up.use_classes = true;

  // adjust layout colors, etc.
  processQueryParams();

  // show help text
  jQuery.get('help.txt', function(data) {
    var lines = data.split('\n');
    for(var i=0; i<lines.length; i++) {
      writeToScreen(lines[i] + '<br/>');
    }
  });

  // websocket
//  var sock = io.connect();
//  var sock = io.connect('', {path:'/client/socket.io'});
//  var sock = io.connect('', {path:location.pathname+'/socket.io'});
  // truncate tailing /index.html
  var baseUri = location.pathname.substring(0, location.pathname.lastIndexOf("/"))
  var sock = io.connect('', {path:baseUri+'/socket.io'});
  sock.on('stream', function(buf){
    buf = doTelnetNegotions(sock, buf);
    writeServerData(buf);
  });
  sock.on('connected', function(){
    writeToScreen('Verbindung zum Wunderland hergestellt.\n');
    connected();
  });
  sock.on('disconnected', function(){
    writeToScreen('Verbindung zum Wunderland verloren.\n');
    disconnected();
  });

  // send
  var send = function(str, isPassword) {
    var viewStr;
    // if password, print stars into the console
    if(str.length>0 && isPassword)
      viewStr=new Array(str.length+1).join('*');
    else
      viewStr=str;
    writeToScreen(viewStr);
    if(sock) sock.emit('stream', str);
  }

  var history_idx = -1; // current position in history array
  var history_max = 20; // max size of history
  var history_tmp = ''; // remember current input
  var history = [];     // the history array

  var sendInput = function() {
    var elem = (pwMode === true ? $('#pwd') : $('#cmd'));
    var trim_cmd = elem.val().trim();
    if(trim_cmd.length>0 && history.indexOf(trim_cmd)!=0) {
      // add trim_cmd to history, if it's not a password
      if(!pwMode) history.unshift(trim_cmd);
      // limit length of history
      if (history.length > history_max) history.pop();
    }
    history_idx=-1;
    send(trim_cmd + '\n', pwMode);
    elem.val('').change();
  }

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
  $('button#send').click(function(e) { sendInput(); (pwMode ? $('#pwd') : $("#cmd")).focus(); });

  // some basic commands
  $('button#who').click(function(e) { $('#cmd').val('wer'); sendInput(); });
  $('button#look').click(function(e) { $('#cmd').val('schau'); sendInput(); });
  $('button#inv').click(function(e) { $('#cmd').val('inv'); sendInput(); });
  $('button#score').click(function(e) { $('#cmd').val('info'); sendInput(); });

  // some basic move commands
  $('button#up').click(function(e) { $('#cmd').val('o'); sendInput(); });
  $('button#north').click(function(e) { $('#cmd').val('n'); sendInput(); });
  $('button#east').click(function(e) { $('#cmd').val('o'); sendInput(); });
  $('button#south').click(function(e) { $('#cmd').val('s'); sendInput(); });
  $('button#west').click(function(e) { $('#cmd').val('w'); sendInput(); });
  $('button#down').click(function(e) { $('#cmd').val('u'); sendInput(); });

  // clear screen
  $('button#clear').click(function(e) { $('div#out').html(''); });

  setTimeout(function(){
    adjustLayout();    
    send('\n', false);
  },200)
});
