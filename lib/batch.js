"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var build_1 = require("./build");
var SqlInserter = (function () {
  function SqlInserter(exec, table, attributes, param, map) {
    this.exec = exec;
    this.table = table;
    this.attributes = attributes;
    this.param = param;
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
    if (stmt) {
      return this.exec(stmt.query, stmt.params);
    }
    else {
      return Promise.resolve(0);
    }
  };
  return SqlInserter;
}());
exports.SqlInserter = SqlInserter;
var SqlUpdater = (function () {
  function SqlUpdater(exec, table, attributes, param, map) {
    this.exec = exec;
    this.table = table;
    this.attributes = attributes;
    this.param = param;
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
    if (stmt) {
      return this.exec(stmt.query, stmt.params);
    }
    else {
      return Promise.resolve(0);
    }
  };
  return SqlUpdater;
}());
exports.SqlUpdater = SqlUpdater;
var SqlBatchInserter = (function () {
  function SqlBatchInserter(exec, table, attributes, param, map) {
    this.exec = exec;
    this.table = table;
    this.attributes = attributes;
    this.param = param;
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
    if (stmt) {
      return this.exec(stmt.query, stmt.params);
    }
    else {
      return Promise.resolve(0);
    }
  };
  return SqlBatchInserter;
}());
exports.SqlBatchInserter = SqlBatchInserter;
var SqlBatchUpdater = (function () {
  function SqlBatchUpdater(execBatch, table, attributes, param, notSkipInvalid, map) {
    this.execBatch = execBatch;
    this.table = table;
    this.attributes = attributes;
    this.param = param;
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
      return this.execBatch(stmts);
    }
    else {
      return Promise.resolve(0);
    }
  };
  return SqlBatchUpdater;
}());
exports.SqlBatchUpdater = SqlBatchUpdater;
