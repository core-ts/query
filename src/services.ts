import { attributes, buildToDelete, buildToInsert, buildToUpdate, exist, metadata, select, version } from "./build"
import { Attribute, Attributes, Statement, StringMap } from "./metadata"
import { LikeType } from "./query"
import { SearchBuilder } from "./SearchBuilder"
// import { SearchResult } from "./search"

export interface Filter {
  fields?: string[]
  sort?: string
  q?: string
}
export type Load<T, ID> = (id: ID, ctx?: any) => Promise<T | null>
export type Get<T, ID> = Load<T, ID>
export function useGet<T, ID>(
  q: <K>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any) => Promise<K[]>,
  table: string,
  attrs: Attributes | string[],
  param: (i: number) => string,
  fromDB?: (v: T) => T,
): Load<T, ID> {
  const l = new SqlLoader<T, ID>(q, table, attrs, param, fromDB)
  return l.load
}
export const useLoad = useGet
export class SqlLoader<T, ID> {
  primaryKeys: Attribute[]
  map?: StringMap
  attributes: Attributes
  bools?: Attribute[]
  constructor(
    protected query: <K>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any) => Promise<K[]>,
    protected table: string,
    attrs: Attributes | string[],
    protected param: (i: number) => string,
    protected fromDB?: (v: T) => T,
  ) {
    if (Array.isArray(attrs)) {
      this.primaryKeys = attributes(attrs)
      this.attributes = {} as any
    } else {
      const m = metadata(attrs)
      this.attributes = attrs
      this.primaryKeys = m.keys
      this.map = m.map
      this.bools = m.bools
    }
    if (this.metadata) {
      this.metadata = this.metadata.bind(this)
    }
    this.all = this.all.bind(this)
    this.load = this.load.bind(this)
    this.exist = this.exist.bind(this)
  }
  metadata?(): Attributes | undefined {
    return this.attributes
  }
  all(): Promise<T[]> {
    const sql = `select * from ${this.table}`
    return this.query(sql, [], this.map)
  }
  load(id: ID, ctx?: any): Promise<T | null> {
    const stmt = select<ID>(id, this.table, this.primaryKeys, this.param)
    if (!stmt) {
      throw new Error("cannot build query by id")
    }
    const fn = this.fromDB
    if (fn) {
      return this.query<T>(stmt.query, stmt.params, this.map, ctx).then((res) => {
        if (!res || res.length === 0) {
          return null
        } else {
          const obj = res[0]
          return fn(obj)
        }
      })
    } else {
      return this.query<T>(stmt.query, stmt.params, this.map).then((res) => (!res || res.length === 0 ? null : res[0]))
    }
  }
  exist(id: ID, ctx?: any): Promise<boolean> {
    const field = this.primaryKeys[0].column ? this.primaryKeys[0].column : this.primaryKeys[0].name
    const stmt = exist<ID>(id, this.table, this.primaryKeys, this.param, field)
    if (!stmt) {
      throw new Error("cannot build query by id")
    }
    return this.query(stmt.query, stmt.params, this.map, undefined, ctx).then((res) => (!res || res.length === 0 ? false : true))
  }
}
// tslint:disable-next-line:max-classes-per-file
export class QueryRepository<T, ID> {
  constructor(public db: DB, public table: string, public attrs: Attributes, public sort?: string, id?: string) {
    this.id = id && id.length > 0 ? id : "id"
    this.query = this.query.bind(this)
    const m = metadata(attrs)
    this.map = m.map
    this.bools = m.bools
  }
  id: string
  map?: StringMap
  bools?: Attribute[]
  query(ids: ID[]): Promise<T[]> {
    if (!ids || ids.length === 0) {
      return Promise.resolve([])
    }
    const ps: string[] = []
    const length = ids.length
    for (let i = 1; i <= length; i++) {
      ps.push(this.db.param(i))
    }
    let sql = `select * from ${this.table} where ${this.id} in (${ps.join(",")})`
    if (this.sort && this.sort.length > 0) {
      sql = sql + " order by " + this.sort
    }
    return this.db.query<T>(sql, ids, this.map, this.bools)
  }
}

