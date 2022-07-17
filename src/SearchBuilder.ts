import {exist, metadata, param, select} from './build';
import {Attribute, Attributes, Statement, StringMap} from './metadata';
import {buildDollarParam, buildMsSQLParam, buildOracleParam, buildQuery, buildSort as bs, LikeType} from './query';
import {buildFromQuery, oracle, SearchResult} from './search';

export const postgres = 'postgres';
export const mssql = 'mssql';
export const mysql = 'mysql';
export const sqlite = 'sqlite';
export class SearchBuilder<T, S> {
  map?: StringMap;
  bools?: Attribute[];
  buildQuery: (s: S, bparam: LikeType|((i: number ) => string), sort?: string, buildSort3?: (sort?: string, map?: Attributes|StringMap) => string, attrs?: Attributes, table?: string, fields?: string[], sq?: string, strExcluding?: string) => Statement|undefined;
  q?: string;
  excluding?: string;
  buildSort?: (sort?: string, map?: Attributes|StringMap) => string;
  param: (i: number) => string;
  total?: string;
  constructor(public query: <K>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any) => Promise<K[]>,
    public table: string,
    public attributes?: Attributes,
    public provider?: string,
    buildQ?: (s: S, bparam: LikeType|((i: number ) => string), sort?: string, buildSort3?: (sort?: string, map?: Attributes|StringMap) => string, attrs?: Attributes, table?: string, fields?: string[], sq?: string, strExcluding?: string) => Statement|undefined,
    public fromDB?: (v: T) => T,
    public sort?: string,
    q?: string,
    excluding?: string,
    buildSort?: (sort?: string, map?: Attributes|StringMap) => string,
    buildParam?: (i: number) => string,
    total?: string) {
      if (attributes) {
        this.attributes = attributes;
        const meta = metadata(attributes);
        this.map = meta.map;
        this.bools = meta.bools;
      }
      this.buildQuery = buildQ ? buildQ : buildQuery;
      this.buildSort = (buildSort ? buildSort : bs);
      this.q = (q && q.length > 0 ? q : 'q');
      this.excluding = (excluding && excluding.length > 0 ? excluding : 'excluding');
      this.search = this.search.bind(this);
      if (buildParam) {
        this.param = buildParam;
      } else {
        if (provider === oracle) {
          this.param = buildOracleParam;
        } else if (provider === postgres) {
          this.param = buildDollarParam;
        } else if (provider === mssql) {
          this.param = buildMsSQLParam;
        } else {
          this.param = param;
        }
      }
      this.total = (total && total.length > 0 ? total : 'total');
    }
  search(s: S, limit?: number, offset?: number|string, fields?: string[]): Promise<SearchResult<T>> {
    let skip = 0;
    if (typeof offset === 'number' && offset > 0) {
      skip = offset;
    }
    const st = (this.sort ? this.sort : 'sort');
    const sn = (s as any)[st] as string;
    delete (s as any)[st];
    const x = (this.provider === postgres ? 'ilike' : this.param);
    const q2 = this.buildQuery(s, x, sn, this.buildSort, this.attributes, this.table, fields, this.q, this.excluding);
    if (!q2) {
      throw new Error('Cannot build query');
    }
    const fn = this.fromDB;
    if (fn) {
      return buildFromQuery<T>(this.query, q2.query, q2.params, limit, skip, this.map, this.bools, this.provider, this.total).then(r => {
        if (r.list && r.list.length > 0) {
          r.list = r.list.map(o => fn(o));
          return r;
        } else {
          return r;
        }
      });
    } else {
      return buildFromQuery(this.query, q2.query, q2.params, limit, skip, this.map, this.bools, this.provider, this.total);
    }
  }
}
export class Query<T, ID, S> extends SearchBuilder<T, S> {
  primaryKeys: Attribute[];
  map?: StringMap;
  // attributes: Attributes;
  bools?: Attribute[];
  constructor(
      query: <K>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[], ctx?: any) => Promise<K[]>,
      table: string,
      attributes: Attributes,
      provider?: string,
      buildQ?: (s: S, bparam: LikeType|((i: number ) => string), sort?: string, buildSort3?: (sort?: string, map?: Attributes|StringMap) => string, attrs?: Attributes, table?: string, fields?: string[], sq?: string, strExcluding?: string) => Statement|undefined,
      fromDB?: (v: T) => T,
      sort?: string,
      q?: string,
      excluding?: string,
      buildSort?: (sort?: string, map?: Attributes|StringMap) => string,
      buildParam?: (i: number) => string,
      total?: string) {
    super(query, table, attributes, provider, buildQ, fromDB, sort, q, excluding, buildSort, buildParam, total);
    const m = metadata(attributes);
    this.primaryKeys = m.keys;
    this.map = m.map;
    this.bools = m.bools;
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
