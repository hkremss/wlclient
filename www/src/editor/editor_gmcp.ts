/* 
 * The Wunderland Creators Editor, GMCPHandler.
 *
 * Written in TypeScript and compiled to ECMAScript.
 * 
 */

namespace wlClient {

    // TELNET protocol
    const IAC  = '\xff'; // 255
    const SB   = '\xfa'; // 250 sub negotiation
    const SE   = '\xf0'; // 240 end sub negotiation

    // TELNET options (WL relevant)
    const TELOPT_GMCP     = '\xc9'; // 201 -> http://www.gammon.com.au/gmcp

    export class WLEditorGMCPHandler {

        // micromodal = require('micromodal')
        private micromodal = null; // MicroModal

        // We need to know the editor
        private wlEditor: WLEditor = null;

        // check connection status regularly
        private connectionStatusTimer = null;

        // Update client window/socket to use
        public initialize(editor: WLEditor) {
            this.wlEditor = editor;

            if (this.micromodal == null) {
                this.micromodal = require('micromodal');
                this.micromodal.init();
            }

            this.connectionStatusTimer = setInterval( function() {
                if ( !this.wlEditor || !this.wlEditor.isClientConnected()) {
                    //document.querySelector<HTMLElement>('connectionStatus  .ui-icon').style.backgroundImage = "url(css/images/ui-icons_ff0000_256x240.png)";
                    document.getElementById('connectionStatus').title = "Getrennt. Bitte neu einloggen!";
                    document.getElementById('connectionStatus').textContent = "Offline";
                } else {
                    //document.querySelector<HTMLElement>('connectionStatus  .ui-icon').style.backgroundImage = "url(css/images/ui-icons_00ff00_256x240.png)";
                    document.getElementById('connectionStatus').title = "Verbunden mit " + this.clientWindow.location;
                    document.getElementById('connectionStatus').textContent = "Online";
                }
            }, 1000);
        }

        private tryBringClientToFront() {
            if (this.wlEditor.isClientWindowClosed()) {
                var windowHandle = window.open("https://wl.mud.de/client/");
                windowHandle.focus();
            }
            else {
                this.wlEditor.focusClientWindow();
            }
        }

        private SendGMCP_WL_File_List(path) {
            if (this.wlEditor && this.wlEditor.isClientConnected()) {
                var msg = 'WL.File.List { \"path\":' + JSON.stringify(path) +' }' ;
                this.wlEditor.getClientSocket().emit('stream', IAC+SB+TELOPT_GMCP+msg+IAC+SE);
            } else {
                document.getElementById('infoModalDlg-title').innerHTML = 'Verbindungsfehler!';
                document.getElementById('infoModalDlg-content').innerHTML = 'Es besteht momentan keine Verbindung zum MUD, melde Dich erst wieder an!';
                this.micromodal.show('infoModalDlg');
            }
        }

        public SendGMCP_WL_File_Transfer(path, content) {
            if (this.wlEditor && this.wlEditor.isClientConnected()) {
                if (!content) {
                // Request a file
                var msg = 'WL.File.Transfer { \"path\":' + JSON.stringify(path) +' }' ;
                this.wlEditor.getClientSocket().emit('stream', IAC+SB+TELOPT_GMCP+msg+IAC+SE);
                } else if (content.length < 2000) {
                // Send a file at once, offset is always 0, eof always 1 (true).
                var msg = 'WL.File.Transfer {\"path\":' + JSON.stringify(path) +',\"offset\":0,\"content\":' + 
                    JSON.stringify(content) + ',\"eof\":1}' ;
                    this.wlEditor.getClientSocket().emit('stream', IAC+SB+TELOPT_GMCP+msg+IAC+SE);
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
                    this.wlEditor.getClientSocket().emit('stream', IAC+SB+TELOPT_GMCP+msg+IAC+SE);
                }
                }
            } else {
                document.getElementById('infoModalDlg-title').innerHTML = 'Verbindungsfehler!';
                document.getElementById('infoModalDlg-content').innerHTML = 'Es besteht momentan keine Verbindung zum MUD, melde Dich erst wieder an!';
                this.micromodal.show('infoModalDlg');
            }
        }
    }
}
