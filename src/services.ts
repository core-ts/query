import {attributes, buildToDelete, buildToInsert, buildToUpdate, exist, metadata, select, version} from './build';
import {Attribute, Attributes, Statement, StringMap} from './metadata';
import {SearchResult} from './search';

export interface Filter {
  fields?: string[];
  sort?: string;
  q?: string;
}
export type Load<T, ID> = (id: ID, ctx?: any) => Promise<T|null>;
export type Get<T, ID> = Load<T, ID>;
export function useGet<T, ID>(
  q: <K>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any) => Promise<K[]>,
  table: string,
  attrs: Attributes|string[],
  param: (i: number) => string,
  fromDB?: (v: T) => T): Load<T, ID> {
  const l = new SqlLoader<T, ID>(q, table, attrs, param, fromDB);
  return l.load;
}
export const useLoad = useGet;
export class SqlLoader<T, ID> {
  primaryKeys: Attribute[];
  map?: StringMap;
  attributes: Attributes;
  bools?: Attribute[];
  constructor(
    public query: <K>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any) => Promise<K[]>,
    public table: string,
    attrs: Attributes|string[],
    public param: (i: number) => string,
    public fromDB?: (v: T) => T) {
    if (Array.isArray(attrs)) {
      this.primaryKeys = attributes(attrs);
      this.attributes = {} as any;
    } else {
      const m = metadata(attrs);
      this.attributes = attrs;
      this.primaryKeys = m.keys;
      this.map = m.map;
      this.bools = m.bools;
    }
    if (this.metadata) {
      this.metadata = this.metadata.bind(this);
    }
    this.all = this.all.bind(this);
    this.load = this.load.bind(this);
    this.exist = this.exist.bind(this);
  }
  metadata?(): Attributes|undefined {
    return this.attributes;
  }
  all(): Promise<T[]> {
    const sql = `select * from ${this.table}`;
    return this.query(sql, [], this.map);
  }
  load(id: ID, ctx?: any): Promise<T|null> {
    const stmt = select<ID>(id, this.table, this.primaryKeys, this.param);
    if (!stmt) {
      throw new Error('cannot build query by id');
    }
    const fn = this.fromDB;
    if (fn) {
      return this.query<T>(stmt.query, stmt.params, this.map, ctx).then(res => {
        if (!res || res.length === 0) {
          return null;
        } else {
          const obj = res[0];
          return fn(obj);
        }
      });
    } else {
      return this.query<T>(stmt.query, stmt.params, this.map).then(res => (!res || res.length === 0) ? null : res[0]);
    }
  }
  exist(id: ID, ctx?: any): Promise<boolean> {
    const field = (this.primaryKeys[0].column ? this.primaryKeys[0].column : this.primaryKeys[0].name);
    const stmt = exist<ID>(id, this.table, this.primaryKeys, this.param, field);
    if (!stmt) {
      throw new Error('cannot build query by id');
    }
    return this.query(stmt.query, stmt.params, this.map, undefined, ctx).then(res => (!res || res.length === 0) ? false : true);
  }
}
// tslint:disable-next-line:max-classes-per-file
export class QueryRepository<T, ID> {
  constructor(public db: DB, public table: string, public attrs: Attributes, public sort?: string, id?: string) {
    this.id = (id && id.length > 0 ? id : 'id');
    this.query = this.query.bind(this);
    const m = metadata(attrs);
    this.map = m.map;
    this.bools = m.bools;
  }
  id: string;
  map?: StringMap;
  bools?: Attribute[];
  query(ids: ID[]): Promise<T[]> {
    if (!ids || ids.length === 0) {
      return Promise.resolve([]);
    }
    const ps: string[] = [];
    const length = ids.length;
    for (let i = 1; i <= length; i++) {
      ps.push(this.db.param(i));
    }
    let sql = `select * from ${this.table} where ${this.id} in (${ps.join(',')})`;
    if (this.sort && this.sort.length > 0) {
      sql = sql + ' order by ' + this.sort;
    }
    return this.db.query<T>(sql, ids, this.map, this.bools);
  }
}
// tslint:disable-next-line:max-classes-per-file
export class SqlLoadRepository<T, K1, K2> {
  map?: StringMap;
  attributes: Attributes;
  bools?: Attribute[];
  id1Col: string;
  id2Col: string;
  constructor(
    public query: <K>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any) => Promise<K[]>,
    public table: string,
    attrs: Attributes,
    public param: (i: number) => string,
    public id1Field: string,
    public id2Field: string,
    public fromDB?: (v: T) => T,
    id1Col?: string,
    id2Col?: string) {

    const m = metadata(attrs);
    this.attributes = attrs;
    this.map = m.map;
    this.bools = m.bools;

    if (this.metadata) {
      this.metadata = this.metadata.bind(this);
    }
    this.all = this.all.bind(this);
    this.load = this.load.bind(this);
    this.exist = this.exist.bind(this);
    if (id1Col && id1Col.length > 0) {
      this.id1Col = id1Col;
    } else {
      const c = attrs[this.id1Field];
      if (c) {
        this.id1Col = (c.column && c.column.length > 0 ? c.column : this.id1Field);
      } else {
        this.id1Col = this.id1Field;
      }
    }
    if (id2Col && id2Col.length > 0) {
      this.id2Col = id2Col;
    } else {
      const c = attrs[this.id2Field];
      if (c) {
        this.id2Col = (c.column && c.column.length > 0 ? c.column : this.id2Field);
      } else {
        this.id2Col = this.id2Field;
      }
    }
  }
  metadata?(): Attributes|undefined {
    return this.attributes;
  }
  all(): Promise<T[]> {
    const sql = `select * from ${this.table}`;
    return this.query(sql, [], this.map);
  }
  load(id1: K1, id2: K2, ctx?: any): Promise<T|null> {
    return this.query<T>(`select * from ${this.table} where ${this.id1Col} = ${this.param(1)} and ${this.id2Col} = ${this.param(2)}`, [id1, id2], this.map, undefined, ctx).then(objs => {
      if (!objs || objs.length === 0) {
        return null;
      } else {
        const fn = this.fromDB;
        if (fn) {
          return fn(objs[0]);
        } else {
          return objs[0];
        }
      }
    });
  }
  exist(id1: K1, id2: K2, ctx?: any): Promise<boolean> {
    return this.query<T>(`select ${this.id1Col} from ${this.table} where ${this.id1Col} = ${this.param(1)} and ${this.id2Col} = ${this.param(2)}`, [id1, id2], undefined, undefined, ctx).then(objs => {
      return (objs && objs.length > 0 ? true : false);
    });
  }
}
// tslint:disable-next-line:max-classes-per-file
export class GenericRepository<T, K1, K2> extends SqlLoadRepository<T, K1, K2> {
  version?: string;
  exec: (sql: string, args?: any[], ctx?: any) => Promise<number>;
  execBatch: (statements: Statement[], firstSuccess?: boolean, ctx?: any) => Promise<number>;
  constructor(manager: Manager, table: string,
    attrs: Attributes,
    id1Field: string,
    id2Field: string,
    public toDB?: (v: T) => T,
    fromDB?: (v: T) => T,
    id1Col?: string,
    id2Col?: string) {
    super(manager.query, table, attrs, manager.param, id1Field, id2Field, fromDB, id1Col, id2Col);
    const x = version(attrs);
    this.exec = manager.exec;
    this.execBatch = manager.execBatch;
    if (x) {
      this.version = x.name;
    }
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.patch = this.patch.bind(this);
    this.delete = this.delete.bind(this);
  }
  create(obj: T, ctx?: any): Promise<number> {
    let obj2 = obj;
    if (this.toDB) {
      obj2 = this.toDB(obj);
    }
    const stmt = buildToInsert(obj2, this.table, this.attributes, this.param, this.version);
    if (stmt) {
      return this.exec(stmt.query, stmt.params, ctx).catch(err => {
        if (err && err.error === 'duplicate') {
          return 0;
        } else {
          throw err;
        }
      });
    } else {
      return Promise.resolve(0);
    }
  }
  update(obj: T, ctx?: any): Promise<number> {
    let obj2 = obj;
    if (this.toDB) {
      obj2 = this.toDB(obj);
    }
    const stmt = buildToUpdate(obj2, this.table, this.attributes, this.param, this.version);
    if (stmt) {
      return this.exec(stmt.query, stmt.params, ctx);
    } else {
      return Promise.resolve(0);
    }
  }
  patch(obj: Partial<T>, ctx?: any): Promise<number> {
    return this.update(obj as any, ctx);
  }
  delete(id1: K1, id2: K2, ctx?: any): Promise<number> {
    return this.exec(`delete from ${this.table} where ${this.id1Col} = ${this.param(1)} and ${this.id2Col} = ${this.param(2)}`, [id1, id2], ctx);
  }
}
// tslint:disable-next-line:max-classes-per-file
export class SqlSearchLoader<T, ID, S extends Filter> extends SqlLoader<T, ID> {
  constructor(
      protected find: (s: S, limit?: number, offset?: number|string, fields?: string[]) => Promise<SearchResult<T>>,
      query: <K>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any) => Promise<K[]>,
      table: string,
      attrs: Attributes|string[],
      param: (i: number) => string,
      fromDB?: (v: T) => T) {
    super(query, table, attrs, param, fromDB);
    this.search = this.search.bind(this);
  }
  search(s: S, limit?: number, offset?: number|string, fields?: string[]): Promise<SearchResult<T>> {
    return this.find(s, limit, offset, fields);
  }
}
export interface Manager {
  driver: string;
  param(i: number): string;
  exec(sql: string, args?: any[], ctx?: any): Promise<number>;
  execBatch(statements: Statement[], firstSuccess?: boolean, ctx?: any): Promise<number>;
  query<T>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any): Promise<T[]>;
}
export type DB  = Manager;
export interface ExtManager {
  driver: string;
  param(i: number): string;
  exec(sql: string, args?: any[], ctx?: any): Promise<number>;
  execBatch(statements: Statement[], firstSuccess?: boolean, ctx?: any): Promise<number>;
  query<T>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any): Promise<T[]>;
  queryOne<T>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any): Promise<T|null>;
  execScalar<T>(sql: string, args?: any[], ctx?: any): Promise<T>;
  count(sql: string, args?: any[], ctx?: any): Promise<number>;
}
export interface SimpleMap {
  [key: string]: string|number|boolean|Date;
}
export interface Logger {
  level: number;
  debug(msg: string, m?: SimpleMap, ctx?: any): void;
  info(msg: string, m?: SimpleMap, ctx?: any): void;
  error(msg: string, m?: SimpleMap, ctx?: any): void;
  isDebugEnabled(): boolean;
  isInfoEnabled(): boolean;
}
export function log(db: ExtManager, isLog: boolean|undefined|null, logger: Logger, q?: string, result?: string, r?: string, duration?: string): ExtManager {
  if (!isLog) {
    return db;
  }
  if (q !== undefined && q != null && q.length > 0) {
    if (!logger.isDebugEnabled()) {
      return db;
    }
    return new LogManager(db, logger.error, logger.debug, q, result, r, duration);
  }
  if (!logger.isInfoEnabled()) {
    return db;
  }
  return new LogManager(db, logger.error, logger.info, q, result, r, duration);
}
export function useLog(db: ExtManager, isLog: boolean|undefined|null, err: ((msg: string, m?: SimpleMap) => void)|undefined, lg?: (msg: string, m?: SimpleMap) => void, q?: string, result?: string, r?: string, duration?: string): ExtManager {
  if (!isLog) {
    return db;
  }
  if (err) {
    return new LogManager(db, err, lg, q, result, r, duration);
  }
  return db;
}
// tslint:disable-next-line:max-classes-per-file
export class LogManager implements ExtManager {
  constructor(public db: ExtManager, err: (msg: string, m?: SimpleMap) => void, lg?: (msg: string, m?: SimpleMap) => void, q?: string, result?: string, r?: string, duration?: string) {
    this.driver = db.driver;
    this.duration = (duration && duration.length > 0 ? duration : 'duration');
    this.sql = (q === undefined ? '' : q);
    this.return = (r !== undefined && r != null ? r : 'count');
    this.result = (result !== undefined && result != null ? result : '');
    // this.err = (er ? er : 'error');
    this.log = lg;
    this.error = err;
    this.param = this.param.bind(this);
    this.exec = this.exec.bind(this);
    this.execBatch = this.execBatch.bind(this);
    this.query = this.query.bind(this);
    this.queryOne = this.queryOne.bind(this);
    this.execScalar = this.execScalar.bind(this);
    this.count = this.count.bind(this);
  }
  log?: (msg: string, m?: SimpleMap, ctx?: any) => void;
  error: (msg: string, m?: SimpleMap, ctx?: any) => void;
  driver: string;
  duration: string;
  sql: string;
  return: string;
  result: string;
  // err: string;
  param(i: number): string {
    return this.db.param(i);
  }
  exec(sql: string, args?: any[], ctx?: any): Promise<number> {
    const t1 = new Date();
    return this.db.exec(sql, args, ctx).then(v => {
      setTimeout(() => {
        if (this.log) {
          const d = diff(t1);
          const obj: SimpleMap = {} ;
          if (this.sql.length > 0) {
            obj[this.sql] = getString(sql, args);
          }
          if (this.return.length > 0) {
            obj[this.return] = v;
          }
          obj[this.duration] = d;
          this.log('query', obj);
        }
      }, 0);
      return v;
    }).catch(er => {
      setTimeout(() => {
        const d = diff(t1);
        const obj: SimpleMap = {};
        if (this.sql.length > 0) {
          obj[this.sql] = getString(sql, args);
        }
        obj[this.duration] = d;
        this.error('error query: ' + buildString(er));
      }, 0);
      throw er;
    });
  }
  execBatch(statements: Statement[], firstSuccess?: boolean, ctx?: any): Promise<number> {
    const t1 = new Date();
    return this.db.execBatch(statements, firstSuccess, ctx).then(v => {
      setTimeout(() => {
        if (this.log) {
          const d = diff(t1);
          const obj: SimpleMap = {} ;
          if (this.sql.length > 0) {
            obj[this.sql] = JSON.stringify(statements);
          }
          if (this.return.length > 0) {
            obj[this.return] = v;
          }
          obj[this.duration] = d;
          this.log('exec batch', obj);
        }
      }, 0);
      return v;
    }).catch(er => {
      setTimeout(() => {
        const d = diff(t1);
        const obj: SimpleMap = {};
        if (this.sql.length > 0) {
          obj[this.sql] = JSON.stringify(statements);
        }
        obj[this.duration] = d;
        this.error('error exec batch: ' + buildString(er));
      }, 0);
      throw er;
    });
  }
  query<T>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any): Promise<T[]> {
    const t1 = new Date();
    return this.db.query<T>(sql, args, m, bools, ctx).then(v => {
      setTimeout(() => {
        if (this.log) {
          const d = diff(t1);
          const obj: SimpleMap = {} ;
          if (this.sql.length > 0) {
            obj[this.sql] = getString(sql, args);
          }
          if (this.result.length > 0) {
            if (v && v.length > 0) {
              obj[this.result] = JSON.stringify(v);
            }
          }
          if (this.return.length > 0) {
            obj[this.return] = v ? v.length : 0;
          }
          obj[this.duration] = d;
          this.log('query', obj);
        }
      }, 0);
      return v;
    }).catch(er => {
      setTimeout(() => {
        const d = diff(t1);
        const obj: SimpleMap = {};
        if (this.sql.length > 0) {
          obj[this.sql] = getString(sql, args);
        }
        obj[this.duration] = d;
        this.error('error query: ' + buildString(er));
      }, 0);
      throw er;
    });
  }
  queryOne<T>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any): Promise<T|null> {
    const t1 = new Date();
    return this.db.queryOne<T>(sql, args, m, bools, ctx).then(v => {
      setTimeout(() => {
        if (this.log) {
          const d = diff(t1);
          const obj: SimpleMap = {} ;
          if (this.sql.length > 0) {
            obj[this.sql] = getString(sql, args);
          }
          if (this.result.length > 0) {
            obj[this.result] = v ? JSON.stringify(v) : 'null';
          }
          if (this.return.length > 0) {
            obj[this.return] = v ? 1 : 0;
          }
          obj[this.duration] = d;
          this.log('query one', obj);
        }
      }, 0);
      return v;
    }).catch(er => {
      setTimeout(() => {
        const d = diff(t1);
        const obj: SimpleMap = {};
        if (this.sql.length > 0) {
          obj[this.sql] = getString(sql, args);
        }
        obj[this.duration] = d;
        this.error('error query one: ' + buildString(er));
      }, 0);
      throw er;
    });
  }
  execScalar<T>(sql: string, args?: any[], ctx?: any): Promise<T> {
    const t1 = new Date();
    return this.db.execScalar<T>(sql, args, ctx).then(v => {
      setTimeout(() => {
        if (this.log) {
          const d = diff(t1);
          const obj: SimpleMap = {} ;
          if (this.sql.length > 0) {
            obj[this.sql] = getString(sql, args);
          }
          if (this.result.length > 0) {
            obj[this.result] = v ? buildString(v) : 'null';
          }
          if (this.return.length > 0) {
            obj[this.return] = v ? 1 : 0;
          }
          obj[this.duration] = d;
          this.log('exec scalar', obj);
        }
      }, 0);
      return v;
    }).catch(er => {
      setTimeout(() => {
        const d = diff(t1);
        const obj: SimpleMap = {};
        if (this.sql.length > 0) {
          obj[this.sql] = getString(sql, args);
        }
        obj[this.duration] = d;
        this.error('error exec scalar: ' + buildString(er));
      }, 0);
      throw er;
    });
  }
  count(sql: string, args?: any[], ctx?: any): Promise<number> {
    const t1 = new Date();
    return this.db.count(sql, args).then(v => {
      setTimeout(() => {
        if (this.log) {
          const d = diff(t1);
          const obj: SimpleMap = {} ;
          if (this.sql.length > 0) {
            obj[this.sql] = getString(sql, args);
          }
          if (this.return.length > 0) {
            obj[this.return] = v;
          }
          obj[this.duration] = d;
          this.log('count', obj);
        }
      }, 0);
      return v;
    }).catch(er => {
      setTimeout(() => {
        const d = diff(t1);
        const obj: SimpleMap = {};
        if (this.sql.length > 0) {
          obj[this.sql] = getString(sql, args);
        }
        obj[this.duration] = d;
        this.error('error count: ' + buildString(er));
      }, 0);
      throw er;
    });
  }
}
function buildString(v: any): string {
  if (typeof v === 'string') {
    return v;
  } else {
    return JSON.stringify(v);
  }
}
function getString(sql: string, args?: any[]): string {
  if (args && args.length > 0) {
    return sql + ' ' + JSON.stringify(args);
  } else {
    return sql;
  }
}
export function diff(d1: Date): number {
  const d2 = new Date();
  return d2.getTime() - d1.getTime();
}
/*
const NS_PER_SEC = 1e9;
const NS_TO_MS = 1e6;
const getDurationInMilliseconds = (start: [number, number] | undefined) => {
  const diff = process.hrtime(start);
  return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;
};
*/
// tslint:disable-next-line:max-classes-per-file
export class SqlWriter<T, ID> extends SqlLoader<T, ID> {
  version?: string;
  exec: (sql: string, args?: any[], ctx?: any) => Promise<number>;
  execBatch: (statements: Statement[], firstSuccess?: boolean, ctx?: any) => Promise<number>;
  constructor(manager: Manager, table: string,
    attrs: Attributes,
    public toDB?: (v: T) => T,
    fromDB?: (v: T) => T) {
    super(manager.query, table, attrs, manager.param, fromDB);
    const x = version(attrs);
    this.exec = manager.exec;
    this.execBatch = manager.execBatch;
    if (x) {
      this.version = x.name;
    }
    this.create = this.create.bind(this);
    this.update = this.update.bind(this);
    this.patch = this.patch.bind(this);
    this.delete = this.delete.bind(this);
  }
  create(obj: T, ctx?: any): Promise<number> {
    let obj2 = obj;
    if (this.toDB) {
      obj2 = this.toDB(obj);
    }
    const stmt = buildToInsert(obj2, this.table, this.attributes, this.param, this.version);
    if (stmt) {
      return this.exec(stmt.query, stmt.params, ctx).catch(err => {
        if (err && err.error === 'duplicate') {
          return 0;
        } else {
          throw err;
        }
      });
    } else {
      return Promise.resolve(0);
    }
  }
  update(obj: T, ctx?: any): Promise<number> {
    let obj2 = obj;
    if (this.toDB) {
      obj2 = this.toDB(obj);
    }
    const stmt = buildToUpdate(obj2, this.table, this.attributes, this.param, this.version);
    if (stmt) {
      return this.exec(stmt.query, stmt.params, ctx);
    } else {
      return Promise.resolve(0);
    }
  }
  patch(obj: Partial<T>, ctx?: any): Promise<number> {
    return this.update(obj as any, ctx);
  }
  delete(id: ID, ctx?: any): Promise<number> {
    const stmt = buildToDelete<ID>(id, this.table, this.primaryKeys, this.param);
    if (stmt) {
      return this.exec(stmt.query, stmt.params, ctx);
    } else {
      return Promise.resolve(0);
    }
  }
}
// tslint:disable-next-line:max-classes-per-file
export class SqlSearchWriter<T, ID, S extends Filter> extends SqlWriter<T, ID> {
  constructor(
      protected find: (s: S, limit?: number, offset?: number|string, fields?: string[]) => Promise<SearchResult<T>>,
      manager: Manager,
      table: string,
      attrs: Attributes,
      toDB?: (v: T) => T,
      fromDB?: (v: T) => T) {
    super(manager, table, attrs, toDB, fromDB);
    this.search = this.search.bind(this);
  }
  search(s: S, limit?: number, offset?: number|string, fields?: string[]): Promise<SearchResult<T>> {
    return this.find(s, limit, offset, fields);
  }
}
