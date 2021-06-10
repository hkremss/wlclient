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
    'lib/codemirror','addon/edit/matchbrackets','addon/hint/show-hint','mode/clike/clike',
    'mode/xml/xml','mode/css/css','mode/javascript/javascript','mode/htmlmixed/htmlmixed',
    'micromodal',
    'js/editor'
  ], function() {
        //This function is called when scripts are loaded.
        console.log('Start editor...');
        var editor = new wlClient.WLEditor();
        editor.startEditor();
    }
);
