// all the GMCP handling for the editor part is done here!
//

"use strict";

// TELNET protocol
var IAC  = '\xff'; // 255
var SB   = '\xfa'; // 250 sub negotiation
var SE   = '\xf0'; // 240 end sub negotiation

// TELNET options (WL relevant)
var TELOPT_GMCP     = '\xc9'; // 201 -> http://www.gammon.com.au/gmcp

// New: GMCP support (Holger)
function getGMCP_WL_File_List(path){
  return 'WL.File.List { \"client\": \"WL@Web\", \"version\": \"1.0.1\" }';
}

// We need to know the client window and socket
var clientWindow;
var clientSocket;

// Update client window/socket to use
function updateClient(win, sock) {
  this.clientWindow = win;
  this.clientSocket = sock;
}

function isClientConnected() {
  return clientWindow && clientSocket && clientSocket.connected && clientWindow.isConnected;
}

function tryBringClientToFront() {
  if (!clientWindow || clientWindow.closed) {
    var windowHandle = window.open("https://wl.mud.de/client/");
    windowHandle.focus();
  }
  else {
    clientWindow.focus();
  }
}

function SendGMCP_WL_File_List(path) {
  if (isClientConnected()) {
    var msg = 'WL.File.List { \"path\":' + JSON.stringify(path) +' }' ;
    clientSocket.emit('stream', IAC+SB+TELOPT_GMCP+msg+IAC+SE);
  } else {
    $( "#messageDialog" ).dialog( "option", "title", "Verbindungsfehler!" );
    $( "#messageDialog" ).html( "Es besteht momentan keine Verbindung zum MUD, melde Dich erst wieder an!" );
    $( "#messageDialog" ).dialog( "open" );
  }
}

function SendGMCP_WL_File_Transfer(path, content) {
  if (isClientConnected()) {
    if (!content) {
      // Request a file
      var msg = 'WL.File.Transfer { \"path\":' + JSON.stringify(path) +' }' ;
      clientSocket.emit('stream', IAC+SB+TELOPT_GMCP+msg+IAC+SE);
    } else if (content.length < 2000) {
      // Send a file at once, offset is always 0, eof always 1 (true).
      var msg = 'WL.File.Transfer {\"path\":' + JSON.stringify(path) +',\"offset\":0,\"content\":' + 
        JSON.stringify(content) + ',\"eof\":1}' ;
      clientSocket.emit('stream', IAC+SB+TELOPT_GMCP+msg+IAC+SE);
    } else {
      // The mud cannot handle messages bigger 5000, because this is the 
      // maximum array size. Because we do not know about the used encoding
      // we chop all files longer than 2048 chars into 2000 char slices
      // for WL.File.Transfer. The mud needs to re-assemble these parts, 
      // when eof:1 (true) is received.
      for(var i=0;i<content.length;i+=2000) {
        var isEof = i+2000<content.length ? '0' : '1';
        var msg = 'WL.File.Transfer {\"path\":' + JSON.stringify(path) +
          ',\"offset\":' + JSON.stringify(i) + 
          ',\"content\":' + JSON.stringify(content.substring(i, i+2000)) + 
          ',\"eof\":' + isEof + '}' ;
        clientSocket.emit('stream', IAC+SB+TELOPT_GMCP+msg+IAC+SE);
      }
    }
  } else {
    $( "#messageDialog" ).dialog( "option", "title", "Verbindungsfehler!" );
    $( "#messageDialog" ).html( "Es besteht momentan keine Verbindung zum MUD, melde Dich erst wieder an!" );
    $( "#messageDialog" ).dialog( "open" );
  }
}

var connectionStatusTimer = setInterval( function() {
  if ( !isClientConnected()) {
	$( "#connectionStatus  .ui-icon" ).css( "background-image", "url(css/images/ui-icons_ff0000_256x240.png)");
        $( "#connectionStatus").prop("title", "Getrennt. Bitte neu einloggen!");
  } else {
    $( "#connectionStatus  .ui-icon" ).css( "background-image", "url(css/images/ui-icons_00ff00_256x240.png)");
        $( "#connectionStatus").prop("title", "Verbunden mit " + this.clientWindow.location);
  }
}, 1000);
