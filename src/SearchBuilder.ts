import { Manager } from "./services"
import { buildToDelete, buildToInsert, buildToUpdate, exist, metadata, param, select, version } from "./build"
import { Attribute, Attributes, Statement, StringMap } from "./metadata"
import { buildSort as bs, buildDollarParam, buildMsSQLParam, buildOracleParam, buildQuery, LikeType } from "./query"
import { buildFromQuery, oracle, SearchResult } from "./search"

export const postgres = "postgres"
export const mssql = "mssql"
export const mysql = "mysql"
export const sqlite = "sqlite"
export class SearchBuilder<T, S> {
  map?: StringMap
  bools?: Attribute[]
  primaryKeys: Attribute[]
  protected deleteSort?: boolean
  buildQuery: (
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
  ) => Statement | undefined
  q?: string
  excluding?: string
  buildSort?: (sort?: string, map?: Attributes | StringMap) => string
  param: (i: number) => string
  total?: string
  constructor(
    protected query: <K>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any) => Promise<K[]>,
    protected table: string,
    protected attrs?: Attributes,
    protected provider?: string,
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
    protected fromDB?: (v: T) => T,
    protected sort?: string,
    q?: string,
    excluding?: string,
    buildSort?: (sort?: string, map?: Attributes | StringMap) => string,
    buildParam?: (i: number) => string,
    total?: string,
  ) {
    if (attrs) {
      this.attrs = attrs
      const meta = metadata(attrs)
      this.map = meta.map
      this.bools = meta.bools
      this.primaryKeys = meta.keys
    } else {
      this.primaryKeys = []
    }
    this.deleteSort = buildQ ? undefined : true
    this.buildQuery = buildQ ? buildQ : buildQuery
    this.buildSort = buildSort ? buildSort : bs
    this.q = q && q.length > 0 ? q : "q"
    this.excluding = excluding && excluding.length > 0 ? excluding : "excluding"
    this.search = this.search.bind(this)
    if (buildParam) {
      this.param = buildParam
    } else {
      if (provider === oracle) {
        this.param = buildOracleParam
      } else if (provider === postgres) {
        this.param = buildDollarParam
      } else if (provider === mssql) {
        this.param = buildMsSQLParam
      } else {
        this.param = param
      }
    }
    this.total = total && total.length > 0 ? total : "total"
  }
  search(filter: S, limit: number, page?: number | string, fields?: string[]): Promise<SearchResult<T>> {
    let ipage = 0
    if (typeof page === "number" && page > 0) {
      ipage = page
    }
    const st = this.sort ? this.sort : "sort"
    const sn = (filter as any)[st] as string
    if (this.deleteSort) {
      delete (filter as any)[st]
    }
    const likeType = this.provider === postgres ? "ilike" : "like"
    const q2 = this.buildQuery(filter, this.param, sn, this.buildSort, this.attrs, this.table, fields, this.q, this.excluding, likeType)
    if (!q2) {
      throw new Error("Cannot build query")
    }
    const fn = this.fromDB
    if (fn) {
      return buildFromQuery<T>(this.query, q2.query, q2.params, limit, ipage, this.map, this.bools, this.provider, this.total).then((r) => {
        if (r.list && r.list.length > 0) {
          r.list = r.list.map((o) => fn(o))
          return r
        } else {
          return r
        }
      })
    } else {
      return buildFromQuery(this.query, q2.query, q2.params, limit, ipage, this.map, this.bools, this.provider, this.total)
    }
  }
}
export class SqlSearchWriter<T, S> extends SearchBuilder<T, S> {
  protected version?: string
  protected exec: (sql: string, args?: any[], ctx?: any) => Promise<number>
  constructor(
    manager: Manager,
    table: string,
    protected attributes: Attributes,
    provider?: string,
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
    super(manager.query, table, attributes, provider, buildQ, fromDB, sort, q, excluding, buildSort, buildParam, total)
    this.exec = manager.exec
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
    if (stmt) {
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
    if (stmt) {
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
    manager: Manager,
    table: string,
    protected attributes: Attributes,
    provider?: string,
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
    super(manager, table, attributes, provider, buildQ, toDB, fromDB, sort, q, excluding, buildSort, buildParam, total)
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
