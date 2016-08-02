
function writeToScreen(str) {
  var out = $('div#out');
  out.append('<span class="out">' + str + '</span>');
  out.scrollTop(out.prop("scrollHeight"));
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
              strippedBuf+='[receive IAC SB ... SE]\n';
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

    // Don't replace double spaces!
    var line = lines[i]; //.replace(/\s\s/g, '&nbsp;');
    if(i < lines.length-1) line += '<br/>';

    // Don't eat the prompt!
    // var len = line.length;
    // if(len>=2 && line.substr(len-2) == '> ') line = line.substr(0, line-2) + '<br/>';

    line = ansi_up.ansi_to_html(line);

    writeToScreen(line);
  }
}

function adjustLayout() {
  var w = $(window).width(), h = $(window).height();
  var w0 = $('div#in').width();
  var w1 = $('button#send').outerWidth(true);
  var w2 = $('button#clear').outerWidth(true);
  $('input#cmd').css({
    width: (w0 - (w1+w2+14)) + 'px',
  });
  var h0 = $('div#in').outerHeight(true);
  $('div#out').css({
    width: (w-2) + 'px',
    height: (h - h0 -2) + 'px',
  });
}

$(window).resize(adjustLayout);

$(document).ready(function(){
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
