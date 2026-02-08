"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var build_1 = require("./build");
var query_1 = require("./query");
var search_1 = require("./search");
exports.postgres = "postgres";
exports.mssql = "mssql";
exports.mysql = "mysql";
exports.sqlite = "sqlite";
var SearchBuilder = (function () {
  function SearchBuilder(db, table, attrs, buildQ, fromDB, sort, q, excluding, buildSort, total) {
    this.db = db;
    this.table = table;
    this.attrs = attrs;
    this.fromDB = fromDB;
    this.sort = sort;
    if (attrs) {
      this.attrs = attrs;
      var meta = build_1.buildMetadata(attrs);
      this.map = meta.map;
      this.bools = meta.bools;
      this.primaryKeys = meta.keys;
      this.version = meta.version;
      this.createdAt = meta.createdAt;
      this.updatedAt = meta.updatedAt;
    }
    else {
      this.primaryKeys = [];
    }
    this.buildQuery = buildQ ? buildQ : query_1.buildQuery;
    this.buildSort = buildSort ? buildSort : query_1.buildSort;
    this.q = q && q.length > 0 ? q : "q";
    this.excluding = excluding && excluding.length > 0 ? excluding : "excluding";
    this.search = this.search.bind(this);
    this.total = total && total.length > 0 ? total : "total";
  }
  SearchBuilder.prototype.search = function (filter, limit, page, fields) {
    var ipage = 0;
    if (typeof page === "number" && page > 0) {
      ipage = page;
    }
    var st = this.sort ? this.sort : "sort";
    var sn = filter[st];
    var likeType = this.db.driver === exports.postgres ? "ilike" : "like";
    var q2 = this.buildQuery(filter, this.db.param, sn, this.buildSort, this.attrs, this.table, fields, this.q, this.excluding, likeType);
    if (!q2) {
      throw new Error("Cannot build query");
    }
    var fn = this.fromDB;
    if (fn) {
      return search_1.buildFromQuery(this.db.query, q2.query, q2.params, limit, ipage, this.map, this.bools, this.db.driver, this.total).then(function (r) {
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
      return search_1.buildFromQuery(this.db.query, q2.query, q2.params, limit, ipage, this.map, this.bools, this.db.driver, this.total);
    }
  };
  return SearchBuilder;
}());
exports.SearchBuilder = SearchBuilder;
exports.SearchRepository = SearchBuilder;
