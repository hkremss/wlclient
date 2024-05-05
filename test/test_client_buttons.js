/*
 * Macro processor buttons tests
 */

'use strict';

// see https://stackoverflow.com/a/30794280
var rewire = require('rewire');
var should = require('should');

const mod = rewire('../www/js/client.js');

// Expose module functions for testing
var WLClient = mod.__get__('wlClient.WLClient');
//console.log(WLClient);

describe('Client', function () {

  describe('initDefaultCmdButtons()', function () {
    it('should return initialized buttons map', function () {
      let wlclient = new WLClient();
      var cmdButtons = wlclient.initDefaultCmdButtons();
      cmdButtons.should.be.type('object');
      Object.keys(cmdButtons).length.should.eql(8);
      cmdButtons['cmdbt1'].type.should.eql(1);
      cmdButtons['cmdbt1'].order.should.eql(7);
      cmdButtons['cmdbt1'].cmds['1'].label.should.eql('unten');
    });
  });

  describe('getCmdButtonLabels(buttonId)', function () {
    it('should return an array of 4 elements for cmdbt2.x', function () {
      let wlclient = new WLClient();
      var cmdButtons = wlclient.initDefaultCmdButtons();
      wlclient.cmdButtons = cmdButtons;
      var labels = wlclient.getCmdButtonLabels('cmdbt2.x');
      labels.should.be.type('object');
      labels.should.have.lengthOf(4);
    });
  });

  describe('removeCmdButton(buttonId)', function () {
    it('should remove button cmdbt4.1 from cmdButtons', function () {
      let wlclient = new WLClient();
      var cmdButtons = wlclient.initDefaultCmdButtons();
      Object.keys(cmdButtons).length.should.eql(8);
      cmdButtons['cmdbt4'].should.be.type('object');
      wlclient.cmdButtons = cmdButtons;

      // mock global.localStorage.setItem()
      var lsMock = {
        setItem: function (key, jsonString) {
          key.should.be.type('string');
          jsonString.should.be.type('string');
        }
      };
      mod.__set__('global.localStorage', lsMock);

      var labels = wlclient.removeCmdButton('cmdbt4.1');
      cmdButtons = wlclient.cmdButtons;
      Object.keys(cmdButtons).length.should.eql(7);
      should(cmdButtons['cmdbt4.1']).be.undefined;
    });
  });

  describe('editCmdButton(buttonId, label, cmd, send)', function () {
    it('should modify cmdbt2.3 button properties', function () {
      let wlclient = new WLClient();
      var cmdButtons = wlclient.initDefaultCmdButtons();
      cmdButtons['cmdbt2'].cmds['3'].label.should.eql('o');
      cmdButtons['cmdbt2'].cmds['3'].cmd.should.eql('o');
      cmdButtons['cmdbt2'].cmds['3'].send.should.eql(true);
      wlclient.cmdButtons = cmdButtons;

      // mock global.localStorage.setItem()
      var lsMock = {
        setItem: function (key, jsonString) {
          key.should.be.type('string');
          jsonString.should.be.type('string');
        }
      };
      mod.__set__('global.localStorage', lsMock);

      wlclient.editCmdButton('cmdbt2.3', 'x', 'y', false);
      cmdButtons = wlclient.cmdButtons;
      cmdButtons['cmdbt2'].cmds['3'].label.should.eql('x');
      cmdButtons['cmdbt2'].cmds['3'].cmd.should.eql('y');
      cmdButtons['cmdbt2'].cmds['3'].send.should.eql(false);
    });
  });

  describe('getHighestCmdButtonOrderValue()', function () {
    it('should return the highest order number of all cmdButtons', function () {
      let wlclient = new WLClient();
      var cmdButtons = wlclient.initDefaultCmdButtons();
      wlclient.cmdButtons = cmdButtons;
      var order = wlclient.getHighestCmdButtonOrderValue();
      order.should.be.type('number');
      order.should.eql(7);
    });
  });

  describe('getInsertableCmdButtonOrderValue(followingCmdButtonId)', function () {
    it('new button before cmdbt8.1 should be order 0 and cmdbt8 would become order 1', function () {
      let wlclient = new WLClient();
      var cmdButtons = wlclient.initDefaultCmdButtons();
      cmdButtons['cmdbt8'].order.should.eql(0);
      wlclient.cmdButtons = cmdButtons;
      var newOrder = wlclient.getInsertableCmdButtonOrderValue('cmdbt8.1');
      cmdButtons = wlclient.cmdButtons;
      newOrder.should.be.type('number');
      newOrder.should.eql(0);
      cmdButtons['cmdbt8'].order.should.eql(1);
    });
    it('new button before cmdbt2.2 should be order 6 and cmdbt2.2 would become order 7', function () {
      let wlclient = new WLClient();
      var cmdButtons = wlclient.initDefaultCmdButtons();
      cmdButtons['cmdbt2'].order.should.eql(6);
      wlclient.cmdButtons = cmdButtons;
      var newOrder = wlclient.getInsertableCmdButtonOrderValue('cmdbt2.2');
      cmdButtons = wlclient.cmdButtons;
      newOrder.should.be.type('number');
      newOrder.should.eql(6);
      cmdButtons['cmdbt2'].order.should.eql(7);
    });
    it('new button before cmdbt1.1 should be order 7 and cmdbt1.1 would become order 8', function () {
      let wlclient = new WLClient();
      var cmdButtons = wlclient.initDefaultCmdButtons();
      cmdButtons['cmdbt1'].order.should.eql(7);
      wlclient.cmdButtons = cmdButtons;
      var newOrder = wlclient.getInsertableCmdButtonOrderValue('cmdbt1.1');
      cmdButtons = wlclient.cmdButtons;
      newOrder.should.be.type('number');
      newOrder.should.eql(7);
      cmdButtons['cmdbt1'].order.should.eql(8);
    });
  });

  describe('add1CmdButton(selectedButtonId)', function () {
    it('should insert a new 1-cmd button before the selected button (cmdbt1.1)', function () {
      let wlclient = new WLClient();
      var cmdButtons = wlclient.initDefaultCmdButtons();
      Object.keys(cmdButtons).length.should.eql(8);
      wlclient.cmdButtons = cmdButtons;

      // mock global.localStorage.setItem()
      var lsMock = {
        setItem: function (key, jsonString) {
          key.should.be.type('string');
          jsonString.should.be.type('string');
        }
      };
      mod.__set__('global.localStorage', lsMock);

      wlclient.add1CmdButton('cmdbt1.1');
      var newCmdButtons = wlclient.cmdButtons;
      var origCmdButtons = wlclient.initDefaultCmdButtons(); // get initial state back
      newCmdButtons.should.be.type('object');
      Object.keys(newCmdButtons).length.should.eql(9);

      var deltaCmdButtonIds = Object.keys(newCmdButtons).filter(n => !Object.keys(origCmdButtons).includes(n))

      deltaCmdButtonIds.length.should.eql(1);
      deltaCmdButtonIds[0].should.eql('cmdbt9');
      newCmdButtons[deltaCmdButtonIds[0]].type.should.eql(1);
      newCmdButtons[deltaCmdButtonIds[0]].order.should.eql(7);
      newCmdButtons[deltaCmdButtonIds[0]].cmds['1'].label.should.eql('neu');
      newCmdButtons[deltaCmdButtonIds[0]].cmds['1'].cmd.should.eql('neu');
      newCmdButtons[deltaCmdButtonIds[0]].cmds['1'].send.should.eql(true);
    });
    it('should insert a new 1-cmd button before the selected button (cmdbt8.1)', function () {
      let wlclient = new WLClient();
      var cmdButtons = wlclient.initDefaultCmdButtons();
      Object.keys(cmdButtons).length.should.eql(8);
      wlclient.cmdButtons = cmdButtons;

      // mock global.localStorage.setItem()
      var lsMock = {
        setItem: function (key, jsonString) {
          key.should.be.type('string');
          jsonString.should.be.type('string');
        }
      };
      mod.__set__('global.localStorage', lsMock);

      wlclient.add1CmdButton('cmdbt8.1');
      var newCmdButtons = wlclient.cmdButtons;
      var origCmdButtons = wlclient.initDefaultCmdButtons(); // get initial state back
      newCmdButtons.should.be.type('object');
      Object.keys(newCmdButtons).length.should.eql(9);

      var deltaCmdButtonIds = Object.keys(newCmdButtons).filter(n => !Object.keys(origCmdButtons).includes(n))

      deltaCmdButtonIds.length.should.eql(1);
      deltaCmdButtonIds[0].should.eql('cmdbt9');
      newCmdButtons[deltaCmdButtonIds[0]].type.should.eql(1);
      newCmdButtons[deltaCmdButtonIds[0]].order.should.eql(0);
      newCmdButtons[deltaCmdButtonIds[0]].cmds['1'].label.should.eql('neu');
      newCmdButtons[deltaCmdButtonIds[0]].cmds['1'].cmd.should.eql('neu');
      newCmdButtons[deltaCmdButtonIds[0]].cmds['1'].send.should.eql(true);
    });
    it('should insert a new 1-cmd button before the selected button (settings) and reuse previously removed id (cmdbt5.1)', function () {
      let wlclient = new WLClient();
      var cmdButtons = wlclient.initDefaultCmdButtons();
      Object.keys(cmdButtons).length.should.eql(8);
      wlclient.cmdButtons = cmdButtons;

      // mock global.localStorage.setItem()
      var lsMock = {
        setItem: function (key, jsonString) {
          key.should.be.type('string');
          jsonString.should.be.type('string');
        }
      };
      mod.__set__('global.localStorage', lsMock);

      wlclient.removeCmdButton('cmdbt5.1'); // this is the id to be reused!
      wlclient.add1CmdButton('settings'); // this is the basement-button
      var newCmdButtons = wlclient.cmdButtons;
      var origCmdButtons = wlclient.initDefaultCmdButtons(); // get initial state back
      newCmdButtons.should.be.type('object');
      Object.keys(newCmdButtons).length.should.eql(8);

      var deltaCmdButtonIds = Object.keys(newCmdButtons).filter(n => !Object.keys(origCmdButtons).includes(n))

      deltaCmdButtonIds.length.should.eql(0);
      newCmdButtons['cmdbt5'].type.should.eql(1);
      newCmdButtons['cmdbt5'].order.should.eql(8);
      newCmdButtons['cmdbt5'].cmds['1'].label.should.eql('neu');
      newCmdButtons['cmdbt5'].cmds['1'].cmd.should.eql('neu');
      newCmdButtons['cmdbt5'].cmds['1'].send.should.eql(true);
    });
  });

  describe('add4CmdButton(selectedButtonId)', function () {
    it('should insert a new 4-cmd button before the selected button (cmdbt1.1)', function () {
      let wlclient = new WLClient();
      var cmdButtons = wlclient.initDefaultCmdButtons();
      Object.keys(cmdButtons).length.should.eql(8);
      wlclient.cmdButtons = cmdButtons;

      // mock global.localStorage.setItem()
      var lsMock = {
        setItem: function (key, jsonString) {
          key.should.be.type('string');
          jsonString.should.be.type('string');
        }
      };
      mod.__set__('global.localStorage', lsMock);

      wlclient.add4CmdButton('cmdbt1.1');
      var newCmdButtons = wlclient.cmdButtons;
      var origCmdButtons = wlclient.initDefaultCmdButtons(); // get initial state back
      newCmdButtons.should.be.type('object');
      Object.keys(newCmdButtons).length.should.eql(9);

      var deltaCmdButtonIds = Object.keys(newCmdButtons).filter(n => !Object.keys(origCmdButtons).includes(n))

      deltaCmdButtonIds.length.should.eql(1);
      deltaCmdButtonIds[0].should.eql('cmdbt9');
      newCmdButtons[deltaCmdButtonIds[0]].type.should.eql(4);
      newCmdButtons[deltaCmdButtonIds[0]].order.should.eql(7);
      newCmdButtons[deltaCmdButtonIds[0]].cmds['1'].label.should.eql('n');
      newCmdButtons[deltaCmdButtonIds[0]].cmds['1'].cmd.should.eql('n');
      newCmdButtons[deltaCmdButtonIds[0]].cmds['1'].send.should.eql(true);
      newCmdButtons[deltaCmdButtonIds[0]].cmds['2'].label.should.eql('s');
      newCmdButtons[deltaCmdButtonIds[0]].cmds['2'].cmd.should.eql('s');
      newCmdButtons[deltaCmdButtonIds[0]].cmds['2'].send.should.eql(true);
      newCmdButtons[deltaCmdButtonIds[0]].cmds['3'].label.should.eql('o');
      newCmdButtons[deltaCmdButtonIds[0]].cmds['3'].cmd.should.eql('o');
      newCmdButtons[deltaCmdButtonIds[0]].cmds['3'].send.should.eql(true);
      newCmdButtons[deltaCmdButtonIds[0]].cmds['4'].label.should.eql('w');
      newCmdButtons[deltaCmdButtonIds[0]].cmds['4'].cmd.should.eql('w');
      newCmdButtons[deltaCmdButtonIds[0]].cmds['4'].send.should.eql(true);
    });
    it('should insert a new 4-cmd button before the selected button (cmdbt8.1)', function () {
      let wlclient = new WLClient();
      var cmdButtons = wlclient.initDefaultCmdButtons();
      Object.keys(cmdButtons).length.should.eql(8);
      wlclient.cmdButtons = cmdButtons;

      // mock global.localStorage.setItem()
      var lsMock = {
        setItem: function (key, jsonString) {
          key.should.be.type('string');
          jsonString.should.be.type('string');
        }
      };
      mod.__set__('global.localStorage', lsMock);

      wlclient.add4CmdButton('cmdbt8.1');
      var newCmdButtons = wlclient.cmdButtons;
      var origCmdButtons = wlclient.initDefaultCmdButtons(); // get initial state back
      newCmdButtons.should.be.type('object');
      Object.keys(newCmdButtons).length.should.eql(9);

      var deltaCmdButtonIds = Object.keys(newCmdButtons).filter(n => !Object.keys(origCmdButtons).includes(n))

      deltaCmdButtonIds.length.should.eql(1);
      deltaCmdButtonIds[0].should.eql('cmdbt9');
      newCmdButtons[deltaCmdButtonIds[0]].type.should.eql(4);
      newCmdButtons[deltaCmdButtonIds[0]].order.should.eql(0);
      newCmdButtons[deltaCmdButtonIds[0]].cmds['1'].label.should.eql('n');
      newCmdButtons[deltaCmdButtonIds[0]].cmds['1'].cmd.should.eql('n');
      newCmdButtons[deltaCmdButtonIds[0]].cmds['1'].send.should.eql(true);
      newCmdButtons[deltaCmdButtonIds[0]].cmds['2'].label.should.eql('s');
      newCmdButtons[deltaCmdButtonIds[0]].cmds['2'].cmd.should.eql('s');
      newCmdButtons[deltaCmdButtonIds[0]].cmds['2'].send.should.eql(true);
      newCmdButtons[deltaCmdButtonIds[0]].cmds['3'].label.should.eql('o');
      newCmdButtons[deltaCmdButtonIds[0]].cmds['3'].cmd.should.eql('o');
      newCmdButtons[deltaCmdButtonIds[0]].cmds['3'].send.should.eql(true);
      newCmdButtons[deltaCmdButtonIds[0]].cmds['4'].label.should.eql('w');
      newCmdButtons[deltaCmdButtonIds[0]].cmds['4'].cmd.should.eql('w');
      newCmdButtons[deltaCmdButtonIds[0]].cmds['4'].send.should.eql(true);
    });
    it('should insert a new 4-cmd button before the selected button (settings) and reuse previously removed id (cmdbt5.1)', function () {
      let wlclient = new WLClient();
      var cmdButtons = wlclient.initDefaultCmdButtons();
      Object.keys(cmdButtons).length.should.eql(8);
      wlclient.cmdButtons = cmdButtons;

      // mock global.localStorage.setItem()
      var lsMock = {
        setItem: function (key, jsonString) {
          key.should.be.type('string');
          jsonString.should.be.type('string');
        }
      };
      mod.__set__('global.localStorage', lsMock);

      wlclient.removeCmdButton('cmdbt5.1'); // this is the id to be reused!
      wlclient.add4CmdButton('settings'); // this is the basement-button
      var newCmdButtons = wlclient.cmdButtons;
      var origCmdButtons = wlclient.initDefaultCmdButtons(); // get initial state back
      newCmdButtons.should.be.type('object');
      Object.keys(newCmdButtons).length.should.eql(8);

      var deltaCmdButtonIds = Object.keys(newCmdButtons).filter(n => !Object.keys(origCmdButtons).includes(n))

      deltaCmdButtonIds.length.should.eql(0);
      newCmdButtons['cmdbt5'].type.should.eql(4);
      newCmdButtons['cmdbt5'].order.should.eql(8);
      newCmdButtons['cmdbt5'].cmds['1'].label.should.eql('n');
      newCmdButtons['cmdbt5'].cmds['1'].cmd.should.eql('n');
      newCmdButtons['cmdbt5'].cmds['1'].send.should.eql(true);
      newCmdButtons['cmdbt5'].cmds['2'].label.should.eql('s');
      newCmdButtons['cmdbt5'].cmds['2'].cmd.should.eql('s');
      newCmdButtons['cmdbt5'].cmds['2'].send.should.eql(true);
      newCmdButtons['cmdbt5'].cmds['3'].label.should.eql('o');
      newCmdButtons['cmdbt5'].cmds['3'].cmd.should.eql('o');
      newCmdButtons['cmdbt5'].cmds['3'].send.should.eql(true);
      newCmdButtons['cmdbt5'].cmds['4'].label.should.eql('w');
      newCmdButtons['cmdbt5'].cmds['4'].cmd.should.eql('w');
      newCmdButtons['cmdbt5'].cmds['4'].send.should.eql(true);
    });
  });
});
