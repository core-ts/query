import {Attribute, Attributes, Statement, StringMap} from './metadata';

export function select<T>(obj: T, table: string, ks: Attribute[], buildParam: (i: number) => string, i?: number): Statement {
  if (!i) {
    i = 1;
  }
  if (ks.length === 1) {
    const field = (ks[0].field ? ks[0].field : ks[0].name);
    if (typeof obj === 'number') {
      const query = `select * from ${table} where ${field} = ${obj}`;
      return { query, params: [] };
    } else {
      const query = `select * from ${table} where ${field} = ${buildParam(i)}`;
      return { query, params: [obj] };
    }
  } else if (ks.length > 1) {
    const cols: string[] = [];
    const args: any[] = [];
    for (const k of ks) {
      const field = (k.field ? k.field : k.name);
      cols.push(`${field} = ${buildParam(i++)}`);
      args.push(obj[k.name]);
    }
    const query = `select * from ${table} where ${cols.join(' and ')}`;
    return { query, params: args };
  } else {
    return null;
  }
}
export function exist<T>(obj: T, table: string, ks: Attribute[], buildParam: (i: number) => string, col?: string, i?: number): Statement {
  if (!i) {
    i = 1;
  }
  if (!col || col.length === 0) {
    col = '*';
  }
  if (ks.length === 1) {
    const field = (ks[0].field ? ks[0].field : ks[0].name);
    if (typeof obj === 'number') {
      const query = `select ${col} from ${table} where ${field} = ${obj}`;
      return { query, params: [] };
    } else {
      const query = `select ${col} from ${table} where ${field} = ${buildParam(i)}`;
      return { query, params: [obj] };
    }
  } else if (ks.length > 1) {
    const cols: string[] = [];
    const args: any[] = [];
    for (const k of ks) {
      const field = (k.field ? k.field : k.name);
      cols.push(`${field} = ${buildParam(i++)}`);
      args.push(obj[k.name]);
    }
    const query = `select * from ${table} where ${cols.join(' and ')}`;
    return { query, params: args };
  } else {
    return null;
  }
}
export function buildToDelete<T>(obj: T, table: string, ks: Attribute[], buildParam: (i: number) => string, i?: number): Statement {
  if (!i) {
    i = 1;
  }
  if (ks.length === 1) {
    const field = (ks[0].field ? ks[0].field : ks[0].name);
    if (typeof obj === 'number') {
      const query = `delete from ${table} where ${field} = ${obj}`;
      return { query, params: [] };
    } else {
      const query = `delete from ${table} where ${field} = ${buildParam(i)}`;
      return { query, params: [obj] };
    }
  } else if (ks.length > 1) {
    const cols: string[] = [];
    const args: any[] = [];
    for (const k of ks) {
      const field = (k.field ? k.field : k.name);
      cols.push(`${field} = ${buildParam(i++)}`);
      args.push(obj[k.name]);
    }
    const query = `delete from ${table} where ${cols.join(' and ')}`;
    return { query, params: args };
  } else {
    return null;
  }
}
export function insert<T>(exec: (sql: string, args?: any[]) => Promise<number>, obj: T, table: string, attrs: Attributes, buildParam: (i: number) => string, ver?: string, i?: number): Promise<number> {
  const stm = buildToInsert(obj, table, attrs, buildParam, ver, i);
  if (!stm) {
    return Promise.resolve(0);
  } else {
    return exec(stm.query, stm.params);
  }
}
export function buildToInsert<T>(obj: T, table: string, attrs: Attributes, buildParam: (i: number) => string, ver?: string, i?: number): Statement {
  if (!i) {
    i = 1;
  }
  const ks = Object.keys(attrs);
  const cols: string[] = [];
  const values: string[] = [];
  const args: any[] = [];
  let isVersion = false;
  for (const k of ks) {
    let v = obj[k];
    const attr = attrs[k];
    if (attr && !attr.ignored && !attr.noinsert) {
      if (v === undefined || v == null) {
        v = attr.default;
      }
      if (v !== undefined && v != null) {
        const field = (attr.field ? attr.field : k);
        cols.push(field);
        if (k === ver) {
          isVersion = true;
          values.push(`${1}`);
        } else {
          if (v === '') {
            values.push(`''`);
          } else if (typeof v === 'number') {
            values.push(toString(v));
          } else if (typeof v === 'boolean') {
            if (attr.true === undefined) {
              if (v === true) {
                values.push(`true`);
              } else {
                values.push(`false`);
              }
            } else {
              const p = buildParam(i++);
              values.push(p);
              if (v === true) {
                const v2 = (attr.true ? attr.true : '1');
                args.push(v2);
              } else {
                const v2 = (attr.false ? attr.false : '0');
                args.push(v2);
              }
            }
          } else {
            const p = buildParam(i++);
            values.push(p);
            args.push(v);
          }
        }
      }
    }
  }
  if (!isVersion && ver && ver.length > 0) {
    const attr = attrs[ver];
    const field = (attr.field ? attr.field : ver);
    cols.push(field);
    values.push(`${1}`);
  }
  if (cols.length === 0) {
    return null;
  } else {
    const query = `insert into ${table}(${cols.join(',')})values(${values.join(',')})`;
    return { query, params: args };
  }
}
export function insertBatch<T>(exec: (sql: string, args?: any[]) => Promise<number>, objs: T[], table: string, attrs: Attributes, buildParam: (i: number) => string, i?: number): Promise<number> {
  const stm = buildToInsertBatch(objs, table, attrs, buildParam, i);
  if (!stm) {
    return Promise.resolve(0);
  } else {
    return exec(stm.query, stm.params);
  }
}
export function buildToInsertBatch<T>(objs: T[], table: string, attrs: Attributes, buildParam: (i: number) => string, i?: number): Statement {
  if (!i) {
    i = 1;
  }
  const ks = Object.keys(attrs);
  const cols: string[] = [];
  const rows: string[] = [];
  const args: any[] = [];
  for (const k of ks) {
    const attr = attrs[k];
    if (attr && !attr.ignored && !attr.noinsert) {
      const field = (attr.field ? attr.field : k);
      cols.push(field);
    }
  }
  for (const obj of objs) {
    const values: string[] = [];
    for (const k of ks) {
      const attr = attrs[k];
      if (attr && !attr.ignored && !attr.noinsert) {
        let v = obj[k];
        if (v === undefined || v === null) {
          v = attr.default;
        }
        // let x: string;
        if (attr.version) {
          values.push('1');
        } else if (v === undefined || v == null) {
          values.push('null');
        } else if (v === '') {
          values.push(`''`);
        } else if (typeof v === 'number') {
          values.push(toString(v));
        } else if (typeof v === 'boolean') {
          if (attr.true === undefined) {
            if (v === true) {
              values.push(`true`);
            } else {
              values.push(`false`);
            }
          } else {
            const p = buildParam(i++);
            values.push(p);
            if (v === true) {
              const v2 = (attr.true ? attr.true : '1');
              args.push(v2);
            } else {
              const v2 = (attr.false ? attr.false : '0');
              args.push(v2);
            }
          }
        } else {
          const p = buildParam(i++);
          values.push(p);
          args.push(v);
        }
      }
    }
    rows.push(`(${values.join(',')})`);
  }
  const query = `insert into ${table}(${cols.join(',')})values ${rows.join(',')}`;
  return { query, params: args };
}
export function update<T>(exec: (sql: string, args?: any[]) => Promise<number>, obj: T, table: string, attrs: Attributes, buildParam: (i: number) => string, ver?: string, i?: number): Promise<number> {
  const stm = buildToUpdate(obj, table, attrs, buildParam, ver, i);
  if (!stm) {
    return Promise.resolve(0);
  } else {
    return exec(stm.query, stm.params);
  }
}
export function buildToUpdate<T>(obj: T, table: string, attrs: Attributes, buildParam: (i: number) => string, ver?: string, i?: number): Statement {
  if (!i) {
    i = 1;
  }
  const ks = Object.keys(attrs);
  const pks: Attribute[] = [];
  const colSet: string[] = [];
  const colQuery: string[] = [];
  const args: any[] = [];
  for (const k of ks) {
    const v = obj[k];
    if (v !== undefined) {
      const attr = attrs[k];
      attr.name = k;
      if (attr && !attr.ignored && k !== ver) {
        if (attr.key) {
          pks.push(attr);
        } else if (!attr.noupdate) {
          const field = (attr.field ? attr.field : k);
          let x: string;
          if (v == null) {
            x = 'null';
          } else if (v === '') {
            x = `''`;
          } else if (typeof v === 'number') {
            x = toString(v);
          } else if (typeof v === 'boolean') {
            if (attr.true === undefined) {
              if (v === true) {
                x = `true`;
              } else {
                x = `false`;
              }
            } else {
              x = buildParam(i++);
              if (v === true) {
                const v2 = (attr.true ? attr.true : '1');
                args.push(v2);
              } else {
                const v2 = (attr.false ? attr.false : '0');
                args.push(v2);
              }
            }
          } else {
            x = buildParam(i++);
            args.push(v);
          }
          colSet.push(`${field}=${x}`);
        }
      }
    }
  }
  for (const pk of pks) {
    const v = obj[pk.name];
    if (!v) {
      return null;
    } else {
      const attr = attrs[pk.name];
      const field = (attr.field ? attr.field : pk.name);
      let x: string;
      if (v == null) {
        x = 'null';
      } else if (v === '') {
        x = `''`;
      } else if (typeof v === 'number') {
        x = toString(v);
      } else {
        x = buildParam(i++);
        if (typeof v === 'boolean') {
          if (v === true) {
            const v2 = (attr.true ? '' + attr.true : '1');
            args.push(v2);
          } else {
            const v2 = (attr.false ? '' + attr.false : '0');
            args.push(v2);
          }
        } else {
          args.push(v);
        }
      }
      colQuery.push(`${field}=${x}`);
    }
  }
  if (ver && ver.length > 0) {
    const v = obj[ver];
    if (typeof v === 'number' && !isNaN(v)) {
      const attr = attrs[ver];
      if (attr) {
        const field = (attr.field ? attr.field : ver);
        colSet.push(`${field}=${(1 + v)}`);
        colQuery.push(`${field}=${v}`);
      }
    }
  }
  if (colSet.length === 0 || colQuery.length === 0) {
    return null;
  } else {
    const query = `update ${table} set ${colSet.join(',')} where ${colQuery.join(' and ')}`;
    return { query, params: args };
  }
}
export function updateBatch<T>(exec: (statements: Statement[]) => Promise<number>, objs: T[], table: string, attrs: Attributes, buildParam: (i: number) => string, notSkipInvalid?: boolean): Promise<number> {
  const stmts = buildToUpdateBatch(objs, table, attrs, buildParam, notSkipInvalid);
  if (!stmts || stmts.length === 0) {
    return Promise.resolve(0);
  } else {
    return exec(stmts);
  }
}
export function buildToUpdateBatch<T>(objs: T[], table: string, attrs: Attributes, buildParam: (i: number) => string, notSkipInvalid?: boolean): Statement[] {
  const sts: Statement[] = [];
  const meta = metadata(attrs);
  if (!meta.keys || meta.keys.length === 0) {
    return null;
  }
  for (const obj of objs) {
    let i = 1;
    const ks = Object.keys(obj);
    const colSet: string[] = [];
    const colQuery: string[] = [];
    const args: any[] = [];
    for (const k of ks) {
      const v = obj[k];
      if (v !== undefined) {
        const attr = attrs[k];
        if (attr && !attr.ignored && !attr.key && !attr.version && !attr.noupdate) {
          const field = (attr.field ? attr.field : k);
          let x: string;
          if (v == null) {
            x = 'null';
          } else if (v === '') {
            x = `''`;
          } else if (typeof v === 'number') {
            x = toString(v);
          } else if (typeof v === 'boolean') {
            if (attr.true === undefined) {
              if (v === true) {
                x = `true`;
              } else {
                x = `false`;
              }
            } else {
              x = buildParam(i++);
              if (v === true) {
                const v2 = (attr.true ? attr.true : '1');
                args.push(v2);
              } else {
                const v2 = (attr.false ? attr.false : '0');
                args.push(v2);
              }
            }
          } else {
            x = buildParam(i++);
            args.push(v);
          }
          colSet.push(`${field}=${x}`);
        }
      }
    }
    let valid = true;
    for (const pk of meta.keys) {
      const v = obj[pk.name];
      if (!v) {
        valid = false;
      } else {
        const attr = attrs[pk.name];
        const field = (attr.field ? attr.field : pk.name);
        let x: string;
        if (v == null) {
          x = 'null';
        } else if (v === '') {
          x = `''`;
        } else if (typeof v === 'number') {
          x = toString(v);
        } else {
          x = buildParam(i++);
          if (typeof v === 'boolean') {
            if (v === true) {
              const v2 = (attr.true ? '' + attr.true : '1');
              args.push(v2);
            } else {
              const v2 = (attr.false ? '' + attr.false : '0');
              args.push(v2);
            }
          } else {
            args.push(v);
          }
        }
        colQuery.push(`${field}=${x}`);
      }
    }
    if (!valid || colSet.length === 0 || colQuery.length === 0) {
      if (notSkipInvalid) {
        return null;
      }
    } else {
      const ver = meta.version;
      if (ver && ver.length > 0) {
        const v = obj[ver];
        if (typeof v === 'number' && !isNaN(v)) {
          const attr = attrs[ver];
          if (attr) {
            const field = (attr.field ? attr.field : ver);
            colSet.push(`${field}=${(1 + v)}`);
            colQuery.push(`${field}=${v}`);
          }
        }
      }
      const query = `update ${table} set ${colSet.join(',')} where ${colQuery.join(' and ')}`;
      const stm: Statement = { query, params: args };
      sts.push(stm);
    }
  }
  return sts;
}
export function version(attrs: Attributes): Attribute {
  const ks = Object.keys(attrs);
  for (const k of ks) {
    const attr = attrs[k];
    if (attr.version) {
      attr.name = k;
      return attr;
    }
  }
  return undefined;
}
export function key(attrs: Attributes): Attribute {
  const ks = Object.keys(attrs);
  for (const k of ks) {
    const attr = attrs[k];
    attr.name = k;
    if (attr.key) {
      return attr;
    }
  }
  return null;
}
export function keys(attrs: Attributes): Attribute[] {
  const ks = Object.keys(attrs);
  const ats: Attribute[] = [];
  for (const k of ks) {
    const attr = attrs[k];
    attr.name = k;
    if (attr.key) {
      ats.push(attr);
    }
  }
  return ats;
}
export function buildMap(attrs: Attributes): StringMap {
  const mp: StringMap = {};
  const ks = Object.keys(attrs);
  for (const k of ks) {
    const attr = attrs[k];
    attr.name = k;
    const field = (attr.field ? attr.field : k);
    const s = field.toLowerCase();
    if (s !== field) {
      mp[s] = field;
    }
  }
  return mp;
}
export interface Metadata {
  keys: Attribute[];
  bools?: Attribute[];
  map?: StringMap;
  version?: string;
  fields?: string[];
}
export function metadata(attrs: Attributes): Metadata {
  const mp: StringMap = {};
  const ks = Object.keys(attrs);
  const ats: Attribute[] = [];
  const bools: Attribute[] = [];
  const fields: string[] = [];
  let ver: string;
  let isMap = false;
  for (const k of ks) {
    const attr = attrs[k];
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
    const field = (attr.field ? attr.field : k);
    const s = field.toLowerCase();
    if (s !== k) {
      mp[s] = k;
      isMap = true;
    }
  }
  const m: Metadata = {keys: ats, fields, version: ver};
  if (isMap) {
    m.map = mp;
  }
  if (bools.length > 0) {
    m.bools = bools;
  }
  return m;
}
export function attributes(attrs: string[], isKey?: boolean) {
  const ks: Attribute[] = [];
  for (const s of attrs) {
    const a: Attribute = {name: s, field: s, key: isKey};
    ks.push(a);
  }
  return ks;
}
export function param(i: number): string {
  return '?';
}
export function setValue<T, V>(obj: T, path: string, value: V): void {
  const paths = path.split('.');
  let o = obj;
  for (let i = 0; i < paths.length - 1; i++) {
    const p = paths[i];
    if (p in o) {
      o = o[p];
    } else {
      o[p] = {};
      o = o[p];
    }
  }
  o[paths[paths.length - 1]] = value;
}
const n = 'NaN';
export function toString(v: number): string {
  let x = '' + v;
  if (x === n) {
    x = 'null';
  }
  return x;
}