export interface DB {
  driver: string
  param(i: number): string
  exec(sql: string, args?: any[], ctx?: any): Promise<number>
  execBatch(statements: Statement[], firstSuccess?: boolean, ctx?: any): Promise<number>
  query<T>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any): Promise<T[]>
}
export type Manager = DB
export interface FullDB {
  driver: string
  param(i: number): string
  exec(sql: string, args?: any[], ctx?: any): Promise<number>
  execBatch(statements: Statement[], firstSuccess?: boolean, ctx?: any): Promise<number>
  query<T>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any): Promise<T[]>
  queryOne<T>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any): Promise<T | null>
  execScalar<T>(sql: string, args?: any[], ctx?: any): Promise<T>
  count(sql: string, args?: any[], ctx?: any): Promise<number>
}
export type ExtManager = FullDB
export interface SimpleMap {
  [key: string]: string | number | boolean | Date
}
export interface Logger {
  level: number
  debug(msg: string, m?: SimpleMap, ctx?: any): void
  info(msg: string, m?: SimpleMap, ctx?: any): void
  error(msg: string, m?: SimpleMap, ctx?: any): void
  isDebugEnabled(): boolean
  isInfoEnabled(): boolean
}
export function log(db: ExtManager, isLog: boolean | undefined | null, logger: Logger, q?: string, result?: string, r?: string, duration?: string): ExtManager {
  if (!isLog) {
    return db
  }
  if (q !== undefined && q != null && q.length > 0) {
    if (!logger.isDebugEnabled()) {
      return db
    }
    return new LogManager(db, logger.error, logger.debug, q, result, r, duration)
  }
  if (!logger.isInfoEnabled()) {
    return db
  }
  return new LogManager(db, logger.error, logger.info, q, result, r, duration)
}
export function useLog(
  db: ExtManager,
  isLog: boolean | undefined | null,
  err: ((msg: string, m?: SimpleMap) => void) | undefined,
  lg?: (msg: string, m?: SimpleMap) => void,
  q?: string,
  result?: string,
  r?: string,
  duration?: string,
): ExtManager {
  if (!isLog) {
    return db
  }
  if (err) {
    return new LogManager(db, err, lg, q, result, r, duration)
  }
  return db
}
// tslint:disable-next-line:max-classes-per-file
export class LogManager implements ExtManager {
  constructor(
    public db: ExtManager,
    err: (msg: string, m?: SimpleMap) => void,
    lg?: (msg: string, m?: SimpleMap) => void,
    q?: string,
    result?: string,
    r?: string,
    duration?: string,
  ) {
    this.driver = db.driver
    this.duration = duration && duration.length > 0 ? duration : "duration"
    this.sql = q === undefined ? "" : q
    this.return = r !== undefined && r != null ? r : "count"
    this.result = result !== undefined && result != null ? result : ""
    // this.err = (er ? er : 'error');
    this.log = lg
    this.error = err
    this.param = this.param.bind(this)
    this.exec = this.exec.bind(this)
    this.execBatch = this.execBatch.bind(this)
    this.query = this.query.bind(this)
    this.queryOne = this.queryOne.bind(this)
    this.execScalar = this.execScalar.bind(this)
    this.count = this.count.bind(this)
  }
  log?: (msg: string, m?: SimpleMap, ctx?: any) => void
  error: (msg: string, m?: SimpleMap, ctx?: any) => void
  driver: string
  duration: string
  sql: string
  return: string
  result: string
  // err: string;
  param(i: number): string {
    return this.db.param(i)
  }
  exec(sql: string, args?: any[], ctx?: any): Promise<number> {
    const t1 = new Date()
    return this.db
      .exec(sql, args, ctx)
      .then((v) => {
        setTimeout(() => {
          if (this.log) {
            const d = diff(t1)
            const obj: SimpleMap = {}
            if (this.sql.length > 0) {
              obj[this.sql] = getString(sql, args)
            }
            if (this.return.length > 0) {
              obj[this.return] = v
            }
            obj[this.duration] = d
            this.log("query", obj)
          }
        }, 0)
        return v
      })
      .catch((er) => {
        setTimeout(() => {
          const d = diff(t1)
          const obj: SimpleMap = {}
          if (this.sql.length > 0) {
            obj[this.sql] = getString(sql, args)
          }
          obj[this.duration] = d
          this.error("error query: " + buildString(er))
        }, 0)
        throw er
      })
  }
  execBatch(statements: Statement[], firstSuccess?: boolean, ctx?: any): Promise<number> {
    const t1 = new Date()
    return this.db
      .execBatch(statements, firstSuccess, ctx)
      .then((v) => {
        setTimeout(() => {
          if (this.log) {
            const d = diff(t1)
            const obj: SimpleMap = {}
            if (this.sql.length > 0) {
              obj[this.sql] = JSON.stringify(statements)
            }
            if (this.return.length > 0) {
              obj[this.return] = v
            }
            obj[this.duration] = d
            this.log("exec batch", obj)
          }
        }, 0)
        return v
      })
      .catch((er) => {
        setTimeout(() => {
          const d = diff(t1)
          const obj: SimpleMap = {}
          if (this.sql.length > 0) {
            obj[this.sql] = JSON.stringify(statements)
          }
          obj[this.duration] = d
          this.error("error exec batch: " + buildString(er))
        }, 0)
        throw er
      })
  }
  query<T>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any): Promise<T[]> {
    const t1 = new Date()
    return this.db
      .query<T>(sql, args, m, bools, ctx)
      .then((v) => {
        setTimeout(() => {
          if (this.log) {
            const d = diff(t1)
            const obj: SimpleMap = {}
            if (this.sql.length > 0) {
              obj[this.sql] = getString(sql, args)
            }
            if (this.result.length > 0) {
              if (v && v.length > 0) {
                obj[this.result] = JSON.stringify(v)
              }
            }
            if (this.return.length > 0) {
              obj[this.return] = v ? v.length : 0
            }
            obj[this.duration] = d
            this.log("query", obj)
          }
        }, 0)
        return v
      })
      .catch((er) => {
        setTimeout(() => {
          const d = diff(t1)
          const obj: SimpleMap = {}
          if (this.sql.length > 0) {
            obj[this.sql] = getString(sql, args)
          }
          obj[this.duration] = d
          this.error("error query: " + buildString(er))
        }, 0)
        throw er
      })
  }
  queryOne<T>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any): Promise<T | null> {
    const t1 = new Date()
    return this.db
      .queryOne<T>(sql, args, m, bools, ctx)
      .then((v) => {
        setTimeout(() => {
          if (this.log) {
            const d = diff(t1)
            const obj: SimpleMap = {}
            if (this.sql.length > 0) {
              obj[this.sql] = getString(sql, args)
            }
            if (this.result.length > 0) {
              obj[this.result] = v ? JSON.stringify(v) : "null"
            }
            if (this.return.length > 0) {
              obj[this.return] = v ? 1 : 0
            }
            obj[this.duration] = d
            this.log("query one", obj)
          }
        }, 0)
        return v
      })
      .catch((er) => {
        setTimeout(() => {
          const d = diff(t1)
          const obj: SimpleMap = {}
          if (this.sql.length > 0) {
            obj[this.sql] = getString(sql, args)
          }
          obj[this.duration] = d
          this.error("error query one: " + buildString(er))
        }, 0)
        throw er
      })
  }
  execScalar<T>(sql: string, args?: any[], ctx?: any): Promise<T> {
    const t1 = new Date()
    return this.db
      .execScalar<T>(sql, args, ctx)
      .then((v) => {
        setTimeout(() => {
          if (this.log) {
            const d = diff(t1)
            const obj: SimpleMap = {}
            if (this.sql.length > 0) {
              obj[this.sql] = getString(sql, args)
            }
            if (this.result.length > 0) {
              obj[this.result] = v ? buildString(v) : "null"
            }
            if (this.return.length > 0) {
              obj[this.return] = v ? 1 : 0
            }
            obj[this.duration] = d
            this.log("exec scalar", obj)
          }
        }, 0)
        return v
      })
      .catch((er) => {
        setTimeout(() => {
          const d = diff(t1)
          const obj: SimpleMap = {}
          if (this.sql.length > 0) {
            obj[this.sql] = getString(sql, args)
          }
          obj[this.duration] = d
          this.error("error exec scalar: " + buildString(er))
        }, 0)
        throw er
      })
  }
  count(sql: string, args?: any[], ctx?: any): Promise<number> {
    const t1 = new Date()
    return this.db
      .count(sql, args)
      .then((v) => {
        setTimeout(() => {
          if (this.log) {
            const d = diff(t1)
            const obj: SimpleMap = {}
            if (this.sql.length > 0) {
              obj[this.sql] = getString(sql, args)
            }
            if (this.return.length > 0) {
              obj[this.return] = v
            }
            obj[this.duration] = d
            this.log("count", obj)
          }
        }, 0)
        return v
      })
      .catch((er) => {
        setTimeout(() => {
          const d = diff(t1)
          const obj: SimpleMap = {}
          if (this.sql.length > 0) {
            obj[this.sql] = getString(sql, args)
          }
          obj[this.duration] = d
          this.error("error count: " + buildString(er))
        }, 0)
        throw er
      })
  }
}
function buildString(v: any): string {
  if (typeof v === "string") {
    return v
  } else {
    return JSON.stringify(v)
  }
}
function getString(sql: string, args?: any[]): string {
  if (args && args.length > 0) {
    return sql + " " + JSON.stringify(args)
  } else {
    return sql
  }
}
export function diff(d1: Date): number {
  const d2 = new Date()
  return d2.getTime() - d1.getTime()
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
export class SqlWriter<T> {
  protected version?: string
  constructor(protected exec: (sql: string, args?: any[], ctx?: any) => Promise<number>, protected param: (i: number) => string, protected table: string, protected attributes: Attributes, public toDB?: (v: T) => T) {
    const x = version(attributes)
    if (x) {
      this.version = x.name
    }
    this.create = this.create.bind(this)
    this.update = this.update.bind(this)
    this.patch = this.patch.bind(this)
  }
  create(obj: T, ctx?: any): Promise<number> {
    let obj2 = obj
    if (this.toDB) {
      obj2 = this.toDB(obj)
    }
    const stmt = buildToInsert(obj2, this.table, this.attributes, this.param, this.version)
    if (stmt.query.length > 0) {
      return this.exec(stmt.query, stmt.params, ctx).catch((err) => {
        if (err && err.error === "duplicate") {
          return 0
        } else {
          throw err
        }
      })
    } else {
      return Promise.resolve(0)
    }
  }
  update(obj: T, ctx?: any): Promise<number> {
    let obj2 = obj
    if (this.toDB) {
      obj2 = this.toDB(obj)
    }
    const stmt = buildToUpdate(obj2, this.table, this.attributes, this.param, this.version)
    if (stmt.query.length > 0) {
      return this.exec(stmt.query, stmt.params, ctx)
    } else {
      return Promise.resolve(0)
    }
  }
  patch(obj: Partial<T>, ctx?: any): Promise<number> {
    return this.update(obj as any, ctx)
  }
}
export class CRUDRepository<T, ID> extends SqlWriter<T> {
  protected primaryKeys: Attribute[]
  protected map?: StringMap
  protected bools?: Attribute[]
  protected query: <K>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any) => Promise<K[]>
  constructor(db: DB, table: string, attributes: Attributes, toDB?: (v: T) => T, protected fromDB?: (v: T) => T) {
    super(db.exec, db.param, table, attributes, toDB)
    this.query = db.query
    const m = metadata(attributes)
    this.primaryKeys = m.keys
    this.map = m.map
    this.bools = m.bools
    this.metadata = this.metadata.bind(this)
    this.all = this.all.bind(this)
    this.load = this.load.bind(this)
    this.exist = this.exist.bind(this)
    this.delete = this.delete.bind(this)
  }
  metadata(): Attributes {
    return this.attributes
  }
  all(): Promise<T[]> {
    const sql = `select * from ${this.table}`
    return this.query(sql, [], this.map)
  }
  load(id: ID, ctx?: any): Promise<T | null> {
    const stmt = select<ID>(id, this.table, this.primaryKeys, this.param)
    if (stmt.query.length === 0) {
      throw new Error("cannot build query by id")
    }
    const fn = this.fromDB
    if (fn) {
      return this.query<T>(stmt.query, stmt.params, this.map, ctx).then((res) => {
        if (!res || res.length === 0) {
          return null
        } else {
          const obj = res[0]
          return fn(obj)
        }
      })
    } else {
      return this.query<T>(stmt.query, stmt.params, this.map).then((res) => (!res || res.length === 0 ? null : res[0]))
    }
  }
  exist(id: ID, ctx?: any): Promise<boolean> {
    const field = this.primaryKeys[0].column ? this.primaryKeys[0].column : this.primaryKeys[0].name
    const stmt = exist<ID>(id, this.table, this.primaryKeys, this.param, field)
    if (stmt.query.length === 0) {
      throw new Error("cannot build query by id")
    }
    return this.query(stmt.query, stmt.params, this.map, undefined, ctx).then((res) => (!res || res.length === 0 ? false : true))
  }
  delete(id: ID, ctx?: any): Promise<number> {
    const stmt = buildToDelete<ID>(id, this.table, this.primaryKeys, this.param)
    if (stmt.query.length > 0) {
      return this.exec(stmt.query, stmt.params, ctx)
    } else {
      return Promise.resolve(0)
    }
  }
}

