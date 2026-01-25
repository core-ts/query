import { metadata, param } from "./build"
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
