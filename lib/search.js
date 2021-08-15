"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function buildFromQuery(query, sql, params, limit, offset, mp, bools, provider, totalCol) {
  if (limit <= 0) {
    return query(sql, params, mp, bools).then(function (list) {
      var total = (list ? list.length : undefined);
      return { list: list, total: total };
    });
  }
  else {
    if (provider === exports.oracle) {
      if (!totalCol || totalCol.length === 0) {
        totalCol = 'total';
      }
      var sql2 = buildPagingQueryForOracle(sql, limit, offset, totalCol);
      return queryAndCount(query, sql2, params, totalCol, mp, bools);
    }
    else {
      var sql2 = buildPagingQuery(sql, limit, offset);
      var countQuery = buildCountQuery(sql);
      var resultPromise = query(sql2, params, mp, bools);
      var countPromise = query(countQuery, params).then(function (r) {
        if (!r || r.length === 0) {
          return 0;
        }
        else {
          var r0 = r[0];
          var keys = Object.keys(r0);
          return r0[keys[0]];
        }
      });
      return Promise.all([resultPromise, countPromise]).then(function (r) {
        var list = r[0], total = r[1];
        return { list: list, total: total };
      });
    }
  }
}
exports.buildFromQuery = buildFromQuery;
function queryAndCount(query, sql, params, total, mp, bools) {
  if (!total || total.length === 0) {
    total = 'total';
  }
  return query(sql, params, mp, bools).then(function (list) {
    if (!list || list.length === 0) {
      return { list: [], total: 0 };
    }
    var t = list[0][total];
    for (var _i = 0, list_1 = list; _i < list_1.length; _i++) {
      var obj = list_1[_i];
      delete obj[total];
    }
    return { list: list, total: t };
  });
}
exports.queryAndCount = queryAndCount;
exports.oracle = 'oracle';
var s = 'select';
var S = 'SELECT';
var d = ' distinct ';
var D = ' DISTINCT ';
function buildPagingQuery(sql, limit, offset, provider) {
  if (limit === undefined || limit == null) {
    limit = 0;
  }
  if (offset === undefined || offset == null) {
    offset = 0;
  }
  if (provider !== exports.oracle) {
    return sql + " limit " + limit + " offset " + offset;
  }
  else {
    return buildPagingQueryForOracle(sql, limit, offset);
  }
}
exports.buildPagingQuery = buildPagingQuery;
function buildPagingQueryForOracle(sql, limit, offset, total) {
  if (!total || total.length === 0) {
    total = 'total';
  }
  var l = d.length;
  var i = sql.indexOf(d);
  if (i < 0) {
    i = sql.indexOf(D);
  }
  if (i < 0) {
    l = S.length;
    i = sql.indexOf(s);
  }
  if (i < 0) {
    i = sql.indexOf(S);
  }
  if (i >= 0) {
    return sql.substr(0, l) + " count(*) over() as " + total + ", " + sql.substr(l) + " offset " + offset + " rows fetch next " + limit + " rows only";
  }
  else {
    return sql + " offset " + offset + " rows fetch next " + limit + " rows only";
  }
}
exports.buildPagingQueryForOracle = buildPagingQueryForOracle;
function buildCountQuery(sql) {
  var sql2 = sql.trim();
  var i = sql2.indexOf('select ');
  if (i < 0) {
    return sql;
  }
  var j = sql2.indexOf(' from ', i + 6);
  if (j < 0) {
    return sql;
  }
  var k = sql2.indexOf(' order by ', j);
  var h = sql2.indexOf(' distinct ');
  if (h > 0) {
    var sql3 = 'select count(*) from (' + sql2.substring(i) + ') as main';
    return sql3;
  }
  if (k > 0) {
    var sql3 = 'select count(*) ' + sql2.substring(j, k);
    return sql3;
  }
  else {
    var sql3 = 'select count(*) ' + sql2.substring(j);
    return sql3;
  }
}
exports.buildCountQuery = buildCountQuery;
