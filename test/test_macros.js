/*
 * Macro processor tests
 */

// see https://stackoverflow.com/a/30794280
var rewire = require('rewire');
var should = require('should');
var anymatch = require('anymatch');

//import rewire from 'rewire';
//import should from 'should';
//import anymatch from 'anymatch/index.js';

const mod = rewire('../www/js/macros.js');

//import {TMP} from '../www/js/macros.js';

// Expose module functions for testing
var TMP = mod.__get__('TMP');
var MacroProcessor = mod.__get__('TMP.MacroProcessor');

//console.log("==========");
console.log(TMP);
console.log(MacroProcessor);
//console.log("==========");

describe('MacroProcessor', function () {

  var macros = new TMP.MacroProcessor;

  describe('getVersion', function () {
    it('should return version 0.2 as string', function () {
      var version = macros.getVersion();
      version.should.be.type('string');
      version.should.have.lengthOf(3);
      version.should.eql('0.3');
    });
  });

  // SaveSettings()

  // ReloadSettings()

  // GetNamedKey()

  // HandleKey()

  describe('getFirstWord', function () {
    it('should return the first word of a string', function() {
      var firstWord = macros.getFirstWord('A1C D2F G3I');
      firstWord.should.eql('a1c');
    });
    it('should return nothing, if string starts with spaces', function() {
      var firstWord = macros.getFirstWord(' A1C D2F G3I');
      firstWord.should.be.empty();
    });
  });

  describe('getQuotedString', function () {
    it('should return a quoted string from index 0 to n of the input string', function() {
      var firstWord = macros.getQuotedString('"reg ex" und so weiter');
      firstWord.should.eql('"reg ex"');
    });
    it('should return nothing, if quoted string does not start from index 0', function() {
      var firstWord = macros.getQuotedString(' "reg ex" und so weiter');
      firstWord.should.eql('');
    });
    it('should return nothing, if there is an opening ", but no closing "', function() {
      var firstWord = macros.getQuotedString('"reg ex und so weiter');
      firstWord.should.eql('');
    });
    it('should return nothing, if closing quote is escaped (\\")', function() {
      var firstWord = macros.getQuotedString('"reg ex\\" und so weiter');
      firstWord.should.eql('');
    });
    it('should return a quoted string, if backslash is escaped in front of closing quote (\\\\")', function() {
      var firstWord = macros.getQuotedString('"reg ex\\\\" und so weiter');
      firstWord.should.eql('"reg ex\\\\"');
    });
    it('should return nothing, if closing quote is escaped and backslash in front is escaped too (\\\\\\")', function() {
      var firstWord = macros.getQuotedString('"reg ex\\\\\\" und so weiter');
      firstWord.should.eql('');
    });
    it('should return a quoted string, as long, as number of leading backslashes is even ("\\\\\\\\\\\\\\\\\\\\")', function() {
      var firstWord = macros.getQuotedString('"\\\\\\\\\\\\\\\\\\\\" und so weiter');
      firstWord.should.eql('"\\\\\\\\\\\\\\\\\\\\"');
    });
    
  });

  // handleDEF()

  // handleUNDEF()

  describe('handleLIST', function () {
    it('should return a list of macros', function() {
      //macros.handleDEF('def', 'def a=b');
      var handle = macros.handleLIST('list', 'list *');
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(25); // '% list: no macros found.\n'
    });
  });

  // handleSET()

  // handleUNSET()

  // handleLISTVAR()

  // handleLET()

  // handleHELP()

  // handleDEFAULT()

  // resolveSingle()

  // resolve()

});
