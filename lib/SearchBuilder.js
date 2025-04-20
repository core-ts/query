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
var query_1 = require("./query");
var search_1 = require("./search");
exports.postgres = "postgres";
exports.mssql = "mssql";
exports.mysql = "mysql";
exports.sqlite = "sqlite";
var SearchBuilder = (function () {
  function SearchBuilder(query, table, attributes, provider, buildQ, fromDB, sort, q, excluding, buildSort, buildParam, total) {
    this.query = query;
    this.table = table;
    this.attributes = attributes;
    this.provider = provider;
    this.fromDB = fromDB;
    this.sort = sort;
    if (attributes) {
      this.attributes = attributes;
      var meta = build_1.metadata(attributes);
      this.map = meta.map;
      this.bools = meta.bools;
    }
    this.buildQuery = buildQ ? buildQ : query_1.buildQuery;
    this.buildSort = buildSort ? buildSort : query_1.buildSort;
    this.q = q && q.length > 0 ? q : "q";
    this.excluding = excluding && excluding.length > 0 ? excluding : "excluding";
    this.search = this.search.bind(this);
    if (buildParam) {
      this.param = buildParam;
    }
    else {
      if (provider === search_1.oracle) {
        this.param = query_1.buildOracleParam;
      }
      else if (provider === exports.postgres) {
        this.param = query_1.buildDollarParam;
      }
      else if (provider === exports.mssql) {
        this.param = query_1.buildMsSQLParam;
      }
      else {
        this.param = build_1.param;
      }
    }
    this.total = total && total.length > 0 ? total : "total";
  }
  SearchBuilder.prototype.search = function (filter, limit, page, fields) {
    var ipage = 0;
    if (typeof page === "number" && page > 0) {
      ipage = page;
    }
    var st = this.sort ? this.sort : "sort";
    var sn = filter[st];
    delete filter[st];
    var x = this.provider === exports.postgres ? "ilike" : this.param;
    var q2 = this.buildQuery(filter, x, sn, this.buildSort, this.attributes, this.table, fields, this.q, this.excluding);
    if (!q2) {
      throw new Error("Cannot build query");
    }
    var fn = this.fromDB;
    if (fn) {
      return search_1.buildFromQuery(this.query, q2.query, q2.params, limit, ipage, this.map, this.bools, this.provider, this.total).then(function (r) {
        if (r.list && r.list.length > 0) {
          r.list = r.list.map(function (o) { return fn(o); });
          return r;
        }
        else {
          return r;
        }
      });
    }
    else {
      return search_1.buildFromQuery(this.query, q2.query, q2.params, limit, ipage, this.map, this.bools, this.provider, this.total);
    }
  };
  return SearchBuilder;
}());
exports.SearchBuilder = SearchBuilder;
var Query = (function (_super) {
  __extends(Query, _super);
  function Query(query, table, attributes, provider, buildQ, fromDB, sort, q, excluding, buildSort, buildParam, total) {
    var _this = _super.call(this, query, table, attributes, provider, buildQ, fromDB, sort, q, excluding, buildSort, buildParam, total) || this;
    var m = build_1.metadata(attributes);
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
    return this.attributes;
  };
  Query.prototype.all = function () {
    var sql = "select * from " + this.table;
    return this.query(sql, [], this.map);
  };
  Query.prototype.load = function (id, ctx) {
    var stmt = build_1.select(id, this.table, this.primaryKeys, this.param);
    if (!stmt) {
      throw new Error("cannot build query by id");
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
      return this.query(stmt.query, stmt.params, this.map).then(function (res) { return (!res || res.length === 0 ? null : res[0]); });
    }
  };
  Query.prototype.exist = function (id, ctx) {
    var field = this.primaryKeys[0].column ? this.primaryKeys[0].column : this.primaryKeys[0].name;
    var stmt = build_1.exist(id, this.table, this.primaryKeys, this.param, field);
    if (!stmt) {
      throw new Error("cannot build query by id");
    }
    return this.query(stmt.query, stmt.params, this.map, undefined, ctx).then(function (res) { return (!res || res.length === 0 ? false : true); });
  };
  return Query;
}(SearchBuilder));
exports.Query = Query;
