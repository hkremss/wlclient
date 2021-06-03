/* 
 * Client application entry point. 
 *
 * Make sure all dependencies are loaded asynchronously and 
 * finally call startClientFunction();
 *
 */

/* RequireJS configuration. */
requirejs.config({
  baseUrl: '',
  paths: {
    // the left side is the module ID,
    // the right side is the path to
    // the file, relative to baseUrl.
    // Also, the path should NOT include
    // the '.js' file extension.
    'jquery': '/client/node_modules/jquery/jquery.min',
    'jquery-ui': '/client/node_modules/jquery-ui/jquery-ui.min',
    'micromodal': '/client/node_modules/micromodal/micromodal',    
    'lib/codemirror': '/client/editor/lib/codemirror',
    'addon/edit/matchbrackets': '/client/editor/addon/edit/matchbrackets',
    'addon/hint/show-hint': '/client/editor/addon/hint/show-hint',
    'mode/clike/clike': '/client/editor/mode/clike/clike',
    'mode/xml/xml': '/client/editor/mode/xml/xml',
    'mode/css/css': '/client/editor/mode/css/css',
    'mode/javascript/javascript': '/client/editor/mode/javascript/javascript',
    'mode/htmlmixed/htmlmixed': '/client/editor/mode/htmlmixed/htmlmixed',
  }
});

/* Load dependencies and start client. */
require([
    'jquery', 'micromodal', 'jquery-ui',
    'js/gmcp_editor','js/toolbar','js/webtoolkit.md5','js/filelist','js/editpart','js/messagelist','js/resizing','js/storage_event',
    'lib/codemirror','addon/edit/matchbrackets','addon/hint/show-hint','mode/clike/clike',
    'mode/xml/xml','mode/css/css','mode/javascript/javascript','mode/htmlmixed/htmlmixed',
  ], function() {
        //This function is called when scripts are loaded.
        console.log('Start editor...');
      $(function() {
          initialize_toolbar();  // in toolbar.js
          initialize_resizing(); // in resizing.js
          initialize_editpart(); // in editpart.js
          refresh_editpart();    // in storage_event.js
          refresh_filetree();    // in storage_event.js
        });
//        window.onload = function name(params) {
//            refresh_filetree();    // in storage_event.js
//            refresh_editpart();    // in storage_event.js
//        };
    }
);
