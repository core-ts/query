"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var resource = (function () {
  function resource() {
  }
  return resource;
}());
exports.resource = resource;
function params(length, p, from) {
  if (from === undefined || from == null) {
    from = 0;
  }
  var ps = [];
  for (var i = 1; i <= length; i++) {
    ps.push(p(i + from));
  }
  return ps;
}
exports.params = params;
function select(obj, table, ks, buildParam, i) {
  if (!i) {
    i = 1;
  }
  if (ks.length === 1) {
    var field = (ks[0].column ? ks[0].column : ks[0].name);
    if (typeof obj === 'number') {
      var query = "select * from " + table + " where " + field + " = " + obj;
      return { query: query, params: [] };
    }
    else {
      var query = "select * from " + table + " where " + field + " = " + buildParam(i);
      return { query: query, params: [obj] };
    }
  }
  else if (ks.length > 1) {
    var cols = [];
    var args = [];
    for (var _i = 0, ks_1 = ks; _i < ks_1.length; _i++) {
      var k = ks_1[_i];
      if (k.name) {
        var field = (k.column ? k.column : k.name);
        cols.push(field + " = " + buildParam(i++));
        args.push(obj[k.name]);
      }
    }
    var query = "select * from " + table + " where " + cols.join(' and ');
    return { query: query, params: args };
  }
  else {
    return undefined;
  }
}
exports.select = select;
function exist(obj, table, ks, buildParam, col, i) {
  if (!i) {
    i = 1;
  }
  if (!col || col.length === 0) {
    col = '*';
  }
  if (ks.length === 1) {
    var field = (ks[0].column ? ks[0].column : ks[0].name);
    if (typeof obj === 'number') {
      var query = "select " + col + " from " + table + " where " + field + " = " + obj;
      return { query: query, params: [] };
    }
    else {
      var query = "select " + col + " from " + table + " where " + field + " = " + buildParam(i);
      return { query: query, params: [obj] };
    }
  }
  else if (ks.length > 1) {
    var cols = [];
    var args = [];
    for (var _i = 0, ks_2 = ks; _i < ks_2.length; _i++) {
      var k = ks_2[_i];
      if (k.name) {
        var field = (k.column ? k.column : k.name);
        cols.push(field + " = " + buildParam(i++));
        args.push(obj[k.name]);
      }
    }
    var query = "select * from " + table + " where " + cols.join(' and ');
    return { query: query, params: args };
  }
  else {
    return undefined;
  }
}
exports.exist = exist;
function buildToDelete(obj, table, ks, buildParam, i) {
  if (!i) {
    i = 1;
  }
  if (ks.length === 1) {
    var field = (ks[0].column ? ks[0].column : ks[0].name);
    if (typeof obj === 'number') {
      var query = "delete from " + table + " where " + field + " = " + obj;
      return { query: query, params: [] };
    }
    else {
      var query = "delete from " + table + " where " + field + " = " + buildParam(i);
      return { query: query, params: [obj] };
    }
  }
  else if (ks.length > 1) {
    var cols = [];
    var args = [];
    for (var _i = 0, ks_3 = ks; _i < ks_3.length; _i++) {
      var k = ks_3[_i];
      if (k.name) {
        var field = (k.column ? k.column : k.name);
        cols.push(field + " = " + buildParam(i++));
        args.push(obj[k.name]);
      }
    }
    var query = "delete from " + table + " where " + cols.join(' and ');
    return { query: query, params: args };
  }
  else {
    return undefined;
  }
}
exports.buildToDelete = buildToDelete;
function insert(exec, obj, table, attrs, buildParam, ver, i) {
  var stm = buildToInsert(obj, table, attrs, buildParam, ver, i);
  if (!stm) {
    return Promise.resolve(0);
  }
  else {
    return exec(stm.query, stm.params);
  }
}
exports.insert = insert;
function buildToInsert(obj, table, attrs, buildParam, ver, i) {
  if (!i) {
    i = 1;
  }
  var o = obj;
  var ks = Object.keys(attrs);
  var cols = [];
  var values = [];
  var args = [];
  var isVersion = false;
  for (var _i = 0, ks_4 = ks; _i < ks_4.length; _i++) {
    var k = ks_4[_i];
    var v = o[k];
    var attr = attrs[k];
    if (attr && !attr.ignored && !attr.noinsert) {
      if (v === undefined || v == null) {
        v = attr.default;
      }
      if (v !== undefined && v != null) {
        var field = (attr.column ? attr.column : k);
        cols.push(field);
        if (k === ver) {
          isVersion = true;
          values.push("" + 1);
        }
        else {
          if (v === '') {
            values.push("''");
          }
          else if (typeof v === 'number') {
            values.push(toString(v));
          }
          else if (typeof v === 'boolean') {
            if (attr.true === undefined) {
              if (v === true) {
                values.push("true");
              }
              else {
                values.push("false");
              }
            }
            else {
              var p = buildParam(i++);
              values.push(p);
              if (v === true) {
                var v2 = (attr.true ? attr.true : '1');
                args.push(v2);
              }
              else {
                var v2 = (attr.false ? attr.false : '0');
                args.push(v2);
              }
            }
          }
          else {
            if (resource.ignoreDatetime && typeof v === 'string' && attr.type === 'datetime') {
              values.push("'" + v + "'");
            }
            else {
              var p = buildParam(i++);
              values.push(p);
              args.push(v);
            }
          }
        }
      }
    }
  }
  if (!isVersion && ver && ver.length > 0) {
    var attr = attrs[ver];
    var field = (attr.column ? attr.column : ver);
    cols.push(field);
    values.push("" + 1);
  }
  if (cols.length === 0) {
    return undefined;
  }
  else {
    var query = "insert into " + table + "(" + cols.join(',') + ")values(" + values.join(',') + ")";
    return { query: query, params: args };
  }
}
exports.buildToInsert = buildToInsert;
function insertBatch(exec, objs, table, attrs, buildParam, ver, i) {
  var stm = buildToInsertBatch(objs, table, attrs, buildParam, ver, i);
  if (!stm) {
    return Promise.resolve(0);
  }
  else {
    return exec(stm.query, stm.params);
  }
}
exports.insertBatch = insertBatch;
function buildOracleParam(i) {
  return ':' + i;
}
function buildToInsertBatch(objs, table, attrs, buildParam, ver, i) {
  if (!i) {
    i = 1;
  }
  var ks = Object.keys(attrs);
  var args = [];
  if (buildParam && typeof buildParam === 'function') {
    var cols = [];
    var rows = [];
    for (var _i = 0, ks_5 = ks; _i < ks_5.length; _i++) {
      var k = ks_5[_i];
      var attr = attrs[k];
      if (attr && !attr.ignored && !attr.noinsert) {
        var field = (attr.column ? attr.column : k);
        cols.push(field);
      }
    }
    for (var _a = 0, objs_1 = objs; _a < objs_1.length; _a++) {
      var obj = objs_1[_a];
      var values = [];
      for (var _b = 0, ks_6 = ks; _b < ks_6.length; _b++) {
        var k = ks_6[_b];
        var attr = attrs[k];
        if (attr && !attr.ignored && !attr.noinsert) {
          var v = obj[k];
          if (v === undefined || v === null) {
            v = attr.default;
          }
          if (attr.version) {
            values.push('1');
          }
          else if (v === undefined || v == null) {
            values.push('null');
          }
          else if (v === '') {
            values.push("''");
          }
          else if (typeof v === 'number') {
            values.push(toString(v));
          }
          else if (typeof v === 'boolean') {
            if (attr.true === undefined) {
              if (v === true) {
                values.push("true");
              }
              else {
                values.push("false");
              }
            }
            else {
              var p = buildParam(i++);
              values.push(p);
              if (v === true) {
                var v2 = (attr.true ? attr.true : '1');
                args.push(v2);
              }
              else {
                var v2 = (attr.false ? attr.false : '0');
                args.push(v2);
              }
            }
          }
          else {
            if (resource.ignoreDatetime && typeof v === 'string' && attr.type === 'datetime') {
              values.push("'" + v + "'");
            }
            else {
              var p = buildParam(i++);
              values.push(p);
              args.push(v);
            }
          }
        }
      }
      rows.push("(" + values.join(',') + ")");
    }
    var query = "insert into " + table + "(" + cols.join(',') + ")values " + rows.join(',');
    return { query: query, params: args };
  }
  else {
    var notSkipInvalid = false;
    if (buildParam === true) {
      notSkipInvalid = true;
    }
    var rows = [];
    for (var _c = 0, objs_2 = objs; _c < objs_2.length; _c++) {
      var obj = objs_2[_c];
      var cols = [];
      var values = [];
      var isVersion = false;
      for (var _d = 0, ks_7 = ks; _d < ks_7.length; _d++) {
        var k = ks_7[_d];
        var v = obj[k];
        var attr = attrs[k];
        if (attr && !attr.ignored && !attr.noinsert) {
          if (v === undefined || v == null) {
            v = attr.default;
          }
          if (v !== undefined && v != null) {
            var field = (attr.column ? attr.column : k);
            cols.push(field);
            if (k === ver) {
              isVersion = true;
              values.push("" + 1);
            }
            else {
              if (v === '') {
                values.push("''");
              }
              else if (typeof v === 'number') {
                values.push(toString(v));
              }
              else if (typeof v === 'boolean') {
                if (attr.true === undefined) {
                  if (v === true) {
                    values.push("true");
                  }
                  else {
                    values.push("false");
                  }
                }
                else {
                  var p = buildOracleParam(i++);
                  values.push(p);
                  if (v === true) {
                    var v2 = (attr.true ? attr.true : '1');
                    args.push(v2);
                  }
                  else {
                    var v2 = (attr.false ? attr.false : '0');
                    args.push(v2);
                  }
                }
              }
              else {
                var p = buildOracleParam(i++);
                values.push(p);
                args.push(v);
              }
            }
          }
        }
      }
      if (!isVersion && ver && ver.length > 0) {
        var attr = attrs[ver];
        var field = (attr.column ? attr.column : ver);
        cols.push(field);
        values.push("" + 1);
      }
      if (cols.length === 0) {
        if (notSkipInvalid) {
          return undefined;
        }
      }
      else {
        var s = "into " + table + "(" + cols.join(',') + ")values(" + values.join(',') + ")";
        rows.push(s);
      }
    }
    if (rows.length === 0) {
      return undefined;
    }
    var query = "insert all " + rows.join(' ') + " select * from dual";
    return { query: query, params: args };
  }
}
exports.buildToInsertBatch = buildToInsertBatch;
function update(exec, obj, table, attrs, buildParam, ver, i) {
  var stm = buildToUpdate(obj, table, attrs, buildParam, ver, i);
  if (!stm) {
    return Promise.resolve(0);
  }
  else {
    return exec(stm.query, stm.params);
  }
}
exports.update = update;
function buildToUpdate(obj, table, attrs, buildParam, ver, i) {
  if (!i) {
    i = 1;
  }
  var o = obj;
  var ks = Object.keys(attrs);
  var pks = [];
  var colSet = [];
  var colQuery = [];
  var args = [];
  for (var _i = 0, ks_8 = ks; _i < ks_8.length; _i++) {
    var k = ks_8[_i];
    var v = o[k];
    if (v !== undefined) {
      var attr = attrs[k];
      attr.name = k;
      if (attr && !attr.ignored && k !== ver) {
        if (attr.key) {
          pks.push(attr);
        }
        else if (!attr.noupdate) {
          var field = (attr.column ? attr.column : k);
          var x = void 0;
          if (v == null) {
            x = 'null';
          }
          else if (v === '') {
            x = "''";
          }
          else if (typeof v === 'number') {
            x = toString(v);
          }
          else if (typeof v === 'boolean') {
            if (attr.true === undefined) {
              if (v === true) {
                x = "true";
              }
              else {
                x = "false";
              }
            }
            else {
              x = buildParam(i++);
              if (v === true) {
                var v2 = (attr.true ? attr.true : '1');
                args.push(v2);
              }
              else {
                var v2 = (attr.false ? attr.false : '0');
                args.push(v2);
              }
            }
          }
          else {
            if (resource.ignoreDatetime && typeof v === 'string' && attr.type === 'datetime') {
              x = "'" + v + "'";
            }
            else {
              x = buildParam(i++);
              args.push(v);
            }
          }
          colSet.push(field + "=" + x);
        }
      }
    }
  }
  for (var _a = 0, pks_1 = pks; _a < pks_1.length; _a++) {
    var pk = pks_1[_a];
    var na = (pk.name ? pk.name : '');
    var v = o[na];
    if (!v) {
      return undefined;
    }
    else {
      var attr = attrs[na];
      var field = (attr.column ? attr.column : pk.name);
      var x = void 0;
      if (v == null) {
        x = 'null';
      }
      else if (v === '') {
        x = "''";
      }
      else if (typeof v === 'number') {
        x = toString(v);
      }
      else {
        x = buildParam(i++);
        if (typeof v === 'boolean') {
          if (v === true) {
            var v2 = (attr.true ? '' + attr.true : '1');
            args.push(v2);
          }
          else {
            var v2 = (attr.false ? '' + attr.false : '0');
            args.push(v2);
          }
        }
        else {
          args.push(v);
        }
      }
      colQuery.push(field + "=" + x);
    }
  }
  if (ver && ver.length > 0) {
    var v = o[ver];
    if (typeof v === 'number' && !isNaN(v)) {
      var attr = attrs[ver];
      if (attr) {
        var field = (attr.column ? attr.column : ver);
        colSet.push(field + "=" + (1 + v));
        colQuery.push(field + "=" + v);
      }
    }
  }
  if (colSet.length === 0 || colQuery.length === 0) {
    return undefined;
  }
  else {
    var query = "update " + table + " set " + colSet.join(',') + " where " + colQuery.join(' and ');
    return { query: query, params: args };
  }
}
exports.buildToUpdate = buildToUpdate;
function updateBatch(exec, objs, table, attrs, buildParam, notSkipInvalid) {
  var stmts = buildToUpdateBatch(objs, table, attrs, buildParam, notSkipInvalid);
  if (!stmts || stmts.length === 0) {
    return Promise.resolve(0);
  }
  else {
    return exec(stmts);
  }
}
exports.updateBatch = updateBatch;
function buildToUpdateBatch(objs, table, attrs, buildParam, notSkipInvalid) {
  var sts = [];
  var meta = metadata(attrs);
  if (!meta.keys || meta.keys.length === 0) {
    return undefined;
  }
  for (var _i = 0, objs_3 = objs; _i < objs_3.length; _i++) {
    var obj = objs_3[_i];
    var o = obj;
    var i = 1;
    var ks = Object.keys(o);
    var colSet = [];
    var colQuery = [];
    var args = [];
    for (var _a = 0, ks_9 = ks; _a < ks_9.length; _a++) {
      var k = ks_9[_a];
      var v = o[k];
      if (v !== undefined) {
        var attr = attrs[k];
        attr.name = k;
        if (attr && !attr.ignored && !attr.key && !attr.version && !attr.noupdate) {
          var field = (attr.column ? attr.column : k);
          var x = void 0;
          if (v == null) {
            x = 'null';
          }
          else if (v === '') {
            x = "''";
          }
          else if (typeof v === 'number') {
            x = toString(v);
          }
          else if (typeof v === 'boolean') {
            if (attr.true === undefined) {
              if (v === true) {
                x = "true";
              }
              else {
                x = "false";
              }
            }
            else {
              x = buildParam(i++);
              if (v === true) {
                var v2 = (attr.true ? attr.true : '1');
                args.push(v2);
              }
              else {
                var v2 = (attr.false ? attr.false : '0');
                args.push(v2);
              }
            }
          }
          else {
            x = buildParam(i++);
            args.push(v);
          }
          colSet.push(field + "=" + x);
        }
      }
    }
    var valid = true;
    for (var _b = 0, _c = meta.keys; _b < _c.length; _b++) {
      var pk = _c[_b];
      var na = (pk.name ? pk.name : '');
      var v = o[na];
      if (!v) {
        valid = false;
      }
      else {
        var attr = attrs[na];
        var field = (attr.column ? attr.column : pk.name);
        var x = void 0;
        if (v == null) {
          x = 'null';
        }
        else if (v === '') {
          x = "''";
        }
        else if (typeof v === 'number') {
          x = toString(v);
        }
        else {
          x = buildParam(i++);
          if (typeof v === 'boolean') {
            if (v === true) {
              var v2 = (attr.true ? '' + attr.true : '1');
              args.push(v2);
            }
            else {
              var v2 = (attr.false ? '' + attr.false : '0');
              args.push(v2);
            }
          }
          else {
            args.push(v);
          }
        }
        colQuery.push(field + "=" + x);
      }
    }
    if (!valid || colSet.length === 0 || colQuery.length === 0) {
      if (notSkipInvalid) {
        return undefined;
      }
    }
    else {
      var ver = meta.version;
      if (ver && ver.length > 0) {
        var v = o[ver];
        if (typeof v === 'number' && !isNaN(v)) {
          var attr = attrs[ver];
          if (attr) {
            var field = (attr.column ? attr.column : ver);
            colSet.push(field + "=" + (1 + v));
            colQuery.push(field + "=" + v);
          }
        }
      }
      var query = "update " + table + " set " + colSet.join(',') + " where " + colQuery.join(' and ');
      var stm = { query: query, params: args };
      sts.push(stm);
    }
  }
  return sts;
}
exports.buildToUpdateBatch = buildToUpdateBatch;
function version(attrs) {
  var ks = Object.keys(attrs);
  for (var _i = 0, ks_10 = ks; _i < ks_10.length; _i++) {
    var k = ks_10[_i];
    var attr = attrs[k];
    if (attr.version) {
      attr.name = k;
      return attr;
    }
  }
  return undefined;
}
exports.version = version;
function key(attrs) {
  var ks = Object.keys(attrs);
  for (var _i = 0, ks_11 = ks; _i < ks_11.length; _i++) {
    var k = ks_11[_i];
    var attr = attrs[k];
    attr.name = k;
    if (attr.key) {
      return attr;
    }
  }
  return undefined;
}
exports.key = key;
function keys(attrs) {
  var ks = Object.keys(attrs);
  var ats = [];
  for (var _i = 0, ks_12 = ks; _i < ks_12.length; _i++) {
    var k = ks_12[_i];
    var attr = attrs[k];
    attr.name = k;
    if (attr.key) {
      ats.push(attr);
    }
  }
  return ats;
}
exports.keys = keys;
function buildMap(attrs) {
  var mp = {};
  var ks = Object.keys(attrs);
  for (var _i = 0, ks_13 = ks; _i < ks_13.length; _i++) {
    var k = ks_13[_i];
    var attr = attrs[k];
    attr.name = k;
    var field = (attr.column ? attr.column : k);
    var s = field.toLowerCase();
    if (s !== k) {
      mp[s] = k;
    }
  }
  return mp;
}
exports.buildMap = buildMap;
function metadata(attrs) {
  var mp = {};
  var ks = Object.keys(attrs);
  var ats = [];
  var bools = [];
  var fields = [];
  var isMap = false;
  var m = { keys: ats, fields: fields };
  for (var _i = 0, ks_14 = ks; _i < ks_14.length; _i++) {
    var k = ks_14[_i];
    var attr = attrs[k];
    attr.name = k;
    if (attr.key) {
      ats.push(attr);
    }
    if (!attr.ignored) {
      fields.push(k);
    }
    if (attr.type === 'boolean') {
      bools.push(attr);
    }
    if (attr.version) {
      m.version = k;
    }
    var field = (attr.column ? attr.column : k);
    var s = field.toLowerCase();
    if (s !== k) {
      mp[s] = k;
      isMap = true;
    }
  }
  if (isMap) {
    m.map = mp;
  }
  if (bools.length > 0) {
    m.bools = bools;
  }
  return m;
}
exports.metadata = metadata;
function attributes(attrs, isKey) {
  var ks = [];
  for (var _i = 0, attrs_1 = attrs; _i < attrs_1.length; _i++) {
    var s = attrs_1[_i];
    var a = { name: s, column: s, key: isKey };
    ks.push(a);
  }
  return ks;
}
exports.attributes = attributes;
function param(i) {
  return '?';
}
exports.param = param;
function setValue(obj, path, value) {
  var paths = path.split('.');
  var o = obj;
  for (var i = 0; i < paths.length - 1; i++) {
    var p = paths[i];
    if (p in o) {
      o = o[p];
    }
    else {
      o[p] = {};
      o = o[p];
    }
  }
  o[paths[paths.length - 1]] = value;
}
exports.setValue = setValue;
var n = 'NaN';
function toString(v) {
  var x = '' + v;
  if (x === n) {
    x = 'null';
  }
  return x;
}
exports.toString = toString;
