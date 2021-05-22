I need my own 'fork' of ansi-regex, because I'm (still) on browser level using 
RequireJS and have to deal with issues like:

Uncaught ReferenceError: module is not defined
    <anonym> http://localhost:4716/client/node_modules/ansi-regex/index.js:3

So, what I did is the following workaround:

https://requirejs.org/docs/commonjs.html#manualconversion

Holger 21.05.2021
