"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var build_1 = require("./build");
function buildSort(sort, map) {
  if (!sort || sort.length === 0) {
    return '';
  }
  var sort2 = [];
  if (sort && sort.length > 0) {
    var sorts = sort.split(',');
    for (var _i = 0, sorts_1 = sorts; _i < sorts_1.length; _i++) {
      var st = sorts_1[_i];
      if (st.length > 0) {
        var field = st;
        var tp = st.charAt(0);
        if (tp === '-' || tp === '+') {
          field = st.substr(1);
        }
        var sortType = (tp === '-' ? ' desc' : '');
        sort2.push(getField(field.trim(), map) + sortType);
      }
    }
  }
  if (sort2.length === 0) {
    return '';
  }
  return sort2.join(',');
}
exports.buildSort = buildSort;
function getField(name, map) {
  if (!map) {
    return name;
  }
  var x = map[name];
  if (!x) {
    return name;
  }
  if (typeof x === 'string') {
    return x;
  }
  if (x.column) {
    return x.column;
  }
  return name;
}
exports.getField = getField;
function buildMsSQLParam(i) {
  return '@' + i;
}
exports.buildMsSQLParam = buildMsSQLParam;
function buildOracleParam(i) {
  return ':' + i;
}
exports.buildOracleParam = buildOracleParam;
function buildDollarParam(i) {
  return '$' + i;
}
exports.buildDollarParam = buildDollarParam;
function buildQuery(filter, bparam, table, attrs, sort, fields, sq, strExcluding, buildSort3) {
  if (!table || !attrs) {
    return undefined;
  }
  var s = filter;
  var like = 'like';
  var param;
  if (typeof bparam === 'string') {
    if (bparam === 'ilike') {
      like = bparam;
    }
    param = buildDollarParam;
  }
  else {
    param = bparam;
  }
  if (!like) {
    like = 'like';
  }
  var filters = [];
  var q;
  var excluding;
  var args = [];
  if (sq && sq.length > 0) {
    q = s[sq];
    delete s[sq];
    if (q === '') {
      q = undefined;
    }
  }
  if (strExcluding && strExcluding.length > 0) {
    excluding = s[strExcluding];
    delete s[strExcluding];
    if (typeof excluding === 'string') {
      excluding = excluding.split(',');
    }
    if (excluding && excluding.length === 0) {
      excluding = undefined;
    }
  }
  var ex = [];
  var keys = Object.keys(s);
  var i = 1;
  for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
    var key = keys_1[_i];
    var v = s[key];
    var field = key;
    if (v !== undefined && v != null) {
      var attr = attrs[key];
      if (attr) {
        field = (attr.column ? attr.column : key);
        if (typeof v === 'string') {
          if (v.length !== 0) {
            if (attr.q) {
              ex.push(key);
            }
            if (attr.match === 'equal') {
              filters.push(field + " = " + param(i++));
              args.push(v);
            }
            else if (attr.match === 'prefix') {
              filters.push(field + " " + like + " " + param(i++));
              args.push(v + '%');
            }
            else {
              filters.push(field + " " + like + " " + param(i++));
              args.push('%' + v + '%');
            }
          }
        }
        else if (v instanceof Date) {
          if (attr.match === 'max') {
            filters.push(field + " <= " + param(i++));
            args.push(v);
          }
          else {
            filters.push(field + " >= " + param(i++));
            args.push(v);
          }
        }
        else if (typeof v === 'number') {
          if (attr.match === 'max') {
            filters.push(field + " <= " + v);
          }
          else {
            filters.push(field + " >= " + v);
          }
        }
        else if (attr.type === 'ObjectId') {
          filters.push(field + " = " + param(i++));
          args.push(v);
        }
        else if (typeof v === 'object') {
          if (Array.isArray(v)) {
            if (v.length > 0) {
              var ps = build_1.params(v.length, param, i - 1);
              i = i + v.length;
              for (var _a = 0, v_1 = v; _a < v_1.length; _a++) {
                var sv = v_1[_a];
                args.push(sv);
              }
              filters.push(field + " in (" + ps.join(',') + ")");
            }
          }
          else if (attr.type === 'date' || attr.type === 'datetime') {
            if (isDateRange(v)) {
              if (v['max']) {
                filters.push(field + " <= " + param(i++));
                args.push(v['max']);
              }
              else if (v['endDate']) {
                filters.push(field + " <= " + param(i++));
                args.push(v['endDate']);
              }
              else if (v['upper']) {
                filters.push(field + " < " + param(i++));
                args.push(v['upper']);
              }
              else if (v['endTime']) {
                filters.push(field + " < " + param(i++));
                args.push(v['endTime']);
              }
              if (v['min']) {
                filters.push(field + " >= " + param(i++));
                args.push(v['min']);
              }
              else if (v['startTime']) {
                filters.push(field + " >= " + param(i++));
                args.push(v['startTime']);
              }
              else if (v['startDate']) {
                filters.push(field + " >= " + param(i++));
                args.push(v['startDate']);
              }
              else if (v['lower']) {
                filters.push(field + " > " + param(i++));
                args.push(v['lower']);
              }
            }
          }
          else if (attr.type === 'number' || attr.type === 'integer') {
            if (isNumberRange(v)) {
              if (v['max']) {
                filters.push(field + " <= " + v['max']);
              }
              else if (v['upper']) {
                filters.push(field + " < " + v['upper']);
              }
              if (v['min']) {
                filters.push(field + " >= " + v['min']);
              }
              else if (v['lower']) {
                filters.push(field + " > " + v['lower']);
              }
            }
          }
        }
      }
    }
  }
  var idField = getId(attrs);
  var c = [];
  if (idField && excluding && excluding.length > 0) {
    var l = excluding.length;
    var ps = [];
    for (var _b = 0, excluding_1 = excluding; _b < excluding_1.length; _b++) {
      var k = excluding_1[_b];
      if (k != null && k !== undefined) {
        if (typeof k === 'number') {
          ps.push(k.toString());
        }
        else {
          ps.push(param(i++));
          args.push(k);
        }
      }
    }
    filters.push(idField + " not in (" + ps.join(',') + ")");
  }
  if (q && attrs) {
    var qkeys = Object.keys(attrs);
    var qfilters = [];
    for (var _c = 0, qkeys_1 = qkeys; _c < qkeys_1.length; _c++) {
      var field = qkeys_1[_c];
      var attr = attrs[field];
      if (attr.q && (attr.type === undefined || attr.type === 'string') && !ex.includes(field)) {
        if (attr.match === 'equal') {
          qfilters.push(field + " = " + param(i++));
          args.push(q);
        }
        else if (attr.match === 'prefix') {
          qfilters.push(field + " " + like + " " + param(i++));
          args.push(q + '%');
        }
        else {
          qfilters.push(field + " " + like + " " + param(i++));
          args.push('%' + q + '%');
        }
        c.push(buildQ(field, q, attr.match));
      }
    }
    if (qfilters.length > 0) {
      filters.push("(" + qfilters.join(' or ') + ")");
    }
  }
  var buildS = buildSort3 ? buildSort3 : buildSort;
  var sSort = buildS(sort, attrs);
  var sOrderBy = (sSort.length > 0 ? " order by " + sSort : '');
  if (filters.length === 0) {
    var sql = "select " + buildFieldsByAttributes(attrs, fields) + " from " + table + sOrderBy;
    return { query: sql, params: args };
  }
  else {
    var sql = "select " + buildFieldsByAttributes(attrs, fields) + " from " + table + " where " + filters.join(' and ') + sOrderBy;
    return { query: sql, params: args };
  }
}
exports.buildQuery = buildQuery;
function getId(attrs) {
  var qkeys = Object.keys(attrs);
  for (var _i = 0, qkeys_2 = qkeys; _i < qkeys_2.length; _i++) {
    var key = qkeys_2[_i];
    var attr = attrs[key];
    if (attr.key) {
      var field = (attr.column ? attr.column : key);
      return field;
    }
  }
  return undefined;
}
exports.getId = getId;
function buildFieldsByAttributes(attrs, fields) {
  if (!fields || fields.length === 0) {
    return '*';
  }
  var cols = [];
  for (var _i = 0, fields_1 = fields; _i < fields_1.length; _i++) {
    var f = fields_1[_i];
    var attr = attrs[f];
    if (attr) {
      var field = (attr.column ? attr.column : f);
      cols.push(field);
    }
  }
  if (cols.length === 0) {
    return '*';
  }
  else {
    return cols.join(',');
  }
}
exports.buildFieldsByAttributes = buildFieldsByAttributes;
function isEmpty(s) {
  return !(s && s.length > 0);
}
exports.isEmpty = isEmpty;
function buildQ(field, q, match) {
  var o = {};
  if (match === 'equal') {
    o[field] = q;
  }
  else if (match === 'prefix') {
    o[field] = new RegExp("^" + q);
  }
  else {
    o[field] = new RegExp("\\w*" + q + "\\w*");
  }
  return o;
}
exports.buildQ = buildQ;
function buildMatch(v, match) {
  if (match === 'equal') {
    return v;
  }
  else if (match === 'prefix') {
    return new RegExp("^" + v);
  }
  else {
    return new RegExp("\\w*" + v + "\\w*");
  }
}
exports.buildMatch = buildMatch;
function isDateRange(obj) {
  var keys = Object.keys(obj);
  for (var _i = 0, keys_2 = keys; _i < keys_2.length; _i++) {
    var key = keys_2[_i];
    var v = obj[key];
    if (!(v instanceof Date)) {
      return false;
    }
  }
  return true;
}
exports.isDateRange = isDateRange;
function isNumberRange(obj) {
  var keys = Object.keys(obj);
  for (var _i = 0, keys_3 = keys; _i < keys_3.length; _i++) {
    var key = keys_3[_i];
    var v = obj[key];
    if (typeof v !== 'number') {
      return false;
    }
  }
  return true;
}
exports.isNumberRange = isNumberRange;
