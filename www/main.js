// Split the query-string into key-value pairs and return a map.
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
  out.append('<span class="out">' + str + '</span>');
  out.scrollTop(out.prop("scrollHeight"));
  while(out.children().length>5000) out.children().first().remove();
}

function pad (str, pad_str, max) {
  str = str.toString();
  return str.length < max ? pad(pad_str.toString() + str, max) : str;
}

// New: GMCP support (Holger)
function getGMCPHello(){
  return 'Core.Hello { \"client\": \"WL@Web\", \"version\": \"1.0.0\" }';
}

function doGMCPReceive(sock, data) {
  if(data.length>0) {

    // handle JSON data here and update UI!
    //writeToScreen('GMCP: ' + data + '<br>');

    var module = data.split(' ', 1)[0];
    var payload = data.substr(module.length);
  
    if(module=='Char.Vitals') {
      //writeToScreen('GMCP: Char.Vitals!<br>');
      var values = JSON.parse(payload);

      // XP
      if('xp' in values){
        $('span#xp.info').text(pad(values['xp'], ' ', 3));
      }

      // HP
      if('hp' in values){
        $('span#hp.info').text(pad(values['hp'], ' ', 3));
      }
      if('max_hp' in values){
        $('span#max_hp.info').text(pad(values['max_hp'], ' ', 3));
      }

      // SP
      if('sp' in values){
        $('span#sp.info').text(pad(values['sp'], ' ', 3));
      }
      if('max_sp' in values){
        $('span#max_sp.info').text(pad(values['max_sp'], ' ', 3));
      }

      // QP
      if('qp' in values){
        $('span#qp.info').text(pad(values['qp'], ' ', 3));
      }
      if('max_qp' in values){
        $('span#max_qp.info').text(pad(values['max_qp'], ' ', 3));
      }

      // Wimpy
      if('wimpy' in values){
        $('span#wimpy.info').text(pad(values['wimpy'], ' ', 3));
      }
      if('wimpy_dir' in values){
        $('span#wimpy_dir.info').text(pad(values['wimpy_dir'], ' ', 3));
      }

      // INT, STR, DEX, CON
      if('int' in values){
        $('span#int.info').text(pad(values['int'], ' ', 3));
      }
      if('str' in values){
        $('span#str.info').text(pad(values['str'], ' ', 3));
      }
      if('dex' in values){
        $('span#dex.info').text(pad(values['dex'], ' ', 3));
      }
      if('con' in values){
        $('span#con.info').text(pad(values['con'], ' ', 3));
      }
    }
  } 
}

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
  var TELOPT_EOR      = '\x19'; // 25
  var TELOPT_TSPEED   = '\x20'; // 32
  var TELOPT_LINEMODE = '\x22'; // 34
  var TELOPT_XDISPLOC = '\x23'; // 35
  var TELOPT_ENVIRON  = '\x24'; // 36
  var TELOPT_GMCP     = '\xc9'; // 201 -> http://www.gammon.com.au/gmcp

  var strippedBuf = '';
  var len = buf.length;

  if(len>0){
    var oldIacIdx = 0;
    var newIacIdx = 0;
    while((newIacIdx=buf.indexOf(IAC,oldIacIdx))>=0){

      // Copy first part of strippedBuf and skip IACs
      strippedBuf+=buf.substr(oldIacIdx, newIacIdx-oldIacIdx);

      if(newIacIdx+2<len){

        switch(buf[newIacIdx+1]){
          case DONT:
//            strippedBuf+='[IAC DONT ('+buf.charCodeAt(newIacIdx+2)+')]';
            oldIacIdx = newIacIdx+3;
            break;
          case DO:
            switch(buf[newIacIdx+2]){
              case TELOPT_TSPEED:
              case TELOPT_LINEMODE:
              case TELOPT_XDISPLOC:
              case TELOPT_ENVIRON:
              default:
                // we WONT do anything else. So just reply all DO by WONT
//                strippedBuf+='[receive: IAC DO ('+buf.charCodeAt(newIacIdx+2)+')]\n';
                if(sock) sock.emit('stream', IAC+WONT+buf.substr(newIacIdx+2,1));
//                strippedBuf+='[respond: IAC WONT ('+buf.charCodeAt(newIacIdx+2)+'|'+buf[newIacIdx+2]+')]\n';
                break;
            }
            oldIacIdx = newIacIdx+3;
            break;
          case WONT:
            switch(buf[newIacIdx+2]){
              case TELOPT_ECHO:
                // enable local echo!
//                strippedBuf+='[receive: IAC WONT ECHO]\n';
                $('input#cmd').get(0).type="text";
                if(sock) sock.emit('stream', IAC+DONT+TELOPT_ECHO);
//                strippedBuf+='[respond: IAC DONT ECHO]\n';
                break;
              default:
                // if the server WONT to do something anymore, tell it, this is fine.
//                strippedBuf+='[receive: IAC WONT ('+buf.charCodeAt(newIacIdx+2)+')]\n';
                if(sock) sock.emit('stream', IAC+DONT+buf.substr(newIacIdx+2,1));
//                strippedBuf+='[respond: IAC DONT ('+buf.charCodeAt(newIacIdx+2)+')]\n';
                break;
            }
            oldIacIdx = newIacIdx+3;
            break;
          case WILL:
            switch(buf[newIacIdx+2]){
              case TELOPT_EOR:
                // No EOR support!
//                strippedBuf+='[receive IAC WILL EOR]\n';
                if(sock) sock.emit('stream', IAC+DONT+TELOPT_EOR);
//                strippedBuf+='[respond: IAC DONT EOR]\n';
                break;
              case TELOPT_ECHO:
                // disable local echo!
//                strippedBuf+='[receive: IAC WILL ECHO]\n';
                $('input#cmd').get(0).type='password';
                if(sock) sock.emit('stream', IAC+DO+TELOPT_ECHO);
//                strippedBuf+='[respond: IAC DO ECHO]\n';
                break;
              case TELOPT_GMCP:
                // use GMCP
//                strippedBuf+='[receive: IAC WILL GMCP]\n';
                if(sock) sock.emit('stream', IAC+DO+TELOPT_GMCP);
//                strippedBuf+='[respond: IAC DO GMCP]\n';
		if(sock) sock.emit('stream', IAC+SB+TELOPT_GMCP+getGMCPHello()+IAC+SE);
//                strippedBuf+='[respond: IAC SB GMCP \''+getGMCPHello()+'\' IAC SE]\n';
		break;
              default:
                // we DONT accept anything else. So just reply all WILL by DONT
//                strippedBuf+='[receive: IAC WILL ('+buf.charCodeAt(newIacIdx+2)+')]\n';
                if(sock) sock.emit('stream', IAC+DONT+buf.substr(newIacIdx+2,1));
//                strippedBuf+='[respond: IAC DONT ('+buf.charCodeAt(newIacIdx+2)+')]\n';
                break;
            }
            oldIacIdx = newIacIdx+3;
            break;
          case SB:
            var endSubNegIdx=buf.indexOf(SE, newIacIdx+2);
            if(endSubNegIdx>0){
              if (buf[newIacIdx+2]==TELOPT_GMCP){
                // Received GMCP message!
                doGMCPReceive(sock, buf.substr(newIacIdx+3, endSubNegIdx-(newIacIdx+4)));
              }
              else {
//                strippedBuf+='[receive IAC SB ... SE]\n';
              }
              oldIacIdx = endSubNegIdx+1;
            }
            break;
          default:
//            strippedBuf+='[IAC ('+buf.charCodeAt(newIacIdx+1)+') ('+buf.charCodeAt(newIacIdx+2)+')]\n';
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

  var lines = buf.split('\r\n');

  for(var i=0; i<lines.length; i++) {

    var line = lines[i];

    line = ansi_up.escape_for_html(line);
    line = ansi_up.ansi_to_html(line);

    if(i < lines.length-1) line += '<br/>';

    writeToScreen(line);
  }
}

function adjustLayout() {

  var w = $('div#page').width(), h = $('div#page').height();
  var w0 = $('div#in').width();
  var w1 = $('button#send').outerWidth(true);
  var w2 = $('button#clear').outerWidth(true);
  var w3 = $('div#info').width();
  $('div#in').css({
    width: (w-(w3+6)) + 'px',
  });
  $('input#cmd').css({
    width: (w0 - (w1+w2+14+4)) + 'px',
  });
    
  //writeToScreen('w -> ' + w + 'px w0 -> '+w0+'px w1 -> '+w1+'px w2 -> '+w2+'px w3 -> '+w3+'\n');
  
  var h0 = $('div#in').outerHeight(true);
  $('div#out').css({
    width: (w-(w3+6)) + 'px',
    height: (h - h0 -2) + 'px',
  });

}

$(window).resize(adjustLayout);

$(document).ready(function(){

  // adjust colors
  var queryParams=parseQuery(document.location.search);
  var bgColor = queryParams['bg'];
  if(bgColor!=null) { $(this).get(0).body.style.backgroundColor='#'+bgColor; }
//  if(bgColor!=null) { $('div#out').get(0).style.backgroundColor='#'+bgColor; }
  var fgColor = queryParams['fg'];
  if(fgColor!=null){ $(this).get(0).body.style.color='#'+fgColor; }
//  if(fgColor!=null){ $('div#out').get(0).style.color='#'+fgColor; }

  // show help text
  jQuery.get('/help.txt', function(data) {
    var lines = data.split('\n');
    for(var i=0; i<lines.length; i++) {
      writeToScreen(lines[i] + '<br/>');
    }
  });

  // websocket
  var sock = io.connect();
  sock.on('stream', function(buf){
    buf = doTelnetNegotions(sock, buf);
    writeServerData(buf);
  });
  sock.on('status', function(str){
    writeToScreen(str);
  });
  sock.on('connected', function(){
    console.log('connected');
  });
  sock.on('disconnect', function(){
    console.log('disconnected');
  });

  var history_idx = -1; // current position in history array
  var history_max = 20; // max size of history
  var history_tmp = ''; // remember current input
  var history = [];     // the history array

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

  var sendInput = function() {
    var cmd = $('input#cmd');
    var trim_cmd = cmd.val().trim();
    if(trim_cmd.length>0 && history.indexOf(trim_cmd)!=0) {
      // add trim_cmd to history, if it's not a password
      if(cmd.get(0).type!='password') history.unshift(trim_cmd);
      // limit length of history
      if (history.length > history_max) history.pop();
    }
    history_idx=-1;
    send(trim_cmd + '\n', cmd.get(0).type=='password');
    cmd.val('');
  }

  // UI events
  $('input#cmd').keypress(function(e) {
    if(e.keyCode == 13) sendInput();
  });

  $('input#cmd').keydown(function(e) {
    // cursor up/down history
    // keypress event does not work in IE/Edge!
    switch (e.keyCode) {
      case 37:
        //alert('left');
        break;
      case 38:
        //alert('up');
        if(history.length>=0 && (history_idx+1)<history.length) {
          if(history_idx<0) { history_tmp = $(this).val().trim(); }
          history_idx++;
          $(this).val(history[history_idx]);
        }
        break;
      case 39:
        //alert('right');
        break;
      case 40:
        //alert('down');
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

  $('button#send').click(function(e) {
    sendInput();
  });

  $('button#clear').click(function(e) {
    $('div#out').html('');
  });

  setTimeout(function(){
    adjustLayout();    
    send('\n', false);
  },200)
});
