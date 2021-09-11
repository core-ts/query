"use strict";
var __extends = (this && this.__extends) || (function () {
  var extendStatics = function (d, b) {
    extendStatics = Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
      function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return extendStatics(d, b);
  };
  return function (d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var build_1 = require("./build");
var SqlLoader = (function () {
  function SqlLoader(table, query, attrs, param, fromDB) {
    this.table = table;
    this.query = query;
    this.param = param;
    this.fromDB = fromDB;
    if (Array.isArray(attrs)) {
      this.primaryKeys = build_1.attributes(attrs);
    }
    else {
      var m = build_1.metadata(attrs);
      this.attributes = attrs;
      this.primaryKeys = m.keys;
      this.map = m.map;
      this.bools = m.bools;
    }
    this.metadata = this.metadata.bind(this);
    this.all = this.all.bind(this);
    this.load = this.load.bind(this);
    this.exist = this.exist.bind(this);
  }
  SqlLoader.prototype.metadata = function () {
    return this.attributes;
  };
  SqlLoader.prototype.all = function () {
    var sql = "select * from " + this.table;
    return this.query(sql, [], this.map);
  };
  SqlLoader.prototype.load = function (id, ctx) {
    var _this = this;
    var stmt = build_1.select(id, this.table, this.primaryKeys, this.param);
    if (this.fromDB) {
      return this.query(stmt.query, stmt.params, this.map, ctx).then(function (res) {
        if (!res || res.length === 0) {
          return null;
        }
        else {
          var obj = res[0];
          return _this.fromDB(obj);
        }
      });
    }
    else {
      return this.query(stmt.query, stmt.params, this.map).then(function (res) { return (!res || res.length === 0) ? null : res[0]; });
    }
  };
  SqlLoader.prototype.exist = function (id, ctx) {
    var field = (this.primaryKeys[0].field ? this.primaryKeys[0].field : this.primaryKeys[0].name);
    var stmt = build_1.exist(id, this.table, this.primaryKeys, this.param, field);
    return this.query(stmt.query, stmt.params, this.map, undefined, ctx).then(function (res) { return (!res || res.length === 0) ? false : true; });
  };
  return SqlLoader;
}());
exports.SqlLoader = SqlLoader;
var SqlSearchLoader = (function (_super) {
  __extends(SqlSearchLoader, _super);
  function SqlSearchLoader(find, table, query, attrs, param, fromDB) {
    var _this = _super.call(this, table, query, attrs, param, fromDB) || this;
    _this.find = find;
    _this.search = _this.search.bind(_this);
    return _this;
  }
  SqlSearchLoader.prototype.search = function (s, limit, offset, fields) {
    return this.find(s, limit, offset, fields);
  };
  return SqlSearchLoader;
}(SqlLoader));
exports.SqlSearchLoader = SqlSearchLoader;
function createSqlWriter(table, manager, attrs, buildParam, toDB, fromDB) {
  var writer = new SqlWriter(table, manager.query, manager.exec, attrs, buildParam, toDB, fromDB, manager.execBatch);
  return writer;
}
exports.createSqlWriter = createSqlWriter;
var SqlWriter = (function (_super) {
  __extends(SqlWriter, _super);
  function SqlWriter(table, query, exec, attrs, buildParam, toDB, fromDB, execBatch) {
    var _this = _super.call(this, table, query, attrs, buildParam, fromDB) || this;
    _this.exec = exec;
    _this.toDB = toDB;
    _this.execBatch = execBatch;
    var x = build_1.version(attrs);
    if (x) {
      _this.version = x.name;
    }
    _this.insert = _this.insert.bind(_this);
    _this.update = _this.update.bind(_this);
    _this.patch = _this.patch.bind(_this);
    _this.delete = _this.delete.bind(_this);
    return _this;
  }
  SqlWriter.prototype.insert = function (obj, ctx) {
    var obj2 = obj;
    if (this.toDB) {
      obj2 = this.toDB(obj);
    }
    var stmt = build_1.buildToInsert(obj2, this.table, this.attributes, this.param, this.version);
    if (stmt) {
      return this.exec(stmt.query, stmt.params, ctx).catch(function (err) {
        if (err && err.error === 'duplicate') {
          return 0;
        }
        else {
          throw err;
        }
      });
    }
    else {
      return Promise.resolve(0);
    }
  };
  SqlWriter.prototype.update = function (obj, ctx) {
    var obj2 = obj;
    if (this.toDB) {
      obj2 = this.toDB(obj);
    }
    var stmt = build_1.buildToUpdate(obj2, this.table, this.attributes, this.param, this.version);
    if (stmt) {
      return this.exec(stmt.query, stmt.params, ctx);
    }
    else {
      return Promise.resolve(0);
    }
  };
  SqlWriter.prototype.patch = function (obj, ctx) {
    return this.update(obj, ctx);
  };
  SqlWriter.prototype.delete = function (id, ctx) {
    var stmt = build_1.buildToDelete(id, this.table, this.primaryKeys, this.param);
    if (stmt) {
      return this.exec(stmt.query, stmt.params, ctx);
    }
    else {
      return Promise.resolve(0);
    }
  };
  return SqlWriter;
}(SqlLoader));
exports.SqlWriter = SqlWriter;
var SqlSearchWriter = (function (_super) {
  __extends(SqlSearchWriter, _super);
  function SqlSearchWriter(find, table, query, exec, attrs, buildParam, toDB, fromDB, execBatch) {
    var _this = _super.call(this, table, query, exec, attrs, buildParam, toDB, fromDB, execBatch) || this;
    _this.find = find;
    _this.search = _this.search.bind(_this);
    return _this;
  }
  SqlSearchWriter.prototype.search = function (s, limit, offset, fields) {
    return this.find(s, limit, offset, fields);
  };
  return SqlSearchWriter;
}(SqlWriter));
exports.SqlSearchWriter = SqlSearchWriter;
function createSqlSearchWriter(find, table, manager, attrs, buildParam, toDB, fromDB) {
  var writer = new SqlSearchWriter(find, table, manager.query, manager.exec, attrs, buildParam, toDB, fromDB, manager.execBatch);
  return writer;
}
exports.createSqlSearchWriter = createSqlSearchWriter;
