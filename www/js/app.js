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
    'lightbox2': 'node_modules/lightbox2/js/lightbox.min',
    'micromodal': 'node_modules/micromodal/micromodal',
    'socket.io': 'socket.io/socket.io.min', // socket.io serves it's own client(s)
    'ansi_up': 'node_modules/ansi_up/ansi_up',
    'constants': 'js/picomatch/constants',
    'scan': 'js/picomatch/scan',
    'parse': 'js/picomatch/parse',
    'utils': 'js/picomatch/utils',
    'picomatch': 'js/picomatch/picomatch',
    'ansi-regex': 'js/ansi-regex/index',
  }
});

/* Load dependencies and start client. */
require([
  'jquery', 'jquery-ui', 'lightbox2', 'micromodal', 'socket.io', 'ansi_up',
  'constants','scan','parse','utils','picomatch',
  'ansi-regex',
  'js/menus','js/macros','js/gmcp_client','js/client'], function() {
    //This function is called when scripts are loaded.
    console.log('Start client...');
    startClientFunction();
});
