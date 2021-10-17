"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var build_1 = require("./build");
var query_1 = require("./query");
var search_1 = require("./search");
exports.postgres = 'postgres';
exports.mssql = 'mssql';
exports.mysql = 'mysql';
exports.sqlite = 'sqlite';
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
    this.buildSort = (buildSort ? buildSort : query_1.buildSort);
    this.q = (q && q.length > 0 ? q : 'q');
    this.excluding = (excluding && excluding.length > 0 ? excluding : 'excluding');
    this.search = this.search.bind(this);
    if (buildParam) {
      this.buildParam = buildParam;
    }
    else {
      if (provider === search_1.oracle) {
        this.buildParam = query_1.buildOracleParam;
      }
      else if (provider === exports.postgres) {
        this.buildParam = query_1.buildDollarParam;
      }
      else if (provider === exports.mssql) {
        this.buildParam = query_1.buildMsSQLParam;
      }
      else {
        this.buildParam = build_1.param;
      }
    }
    this.total = (total && total.length > 0 ? total : 'total');
  }
  SearchBuilder.prototype.search = function (s, limit, skip, fields) {
    var _this = this;
    var st = (this.sort ? this.sort : 'sort');
    var sn = s[st];
    delete s[st];
    var x = (this.provider === exports.postgres ? 'ilike' : this.buildParam);
    var q2 = this.buildQuery(s, x, this.table, this.attributes, sn, fields, this.q, this.excluding, this.buildSort);
    if (this.fromDB) {
      return search_1.buildFromQuery(this.query, q2.query, q2.params, limit, skip, this.map, this.bools, this.provider, this.total).then(function (r) {
        if (r.list && r.list.length > 0) {
          r.list = r.list.map(function (o) { return _this.fromDB(o); });
        }
        else {
          return r;
        }
      });
    }
    else {
      return search_1.buildFromQuery(this.query, q2.query, q2.params, limit, skip, this.map, this.bools, this.provider, this.total);
    }
  };
  return SearchBuilder;
}());
exports.SearchBuilder = SearchBuilder;
