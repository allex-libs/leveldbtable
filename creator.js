function createLib(execlib, leveldblib, ldbwithloglib) {
  'use strict';

  var lib = execlib.lib,
    q = lib.q,
    LevelDBWithLog = ldbwithloglib.LevelDBWithLog,
    LevelDBTableMixin = require('./mixincreator')(execlib, leveldblib, ldbwithloglib);

  function LevelDBTable (prophash) {
    LevelDBTableMixin.call(this, prophash);
    LevelDBWithLog.call(this,prophash);
  }
  lib.inherit(LevelDBTable, LevelDBWithLog);
  LevelDBTableMixin.addMethods(LevelDBTable);

  LevelDBTable.prototype.destroy = function () {
    LevelDBWithLog.prototype.destroy.call(this);
    LevelDBTableMixin.prototype.destroy.call(this);
  };

  return q({
    LevelDBTableMixin: LevelDBTableMixin,
    LevelDBTable: LevelDBTable
  });
}

module.exports = createLib;
