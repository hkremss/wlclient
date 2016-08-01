
function writeToScreen(str) {
  var out = $('div#out');
  out.append('<span class="out">' + str + '</span>');
  out.scrollTop(out.prop("scrollHeight"));
}

function writeServerData(sock, buf) {
  // now we send utf8 string instead of utf8 array
  // var data = new Uint8Array(buf);
  // var str = binayUtf8ToString(data, 0);
  var str = buf;

  var lines = str.split('\r\n');
  for(var i=0; i<lines.length; i++) {
// NO! (Holger)
// Don't replace double spaces!
    var line = lines[i]; //.replace(/\s\s/g, '&nbsp;');
    if(i < lines.length-1) line += '<br/>';

    // replace the prompt "> " with a empty line
// NO! (Holger)
// Don't eat the prompt!
//    var len = line.length;
//    if(len>=2 && line.substr(len-2) == '> ') line = line.substr(0, line-2) + '<br/>';

// New: Telnet negotiations (Holger).
/*
var len = line.length;
if(len>0){
  var iacIdx = 0;
  while((iacIdx=line.indexOf('\xff',iacIdx))>=0){
    writeToScreen('[IAC');
    if(iacIdx+2<len){
      if(line[iacIdx+1]=='\xfe'){
        writeToScreen(' DONT');
      } else if(line[iacIdx+1]=='\xfd'){
        writeToScreen(' DO');
      } else if (line[iacIdx+1]=='\xfc'){
        writeToScreen(' WONT');
      } else if (line[iacIdx+1]=='\xfb'){
        writeToScreen(' WILL');
      } else {
        writeToScreen(' ('+String.charCodeAt(iacIdx+1)+')');
      }

      if(line[iacIdx+1]=='\xfb' && line[iacIdx+2]=='\x19'){ // IAC WILL EOR
        writeToScreen(' EOR]');
        // respond: [IAC DO EOR]
        //if(sock) sock.emit('stream', '\xff\xfd\x19');        
        // respond: [IAC WONT EOR]
        if(sock) sock.emit('stream', '\xff\xfc\x19');        
      } else
      if(line[iacIdx+1]=='\xfb' && line[iacIdx+2]=='\x01'){ // IAC WILL ECHO - request to turn off local echo
        writeToScreen(' ECHO]');
        // respond: [IAC DO ECHO]
        if(sock) sock.emit('stream', '\xff\xfd\x01');        
      } else
      if(line[iacIdx+1]=='\xfc' && line[iacIdx+2]=='\x01'){ // IAC WONT ECHO - request to turn on local echo
        writeToScreen(' ECHO]');
        // respond: [IAC DONT ECHO]
        if(sock) sock.emit('stream', '\xff\xfe\x01');        
      } else {
        writeToScreen(' '+line.charCodeAt(iacIdx+2)+']');
        if(sock) sock.emit('stream', '\xff\xfc'+line[iacIdx+2]);
      }
      iacIdx+=2;
    }
  }
}
*/
    line = ansi_up.ansi_to_html(line);

    writeToScreen(line);
  }
}

function adjustLayout() {
  var w = $(window).width(), h = $(window).height();
  var w0 = $('div#cmd').width();
  var w1 = $('button#send').outerWidth(true);
  var w2 = $('button#clear').outerWidth(true);
  $('input#cmd').css({
    width: (w0 - (w1+w2+14)) + 'px',
  });
  var h0 = $('div#cmd').outerHeight(true);
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
    writeServerData(sock, buf);
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
  var send = function(str) {
    writeToScreen(str);
    if(sock) sock.emit('stream', str);
  }
  var sendInput = function() {
    var cmd = $('input#cmd');
    var trim_cmd = cmd.val().trim();
    if(trim_cmd.length>0 && history.indexOf(trim_cmd)!=0) {
      // add trim_cmd to history
      history.unshift(trim_cmd);
      // limit length of history
      if (history.length > history_max) history.pop();
    }
    history_idx=-1;
    send(trim_cmd + '\n');
    cmd.val('');
  }

  // UI events
  $('input#cmd').keypress(function(e) {
    // history test
    if(e.keyCode == 38) { // UP
//writeToScreen('UP1');
      if(history.length>=0 && (history_idx+1)<history.length) {
//writeToScreen(' UP2 (' + history_idx + ')');
        if(history_idx<0) { history_tmp = $('input#cmd').val().trim(); }
//writeToScreen(' UP3 (' + history_tmp + ')');
        history_idx++;
//writeToScreen(' UP4 (' + history_idx + ' '+ history[history_idx] + ')');
        $('input#cmd').val(history[history_idx]);
      }
    }
    if(e.keyCode == 40) { // DOWN
//writeToScreen('DN1');
      if(history_idx>=0) {
//writeToScreen(' DN2 (' + history_idx + ')');
        history_idx--;
        if(history_idx<0) { 
//writeToScreen(' DN3a (' + history_tmp + ')');
          $('input#cmd').val(history_tmp);
        }
        else {
//writeToScreen(' DN3b (' + history_idx + ' '+ history.length + ')');
          if(history_idx<history.length) {
//writeToScreen(' DN4 (' + history[history_idx] + ')');
            $('input#cmd').val(history[history_idx]);
          }
        }
      }
    }
    if(e.keyCode == 13) sendInput();
  });
  $('button#send').click(function(e) {
    sendInput();
  });
  $('button#clear').click(function(e) {
    $('div#out').html('');
  });

  setTimeout(function(){
    adjustLayout();
    
    send('\n');
  },200)
});