export class SqlSearchWriter<T, S> extends SearchBuilder<T, S> {
  protected version?: string
  protected exec: (sql: string, args?: any[], ctx?: any) => Promise<number>
  constructor(
    db: DB,
    table: string,
    protected attributes: Attributes,
    buildQ?: (
      s: S,
      param: (i: number) => string,
      sort?: string,
      buildSort3?: (sort?: string, map?: Attributes | StringMap) => string,
      attrs?: Attributes,
      table?: string,
      fields?: string[],
      sq?: string,
      strExcluding?: string,
      likeType?: LikeType
    ) => Statement | undefined,
    protected toDB?: (v: T) => T,
    fromDB?: (v: T) => T,
    sort?: string,
    q?: string,
    excluding?: string,
    buildSort?: (sort?: string, map?: Attributes | StringMap) => string,
    buildParam?: (i: number) => string,
    total?: string,
  ) {
    super(db.query, table, attributes, db.driver, buildQ, fromDB, sort, q, excluding, buildSort, buildParam, total)
    this.exec = db.exec
    const x = version(attributes)
    if (x) {
      this.version = x.name
    }
    this.create = this.create.bind(this)
    this.update = this.update.bind(this)
    this.patch = this.patch.bind(this)
  }
  create(obj: T, ctx?: any): Promise<number> {
    let obj2 = obj
    if (this.toDB) {
      obj2 = this.toDB(obj)
    }
    const stmt = buildToInsert(obj2, this.table, this.attributes, this.param, this.version)
    if (stmt.query.length > 0) {
      return this.exec(stmt.query, stmt.params, ctx).catch((err) => {
        if (err && err.error === "duplicate") {
          return 0
        } else {
          throw err
        }
      })
    } else {
      return Promise.resolve(0)
    }
  }
  update(obj: T, ctx?: any): Promise<number> {
    let obj2 = obj
    if (this.toDB) {
      obj2 = this.toDB(obj)
    }
    const stmt = buildToUpdate(obj2, this.table, this.attributes, this.param, this.version)
    if (stmt.query.length > 0) {
      return this.exec(stmt.query, stmt.params, ctx)
    } else {
      return Promise.resolve(0)
    }
  }
  patch(obj: Partial<T>, ctx?: any): Promise<number> {
    return this.update(obj as any, ctx)
  }
}
// tslint:disable-next-line:max-classes-per-file
export class SqlRepository<T, ID, S> extends SqlSearchWriter<T, S> {
  constructor(
    db: DB,
    table: string,
    protected attributes: Attributes,
    buildQ?: (
      s: S,
      param: (i: number) => string,
      sort?: string,
      buildSort3?: (sort?: string, map?: Attributes | StringMap) => string,
      attrs?: Attributes,
      table?: string,
      fields?: string[],
      sq?: string,
      strExcluding?: string,
      likeType?: LikeType
    ) => Statement | undefined,
    protected toDB?: (v: T) => T,
    fromDB?: (v: T) => T,
    sort?: string,
    q?: string,
    excluding?: string,
    buildSort?: (sort?: string, map?: Attributes | StringMap) => string,
    buildParam?: (i: number) => string,
    total?: string,
  ) {
    super(db, table, attributes, buildQ, toDB, fromDB, sort, q, excluding, buildSort, buildParam, total)
    this.metadata = this.metadata.bind(this)
    this.all = this.all.bind(this)
    this.load = this.load.bind(this)
    this.exist = this.exist.bind(this)
    this.delete = this.delete.bind(this)
  }
  metadata(): Attributes {
    return this.attributes
  }
  all(): Promise<T[]> {
    const sql = `select * from ${this.table}`
    return this.query(sql, [], this.map)
  }
  load(id: ID, ctx?: any): Promise<T | null> {
    const stmt = select<ID>(id, this.table, this.primaryKeys, this.param)
    if (!stmt) {
      throw new Error("cannot build query by id")
    }
    const fn = this.fromDB
    if (fn) {
      return this.query<T>(stmt.query, stmt.params, this.map, ctx).then((res) => {
        if (!res || res.length === 0) {
          return null
        } else {
          const obj = res[0]
          return fn(obj)
        }
      })
    } else {
      return this.query<T>(stmt.query, stmt.params, this.map).then((res) => (!res || res.length === 0 ? null : res[0]))
    }
  }
  exist(id: ID, ctx?: any): Promise<boolean> {
    const field = this.primaryKeys[0].column ? this.primaryKeys[0].column : this.primaryKeys[0].name
    const stmt = exist<ID>(id, this.table, this.primaryKeys, this.param, field)
    if (!stmt) {
      throw new Error("cannot build query by id")
    }
    return this.query(stmt.query, stmt.params, this.map, undefined, ctx).then((res) => (!res || res.length === 0 ? false : true))
  }
  delete(id: ID, ctx?: any): Promise<number> {
    const stmt = buildToDelete<ID>(id, this.table, this.primaryKeys, this.param)
    if (stmt) {
      return this.exec(stmt.query, stmt.params, ctx)
    } else {
      return Promise.resolve(0)
    }
  }
}
// tslint:disable-next-line:max-classes-per-file
export class Query<T, ID, S> extends SearchBuilder<T, S> {
  primaryKeys: Attribute[]
  map?: StringMap
  // attributes: Attributes;
  bools?: Attribute[]
  constructor(
    query: <K>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any) => Promise<K[]>,
    table: string,
    attributes: Attributes,
    buildQ?: (
      s: S,
      param: (i: number) => string,
      sort?: string,
      buildSort3?: (sort?: string, map?: Attributes | StringMap) => string,
      attrs?: Attributes,
      table?: string,
      fields?: string[],
      sq?: string,
      strExcluding?: string,
      likeType?: LikeType
    ) => Statement | undefined,
    provider?: string,
    fromDB?: (v: T) => T,
    sort?: string,
    q?: string,
    excluding?: string,
    buildSort?: (sort?: string, map?: Attributes | StringMap) => string,
    buildParam?: (i: number) => string,
    total?: string,
  ) {
    super(query, table, attributes, provider, buildQ, fromDB, sort, q, excluding, buildSort, buildParam, total)
    const m = metadata(attributes)
    this.primaryKeys = m.keys
    this.map = m.map
    this.bools = m.bools
    if (this.metadata) {
      this.metadata = this.metadata.bind(this)
    }
    this.all = this.all.bind(this)
    this.load = this.load.bind(this)
    this.exist = this.exist.bind(this)
  }
  metadata?(): Attributes | undefined {
    return this.attrs
  }
  all(): Promise<T[]> {
    const sql = `select * from ${this.table}`
    return this.query(sql, [], this.map)
  }
  load(id: ID, ctx?: any): Promise<T | null> {
    const stmt = select<ID>(id, this.table, this.primaryKeys, this.param)
    if (!stmt) {
      throw new Error("cannot build query by id")
    }
    const fn = this.fromDB
    if (fn) {
      return this.query<T>(stmt.query, stmt.params, this.map, ctx).then((res) => {
        if (!res || res.length === 0) {
          return null
        } else {
          const obj = res[0]
          return fn(obj)
        }
      })
    } else {
      return this.query<T>(stmt.query, stmt.params, this.map).then((res) => (!res || res.length === 0 ? null : res[0]))
    }
  }
  exist(id: ID, ctx?: any): Promise<boolean> {
    const field = this.primaryKeys[0].column ? this.primaryKeys[0].column : this.primaryKeys[0].name
    const stmt = exist<ID>(id, this.table, this.primaryKeys, this.param, field)
    if (!stmt) {
      throw new Error("cannot build query by id")
    }
    return this.query(stmt.query, stmt.params, this.map, undefined, ctx).then((res) => (!res || res.length === 0 ? false : true))
  }
}
