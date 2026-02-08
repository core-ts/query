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
var SearchBuilder_1 = require("./SearchBuilder");
function useGet(db, table, attrs, fromDB) {
  var l = new SqlLoader(db, table, attrs, fromDB);
  return l.load;
}
exports.useGet = useGet;
exports.useLoad = useGet;
var SqlLoader = (function () {
  function SqlLoader(db, table, attrs, fromDB) {
    this.db = db;
    this.table = table;
    this.fromDB = fromDB;
    if (Array.isArray(attrs)) {
      this.primaryKeys = build_1.attributes(attrs);
      this.attributes = {};
    }
    else {
      var m = build_1.buildMetadata(attrs);
      this.attributes = attrs;
      this.primaryKeys = m.keys;
      this.map = m.map;
      this.bools = m.bools;
    }
    if (this.metadata) {
      this.metadata = this.metadata.bind(this);
    }
    this.all = this.all.bind(this);
    this.load = this.load.bind(this);
    this.exist = this.exist.bind(this);
  }
  SqlLoader.prototype.metadata = function () {
    return this.attributes;
  };
  SqlLoader.prototype.all = function (tx) {
    var sql = "select * from " + this.table;
    var db = tx ? tx : this.db;
    return db.query(sql, [], this.map, this.bools);
  };
  SqlLoader.prototype.load = function (id, tx) {
    var stmt = build_1.select(id, this.table, this.primaryKeys, this.db.param);
    if (!stmt.query) {
      throw new Error("cannot build query by id");
    }
    var db = tx ? tx : this.db;
    var fn = this.fromDB;
    if (fn) {
      return db.query(stmt.query, stmt.params, this.map, this.bools).then(function (res) {
        if (!res || res.length === 0) {
          return null;
        }
        else {
          var obj = res[0];
          return fn(obj);
        }
      });
    }
    else {
      return db.query(stmt.query, stmt.params, this.map, this.bools).then(function (res) { return (!res || res.length === 0 ? null : res[0]); });
    }
  };
  SqlLoader.prototype.exist = function (id, tx) {
    var field = this.primaryKeys[0].column ? this.primaryKeys[0].column : this.primaryKeys[0].name;
    var stmt = build_1.exist(id, this.table, this.primaryKeys, this.db.param, field);
    if (!stmt.query) {
      throw new Error("cannot build query by id");
    }
    var db = tx ? tx : this.db;
    return db.query(stmt.query, stmt.params, undefined, undefined).then(function (res) { return (!res || res.length === 0 ? false : true); });
  };
  return SqlLoader;
}());
exports.SqlLoader = SqlLoader;
exports.SqlViewRepository = SqlLoader;
exports.SqlLoadService = SqlLoader;
exports.SqlViewServic = SqlLoader;
var QueryRepository = (function () {
  function QueryRepository(db, table, attrs, sort, id) {
    this.db = db;
    this.table = table;
    this.attrs = attrs;
    this.sort = sort;
    this.id = id && id.length > 0 ? id : "id";
    this.query = this.query.bind(this);
    var m = build_1.buildMetadata(attrs);
    this.map = m.map;
    this.bools = m.bools;
  }
  QueryRepository.prototype.query = function (ids, tx) {
    if (!ids || ids.length === 0) {
      return Promise.resolve([]);
    }
    var ps = [];
    var length = ids.length;
    for (var i = 1; i <= length; i++) {
      ps.push(this.db.param(i));
    }
    var sql = "select * from " + this.table + " where " + this.id + " in (" + ps.join(",") + ")";
    if (this.sort && this.sort.length > 0) {
      sql = sql + " order by " + this.sort;
    }
    var db = tx ? tx : this.db;
    return db.query(sql, ids, this.map, this.bools);
  };
  return QueryRepository;
}());
exports.QueryRepository = QueryRepository;
function log(db, isLog, logger, q, result, r, duration) {
  if (!isLog) {
    return db;
  }
  if (q !== undefined && q != null && q.length > 0) {
    if (!logger.isDebugEnabled()) {
      return db;
    }
    return new LogManager(db, logger.error, logger.debug, q, result, r, duration);
  }
  if (!logger.isInfoEnabled()) {
    return db;
  }
  return new LogManager(db, logger.error, logger.info, q, result, r, duration);
}
exports.log = log;
function useLog(db, isLog, err, lg, q, result, r, duration) {
  if (!isLog) {
    return db;
  }
  if (err) {
    return new LogManager(db, err, lg, q, result, r, duration);
  }
  return db;
}
exports.useLog = useLog;
var LogManager = (function () {
  function LogManager(db, err, lg, q, result, r, duration) {
    this.db = db;
    this.driver = db.driver;
    this.duration = duration && duration.length > 0 ? duration : "duration";
    this.sql = q === undefined ? "" : q;
    this.return = r !== undefined && r != null ? r : "count";
    this.result = result !== undefined && result != null ? result : "";
    this.log = lg;
    this.error = err;
    this.param = this.param.bind(this);
    this.execute = this.execute.bind(this);
    this.executeBatch = this.executeBatch.bind(this);
    this.query = this.query.bind(this);
    this.queryOne = this.queryOne.bind(this);
    this.executeScalar = this.executeScalar.bind(this);
    this.count = this.count.bind(this);
  }
  LogManager.prototype.param = function (i) {
    return this.db.param(i);
  };
  LogManager.prototype.execute = function (sql, args, ctx) {
    var _this = this;
    var t1 = new Date();
    return this.db
      .execute(sql, args, ctx)
      .then(function (v) {
      setTimeout(function () {
        if (_this.log) {
          var d = diff(t1);
          var obj = {};
          if (_this.sql.length > 0) {
            obj[_this.sql] = getString(sql, args);
          }
          if (_this.return.length > 0) {
            obj[_this.return] = v;
          }
          obj[_this.duration] = d;
          _this.log("query", obj);
        }
      }, 0);
      return v;
    })
      .catch(function (er) {
      setTimeout(function () {
        var d = diff(t1);
        var obj = {};
        if (_this.sql.length > 0) {
          obj[_this.sql] = getString(sql, args);
        }
        obj[_this.duration] = d;
        _this.error("error query: " + buildString(er));
      }, 0);
      throw er;
    });
  };
  LogManager.prototype.executeBatch = function (statements, firstSuccess, ctx) {
    var _this = this;
    var t1 = new Date();
    return this.db
      .executeBatch(statements, firstSuccess, ctx)
      .then(function (v) {
      setTimeout(function () {
        if (_this.log) {
          var d = diff(t1);
          var obj = {};
          if (_this.sql.length > 0) {
            obj[_this.sql] = JSON.stringify(statements);
          }
          if (_this.return.length > 0) {
            obj[_this.return] = v;
          }
          obj[_this.duration] = d;
          _this.log("exec batch", obj);
        }
      }, 0);
      return v;
    })
      .catch(function (er) {
      setTimeout(function () {
        var d = diff(t1);
        var obj = {};
        if (_this.sql.length > 0) {
          obj[_this.sql] = JSON.stringify(statements);
        }
        obj[_this.duration] = d;
        _this.error("error exec batch: " + buildString(er));
      }, 0);
      throw er;
    });
  };
  LogManager.prototype.query = function (sql, args, m, bools, ctx) {
    var _this = this;
    var t1 = new Date();
    return this.db
      .query(sql, args, m, bools, ctx)
      .then(function (v) {
      setTimeout(function () {
        if (_this.log) {
          var d = diff(t1);
          var obj = {};
          if (_this.sql.length > 0) {
            obj[_this.sql] = getString(sql, args);
          }
          if (_this.result.length > 0) {
            if (v && v.length > 0) {
              obj[_this.result] = JSON.stringify(v);
            }
          }
          if (_this.return.length > 0) {
            obj[_this.return] = v ? v.length : 0;
          }
          obj[_this.duration] = d;
          _this.log("query", obj);
        }
      }, 0);
      return v;
    })
      .catch(function (er) {
      setTimeout(function () {
        var d = diff(t1);
        var obj = {};
        if (_this.sql.length > 0) {
          obj[_this.sql] = getString(sql, args);
        }
        obj[_this.duration] = d;
        _this.error("error query: " + buildString(er));
      }, 0);
      throw er;
    });
  };
  LogManager.prototype.queryOne = function (sql, args, m, bools, ctx) {
    var _this = this;
    var t1 = new Date();
    return this.db
      .queryOne(sql, args, m, bools, ctx)
      .then(function (v) {
      setTimeout(function () {
        if (_this.log) {
          var d = diff(t1);
          var obj = {};
          if (_this.sql.length > 0) {
            obj[_this.sql] = getString(sql, args);
          }
          if (_this.result.length > 0) {
            obj[_this.result] = v ? JSON.stringify(v) : "null";
          }
          if (_this.return.length > 0) {
            obj[_this.return] = v ? 1 : 0;
          }
          obj[_this.duration] = d;
          _this.log("query one", obj);
        }
      }, 0);
      return v;
    })
      .catch(function (er) {
      setTimeout(function () {
        var d = diff(t1);
        var obj = {};
        if (_this.sql.length > 0) {
          obj[_this.sql] = getString(sql, args);
        }
        obj[_this.duration] = d;
        _this.error("error query one: " + buildString(er));
      }, 0);
      throw er;
    });
  };
  LogManager.prototype.executeScalar = function (sql, args, ctx) {
    var _this = this;
    var t1 = new Date();
    return this.db
      .executeScalar(sql, args, ctx)
      .then(function (v) {
      setTimeout(function () {
        if (_this.log) {
          var d = diff(t1);
          var obj = {};
          if (_this.sql.length > 0) {
            obj[_this.sql] = getString(sql, args);
          }
          if (_this.result.length > 0) {
            obj[_this.result] = v ? buildString(v) : "null";
          }
          if (_this.return.length > 0) {
            obj[_this.return] = v ? 1 : 0;
          }
          obj[_this.duration] = d;
          _this.log("exec scalar", obj);
        }
      }, 0);
      return v;
    })
      .catch(function (er) {
      setTimeout(function () {
        var d = diff(t1);
        var obj = {};
        if (_this.sql.length > 0) {
          obj[_this.sql] = getString(sql, args);
        }
        obj[_this.duration] = d;
        _this.error("error exec scalar: " + buildString(er));
      }, 0);
      throw er;
    });
  };
  LogManager.prototype.count = function (sql, args, ctx) {
    var _this = this;
    var t1 = new Date();
    return this.db
      .count(sql, args)
      .then(function (v) {
      setTimeout(function () {
        if (_this.log) {
          var d = diff(t1);
          var obj = {};
          if (_this.sql.length > 0) {
            obj[_this.sql] = getString(sql, args);
          }
          if (_this.return.length > 0) {
            obj[_this.return] = v;
          }
          obj[_this.duration] = d;
          _this.log("count", obj);
        }
      }, 0);
      return v;
    })
      .catch(function (er) {
      setTimeout(function () {
        var d = diff(t1);
        var obj = {};
        if (_this.sql.length > 0) {
          obj[_this.sql] = getString(sql, args);
        }
        obj[_this.duration] = d;
        _this.error("error count: " + buildString(er));
      }, 0);
      throw er;
    });
  };
  return LogManager;
}());
exports.LogManager = LogManager;
function buildString(v) {
  if (typeof v === "string") {
    return v;
  }
  else {
    return JSON.stringify(v);
  }
}
function getString(sql, args) {
  if (args && args.length > 0) {
    return sql + " " + JSON.stringify(args);
  }
  else {
    return sql;
  }
}
function diff(d1) {
  var d2 = new Date();
  return d2.getTime() - d1.getTime();
}
exports.diff = diff;
var SqlWriter = (function () {
  function SqlWriter(db, table, attributes, toDB) {
    this.db = db;
    this.table = table;
    this.attributes = attributes;
    this.toDB = toDB;
    var x = build_1.buildMetadata(attributes);
    this.primaryKeys = x.keys;
    this.map = x.map;
    this.bools = x.bools;
    this.version = x.version;
    this.createdAt = x.createdAt;
    this.updatedAt = x.updatedAt;
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.patch = this.patch.bind(this);
  }
  SqlWriter.prototype.create = function (obj, tx) {
    var obj2 = obj;
    if (this.toDB) {
      obj2 = this.toDB(obj);
    }
    if (this.createdAt) {
      obj2[this.createdAt] = new Date();
    }
    if (this.updatedAt) {
      obj2[this.updatedAt] = new Date();
    }
    var stmt = build_1.buildToInsert(obj2, this.table, this.attributes, this.db.param, this.version);
    if (stmt.query) {
      var db = tx ? tx : this.db;
      return db.execute(stmt.query, stmt.params).catch(function (err) {
        if (err && err.error === "duplicate") {
          return 0;
        }
        else {
          throw err;
        }
      });
    }
    else {
      return Promise.resolve(-1);
    }
  };
  SqlWriter.prototype.update = function (obj, tx) {
    var obj2 = obj;
    if (this.toDB) {
      obj2 = this.toDB(obj);
    }
    if (this.updatedAt) {
      obj2[this.updatedAt] = new Date();
    }
    var stmt = build_1.buildToUpdate(obj2, this.table, this.attributes, this.db.param, this.version);
    if (stmt.query) {
      var db = tx ? tx : this.db;
      return db.execute(stmt.query, stmt.params);
    }
    else {
      return Promise.resolve(-1);
    }
  };
  SqlWriter.prototype.patch = function (obj, tx) {
    return this.update(obj, tx);
  };
  return SqlWriter;
}());
exports.SqlWriter = SqlWriter;
var CRUDRepository = (function (_super) {
  __extends(CRUDRepository, _super);
  function CRUDRepository(db, table, attributes, toDB, fromDB) {
    var _this = _super.call(this, db, table, attributes, toDB) || this;
    _this.fromDB = fromDB;
    _this.metadata = _this.metadata.bind(_this);
    _this.all = _this.all.bind(_this);
    _this.load = _this.load.bind(_this);
    _this.exist = _this.exist.bind(_this);
    _this.delete = _this.delete.bind(_this);
    return _this;
  }
  CRUDRepository.prototype.metadata = function () {
    return this.attributes;
  };
  CRUDRepository.prototype.all = function (tx) {
    var sql = "select * from " + this.table;
    var db = tx ? tx : this.db;
    return db.query(sql, [], this.map, this.bools);
  };
  CRUDRepository.prototype.load = function (id, tx) {
    var stmt = build_1.select(id, this.table, this.primaryKeys, this.db.param);
    if (!stmt.query) {
      throw new Error("cannot build query by id");
    }
    var fn = this.fromDB;
    var db = tx ? tx : this.db;
    if (fn) {
      return db.query(stmt.query, stmt.params, this.map, this.bools).then(function (res) {
        if (!res || res.length === 0) {
          return null;
        }
        else {
          var obj = res[0];
          return fn(obj);
        }
      });
    }
    else {
      return db.query(stmt.query, stmt.params, this.map, this.bools).then(function (res) { return (!res || res.length === 0 ? null : res[0]); });
    }
  };
  CRUDRepository.prototype.exist = function (id, tx) {
    var field = this.primaryKeys[0].column ? this.primaryKeys[0].column : this.primaryKeys[0].name;
    var stmt = build_1.exist(id, this.table, this.primaryKeys, this.db.param, field);
    if (!stmt.query) {
      throw new Error("cannot build query by id");
    }
    var db = tx ? tx : this.db;
    return db.query(stmt.query, stmt.params).then(function (res) { return (!res || res.length === 0 ? false : true); });
  };
  CRUDRepository.prototype.delete = function (id, tx) {
    var stmt = build_1.buildToDelete(id, this.table, this.primaryKeys, this.db.param);
    if (stmt.query) {
      var db = tx ? tx : this.db;
      return db.execute(stmt.query, stmt.params);
    }
    else {
      throw new Error("cannot build delete query by id");
    }
  };
  return CRUDRepository;
}(SqlWriter));
exports.CRUDRepository = CRUDRepository;
exports.GenericRepository = CRUDRepository;
exports.SqlGenericRepository = CRUDRepository;
var SqlSearchWriter = (function (_super) {
  __extends(SqlSearchWriter, _super);
  function SqlSearchWriter(db, table, attributes, buildQ, toDB, fromDB, sort, q, excluding, buildSort, total) {
    var _this = _super.call(this, db, table, attributes, buildQ, fromDB, sort, q, excluding, buildSort, total) || this;
    _this.db = db;
    _this.attributes = attributes;
    _this.toDB = toDB;
    var x = build_1.buildMetadata(attributes);
    if (x) {
      _this.version = x.version;
    }
    _this.create = _this.create.bind(_this);
    _this.update = _this.update.bind(_this);
    _this.patch = _this.patch.bind(_this);
    return _this;
  }
  SqlSearchWriter.prototype.create = function (obj, tx) {
    var obj2 = obj;
    if (this.toDB) {
      obj2 = this.toDB(obj);
    }
    if (this.createdAt) {
      obj2[this.createdAt] = new Date();
    }
    if (this.updatedAt) {
      obj2[this.updatedAt] = new Date();
    }
    var stmt = build_1.buildToInsert(obj2, this.table, this.attributes, this.db.param, this.version);
    if (stmt.query) {
      var db = tx ? tx : this.db;
      return db.execute(stmt.query, stmt.params).catch(function (err) {
        if (err && err.error === "duplicate") {
          return 0;
        }
        else {
          throw err;
        }
      });
    }
    else {
      return Promise.resolve(-1);
    }
  };
  SqlSearchWriter.prototype.update = function (obj, tx) {
    var obj2 = obj;
    if (this.toDB) {
      obj2 = this.toDB(obj);
    }
    if (this.updatedAt) {
      obj2[this.updatedAt] = new Date();
    }
    var stmt = build_1.buildToUpdate(obj2, this.table, this.attributes, this.db.param, this.version);
    if (stmt.query) {
      var db = tx ? tx : this.db;
      return db.execute(stmt.query, stmt.params);
    }
    else {
      return Promise.resolve(-1);
    }
  };
  SqlSearchWriter.prototype.patch = function (obj, tx) {
    return this.update(obj, tx);
  };
  return SqlSearchWriter;
}(SearchBuilder_1.SearchBuilder));
exports.SqlSearchWriter = SqlSearchWriter;
var SqlRepository = (function (_super) {
  __extends(SqlRepository, _super);
  function SqlRepository(db, table, attributes, buildQ, toDB, fromDB, sort, q, excluding, buildSort, total) {
    var _this = _super.call(this, db, table, attributes, buildQ, toDB, fromDB, sort, q, excluding, buildSort, total) || this;
    _this.attributes = attributes;
    _this.toDB = toDB;
    _this.metadata = _this.metadata.bind(_this);
    _this.all = _this.all.bind(_this);
    _this.load = _this.load.bind(_this);
    _this.exist = _this.exist.bind(_this);
    _this.delete = _this.delete.bind(_this);
    return _this;
  }
  SqlRepository.prototype.metadata = function () {
    return this.attributes;
  };
  SqlRepository.prototype.all = function (tx) {
    var sql = "select * from " + this.table;
    var db = tx ? tx : this.db;
    return db.query(sql, [], this.map, this.bools);
  };
  SqlRepository.prototype.load = function (id, tx) {
    var stmt = build_1.select(id, this.table, this.primaryKeys, this.db.param);
    if (!stmt.query) {
      throw new Error("cannot build query by id");
    }
    var fn = this.fromDB;
    var db = tx ? tx : this.db;
    if (fn) {
      return db.query(stmt.query, stmt.params, this.map, this.bools).then(function (res) {
        if (!res || res.length === 0) {
          return null;
        }
        else {
          var obj = res[0];
          return fn(obj);
        }
      });
    }
    else {
      return db.query(stmt.query, stmt.params, this.map, this.bools).then(function (res) { return (!res || res.length === 0 ? null : res[0]); });
    }
  };
  SqlRepository.prototype.exist = function (id, tx) {
    var field = this.primaryKeys[0].column ? this.primaryKeys[0].column : this.primaryKeys[0].name;
    var stmt = build_1.exist(id, this.table, this.primaryKeys, this.db.param, field);
    if (!stmt.query) {
      throw new Error("cannot build query by id");
    }
    var db = tx ? tx : this.db;
    return db.query(stmt.query, stmt.params).then(function (res) { return (!res || res.length === 0 ? false : true); });
  };
  SqlRepository.prototype.delete = function (id, tx) {
    var stmt = build_1.buildToDelete(id, this.table, this.primaryKeys, this.db.param);
    if (stmt.query) {
      var db = tx ? tx : this.db;
      return db.execute(stmt.query, stmt.params);
    }
    else {
      throw new Error("cannot build delete query by id");
    }
  };
  return SqlRepository;
}(SqlSearchWriter));
exports.SqlRepository = SqlRepository;
exports.Repository = SqlRepository;
var Query = (function (_super) {
  __extends(Query, _super);
  function Query(db, table, attributes, buildQ, fromDB, sort, q, excluding, buildSort, total) {
    var _this = _super.call(this, db, table, attributes, buildQ, fromDB, sort, q, excluding, buildSort, total) || this;
    var m = build_1.buildMetadata(attributes);
    _this.primaryKeys = m.keys;
    _this.map = m.map;
    _this.bools = m.bools;
    if (_this.metadata) {
      _this.metadata = _this.metadata.bind(_this);
    }
    _this.all = _this.all.bind(_this);
    _this.load = _this.load.bind(_this);
    _this.exist = _this.exist.bind(_this);
    return _this;
  }
  Query.prototype.metadata = function () {
    return this.attrs;
  };
  Query.prototype.all = function (tx) {
    var sql = "select * from " + this.table;
    var db = tx ? tx : this.db;
    return db.query(sql, [], this.map, this.bools);
  };
  Query.prototype.load = function (id, tx) {
    var stmt = build_1.select(id, this.table, this.primaryKeys, this.db.param);
    if (!stmt.query) {
      throw new Error("cannot build query by id");
    }
    var db = tx ? tx : this.db;
    var fn = this.fromDB;
    if (fn) {
      return db.query(stmt.query, stmt.params, this.map, this.bools).then(function (res) {
        if (!res || res.length === 0) {
          return null;
        }
        else {
          var obj = res[0];
          return fn(obj);
        }
      });
    }
    else {
      return this.db.query(stmt.query, stmt.params, this.map, this.bools).then(function (res) { return (!res || res.length === 0 ? null : res[0]); });
    }
  };
  Query.prototype.exist = function (id, tx) {
    var field = this.primaryKeys[0].column ? this.primaryKeys[0].column : this.primaryKeys[0].name;
    var stmt = build_1.exist(id, this.table, this.primaryKeys, this.db.param, field);
    if (!stmt.query) {
      throw new Error("cannot build query by id");
    }
    var db = tx ? tx : this.db;
    return db.query(stmt.query, stmt.params, undefined, undefined).then(function (res) { return (!res || res.length === 0 ? false : true); });
  };
  return Query;
}(SearchBuilder_1.SearchBuilder));
exports.Query = Query;
