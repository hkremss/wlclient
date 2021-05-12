/*
* Macro processor tests
*/

// see https://stackoverflow.com/a/30794280
var rewire = require('rewire');

var TMP = rewire('../www/js/macros.js');
var MacroProcessor = TMP.__get__('MacroProcessor');
//import MacroProcessor from '../www/js/macros.js';


console.log("==========");
console.log(TMP);
console.log(MacroProcessor);
console.log("==========");


var should = require('should');

describe('MacroProcessor', function () {

  describe('getVersion', function () {

    it('should return a version as string', function () {
      var macros = new MacroProcessor;
      var version = macros.getVersion();
      version.should.be.type('string');
      version.should.have.lengthOf(3);
    });

  });

});
