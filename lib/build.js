"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function select(obj, table, ks, buildParam, i) {
  if (!i) {
    i = 1;
  }
  if (ks.length === 1) {
    var field = (ks[0].field ? ks[0].field : ks[0].name);
    if (typeof obj === 'number') {
      var query = "select * from " + table + " where " + field + " = " + obj;
      return { query: query, args: [] };
    }
    else {
      var query = "select * from " + table + " where " + field + " = " + buildParam(i);
      return { query: query, args: [obj] };
    }
  }
  else if (ks.length > 1) {
    var cols = [];
    var args = [];
    for (var _i = 0, ks_1 = ks; _i < ks_1.length; _i++) {
      var k = ks_1[_i];
      var field = (k.field ? k.field : k.name);
      cols.push(field + " = " + buildParam(i++));
      args.push(obj[k.name]);
    }
    var query = "select * from " + table + " where " + cols.join(' and ');
    return { query: query, args: args };
  }
  else {
    return null;
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
    var field = (ks[0].field ? ks[0].field : ks[0].name);
    if (typeof obj === 'number') {
      var query = "select " + col + " from " + table + " where " + field + " = " + obj;
      return { query: query, args: [] };
    }
    else {
      var query = "select " + col + " from " + table + " where " + field + " = " + buildParam(i);
      return { query: query, args: [obj] };
    }
  }
  else if (ks.length > 1) {
    var cols = [];
    var args = [];
    for (var _i = 0, ks_2 = ks; _i < ks_2.length; _i++) {
      var k = ks_2[_i];
      var field = (k.field ? k.field : k.name);
      cols.push(field + " = " + buildParam(i++));
      args.push(obj[k.name]);
    }
    var query = "select * from " + table + " where " + cols.join(' and ');
    return { query: query, args: args };
  }
  else {
    return null;
  }
}
exports.exist = exist;
function buildToDelete(obj, table, ks, buildParam, i) {
  if (!i) {
    i = 1;
  }
  if (ks.length === 1) {
    var field = (ks[0].field ? ks[0].field : ks[0].name);
    if (typeof obj === 'number') {
      var query = "delete from " + table + " where " + field + " = " + obj;
      return { query: query, args: [] };
    }
    else {
      var query = "delete from " + table + " where " + field + " = " + buildParam(i);
      return { query: query, args: [obj] };
    }
  }
  else if (ks.length > 1) {
    var cols = [];
    var args = [];
    for (var _i = 0, ks_3 = ks; _i < ks_3.length; _i++) {
      var k = ks_3[_i];
      var field = (k.field ? k.field : k.name);
      cols.push(field + " = " + buildParam(i++));
      args.push(obj[k.name]);
    }
    var query = "delete from " + table + " where " + cols.join(' and ');
    return { query: query, args: args };
  }
  else {
    return null;
  }
}
exports.buildToDelete = buildToDelete;
function insert(exec, obj, table, attrs, buildParam, ver, i) {
  var stm = buildToInsert(obj, table, attrs, buildParam, ver, i);
  if (!stm) {
    return Promise.resolve(0);
  }
  else {
    return exec(stm.query, stm.args);
  }
}
exports.insert = insert;
function buildToInsert(obj, table, attrs, buildParam, ver, i) {
  if (!i) {
    i = 1;
  }
  var ks = Object.keys(attrs);
  var cols = [];
  var values = [];
  var args = [];
  var isVersion = false;
  for (var _i = 0, ks_4 = ks; _i < ks_4.length; _i++) {
    var k = ks_4[_i];
    var v = obj[k];
    var attr = attrs[k];
    if (attr && !attr.ignored && !attr.noinsert) {
      if (v === undefined || v == null) {
        v = attr.default;
      }
      if (v !== undefined && v != null) {
        var field = (attr.field ? attr.field : k);
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
          else {
            var p = buildParam(i++);
            values.push(p);
            if (typeof v === 'boolean') {
              if (v === true) {
                var v2 = (attr.true ? attr.true : '1');
                args.push(v2);
              }
              else {
                var v2 = (attr.false ? attr.false : '0');
                args.push(v2);
              }
            }
            else {
              args.push(v);
            }
          }
        }
      }
    }
  }
  if (!isVersion && ver && ver.length > 0) {
    var attr = attrs[ver];
    var field = (attr.field ? attr.field : ver);
    cols.push(field);
    values.push("" + 1);
  }
  if (cols.length === 0) {
    return null;
  }
  else {
    var query = "insert into " + table + "(" + cols.join(',') + ")values(" + values.join(',') + ")";
    return { query: query, args: args };
  }
}
exports.buildToInsert = buildToInsert;
function insertBatch(exec, objs, table, attrs, buildParam, i) {
  var stm = buildToInsertBatch(objs, table, attrs, buildParam, i);
  if (!stm) {
    return Promise.resolve(0);
  }
  else {
    return exec(stm.query, stm.args);
  }
}
exports.insertBatch = insertBatch;
function buildToInsertBatch(objs, table, attrs, buildParam, i) {
  if (!i) {
    i = 1;
  }
  var ks = Object.keys(attrs);
  var cols = [];
  var rows = [];
  var args = [];
  for (var _i = 0, ks_5 = ks; _i < ks_5.length; _i++) {
    var k = ks_5[_i];
    var attr = attrs[k];
    if (attr && !attr.ignored && !attr.noinsert) {
      var field = (attr.field ? attr.field : k);
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
        var x = void 0;
        if (attr.version) {
          x = '1';
        }
        else if (v === undefined || v == null) {
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
        values.push(x);
      }
    }
    rows.push("(" + values.join(',') + ")");
  }
  var query = "insert into " + table + "(" + cols.join(',') + ")values " + rows.join(',');
  return { query: query, args: args };
}
exports.buildToInsertBatch = buildToInsertBatch;
function update(exec, obj, table, attrs, buildParam, ver, i) {
  var stm = buildToUpdate(obj, table, attrs, buildParam, ver, i);
  if (!stm) {
    return Promise.resolve(0);
  }
  else {
    return exec(stm.query, stm.args);
  }
}
exports.update = update;
function buildToUpdate(obj, table, attrs, buildParam, ver, i) {
  if (!i) {
    i = 1;
  }
  var ks = Object.keys(attrs);
  var pks = [];
  var colSet = [];
  var colQuery = [];
  var args = [];
  for (var _i = 0, ks_7 = ks; _i < ks_7.length; _i++) {
    var k = ks_7[_i];
    var v = obj[k];
    if (v !== undefined) {
      var attr = attrs[k];
      attr.name = k;
      if (attr && !attr.ignored && k !== ver) {
        if (attr.key) {
          pks.push(attr);
        }
        else if (!attr.noupdate) {
          var field = (attr.field ? attr.field : k);
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
          colSet.push(field + "=" + x);
        }
      }
    }
  }
  for (var _a = 0, pks_1 = pks; _a < pks_1.length; _a++) {
    var pk = pks_1[_a];
    var v = obj[pk.name];
    if (!v) {
      return null;
    }
    else {
      var attr = attrs[pk.name];
      var field = (attr.field ? attr.field : pk.name);
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
    var v = obj[ver];
    if (typeof v === 'number' && !isNaN(v)) {
      var attr = attrs[ver];
      if (attr) {
        var field = (attr.field ? attr.field : ver);
        colSet.push(field + "=" + (1 + v));
        colQuery.push(field + "=" + v);
      }
    }
  }
  if (colSet.length === 0 || colQuery.length === 0) {
    return null;
  }
  else {
    var query = "update " + table + " set " + colSet.join(',') + " where " + colQuery.join(' and ');
    return { query: query, args: args };
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
    return null;
  }
  for (var _i = 0, objs_2 = objs; _i < objs_2.length; _i++) {
    var obj = objs_2[_i];
    var i = 1;
    var ks = Object.keys(obj);
    var colSet = [];
    var colQuery = [];
    var args = [];
    for (var _a = 0, ks_8 = ks; _a < ks_8.length; _a++) {
      var k = ks_8[_a];
      var v = obj[k];
      if (v !== undefined) {
        var attr = attrs[k];
        if (attr && !attr.ignored && !attr.key && !attr.version && !attr.noupdate) {
          var field = (attr.field ? attr.field : k);
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
          colSet.push(field + "=" + x);
        }
      }
    }
    var valid = true;
    for (var _b = 0, _c = meta.keys; _b < _c.length; _b++) {
      var pk = _c[_b];
      var v = obj[pk.name];
      if (!v) {
        valid = false;
      }
      else {
        var attr = attrs[pk.name];
        var field = (attr.field ? attr.field : pk.name);
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
        return null;
      }
    }
    else {
      var ver = meta.version;
      if (ver && ver.length > 0) {
        var v = obj[ver];
        if (typeof v === 'number' && !isNaN(v)) {
          var attr = attrs[ver];
          if (attr) {
            var field = (attr.field ? attr.field : ver);
            colSet.push(field + "=" + (1 + v));
            colQuery.push(field + "=" + v);
          }
        }
      }
      var query = "update " + table + " set " + colSet.join(',') + " where " + colQuery.join(' and ');
      var stm = { query: query, args: args };
      sts.push(stm);
    }
  }
  return sts;
}
exports.buildToUpdateBatch = buildToUpdateBatch;
function version(attrs) {
  var ks = Object.keys(attrs);
  for (var _i = 0, ks_9 = ks; _i < ks_9.length; _i++) {
    var k = ks_9[_i];
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
  for (var _i = 0, ks_10 = ks; _i < ks_10.length; _i++) {
    var k = ks_10[_i];
    var attr = attrs[k];
    attr.name = k;
    if (attr.key) {
      return attr;
    }
  }
  return null;
}
exports.key = key;
function keys(attrs) {
  var ks = Object.keys(attrs);
  var ats = [];
  for (var _i = 0, ks_11 = ks; _i < ks_11.length; _i++) {
    var k = ks_11[_i];
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
  for (var _i = 0, ks_12 = ks; _i < ks_12.length; _i++) {
    var k = ks_12[_i];
    var attr = attrs[k];
    attr.name = k;
    var field = (attr.field ? attr.field : k);
    var s = field.toLowerCase();
    if (s !== field) {
      mp[s] = field;
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
  var ver;
  var isMap = false;
  for (var _i = 0, ks_13 = ks; _i < ks_13.length; _i++) {
    var k = ks_13[_i];
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
      ver = k;
    }
    var field = (attr.field ? attr.field : k);
    var s = field.toLowerCase();
    if (s !== k) {
      mp[s] = k;
      isMap = true;
    }
  }
  var m = { keys: ats, fields: fields, version: ver };
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
    var a = { name: s, field: s, key: isKey };
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
