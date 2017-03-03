function createLevelDBTableMixin (execlib, leveldblib, ldbwithloglib) {
  'use strict';

  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    LevelDBWithLog = ldbwithloglib.LevelDBWithLog,
    JobBase = qlib.JobBase;

  function TableEditJob (kvstorage, log, row, column, data, user) {
    JobBase.call(this);
    this.kvstorage = kvstorage;
    this.log = log;
    this.row = row;
    this.column = column;
    this.data = data;
    this.user = user;
    this.oldrow = null;
    this.newrow = null;
  }
  lib.inherit(TableEditJob, JobBase);
  TableEditJob.prototype.destroy = function () {
    this.newrow = null;
    this.oldrow = null;
    this.user = null;
    this.data = null;
    this.column = null;
    this.row = null;
    this.log = null;
    this.kvstorage = null;
    JobBase.prototype.destroy.call(this);
  };
  TableEditJob.prototype.go = function () {
    this.kvstorage.safeGet(this.row, null).then(
      this.onRow.bind(this),
      this.reject.bind(this)
    );
  };
  TableEditJob.prototype.onRow = function (row) {
    if (!row) {
      this.reject(new lib.Error('NO_ROW', 'There is no row #'+this.row));
      return;
    }
    this.oldrow = row.slice(0);
    row[this.column] = this.data;
    this.kvstorage.put(this.row, row).then(
      this.onWriteKVS.bind(this),
      this.reject.bind(this)
    );
  };
  TableEditJob.prototype.onWriteKVS = function (result) {
    this.newrow = result[1].slice(0);
    this.log.push([this.oldrow, this.newrow, this.user || '', Date.now()]).then(
      this.onWriteLog.bind(this),
      this.reject.bind(this)
    );
  };
  TableEditJob.prototype.onWriteLog = function (result) {
    console.log('onWriteLog', result);
    this.resolve(true);
  };

  function LevelDBTableMixin (prophash) {
    this.editlocks = new qlib.JobCollection();
    prophash.kvstorage = {
      mode: 'array',
      dbcreationoptions: {
        bufferValueEncoding: this.rowUserNames
      }
    };
    prophash.log = {
      dbcreationoptions: {
        bufferValueEncoding: ['Int32BE', 'Int16BE', 'JSON', 'JSON', 'String', 'Int64BE'] //row, column, oldval, newval, editorname, moment
      }
    };
  }

  LevelDBTableMixin.prototype.destroy = function () {
    if (this.editlocks) {
      this.editlocks.destroy();
    }
    this.editlocks = null;
  };

  LevelDBTableMixin.prototype.push = function (rowarry) {
    return this.kvstorage.push(rowarry);
  };

  LevelDBTableMixin.prototype.edit = function (row, column, data, user) {
    return this.editlocks.run('edit', new TableEditJob(this.kvstorage, this.log, row, column, data, user));
  };

  LevelDBTableMixin.prototype.rowUserNames = [];

  LevelDBTableMixin.addMethods = function (klass) {
    lib.inheritMethods(klass, LevelDBTableMixin,
      'push',
      'edit'
    );
  };

  return LevelDBTableMixin;
}

module.exports = createLevelDBTableMixin;
