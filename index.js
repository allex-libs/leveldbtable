function createLib (execlib) {
  'use strict';
  return execlib.loadDependencies('client', ['allex:leveldb:lib', 'allex:leveldbwithlog:lib'], require('./creator').bind(null, execlib));
}

module.exports = createLib;
