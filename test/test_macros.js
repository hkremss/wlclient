/*
 * Macro processor tests
 */

'use strict';

// see https://stackoverflow.com/a/30794280
var rewire = require('rewire');
var should = require('should');
//var anymatch = require('anymatch');

//import rewire from 'rewire';
//import should from 'should';
//import anymatch from 'anymatch/index.js';

const mod = rewire('../www/js/macros.js');

//import {TMP} from '../www/js/macros.js';

// Expose module functions for testing
var TMP = mod.__get__('TMP');
var MacroProcessor = mod.__get__('TMP.MacroProcessor');
var EvaluationContext = mod.__get__('TMP.EvaluationContext');

//console.log("==========");
//console.log(TMP);
//console.log(MacroProcessor);
//console.log(EvaluationContext);
//console.log("==========");

describe('MacroProcessor', function () {

  describe('getVersion', function () {
    it('should return version 0.2 as string', function () {
      var macros = new TMP.MacroProcessor;
      var version = macros.getVersion();
      version.should.be.type('string');
      version.should.have.lengthOf(3);
      version.should.eql('0.3');
    });
  });

  describe('SaveSettings', function () {
    it('should be written later');
  });

  describe('ReloadSettings', function () {
    it('should be written later');
  });

  describe('GetNamedKey', function () {
    it('should be written later');
  });

  describe('HandleKey', function () {
    it('should be written later');
  });

/*   describe('getWords', function () {
      var macros = new TMP.MacroProcessor;
    it('should return an 1 empty word, if string consits of spaces only', function() {
      var words = macros.getWords('   ');
      words.should.have.lengthOf(1);
      words[0].should.eql('');
    });
    it('should return 3 words: \'a\', quoted space and \'b\'', function() {
      var words = macros.getWords('a"   "b');
      //console.log(words);
      words.should.have.lengthOf(3);
      words[0].should.eql('a');
      words[1].should.eql('"   "');
      words[2].should.eql('b');
    });
    it('should return 2 words, the first contains a quoted space, the second is empty', function() {
      var words = macros.getWords(' "   "  ');
      //console.log(words);
      words.should.have.lengthOf(2);
      words[0].should.eql('"   "');
      words[1].should.eql('');
    });
    it('should return an array of 3 words', function() {
      var words = macros.getWords('A1C D2F G3I');
      words.should.have.lengthOf(3);
      words[0].should.eql('A1C');
      words[1].should.eql('D2F');
      words[2].should.eql('G3I');
    });
    it('should return an array of 3 words, even if string starts with spaces', function() {
      var words = macros.getWords(' A1C D2F G3I');
      words.should.have.lengthOf(3);
      words[0].should.eql('A1C');
    });
    it('should an array of 2 words, if first space is escaped', function() {
      var words = macros.getWords('A1C\\ D2F G3I');
      words.should.have.lengthOf(2);
      words[0].should.eql('A1C\\ D2F');
      words[1].should.eql('G3I');
    });
    it('should return all words and quoted words of a string', function() {
      var words = macros.getWords('A1C"D2F G3I"J4L');
      //console.log(words);
      words.should.have.lengthOf(3);
      words[0].should.eql('A1C');
      words[1].should.eql('"D2F G3I"');
      words[2].should.eql('J4L');
    });
    it('should return 2 words, the first contains a quoted \'test\', the second is \'x\'', function() {
      var words = macros.getWords('"test"  x');
      words.should.have.lengthOf(2);
      words[0].should.eql('"test"');
      words[1].should.eql('x');
    });
    it('should return all words and quoted words of a string', function() {
      var words = macros.getWords('/def -t"bla \\" blu" abc');
      //console.log(words);
      words.should.have.lengthOf(4);
      words[0].should.eql('/def');
      words[1].should.eql('-t');
      words[2].should.eql('"bla \\" blu"');
      words[3].should.eql('abc');
    });
  });*/

/*   describe('searchUnescapedChar', function () {
      var macros = new TMP.MacroProcessor;
    it('should return position of a non-escaped char start index of the input string', function() {
      var 
      pos = macros.searchUnescapedChar('abc', 0, '"');
      pos.should.eql(-1);
      pos = macros.searchUnescapedChar('"bc', 0, '"');
      pos.should.eql(0);
      pos = macros.searchUnescapedChar('a"c', 0, '"');
      pos.should.eql(1);
      pos = macros.searchUnescapedChar('ab"', 0, '"');
      pos.should.eql(2);
      pos = macros.searchUnescapedChar('"b"', 1, '"');
      pos.should.eql(2);
      pos = macros.searchUnescapedChar('"""', 2, '"');
      pos.should.eql(2);
      pos = macros.searchUnescapedChar('"\\"', 1, '"'); // need double-escapes (2==1)!
      pos.should.eql(-1);
      pos = macros.searchUnescapedChar('\\\\"', 0, '"'); // need double-escapes (4==2)!
      pos.should.eql(2);
      pos = macros.searchUnescapedChar('\\\\\\ ', 0, ' '); // need double-escapes (6==3)!
      pos.should.eql(-1);
      pos = macros.searchUnescapedChar('\\\\ ', 0, ' '); // need double-escapes (4==2)!
      pos.should.eql(2);
    });
  }); */

  describe('getQuotedString', function () {
      var macros = new TMP.MacroProcessor;
    it('should return a quoted string from index 0 to n of the input string', function() {
      var firstWord = macros.getQuotedString('"reg ex" und so weiter', '"');
      firstWord.should.eql('"reg ex"');
    });
    it('should return nothing, if quoted string does not start from index 0', function() {
      var firstWord = macros.getQuotedString(' "reg ex" und so weiter', '"');
      firstWord.should.eql('');
    });
    it('should return nothing, if there is an opening ", but no closing "', function() {
      var firstWord = macros.getQuotedString('"reg ex und so weiter', '"');
      firstWord.should.eql('');
    });
    it('should return nothing, if closing quote is escaped (\\")', function() {
      var firstWord = macros.getQuotedString('"reg ex\\" und so weiter', '"');
      firstWord.should.eql('');
    });
    it('should return a quoted string, if backslash is escaped in front of closing quote (\\\\")', function() {
      var firstWord = macros.getQuotedString('"reg ex\\\\" und so weiter', '"');
      firstWord.should.eql('"reg ex\\\\"');
    });
    it('should return nothing, if closing quote is escaped and backslash in front is escaped too (\\\\\\")', function() {
      var firstWord = macros.getQuotedString('"reg ex\\\\\\" und so weiter', '"');
      firstWord.should.eql('');
    });
    it('should return a quoted string, as long, as number of leading backslashes is even ("\\\\\\\\\\\\\\\\\\\\")', function() {
      var firstWord = macros.getQuotedString('"\\\\\\\\\\\\\\\\\\\\" und so weiter', '"');
      firstWord.should.eql('"\\\\\\\\\\\\\\\\\\\\"');
    });
    
  });

  describe('handleDEF', function () {
    it('should set and store a macro \'a=sag %{0}, einzeln: 1:%{1} 2:%{2} 3:%{3} 4:%{4}, alle: %{*}\' to localStorage key \''+MacroProcessor.STORAGE_KEY_LIST+'\'', function() {
      var macros = new TMP.MacroProcessor;
      var lsMock = {
        setItem: function (key, jsonString) {
          if (key == MacroProcessor.STORAGE_KEY_LIST) {
            let storedMacros = JSON.parse(jsonString);
            storedMacros.should.be.type('object');
            Object.keys(storedMacros).should.have.lengthOf(1);
            storedMacros['a'].body.should.eql('sag %{0}, einzeln: 1:%{1} 2:%{2} 3:%{3} 4:%{4}, alle: %{*}');
          }
        }
      };
      mod.__set__("localStorage", lsMock);


      var handle = macros.expandMacro('def a = sag %{0}, einzeln: 1:%{1} 2:%{2} 3:%{3} 4:%{4}, alle: %{*}', []);
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(0); // success
    });
    it('should not allow a macro with empty name', function() {
      var macros = new TMP.MacroProcessor;
      var lsMock = {
        setItem: function (key, jsonString) {
          if (key == MacroProcessor.STORAGE_KEY_LIST) {
            let storedMacros = JSON.parse(jsonString);
            storedMacros.should.be.type('object');
            Object.keys(storedMacros).should.have.lengthOf(0);
          }
        }
      };
      mod.__set__("localStorage", lsMock);

      var handle = macros.expandMacro('def  = some body', []);
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.not.have.lengthOf(0); // error message!
    });
    it('should allow a macro with empty body', function() {
      var macros = new TMP.MacroProcessor;
      var lsMock = {
        setItem: function (key, jsonString) {
          if (key == MacroProcessor.STORAGE_KEY_LIST) {
            let storedMacros = JSON.parse(jsonString);
            storedMacros.should.be.type('object');
            Object.keys(storedMacros).should.have.lengthOf(1);
            storedMacros['a'].body.should.eql('');
          }
        }
      };
      mod.__set__("localStorage", lsMock);

      var handle = macros.expandMacro('def a = ');
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(0); // success
    });
    it('should create a macro with trigger option', function() {
      var macros = new TMP.MacroProcessor;
      var lsMock = {
        setItem: function (key, jsonString) {
          if (key == MacroProcessor.STORAGE_KEY_LIST) {
            let storedMacros = JSON.parse(jsonString);
            storedMacros.should.be.type('object');
            Object.keys(storedMacros).should.have.lengthOf(1);
            storedMacros['greet'].body.should.eql('winke %{1}');
            storedMacros['greet'].trigger.pattern.should.eql('{*} kommt an.');
          }
        }
      };
      mod.__set__("localStorage", lsMock);

      var handle = macros.expandMacro('def -t"{*} kommt an." greet = winke %{1}');
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(0); // success
    });
  });

  describe('handleUNDEF', function () {
    it('should be written later');
  });

  describe('handleLIST', function () {
    it('should return a list of macros', function() {
      var macros = new TMP.MacroProcessor;
      //macros.handleDEF('def', 'def a=b');
      var handle = macros.expandMacro('list *');
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(25); // '% list: no macros found.\n'
    });
  });

  describe('searchVariable', function () {
    it('should be written later');
  });

  describe('substituteVariables', function () {
    it('should substitute numbered parameters', function() {
      var macros = new TMP.MacroProcessor;
      let context = new TMP.EvaluationContext;
        context.cmd = 'a b x\'c\\\' d\'';
        context.parameters = context.cmd.split(' ');
        context.localVariables = {};
        var handle = macros.substituteVariables('sag %{0}, einzeln: 1:%{1} 2:%{2} 3:%{3} 4:%{4}, alle: %{*}', [context]);
      handle.should.be.type('string');
      handle.should.eql('sag a, einzeln: 1:b 2:x\'c\\\'\ 3:d\' 4:, alle: b x\'c\\\'\ d\'');
    });
    it('should substitute local variables', function() {
      var macros = new TMP.MacroProcessor;
      macros.globalVariables = { 'borg':'1', 'matching':'glob', 'foo':'bar' };
      let stack = [];
      let context1 = new TMP.EvaluationContext;
      context1.cmd = 'a b x\'c\\\' d\'';
      context1.parameters = context1.cmd.split(' ');
      context1.localVariables = {'loc1':'val1 original','loc2':'val2 original','loc3':'val3','foo':'shadowing global variable'};
      stack.push(context1);
      let context2 = new TMP.EvaluationContext;
      context2.cmd = 'a b x\'c\\\' d\'';
      context2.parameters = context2.cmd.split(' ');
      context2.localVariables = {'loc2':'val2 shadow','foo':'shadowing global variable'};
      stack.push(context2);
      var handle = macros.substituteVariables('loc1: %{loc1}, loc2: %{loc2}, matching: %{matching}, foo: %{foo}', stack);
      handle.should.be.type('string');
      handle.should.eql('loc1: val1 original, loc2: val2 shadow, matching: glob, foo: shadowing global variable');
    });
    it('should substitute global variables', function() {
      var macros = new TMP.MacroProcessor;
      macros.globalVariables = { 'borg':'1', 'matching':'glob', 'foo':'bar', 'recursiv':'-%{recursiv}' };
      var handle = macros.substituteVariables('borg: %{borg} matching: %{matching} foo: %{foo} recursiv: %{recursiv}', []);
      handle.should.be.type('string');
      handle.should.eql('borg: 1 matching: glob foo: bar recursiv: ---------------------------------------%{recursiv}'); // limited recursion!
    });
  });

  describe('handleSET', function () {
    var macros = new TMP.MacroProcessor;
    it('should set and store a global variable \'a=42\' to localStorage key \''+MacroProcessor.STORAGE_KEY_LISTVAR+'\'', function() {
      var lsMock = {
        setItem: function (key, jsonString) {
          if (key == MacroProcessor.STORAGE_KEY_LISTVAR) {
            let storedVars = JSON.parse(jsonString);
            storedVars.should.be.type('object');
            Object.keys(storedVars).should.have.lengthOf(3);
            storedVars['a'].should.eql('42');
          }
        }
      };
      mod.__set__("localStorage", lsMock);

      var handle = macros.expandMacro('set a=42');
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(0); // success
    });
    it('should redefine global variable \'a=   43\' with leading spaces', function() {
      var lsMock = {
        setItem: function (key, jsonString) {
          if (key == MacroProcessor.STORAGE_KEY_LISTVAR) {
            let storedVars = JSON.parse(jsonString);
            storedVars.should.be.type('object');
            Object.keys(storedVars).should.have.lengthOf(3);
            storedVars['a'].should.eql('   43');
          }
        }
      };
      mod.__set__("localStorage", lsMock);

      var handle = macros.expandMacro('set a=   43');
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(28); // '% set: Redefined variable a\n'
    });
    it('should output global variable \'a \', because argument is missing', function() {
      var lsMock = {
        setItem: function (key, jsonString) {
          if (key == MacroProcessor.STORAGE_KEY_LISTVAR) {
            let storedVars = JSON.parse(jsonString);
            storedVars.should.be.type('object');
            Object.keys(storedVars).should.have.lengthOf(3);
            storedVars['a'].should.eql('');
          }
        }
      };
      mod.__set__("localStorage", lsMock);

      var handle = macros.expandMacro('set a ');
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(10); // '% a=   43\n'
    });
    it('should set global variable \'a=\' to an empty value', function() {
      var lsMock = {
        setItem: function (key, jsonString) {
          if (key == MacroProcessor.STORAGE_KEY_LISTVAR) {
            let storedVars = JSON.parse(jsonString);
            storedVars.should.be.type('object');
            Object.keys(storedVars).should.have.lengthOf(3);
            storedVars['a'].should.eql('');
          }
        }
      };
      mod.__set__("localStorage", lsMock);

      var handle = macros.expandMacro('set a=');
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(28); // '% set: redefined variable a\n'
    });
    it('should set global variable \'a 53 b %{1}\', alternative syntax', function() {
      var lsMock = {
        setItem: function (key, jsonString) {
          if (key == MacroProcessor.STORAGE_KEY_LISTVAR) {
            let storedVars = JSON.parse(jsonString);
            storedVars.should.be.type('object');
            Object.keys(storedVars).should.have.lengthOf(3);
            storedVars['a'].should.eql('53 b %{1}');
          }
        }
      };
      mod.__set__("localStorage", lsMock);

      var handle = macros.expandMacro('set a 53 b %{1}');
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(28); // '% set: redefined variable a\n'
    });
    it('should set global variable \'a       56 c %{1}\', alternative syntax without leading spaces', function() {
      var lsMock = {
        setItem: function (key, jsonString) {
          if (key == MacroProcessor.STORAGE_KEY_LISTVAR) {
            let storedVars = JSON.parse(jsonString);
            storedVars.should.be.type('object');
            Object.keys(storedVars).should.have.lengthOf(3);
            storedVars['a'].should.eql('56 c %{1}');
          }
        }
      };
      mod.__set__("localStorage", lsMock);

      var handle = macros.expandMacro('set a       56 c %{1}');
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(28); // '% set: redefined variable a\n'
    });
    it('should set special global variable \'borg=0\' to 0 ', function() {
      var lsMock = {
        setItem: function (key, jsonString) {
          if (key == MacroProcessor.STORAGE_KEY_LISTVAR) {
            let storedVars = JSON.parse(jsonString);
            storedVars.should.be.type('object');
            Object.keys(storedVars).should.have.lengthOf(3);
            storedVars['borg'].should.eql('0');
          }
        }
      };
      mod.__set__("localStorage", lsMock);

      var handle = macros.expandMacro('set borg=0');
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(31); // '% set: redefined variable borg\n'
    });
    it('should set special global variable \'borg=egal+irgendwas\' to 1 ', function() {
      var lsMock = {
        setItem: function (key, jsonString) {
          if (key == MacroProcessor.STORAGE_KEY_LISTVAR) {
            let storedVars = JSON.parse(jsonString);
            storedVars.should.be.type('object');
            Object.keys(storedVars).should.have.lengthOf(3);
            storedVars['borg'].should.eql('1');
          }
        }
      };
      mod.__set__("localStorage", lsMock);

      var handle = macros.expandMacro('set borg=egal+irgendwas');
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(31); // '% set: redefined variable borg\n'
    });
    it('should set special global variable \'matching=regexp\' to \'regexp\' ', function() {
      var lsMock = {
        setItem: function (key, jsonString) {
          if (key == MacroProcessor.STORAGE_KEY_LISTVAR) {
            let storedVars = JSON.parse(jsonString);
            storedVars.should.be.type('object');
            Object.keys(storedVars).should.have.lengthOf(3);
            storedVars['matching'].should.eql('regexp');
          }
        }
      };
      mod.__set__("localStorage", lsMock);

      var handle = macros.expandMacro('set matching=regexp');
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(35); // '% set: redefined variable matching\n'
    });
    it('should set special global variable \'matching=glob\' to \'glob\' ', function() {
      var lsMock = {
        setItem: function (key, jsonString) {
          if (key == MacroProcessor.STORAGE_KEY_LISTVAR) {
            let storedVars = JSON.parse(jsonString);
            storedVars.should.be.type('object');
            Object.keys(storedVars).should.have.lengthOf(3);
            storedVars['matching'].should.eql('glob');
          }
        }
      };
      mod.__set__("localStorage", lsMock);

      var handle = macros.expandMacro('set matching=glob');
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(35); // '% set: redefined variable matching\n'
    });
    it('should set special global variable \'matching=simple\' to \'simple\' ', function() {
      var lsMock = {
        setItem: function (key, jsonString) {
          if (key == MacroProcessor.STORAGE_KEY_LISTVAR) {
            let storedVars = JSON.parse(jsonString);
            storedVars.should.be.type('object');
            Object.keys(storedVars).should.have.lengthOf(3);
            storedVars['matching'].should.eql('simple');
          }
        }
      };
      mod.__set__("localStorage", lsMock);

      var handle = macros.expandMacro('set matching=simple');
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(35); // '% set: redefined variable matching\n'
    });
    it('should set special global variable \'matching=nonsense\' to \'glob\' (default)', function() {
      var lsMock = {
        setItem: function (key, jsonString) {
          if (key == MacroProcessor.STORAGE_KEY_LISTVAR) {
            let storedVars = JSON.parse(jsonString);
            storedVars.should.be.type('object');
            Object.keys(storedVars).should.have.lengthOf(3);
            storedVars['matching'].should.eql('glob');
          }
        }
      };
      mod.__set__("localStorage", lsMock);

      var handle = macros.expandMacro('set matching=nonsense', []);
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(35); // '% set: redefined variable matching\n'
    });
  });

  describe('handleUNSET', function () {
    it('should be written later');
  });

  describe('handleLISTVAR', function () {
    var macros = new TMP.MacroProcessor;
    it('should return a list of all special global variables', function() {
      var handle = macros.expandMacro('listvar', []);
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(31); // '/set borg=1\n/set matching=glob\n'
    });
    it('should return the special global variable \'borg\'', function() {
      var handle = macros.expandMacro('listvar *org', []);
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(12); // '/set borg=1\n'
    });
    it('should return the special global variables \'borg\' and \'matching\'', function() {
      var handle = macros.expandMacro('listvar *g', []);
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(31); // '/set borg=1\n/set matching=glob\n'
    });
  });

  describe('handleLET', function () {
    it('should set a local variable in it\'s parent context of the stack', function() {
      var macros = new TMP.MacroProcessor;
      let context1 = new TMP.EvaluationContext;
      context1.cmd = 'egal1';
      context1.parameters = context1.cmd.split(' ');
      context1.localVariables = {};
      let context2 = new TMP.EvaluationContext;
      context2.cmd = 'egal2';
      context2.parameters = context2.cmd.split(' ');
      context2.localVariables = {};
      let stack = [];
      stack.push(context1);
      stack.push(context2);

      var handle = macros.expandMacro('let a=b', stack);

      stack.should.have.lengthOf(2);
      stack[0].localVariables.should.be.type('object');
      Object.keys(stack[0].localVariables).should.have.lengthOf(0);
      stack[1].localVariables.should.be.type('object');
      Object.keys(stack[1].localVariables).should.have.lengthOf(1);
      stack[1].localVariables['a'].should.be.type('string');
      stack[1].localVariables['a'].should.eql('b');
    });
  });

  describe('handleHELP', function () {
    it('should be written later');
  });

  describe('handleDEFAULT', function () {
    var macros = new TMP.MacroProcessor;
    it('should evaluate a macro \'a=sag %{0}, einzeln: 1:%{1} 2:%{2} 3:%{3} 4:%{4}, alle: %{*}', function() {
      var lsMock = {
        setItem: function (key, jsonString) {
          if (key == MacroProcessor.STORAGE_KEY_LIST) {
            let storedMacros = JSON.parse(jsonString);
            storedMacros.should.be.type('object');
            Object.keys(storedMacros).should.have.lengthOf(1);
            storedMacros['a'].body.should.eql('sag %{0}, einzeln: 1:%{1} 2:%{2} 3:%{3} 4:%{4}, alle: %{*}');
          }
        }
      };
      mod.__set__("localStorage", lsMock);

      macros.expandMacro('def a = sag %{0}, einzeln: 1:%{1} 2:%{2} 3:%{3} 4:%{4}, alle: %{*}');
      var handle = macros.expandMacro('a b x\'c\\\'\\ d\'');
      // [doSend, newCmd, userMessage]
      handle.should.be.type('object');
      handle.should.have.lengthOf(3);
      handle[1].should.be.type('string');
      handle[1].should.eql('sag a, einzeln: 1:b 2:x\'c\\\'\\ 3:d\' 4:, alle: b x\'c\\\'\\ d\'\n');
      handle[2].should.be.type('string');
      handle[2].should.have.lengthOf(0); // success
    });
  });

  describe('resolveSingle', function () {
    it('should be written later');
  });

  describe('resolve', function () {
    it('should be written later');
  });

});
