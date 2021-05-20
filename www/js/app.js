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
    'jquery': 'node_modules/jquery/jquery.min',
    'jquery-ui': 'node_modules/jquery-ui/jquery-ui.min',
    'lightbox2': 'node_modules/lightbox2/js/lightbox',
    'socket.io': 'node_modules/socket.io/client-dist/socket.io.min',
    'ansi_up': 'node_modules/ansi_up/ansi_up',
    'constants': 'js/picomatch/constants',
    'scan': 'js/picomatch/scan',
    'parse': 'js/picomatch/parse',
    'utils': 'js/picomatch/utils',
    'picomatch': 'js/picomatch/picomatch',
  }
});

/* Load dependencies and start client. */
require([
  'jquery', 'jquery-ui', 'lightbox2', 'socket.io', 'ansi_up', 
  'constants','scan','parse','utils','picomatch',
  'js/dropdown','js/macros','js/gmcp_client','js/client'], function() {
    //This function is called when scripts are loaded.
    console.log('DONE!');
    startClientFunction();
});
