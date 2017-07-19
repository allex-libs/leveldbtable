loadMochaIntegration('allex_leveldblib');

function dumpkvstorage () {
  return qlib.promise2console(TheTable.kvstorage.dumpToConsole(), 'kvstorage');
}

function dumplog () {
  return qlib.promise2console(TheTable.log.dumpToConsole(), 'log');
}

describe('Basic tests', function () {
  loadClientSide(['allex_leveldbtablelib']);
  it ('create custom LevelDBTable class', function () {
    var LevelDBTable = leveldbtablelib.LevelDBTable;
    function MyTable (prophash) {
      LevelDBTable.call(this, prophash);
    }
    lib.inherit(MyTable, LevelDBTable);
    LevelDBTable.prototype.rowUserNames = ['String', 'String', 'Int16BE', 'Byte'];
    return setGlobal('MyTable', MyTable);
  });
  it ('create LDBTable', function () {
    var d = q.defer(),
      ret = d.promise,
      mt = new MyTable({
        path: 'table1.db',
        starteddefer: d
      });
    return setGlobal('TheTable', ret);
  });
  it ('push a row', function () {
    return qlib.promise2console(TheTable.push(['andrija', 'petrovic', '1968', '178']), 'push');
  });
  it ('after push', function () {
    return dumpkvstorage().then(dumplog);
  });
  it ('edit', function () {
    return qlib.promise2console(TheTable.edit(1, 0, 'mica', 'editor'));
  });
  it ('after edit', function () {
    return dumpkvstorage().then(dumplog);
  });
  it ('undo', function () {
    return qlib.promise2console(TheTable.undo());
  });
  it ('after undo', function () {
    return dumpkvstorage().then(dumplog);
  });
});

