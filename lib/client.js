"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var map_1 = require("./map");
function buildStatements(s) {
  var d = [];
  if (!s || s.length === 0) {
    return d;
  }
  for (var _i = 0, s_1 = s; _i < s_1.length; _i++) {
    var t = s_1[_i];
    var dates = toDates(t.params);
    var j = { query: t.query, params: t.params, dates: dates };
    d.push(j);
  }
  return d;
}
exports.buildStatements = buildStatements;
function toDates(args) {
  var d = [];
  if (!args || args.length === 0) {
    return d;
  }
  var l = args.length;
  for (var i = 0; i < l; i++) {
    if (args[i] && args[i] instanceof Date) {
      d.push(i);
    }
  }
  return d;
}
exports.toDates = toDates;
var ProxyClient = (function () {
  function ProxyClient(httpRequest, url) {
    this.httpRequest = httpRequest;
    this.url = url;
    this.query = this.query.bind(this);
    this.exec = this.exec.bind(this);
    this.execBatch = this.execBatch.bind(this);
  }
  ProxyClient.prototype.query = function (sql, args, m, bools) {
    var dates = toDates(args);
    var j = { query: sql, params: args, dates: dates };
    if (m || bools) {
      return this.httpRequest.post(this.url + '/query', j).then(function (r) { return map_1.handleResults(r, m, bools); });
    }
    else {
      return this.httpRequest.post(this.url + '/query', j);
    }
  };
  ProxyClient.prototype.exec = function (sql, args) {
    var dates = toDates(args);
    var j = { query: sql, params: args, dates: dates };
    return this.httpRequest.post(this.url + '/exec', j);
  };
  ProxyClient.prototype.execBatch = function (stmts) {
    var d = buildStatements(stmts);
    return this.httpRequest.post(this.url + '/exec-batch', d);
  };
  ProxyClient.prototype.beginTransaction = function (timeout) {
    var st = (timeout && timeout > 0 ? '?timeout=' + timeout : '');
    return this.httpRequest.post(this.url + '/begin' + st, '');
  };
  ProxyClient.prototype.commitTransaction = function (tx) {
    return this.httpRequest.post(this.url + '/end?tx=' + tx, '');
  };
  ProxyClient.prototype.rollbackTransaction = function (tx) {
    return this.httpRequest.post(this.url + '/end?roleback=true&tx=' + tx, '');
  };
  ProxyClient.prototype.queryWithTx = function (tx, commit, sql, args, m, bools) {
    var dates = toDates(args);
    var j = { query: sql, params: args, dates: dates };
    var sc = (commit ? '&commit=true' : '');
    if (m || bools) {
      return this.httpRequest.post(this.url + '/query?tx=' + tx + sc, j).then(function (r) { return map_1.handleResults(r, m, bools); });
    }
    else {
      return this.httpRequest.post(this.url + '/query?tx=' + tx + sc, j);
    }
  };
  ProxyClient.prototype.execWithTx = function (tx, commit, sql, args) {
    var dates = toDates(args);
    var j = { query: sql, params: args, dates: dates };
    var sc = (commit ? '&commit=true' : '');
    return this.httpRequest.post(this.url + '/exec?tx=' + tx + sc, j);
  };
  ProxyClient.prototype.execBatchWithTx = function (tx, commit, stmts) {
    var d = buildStatements(stmts);
    var sc = (commit ? '&commit=true' : '');
    return this.httpRequest.post(this.url + '/exec-batch?tx=' + tx + sc, d);
  };
  return ProxyClient;
}());
exports.ProxyClient = ProxyClient;
