/* 
 * The Wunderland Creators Editor, FiletreeHandler.
 *
 * Written in TypeScript and compiled to ECMAScript.
 * 
 */

namespace wlClient {

    export class WLEditorFiletreeHandler {

        // micromodal = require('micromodal')
        private micromodal = null; // MicroModal

        // the Editor, the GMCHandler, given on initialize
        private wlEditor: WLEditor = null;
        private gmcpHandler: WLEditorGMCPHandler = null;

        private currentPath = '';
        private selectedEntry = '';

        public initialize(editor: WLEditor, gmcpHandler : WLEditorGMCPHandler) {

            this.wlEditor = editor;
            this.gmcpHandler = gmcpHandler;

            if (this.micromodal == null) {
                this.micromodal = require('micromodal');
                this.micromodal.init();
            }
/*
            $( "ul#fileslist" ).selectable({
                stop: function() {
                    var result = $( "#select-result" ).empty();
                    $( ".ui-selected", this ).each(function() {
                        var index = $( "ul#fileslist li" ).index( this );
                        if (index>=0) {
                        index++;
                        // from messagelist.js
                        var path = $( "ul#fileslist" ).find('li:nth-child('+index+')').text();
                        if (path == this.selectedEntry) {
                            // if selected 'again', do something (kind of double click behavior)
                            if (path.lastIndexOf('/') == -1) {
                            // double click on a file
                            this.gmcpHandler.SendGMCP_WL_File_Transfer(this.currentPath + "/" + path, 0); // it's a request
                            this.wlEditor.logMessage( "Open file: " + this.currentPath + "/" + path);
                            } else {
                                this.gmcpHandler.SendGMCP_WL_File_List(this.currentPath + "/" + path + "*");
                            this.wlEditor.logMessage( "Get file list for: " + this.currentPath + "/" + path);
                            }
                            this.selectedEntry = '';
                        } 
                        else {
                            // first selection
                            this.selectedEntry = path;
                            this.wlEditor.logMessage( "Element '" + path + "' selected.");
                        }
                        }
                    });
                }
            });
*/
        }

        public refreshFiletree() {
/*
            var path = localStorage.getItem('WL.File.List path');
            var list = localStorage.getItem('WL.File.List list');

            if (path!=null) {
                var currentFilename = path.replace(/^.*[\\\/]/, '');
                this.currentPath = path.substring(0, (path.length-currentFilename.length)-1);
            }
            
            // from messagelist.js
            this.wlEditor.logMessage("Received WL.File.List update for: " + path);

            $('ul#fileslist').empty();

            if (list != null && list.length > 0) {
                var fileList = JSON.parse(list);

                // sort by name
                fileList.sort(function(a, b){ return a[0] > b[0] });

                if (fileList.length > 0) {
                    for (var i = 0; i < fileList.length; i++)
                    {
                        if (fileList[i][0] == '.') continue;
                        if (fileList[i][0] == '..' && this.currentPath == "") continue;
                        var il = document.createElement('li');
                        il.class='ui-widget-content';
                        if (fileList[i][1] >= 0) {
                        il.appendChild(document.createTextNode(fileList[i][0]));
                        } else {
                        il.appendChild(document.createTextNode(fileList[i][0] + '/'));
                        }
                        $('ul#fileslist').append(il);
                    }
                }
            }
*/
        }
    }
}
