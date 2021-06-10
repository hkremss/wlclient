/* 
 * The Wunderland Creators Editor.
 *
 * Written in TypeScript and compiled to ECMAScript.
 *
 * Build: tsc --sourceMap editor.ts
 * 
 * Ideas: 
 *  -
 */

namespace wlClient {

    export class WLEditor {
        // We need to know the client window and socket
        private clientWindow: Window = null;
        private clientInstance: any = null;

        // Handlers
        private resizeHandler: WLEditorResizeHandler = null;
        private tabsHandler: WLEditorTabsHandler = null;
        private gmcpHandler: WLEditorGMCPHandler = null;
        private filetreeHandler: WLEditorFiletreeHandler = null;

        // Update client window/socket to use
        public updateClient(clientWin: Window, clientInst: any) {
            this.clientWindow = clientWin;
            this.clientInstance = clientInst;
        }

        public isClientConnected() {
            return this.clientWindow && this.clientInstance && this.clientInstance.getSocket().connected;
        }

        public getClientSocket() {
            if (this.clientWindow && this.clientInstance)
                return this.clientInstance.getSocket();
            else
                return null;
        }

        public isClientWindowClosed() {
            return !this.clientWindow || this.clientWindow.closed;
        }

        public focusClientWindow() {
            if (!this.isClientWindowClosed()) this.clientWindow.focus();
        }

        // Part of document body to handle storage events
        private handle_storage(event) {
            console.log("STORAGE EVENT: " + event.key);
            // file list received  
            if (/^WL\.File\.List list/.test(event.key)) this.filetreeHandler.refreshFiletree();
            // file has been transferred
            if (/^WL\.File\.Transfer path/.test(event.key)) this.tabsHandler.refreshEditpart();
        };

        // Called once from app.js, when all required modules are loaded.
        public startEditor() {
            this.resizeHandler = new WLEditorResizeHandler();
            this.filetreeHandler = new WLEditorFiletreeHandler();
            this.tabsHandler = new WLEditorTabsHandler();
            this.gmcpHandler = new WLEditorGMCPHandler();

            this.resizeHandler.initialize();
            this.gmcpHandler.initialize(this);
            this.tabsHandler.initialize(this, this.gmcpHandler);

            // rebuild existing tabs from storage items
            this.tabsHandler.refreshEditpart();

            // react on storage events
            window.addEventListener('storage', this.handle_storage, false);
        }

        public logMessage(msg: string) {
            document.getElementById('messages').append( "<span style=\"display: block;\">" + new Date().toJSON() + ": "+msg + "</span>");
            document.getElementById('messages').scrollTop = document.getElementById('messages').scrollHeight;
        }
    }
}
