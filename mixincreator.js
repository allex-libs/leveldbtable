function createLevelDBTableMixin (execlib, leveldblib, ldbwithloglib) {
  'use strict';

  var lib = execlib.lib,
    q = lib.q,
    qlib = lib.qlib,
    LevelDBWithLog = ldbwithloglib.LevelDBWithLog,
    JobBase = qlib.JobBase;

  function TableEditJob (kvstorage, log, row, column, data, user, skiprecordlog) {
    console.log('will edit on row', row, 'column', column, 'by putting data', data, 'for editor', user);
    JobBase.call(this);
    this.kvstorage = kvstorage;
    this.log = log;
    this.row = row;
    this.column = column;
    this.data = data;
    this.user = user;
    this.skiprecordlog = skiprecordlog;
    this.oldval = null;
    this.newval = null;
  }
  lib.inherit(TableEditJob, JobBase);
  TableEditJob.prototype.destroy = function () {
    this.newval = null;
    this.oldval = null;
    this.skiprecordlog = null;
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
      this.resolve(false);
      return;
    }
    if (!(lib.isArray(row) && row.length > this.column)) {
      this.resolve(false);
      return;
    }
    this.oldval = row[this.column];
    row[this.column] = this.data;
    this.kvstorage.put(this.row, row).then(
      this.onWriteKVS.bind(this),
      this.reject.bind(this)
    );
  };
  TableEditJob.prototype.onWriteKVS = function (result) {
    if (!(lib.isArray(result) && result.length>1 && lib.isArray(result[1]))) {
      this.resolve (false);
      return;
    }
    if (this.skiprecordlog) {
      this.resolve(true);
      return;
    }
    this.newval = result[1][this.column];
    this.log.push([this.row, this.column, this.oldval, this.newval, this.user || '', Date.now()]).then(
      this.onWriteLog.bind(this),
      this.reject.bind(this)
    );
  };
  TableEditJob.prototype.onWriteLog = function (result) {
    this.resolve(true);
  };

  function TableUndoJob (kvstorage, log) {
    JobBase.call(this);
    this.kvstorage = kvstorage;
    this.log = log;
  }
  lib.inherit(TableUndoJob, JobBase);
  TableUndoJob.prototype.destroy = function () {
    this.log = null;
    this.kvstorage = null;
    JobBase.prototype.destroy.call(this);
  };
  TableUndoJob.prototype.go = function () {
    this.log.getLast().then(
      this.onUndo.bind(this)
    );
  };
  TableUndoJob.prototype.onUndo = function (undorec) {
    var key = undorec.key, undo = undorec.value, editjob;
    if (!(lib.isVal(key) && lib.isVal(undo))) {
      this.resolve(false);
      return;
    }
    editjob = new TableEditJob(this.kvstorage, this.log, undo[0], undo[1], undo[2], undo[4], true);
    editjob.defer.promise.then(
      this.onUndoDone.bind(this, key),
      this.reject.bind(this)
    );
    editjob.go();
  };
  TableUndoJob.prototype.onUndoDone = function (key, result) {
    if (!result) {
      this.resolve(false);
      return;
    }
    this.log.del(key).then(
      this.resolve.bind(this, true),
      this.reject.bind(this)
    );
  };

  function LevelDBTableMixin (prophash) {
    this.editlocks = new qlib.JobCollection();
    prophash.kvstorage = {
      mode: 'array',
      startfromone: true,
      dbcreationoptions: {
        bufferValueEncoding: this.rowUserNames
      }
    };
    prophash.log = {
      dbcreationoptions: {
        bufferValueEncoding: ['Int32BE', 'Int16BE', 'JSONString', 'JSONString', 'String', 'Int64BE'] //row, column, oldval, newval, editorname, moment
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

  LevelDBTableMixin.prototype.undo = function () {
    return this.editlocks.run('edit', new TableUndoJob(this.kvstorage, this.log));
  };
  LevelDBTableMixin.prototype.rowUserNames = [];

  LevelDBTableMixin.addMethods = function (klass) {
    lib.inheritMethods(klass, LevelDBTableMixin,
      'push',
      'edit',
      'undo'
    );
  };

  return LevelDBTableMixin;
}

module.exports = createLevelDBTableMixin;
