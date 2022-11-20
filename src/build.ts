import {Attribute, Attributes, Statement, StringMap} from './metadata';

// tslint:disable-next-line:class-name
export class resource {
  static string?: boolean;
  static ignoreDatetime?: boolean;
}
export function params(length: number, p: (i: number) => string, from?: number): string[] {
  if (from === undefined || from == null) {
    from = 0;
  }
  const ps: string[] = [];
  for (let i = 1; i <= length; i++) {
    ps.push(p(i + from));
  }
  return ps;
}
export function select<T>(obj: T, table: string, ks: Attribute[], buildParam: (i: number) => string, i?: number): Statement|undefined {
  if (!i) {
    i = 1;
  }
  if (ks.length === 1) {
    const field = (ks[0].column ? ks[0].column : ks[0].name);
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
      if (k.name) {
        const field = (k.column ? k.column : k.name);
        cols.push(`${field} = ${buildParam(i++)}`);
        args.push((obj as any)[k.name]);
      }
    }
    const query = `select * from ${table} where ${cols.join(' and ')}`;
    return { query, params: args };
  } else {
    return undefined;
  }
}
export function exist<T>(obj: T, table: string, ks: Attribute[], buildParam: (i: number) => string, col?: string, i?: number): Statement|undefined {
  if (!i) {
    i = 1;
  }
  if (!col || col.length === 0) {
    col = '*';
  }
  if (ks.length === 1) {
    const field = (ks[0].column ? ks[0].column : ks[0].name);
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
      if (k.name) {
        const field = (k.column ? k.column : k.name);
        cols.push(`${field} = ${buildParam(i++)}`);
        args.push((obj as any)[k.name]);
      }
    }
    const query = `select * from ${table} where ${cols.join(' and ')}`;
    return { query, params: args };
  } else {
    return undefined;
  }
}
export function buildToDelete<T>(obj: T, table: string, ks: Attribute[], buildParam: (i: number) => string, i?: number): Statement|undefined {
  if (!i) {
    i = 1;
  }
  if (ks.length === 1) {
    const field = (ks[0].column ? ks[0].column : ks[0].name);
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
      if (k.name) {
        const field = (k.column ? k.column : k.name);
        cols.push(`${field} = ${buildParam(i++)}`);
        args.push((obj as any)[k.name]);
      }
    }
    const query = `delete from ${table} where ${cols.join(' and ')}`;
    return { query, params: args };
  } else {
    return undefined;
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
export function buildToInsert<T>(obj: T, table: string, attrs: Attributes, buildParam: (i: number) => string, ver?: string, i?: number): Statement|undefined {
  if (!i) {
    i = 1;
  }
  const o: any = obj;
  const ks = Object.keys(attrs);
  const cols: string[] = [];
  const values: string[] = [];
  const args: any[] = [];
  let isVersion = false;
  for (const k of ks) {
    let v = o[k];
    const attr = attrs[k];
    if (attr && !attr.ignored && !attr.noinsert) {
      if (v === undefined || v == null) {
        v = attr.default;
      }
      if (v !== undefined && v != null) {
        const field = (attr.column ? attr.column : k);
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
            if (resource.ignoreDatetime && typeof v === 'string' && attr.type === 'datetime') {
              values.push(`'${v}'`);
            } else {
              const p = buildParam(i++);
              values.push(p);
              args.push(v);
            }
          }
        }
      }
    }
  }
  if (!isVersion && ver && ver.length > 0) {
    const attr = attrs[ver];
    const field = (attr.column ? attr.column : ver);
    cols.push(field);
    values.push(`${1}`);
  }
  if (cols.length === 0) {
    return undefined;
  } else {
    const query = `insert into ${table}(${cols.join(',')})values(${values.join(',')})`;
    return { query, params: args };
  }
}
export function insertBatch<T>(exec: (sql: string, args?: any[]) => Promise<number>, objs: T[], table: string, attrs: Attributes, buildParam: ((i: number) => string)|boolean, ver?: string, i?: number): Promise<number> {
  const stm = buildToInsertBatch(objs, table, attrs, buildParam, ver, i);
  if (!stm) {
    return Promise.resolve(0);
  } else {
    return exec(stm.query, stm.params);
  }
}
function buildOracleParam(i: number): string {
  return ':' + i;
}
export function buildToInsertBatch<T>(objs: T[], table: string, attrs: Attributes, buildParam: ((i: number) => string) | boolean, ver?: string, i?: number): Statement|undefined {
  if (!i) {
    i = 1;
  }
  const ks = Object.keys(attrs);
  const args: any[] = [];
  if (buildParam && typeof buildParam === 'function') {
    const cols: string[] = [];
    const rows: string[] = [];
    for (const k of ks) {
      const attr = attrs[k];
      if (attr && !attr.ignored && !attr.noinsert) {
        const field = (attr.column ? attr.column : k);
        cols.push(field);
      }
    }
    for (const obj of objs) {
      const values: string[] = [];
      for (const k of ks) {
        const attr = attrs[k];
        if (attr && !attr.ignored && !attr.noinsert) {
          let v = (obj as any)[k];
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
            if (resource.ignoreDatetime && typeof v === 'string' && attr.type === 'datetime') {
              values.push(`'${v}'`);
            } else {
              const p = buildParam(i++);
              values.push(p);
              args.push(v);
            }
          }
        }
      }
      rows.push(`(${values.join(',')})`);
    }
    const query = `insert into ${table}(${cols.join(',')})values ${rows.join(',')}`;
    return { query, params: args };
  } else {
    let notSkipInvalid = false;
    if (buildParam === true) {
      notSkipInvalid = true;
    }
    const rows: string[] = [];
    for (const obj of objs) {
      const cols: string[] = [];
      const values: string[] = [];
      let isVersion = false;
      for (const k of ks) {
        let v = (obj as any)[k];
        const attr = attrs[k];
        if (attr && !attr.ignored && !attr.noinsert) {
          if (v === undefined || v == null) {
            v = attr.default;
          }
          if (v !== undefined && v != null) {
            const field = (attr.column ? attr.column : k);
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
                  const p = buildOracleParam(i++);
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
                const p = buildOracleParam(i++);
                values.push(p);
                args.push(v);
              }
            }
          }
        }
      }
      if (!isVersion && ver && ver.length > 0) {
        const attr = attrs[ver];
        const field = (attr.column ? attr.column : ver);
        cols.push(field);
        values.push(`${1}`);
      }
      if (cols.length === 0) {
        if (notSkipInvalid) {
          return undefined;
        }
      } else {
        const s = `into ${table}(${cols.join(',')})values(${values.join(',')})`;
        rows.push(s);
      }
    }
    if (rows.length === 0) {
      return undefined;
    }
    const query = `insert all ${rows.join(' ')} select * from dual`;
    return { query, params: args };
  }
}
export function update<T>(exec: (sql: string, args?: any[]) => Promise<number>, obj: T, table: string, attrs: Attributes, buildParam: (i: number) => string, ver?: string, i?: number): Promise<number> {
  const stm = buildToUpdate(obj, table, attrs, buildParam, ver, i);
  if (!stm) {
    return Promise.resolve(0);
  } else {
    return exec(stm.query, stm.params);
  }
}
export function buildToUpdate<T>(obj: T, table: string, attrs: Attributes, buildParam: (i: number) => string, ver?: string, i?: number): Statement|undefined {
  if (!i) {
    i = 1;
  }
  const o: any = obj;
  const ks = Object.keys(attrs);
  const pks: Attribute[] = [];
  const colSet: string[] = [];
  const colQuery: string[] = [];
  const args: any[] = [];
  for (const k of ks) {
    const v = o[k];
    if (v !== undefined) {
      const attr = attrs[k];
      attr.name = k;
      if (attr && !attr.ignored && k !== ver) {
        if (attr.key) {
          pks.push(attr);
        } else if (!attr.noupdate) {
          const field = (attr.column ? attr.column : k);
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
            if (resource.ignoreDatetime && typeof v === 'string' && attr.type === 'datetime') {
              x = `'${v}'`;
            } else {
              x = buildParam(i++);
              args.push(v);
            }
          }
          colSet.push(`${field}=${x}`);
        }
      }
    }
  }
  for (const pk of pks) {
    const na = (pk.name ? pk.name : '');
    const v = o[na];
    if (!v) {
      return undefined;
    } else {
      const attr = attrs[na];
      const field = (attr.column ? attr.column : pk.name);
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
    const v = o[ver];
    if (typeof v === 'number' && !isNaN(v)) {
      const attr = attrs[ver];
      if (attr) {
        const field = (attr.column ? attr.column : ver);
        colSet.push(`${field}=${(1 + v)}`);
        colQuery.push(`${field}=${v}`);
      }
    }
  }
  if (colSet.length === 0 || colQuery.length === 0) {
    return undefined;
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
export function buildToUpdateBatch<T>(objs: T[], table: string, attrs: Attributes, buildParam: (i: number) => string, notSkipInvalid?: boolean): Statement[]|undefined {
  const sts: Statement[] = [];
  const meta = metadata(attrs);
  if (!meta.keys || meta.keys.length === 0) {
    return undefined;
  }
  for (const obj of objs) {
    const o: any = obj;
    let i = 1;
    const ks = Object.keys(o);
    const colSet: string[] = [];
    const colQuery: string[] = [];
    const args: any[] = [];
    for (const k of ks) {
      const v = o[k];
      if (v !== undefined) {
        const attr = attrs[k];
        attr.name = k;
        if (attr && !attr.ignored && !attr.key && !attr.version && !attr.noupdate) {
          const field = (attr.column ? attr.column : k);
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
      const na = (pk.name ? pk.name : '');
      const v = o[na];
      if (!v) {
        valid = false;
      } else {
        const attr = attrs[na];
        const field = (attr.column ? attr.column : pk.name);
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
        return undefined;
      }
    } else {
      const ver = meta.version;
      if (ver && ver.length > 0) {
        const v = o[ver];
        if (typeof v === 'number' && !isNaN(v)) {
          const attr = attrs[ver];
          if (attr) {
            const field = (attr.column ? attr.column : ver);
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
export function version(attrs: Attributes): Attribute|undefined {
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
export function key(attrs: Attributes): Attribute|undefined {
  const ks = Object.keys(attrs);
  for (const k of ks) {
    const attr = attrs[k];
    attr.name = k;
    if (attr.key) {
      return attr;
    }
  }
  return undefined;
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
    const field = (attr.column ? attr.column : k);
    const s = field.toLowerCase();
    if (s !== k) {
      mp[s] = k;
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
  let isMap = false;
  const m: Metadata = {keys: ats, fields};
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
      m.version = k;
    }
    const field = (attr.column ? attr.column : k);
    const s = field.toLowerCase();
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
export function attributes(attrs: string[], isKey?: boolean) {
  const ks: Attribute[] = [];
  for (const s of attrs) {
    const a: Attribute = {name: s, column: s, key: isKey};
    ks.push(a);
  }
  return ks;
}
export function param(i: number): string {
  return '?';
}
export function setValue<T, V>(obj: T, path: string, value: V): void {
  const paths = path.split('.');
  let o: any = obj;
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
