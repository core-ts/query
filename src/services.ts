import {attributes, buildToDelete, buildToInsert, buildToUpdate, exist, metadata, select, version} from './build';
import {Attribute, Attributes, Statement, StringMap} from './metadata';
import {SearchResult} from './search';

export interface SearchModel {
  fields?: string[];
  sort?: string;
  q?: string;
}
export class SqlLoader<T, ID> {
  primaryKeys: Attribute[];
  map?: StringMap;
  attributes: Attributes;
  bools?: Attribute[];
  constructor(public table: string,
    public query: (sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any) => Promise<T[]>,
    attrs: Attributes|string[],
    protected param: (i: number) => string,
    protected fromDB?: (v: T) => T) {
    if (Array.isArray(attrs)) {
      this.primaryKeys = attributes(attrs);
    } else {
      const m = metadata(attrs);
      this.attributes = attrs;
      this.primaryKeys = m.keys;
      this.map = m.map;
      this.bools = m.bools;
    }
    this.metadata = this.metadata.bind(this);
    this.all = this.all.bind(this);
    this.load = this.load.bind(this);
    this.exist = this.exist.bind(this);
  }
  metadata(): Attributes {
    return this.attributes;
  }
  all(): Promise<T[]> {
    const sql = `select * from ${this.table}`;
    return this.query(sql, [], this.map);
  }
  load(id: ID, ctx?: any): Promise<T> {
    const stmt = select<ID>(id, this.table, this.primaryKeys, this.param);
    if (this.fromDB) {
      return this.query(stmt.query, stmt.params, this.map, ctx).then(res => {
        if (!res || res.length === 0) {
          return null;
        } else {
          const obj = res[0];
          return this.fromDB(obj);
        }
      });
    } else {
      return this.query(stmt.query, stmt.params, this.map).then(res => (!res || res.length === 0) ? null : res[0]);
    }
  }
  exist(id: ID, ctx?: any): Promise<boolean> {
    const field = (this.primaryKeys[0].field ? this.primaryKeys[0].field : this.primaryKeys[0].name);
    const stmt = exist<ID>(id, this.table, this.primaryKeys, this.param, field);
    return this.query(stmt.query, stmt.params, this.map, undefined, ctx).then(res => (!res || res.length === 0) ? false : true);
  }
}
export class SqlSearchLoader<T, ID, S extends SearchModel> extends SqlLoader<T, ID> {
  constructor(
      protected find: (s: S, limit?: number, offset?: number|string, fields?: string[]) => Promise<SearchResult<T>>,
      table: string,
      query: (sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any) => Promise<T[]>,
      attrs: Attributes|string[],
      param: (i: number) => string,
      fromDB?: (v: T) => T) {
    super(table, query, attrs, param, fromDB);
    this.search = this.search.bind(this);
  }
  search(s: S, limit?: number, offset?: number|string, fields?: string[]): Promise<SearchResult<T>> {
    return this.find(s, limit, offset, fields);
  }
}
export interface Manager {
  exec(sql: string, args?: any[], ctx?: any): Promise<number>;
  execBatch(statements: Statement[], firstSuccess?: boolean, ctx?: any): Promise<number>;
  query<T>(sql: string, args?: any[], m?: StringMap, fields?: string[], ctx?: any): Promise<T[]>;
}
export function createSqlWriter<T, ID>(table: string,
    manager: Manager,
    attrs: Attributes,
    buildParam: (i: number) => string,
    toDB?: (v: T) => T,
    fromDB?: (v: T) => T) {
  const writer = new SqlWriter<T, ID>(table, manager.query, manager.exec, attrs, buildParam, toDB, fromDB, manager.execBatch);
  return writer;
}

export class SqlWriter<T, ID> extends SqlLoader<T, ID> {
  version?: string;
  constructor(table: string,
    query: (sql: string, args?: any[], m?: StringMap, ctx?: any) => Promise<T[]>,
    public exec: (sql: string, args?: any[], ctx?: any) => Promise<number>,
    attrs: Attributes,
    buildParam: (i: number) => string,
    protected toDB?: (v: T) => T,
    fromDB?: (v: T) => T,
    public execBatch?: (statements: Statement[], firstSuccess?: boolean, ctx?: any) => Promise<number>) {
    super(table, query, attrs, buildParam, fromDB);
    const x = version(attrs);
    if (x) {
      this.version = x.name;
    }
    this.insert = this.insert.bind(this);
    this.update = this.update.bind(this);
    this.patch = this.patch.bind(this);
    this.delete = this.delete.bind(this);
  }
  insert(obj: T, ctx?: any): Promise<number> {
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
  patch(obj: T, ctx?: any): Promise<number> {
    return this.update(obj, ctx);
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
export class SqlSearchWriter<T, ID, S extends SearchModel> extends SqlWriter<T, ID> {
  constructor(
      protected find: (s: S, limit?: number, offset?: number|string, fields?: string[]) => Promise<SearchResult<T>>,
      table: string,
      query: (sql: string, args?: any[], m?: StringMap, ctx?: any) => Promise<T[]>,
      exec: (sql: string, args?: any[], ctx?: any) => Promise<number>,
      attrs: Attributes,
      buildParam: (i: number) => string,
      toDB?: (v: T) => T,
      fromDB?: (v: T) => T,
      execBatch?: (statements: Statement[], firstSuccess?: boolean, ctx?: any) => Promise<number>) {
    super(table, query, exec, attrs, buildParam, toDB, fromDB, execBatch);
    this.search = this.search.bind(this);
  }
  search(s: S, limit?: number, offset?: number|string, fields?: string[]): Promise<SearchResult<T>> {
    return this.find(s, limit, offset, fields);
  }
}
export function createSqlSearchWriter<T, ID, S extends SearchModel>(
  find: (s: S, limit?: number, offset?: number|string, fields?: string[]) => Promise<SearchResult<T>>,
  table: string,
  manager: Manager,
  attrs: Attributes,
  buildParam: (i: number) => string,
  toDB?: (v: T) => T,
  fromDB?: (v: T) => T) {
const writer = new SqlSearchWriter<T, ID, S>(find, table, manager.query, manager.exec, attrs, buildParam, toDB, fromDB, manager.execBatch);
return writer;
}
