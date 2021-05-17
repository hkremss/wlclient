I need my own 'fork' of picomatch, because I'm (still) on browser level using 
RequireJS and have to deal with issues like:

Uncaught ReferenceError: module is not defined
    <anonymous> http://localhost:4716/client/node_modules/picomatch/picomatch.js:1

So, what I did is the following workaround:

https://requirejs.org/docs/commonjs.html#manualconversion

In additon 'path' dependency was removed

Holger 17.05.2021
