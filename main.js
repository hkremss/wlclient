#!/usr/bin/env node

'use strict';

var info = require('./package.json');

var path = require('path'),
    socketio = require('socket.io')({ path: '/client/socket.io'}),
    express = require('express'),
    https = require('https'),
    http = require('http'),
    fs = require('fs'),
    webtelnet = require('./webtelnet-proxy.js');

var conf = {
  telnet: {
    host: '127.0.0.1',
    port: 23,
  },
  web: {
    host: '0.0.0.0',
    port: 8080,
  },
  www: path.resolve(__dirname + '/www'),
  logTraffic: true,
};

var argv = process.argv;
var me = argv[1];
var args = require('minimist')(argv.slice(2));

process.stdout.write('wlclient, version ' + info.version + ', by ' + info.author.name + ' <' + info.author.email +'>\n');

if(args._.length < 2) {
  process.stdout.write(
    'Syntax: webtelnet <http-port> <telnet-port> [options]\n' +
    'Options: \n' +
    '    [-s]\n' +
    '    [-h <telnet-host>]\n' +
    '    [-w <path/to/www>]\n' +
    '    [-c <charset>]\n'
  );
  process.exit(0);
}

conf.web.port = parseInt(args._[0], 10);
conf.telnet.port = parseInt(args._[1], 10);

if(args.h) conf.telnet.host = args.h;
if(args.w) conf.www = path.resolve(args.w);

var app = express();

// debug logging
//app.use(function (req, res, next) {
//  console.log('Time:', Date.now(), 'req.originalUrl:', req.originalUrl, 'statusCode:', res.statusCode);
//  next();
//});

// Setup static content folder
app.use('/client', express.static(conf.www));

// Propagate some nodes_modules to a static web uri as well
app.use('/client/node_modules/ansi_up', express.static(__dirname + '/node_modules/ansi_up/'));
app.use('/client/node_modules/jquery', express.static(__dirname + '/node_modules/jquery/dist/'));
app.use('/client/node_modules/jquery-ui', express.static(__dirname + '/node_modules/jquery-ui-dist/'));
app.use('/client/node_modules/lightbox2', express.static(__dirname + '/node_modules/lightbox2/dist/'));
app.use('/client/node_modules/picomatch', express.static(__dirname + '/node_modules/picomatch/lib/'));

var httpserver = null;

if (args.s) {
  // This line is from the Node.js HTTPS documentation.
  var options = {
    key: fs.readFileSync('/home/www/ssl/wl-key.pem'),
    cert: fs.readFileSync('/home/www/ssl/wl-cert.pem')
  };
  httpserver = https.createServer(options, app);
  httpserver.listen(conf.web.port, conf.web.host, function(){
    console.log('HTTPS listening on ' + conf.web.host + ':' + conf.web.port);
  });
} 
else {
  httpserver = http.createServer(app);
  httpserver.listen(conf.web.port, conf.web.host, function(){
    console.log('HTTP listening on ' + conf.web.host + ':' + conf.web.port);
  });
}

// create socket io
var io = socketio.listen(httpserver);

// create webtelnet proxy and bind to io
var webtelnetd = webtelnet(io, conf.telnet.port, conf.telnet.host);
if(args.c) webtelnetd.setCharset(args.c);
