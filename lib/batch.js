"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var build_1 = require("./build");
var SqlInserter = (function () {
  function SqlInserter(exec, table, attributes, param, oneIfSuccess, map) {
    this.exec = exec;
    this.table = table;
    this.attributes = attributes;
    this.param = param;
    this.oneIfSuccess = oneIfSuccess;
    this.map = map;
    this.write = this.write.bind(this);
    var x = build_1.version(attributes);
    if (x) {
      this.version = x.name;
    }
  }
  SqlInserter.prototype.write = function (obj) {
    if (!obj) {
      return Promise.resolve(0);
    }
    var obj2 = obj;
    if (this.map) {
      obj2 = this.map(obj);
    }
    var stmt = build_1.buildToInsert(obj2, this.table, this.attributes, this.param, this.version);
    if (stmt.query.length > 0) {
      if (this.oneIfSuccess) {
        return this.exec(stmt.query, stmt.params).then(function (ct) { return (ct > 0 ? 1 : 0); });
      }
      else {
        return this.exec(stmt.query, stmt.params);
      }
    }
    else {
      return Promise.resolve(0);
    }
  };
  return SqlInserter;
}());
exports.SqlInserter = SqlInserter;
var SqlUpdater = (function () {
  function SqlUpdater(exec, table, attributes, param, oneIfSuccess, map) {
    this.exec = exec;
    this.table = table;
    this.attributes = attributes;
    this.param = param;
    this.oneIfSuccess = oneIfSuccess;
    this.map = map;
    this.write = this.write.bind(this);
    var x = build_1.version(attributes);
    if (x) {
      this.version = x.name;
    }
  }
  SqlUpdater.prototype.write = function (obj) {
    if (!obj) {
      return Promise.resolve(0);
    }
    var obj2 = obj;
    if (this.map) {
      obj2 = this.map(obj);
    }
    var stmt = build_1.buildToUpdate(obj2, this.table, this.attributes, this.param, this.version);
    if (stmt.query.length > 0) {
      if (this.oneIfSuccess) {
        return this.exec(stmt.query, stmt.params).then(function (ct) { return (ct > 0 ? 1 : 0); });
      }
      else {
        return this.exec(stmt.query, stmt.params);
      }
    }
    else {
      return Promise.resolve(0);
    }
  };
  return SqlUpdater;
}());
exports.SqlUpdater = SqlUpdater;
var SqlBatchInserter = (function () {
  function SqlBatchInserter(exec, table, attributes, param, oneIfSuccess, map) {
    this.exec = exec;
    this.table = table;
    this.attributes = attributes;
    this.param = param;
    this.oneIfSuccess = oneIfSuccess;
    this.map = map;
    this.write = this.write.bind(this);
    var x = build_1.version(attributes);
    if (x) {
      this.version = x.name;
    }
  }
  SqlBatchInserter.prototype.write = function (objs) {
    if (!objs || objs.length === 0) {
      return Promise.resolve(0);
    }
    var list = objs;
    if (this.map) {
      list = [];
      for (var _i = 0, objs_1 = objs; _i < objs_1.length; _i++) {
        var obj = objs_1[_i];
        var obj2 = this.map(obj);
        list.push(obj2);
      }
    }
    var stmt = build_1.buildToInsertBatch(list, this.table, this.attributes, this.param, this.version);
    if (stmt.query.length > 0) {
      if (this.oneIfSuccess) {
        return this.exec(stmt.query, stmt.params).then(function (ct) { return objs.length; });
      }
      else {
        return this.exec(stmt.query, stmt.params);
      }
    }
    else {
      return Promise.resolve(0);
    }
  };
  return SqlBatchInserter;
}());
exports.SqlBatchInserter = SqlBatchInserter;
var SqlBatchUpdater = (function () {
  function SqlBatchUpdater(execBatch, table, attributes, param, oneIfSuccess, notSkipInvalid, map) {
    this.execBatch = execBatch;
    this.table = table;
    this.attributes = attributes;
    this.param = param;
    this.oneIfSuccess = oneIfSuccess;
    this.notSkipInvalid = notSkipInvalid;
    this.map = map;
    this.write = this.write.bind(this);
    var x = build_1.version(attributes);
    if (x) {
      this.version = x.name;
    }
  }
  SqlBatchUpdater.prototype.write = function (objs) {
    if (!objs || objs.length === 0) {
      return Promise.resolve(0);
    }
    var list = objs;
    if (this.map) {
      list = [];
      for (var _i = 0, objs_2 = objs; _i < objs_2.length; _i++) {
        var obj = objs_2[_i];
        var obj2 = this.map(obj);
        list.push(obj2);
      }
    }
    var stmts = build_1.buildToUpdateBatch(list, this.table, this.attributes, this.param, this.notSkipInvalid);
    if (stmts && stmts.length > 0) {
      if (this.oneIfSuccess) {
        return this.execBatch(stmts).then(function (ct) { return stmts.length; });
      }
      else {
        return this.execBatch(stmts);
      }
    }
    else {
      return Promise.resolve(0);
    }
  };
  return SqlBatchUpdater;
}());
exports.SqlBatchUpdater = SqlBatchUpdater;
var StreamInserter = (function () {
  function StreamInserter(exec, table, attributes, param, size, toDB) {
    this.exec = exec;
    this.table = table;
    this.attributes = attributes;
    this.param = param;
    this.list = [];
    this.size = 0;
    this.write = this.write.bind(this);
    this.flush = this.flush.bind(this);
    this.map = toDB;
    var x = build_1.version(attributes);
    if (x) {
      this.version = x.name;
    }
    if (size !== undefined && size > 0) {
      this.size = size;
    }
  }
  StreamInserter.prototype.write = function (obj) {
    if (!obj) {
      return Promise.resolve(0);
    }
    var obj2 = obj;
    if (this.map) {
      obj2 = this.map(obj);
      this.list.push(obj2);
    }
    else {
      this.list.push(obj);
    }
    if (this.list.length < this.size) {
      return Promise.resolve(0);
    }
    else {
      return this.flush();
    }
  };
  StreamInserter.prototype.flush = function () {
    var _this = this;
    if (!this.list || this.list.length === 0) {
      return Promise.resolve(0);
    }
    else {
      var total_1 = this.list.length;
      var stmt = build_1.buildToInsertBatch(this.list, this.table, this.attributes, this.param, this.version);
      if (stmt.query.length > 0) {
        return this.exec(stmt.query, stmt.params).then(function (r) {
          _this.list = [];
          return total_1;
        });
      }
      else {
        return Promise.resolve(0);
      }
    }
  };
  return StreamInserter;
}());
exports.StreamInserter = StreamInserter;
var StreamUpdater = (function () {
  function StreamUpdater(execBatch, table, attributes, param, size, toDB) {
    this.execBatch = execBatch;
    this.table = table;
    this.attributes = attributes;
    this.param = param;
    this.list = [];
    this.size = 0;
    this.write = this.write.bind(this);
    this.flush = this.flush.bind(this);
    this.map = toDB;
    var x = build_1.version(attributes);
    if (x) {
      this.version = x.name;
    }
    if (size !== undefined && size > 0) {
      this.size = size;
    }
  }
  StreamUpdater.prototype.write = function (obj) {
    if (!obj) {
      return Promise.resolve(0);
    }
    var obj2 = obj;
    if (this.map) {
      obj2 = this.map(obj);
      this.list.push(obj2);
    }
    else {
      this.list.push(obj);
    }
    if (this.list.length < this.size) {
      return Promise.resolve(0);
    }
    else {
      return this.flush();
    }
  };
  StreamUpdater.prototype.flush = function () {
    var _this = this;
    if (!this.list || this.list.length === 0) {
      return Promise.resolve(0);
    }
    else {
      var total_2 = this.list.length;
      var stmt = build_1.buildToUpdateBatch(this.list, this.table, this.attributes, this.param);
      if (stmt) {
        return this.execBatch(stmt).then(function (r) {
          _this.list = [];
          return total_2;
        });
      }
      else {
        return Promise.resolve(0);
      }
    }
  };
  return StreamUpdater;
}());
exports.StreamUpdater = StreamUpdater;
