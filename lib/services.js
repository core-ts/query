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
function useGet(table, q, attrs, param, fromDB) {
  var l = new SqlLoader(table, q, attrs, param, fromDB);
  return l.load;
}
exports.useGet = useGet;
exports.useLoad = useGet;
var SqlLoader = (function () {
  function SqlLoader(table, query, attrs, param, fromDB) {
    this.table = table;
    this.query = query;
    this.param = param;
    this.fromDB = fromDB;
    if (Array.isArray(attrs)) {
      this.primaryKeys = build_1.attributes(attrs);
      this.attributes = {};
    }
    else {
      var m = build_1.metadata(attrs);
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
  SqlLoader.prototype.all = function () {
    var sql = "select * from " + this.table;
    return this.query(sql, [], this.map);
  };
  SqlLoader.prototype.load = function (id, ctx) {
    var stmt = build_1.select(id, this.table, this.primaryKeys, this.param);
    if (!stmt) {
      throw new Error('cannot build query by id');
    }
    var fn = this.fromDB;
    if (fn) {
      return this.query(stmt.query, stmt.params, this.map, ctx).then(function (res) {
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
      return this.query(stmt.query, stmt.params, this.map).then(function (res) { return (!res || res.length === 0) ? null : res[0]; });
    }
  };
  SqlLoader.prototype.exist = function (id, ctx) {
    var field = (this.primaryKeys[0].column ? this.primaryKeys[0].column : this.primaryKeys[0].name);
    var stmt = build_1.exist(id, this.table, this.primaryKeys, this.param, field);
    if (!stmt) {
      throw new Error('cannot build query by id');
    }
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
    this.duration = (duration && duration.length > 0 ? duration : 'duration');
    this.sql = (q === undefined ? '' : q);
    this.return = (r !== undefined && r != null ? r : 'count');
    this.result = (result !== undefined && result != null ? result : '');
    this.log = lg;
    this.error = err;
    this.param = this.param.bind(this);
    this.exec = this.exec.bind(this);
    this.execBatch = this.execBatch.bind(this);
    this.query = this.query.bind(this);
    this.queryOne = this.queryOne.bind(this);
    this.execScalar = this.execScalar.bind(this);
    this.count = this.count.bind(this);
  }
  LogManager.prototype.param = function (i) {
    return this.db.param(i);
  };
  LogManager.prototype.exec = function (sql, args, ctx) {
    var _this = this;
    var t1 = new Date();
    return this.db.exec(sql, args, ctx).then(function (v) {
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
          _this.log('query', obj);
        }
      }, 0);
      return v;
    }).catch(function (er) {
      setTimeout(function () {
        var d = diff(t1);
        var obj = {};
        if (_this.sql.length > 0) {
          obj[_this.sql] = getString(sql, args);
        }
        obj[_this.duration] = d;
        _this.error('error query: ' + buildString(er));
      }, 0);
      throw er;
    });
  };
  LogManager.prototype.execBatch = function (statements, firstSuccess, ctx) {
    var _this = this;
    var t1 = new Date();
    return this.db.execBatch(statements, firstSuccess, ctx).then(function (v) {
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
          _this.log('exec batch', obj);
        }
      }, 0);
      return v;
    }).catch(function (er) {
      setTimeout(function () {
        var d = diff(t1);
        var obj = {};
        if (_this.sql.length > 0) {
          obj[_this.sql] = JSON.stringify(statements);
        }
        obj[_this.duration] = d;
        _this.error('error exec batch: ' + buildString(er));
      }, 0);
      throw er;
    });
  };
  LogManager.prototype.query = function (sql, args, m, bools, ctx) {
    var _this = this;
    var t1 = new Date();
    return this.db.query(sql, args, m, bools, ctx).then(function (v) {
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
          _this.log('query', obj);
        }
      }, 0);
      return v;
    }).catch(function (er) {
      setTimeout(function () {
        var d = diff(t1);
        var obj = {};
        if (_this.sql.length > 0) {
          obj[_this.sql] = getString(sql, args);
        }
        obj[_this.duration] = d;
        _this.error('error query: ' + buildString(er));
      }, 0);
      throw er;
    });
  };
  LogManager.prototype.queryOne = function (sql, args, m, bools, ctx) {
    var _this = this;
    var t1 = new Date();
    return this.db.queryOne(sql, args, m, bools, ctx).then(function (v) {
      setTimeout(function () {
        if (_this.log) {
          var d = diff(t1);
          var obj = {};
          if (_this.sql.length > 0) {
            obj[_this.sql] = getString(sql, args);
          }
          if (_this.result.length > 0) {
            obj[_this.result] = v ? JSON.stringify(v) : 'null';
          }
          if (_this.return.length > 0) {
            obj[_this.return] = v ? 1 : 0;
          }
          obj[_this.duration] = d;
          _this.log('query one', obj);
        }
      }, 0);
      return v;
    }).catch(function (er) {
      setTimeout(function () {
        var d = diff(t1);
        var obj = {};
        if (_this.sql.length > 0) {
          obj[_this.sql] = getString(sql, args);
        }
        obj[_this.duration] = d;
        _this.error('error query one: ' + buildString(er));
      }, 0);
      throw er;
    });
  };
  LogManager.prototype.execScalar = function (sql, args, ctx) {
    var _this = this;
    var t1 = new Date();
    return this.db.execScalar(sql, args, ctx).then(function (v) {
      setTimeout(function () {
        if (_this.log) {
          var d = diff(t1);
          var obj = {};
          if (_this.sql.length > 0) {
            obj[_this.sql] = getString(sql, args);
          }
          if (_this.result.length > 0) {
            obj[_this.result] = v ? buildString(v) : 'null';
          }
          if (_this.return.length > 0) {
            obj[_this.return] = v ? 1 : 0;
          }
          obj[_this.duration] = d;
          _this.log('exec scalar', obj);
        }
      }, 0);
      return v;
    }).catch(function (er) {
      setTimeout(function () {
        var d = diff(t1);
        var obj = {};
        if (_this.sql.length > 0) {
          obj[_this.sql] = getString(sql, args);
        }
        obj[_this.duration] = d;
        _this.error('error exec scalar: ' + buildString(er));
      }, 0);
      throw er;
    });
  };
  LogManager.prototype.count = function (sql, args, ctx) {
    var _this = this;
    var t1 = new Date();
    return this.db.count(sql, args).then(function (v) {
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
          _this.log('count', obj);
        }
      }, 0);
      return v;
    }).catch(function (er) {
      setTimeout(function () {
        var d = diff(t1);
        var obj = {};
        if (_this.sql.length > 0) {
          obj[_this.sql] = getString(sql, args);
        }
        obj[_this.duration] = d;
        _this.error('error count: ' + buildString(er));
      }, 0);
      throw er;
    });
  };
  return LogManager;
}());
exports.LogManager = LogManager;
function buildString(v) {
  if (typeof v === 'string') {
    return v;
  }
  else {
    return JSON.stringify(v);
  }
}
function getString(sql, args) {
  if (args && args.length > 0) {
    return sql + ' ' + JSON.stringify(args);
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
var SqlWriter = (function (_super) {
  __extends(SqlWriter, _super);
  function SqlWriter(manager, table, attrs, toDB, fromDB) {
    var _this = _super.call(this, table, manager.query, attrs, manager.param, fromDB) || this;
    _this.toDB = toDB;
    var x = build_1.version(attrs);
    _this.exec = manager.exec;
    _this.execBatch = manager.execBatch;
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
  function SqlSearchWriter(find, manager, table, attrs, toDB, fromDB) {
    var _this = _super.call(this, manager, table, attrs, toDB, fromDB) || this;
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
