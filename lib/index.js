"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
Object.defineProperty(exports, "__esModule", { value: true });
var health_1 = require("./health");
exports.SqlChecker = health_1.Checker;
var build_1 = require("./build");
var services_1 = require("./services");
exports.SqlViewRepository = services_1.SqlLoader;
exports.SqlLoadService = services_1.SqlLoader;
exports.SqlViewService = services_1.SqlLoader;
exports.ViewSearchRepository = services_1.SqlSearchLoader;
exports.ViewSearchService = services_1.SqlSearchLoader;
exports.SqlViewSearchRepository = services_1.SqlSearchLoader;
exports.SqlViewSearchService = services_1.SqlSearchLoader;
exports.SqlSearchRepository = services_1.SqlSearchLoader;
exports.SqlSearchService = services_1.SqlSearchLoader;
exports.SearchRepository = services_1.SqlSearchLoader;
exports.SearchService = services_1.SqlSearchLoader;
exports.GenericSearchRepository = services_1.SqlSearchWriter;
exports.GenericSearchService = services_1.SqlSearchWriter;
exports.SqlRepository = services_1.SqlSearchWriter;
exports.SqlService = services_1.SqlSearchWriter;
exports.Service = services_1.SqlSearchWriter;
exports.SqlGenericRepository = services_1.SqlWriter;
exports.Repository = services_1.SqlWriter;
exports.SqlGenericService = services_1.SqlWriter;
__export(require("./health"));
__export(require("./build"));
__export(require("./services"));
__export(require("./batch"));
__export(require("./query"));
__export(require("./search"));
__export(require("./SearchBuilder"));
__export(require("./client"));
var Loader = (function () {
    function Loader(query, sql, m, bools) {
        this.query = query;
        this.sql = sql;
        this.bools = bools;
        this.map = m;
        this.load = this.load.bind(this);
    }
    Loader.prototype.load = function () {
        return this.query(this.sql, [], this.map, this.bools);
    };
    return Loader;
}());
exports.Loader = Loader;
function toArray(arr) {
    if (!arr || arr.length === 0) {
        return [];
    }
    var p = [];
    var l = arr.length;
    for (var i = 0; i < l; i++) {
        if (arr[i] === undefined || arr[i] == null) {
            p.push(null);
        }
        else {
            if (typeof arr[i] === 'object') {
                if (arr[i] instanceof Date) {
                    p.push(arr[i]);
                }
                else {
                    if (build_1.resource.string) {
                        var s = JSON.stringify(arr[i]);
                        p.push(s);
                    }
                    else {
                        p.push(arr[i]);
                    }
                }
            }
            else {
                p.push(arr[i]);
            }
        }
    }
    return p;
}
exports.toArray = toArray;
function map(obj, m) {
    if (!m) {
        return obj;
    }
    var mkeys = Object.keys(m);
    if (mkeys.length === 0) {
        return obj;
    }
    var obj2 = {};
    var keys = Object.keys(obj);
    for (var _i = 0, keys_1 = keys; _i < keys_1.length; _i++) {
        var key = keys_1[_i];
        var k0 = m[key];
        if (!k0) {
            k0 = key;
        }
        obj2[k0] = obj[key];
    }
    return obj2;
}
exports.map = map;
