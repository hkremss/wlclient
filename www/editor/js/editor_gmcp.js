// all the GMCP handling for the editor part is done here!
//

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

// We need to know the socket
var sock = null;

// Update socket to use
function useSocket(newSock) {
  sock = newSock;
}

function SendGMCP_WL_File_List(path) {
  if (sock) {
    var msg = 'WL.File.List { \"path\":' + JSON.stringify(path) +' }' ;
    sock.emit('stream', IAC+SB+TELOPT_GMCP+msg+IAC+SE);
  }
}

function doGMCPReceive(sock, data) {
  if(data.length>0) {

    var module = data.split(' ', 1)[0];
    var payload = data.substr(module.length);

    switch (module) {
      case 'Core.Ping':
        HandleGMCP_Core_Ping(sock, module, payload);
        break;
      case 'Core.Goodbye':
        HandleGMCP_Core_Goodbye(sock, module, payload);
        break;
      case 'Char.Vitals':
        HandleGMCP_Char_Vitals(sock, module, payload);
    }
  }
}
