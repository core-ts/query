import {metadata, param} from './build';
import {Attribute, Attributes, Statement, StringMap} from './metadata';
import {buildDollarParam, buildMsSQLParam, buildOracleParam, buildQuery, buildSort as bs, LikeType} from './query';
import {buildFromQuery, oracle, SearchResult} from './search';

export const postgre = 'postgre';
export const mssql = 'mssql';
export const mysql = 'mysql';
export const sqlite = 'sqlite';
export class SearchBuilder<T, S> {
  map?: StringMap;
  bools?: Attribute[];
  buildQuery: (s: S, bparam: LikeType|((i: number ) => string), table?: string, attrs?: Attributes, sort?: string, fields?: string[], sq?: string, strExcluding?: string, buildSort3?: (sort: string, map?: Attributes|StringMap) => string) => Statement;
  q?: string;
  excluding?: string;
  buildSort?: (sort: string, map?: Attributes|StringMap) => string;
  buildParam?: (i: number) => string;
  total?: string;
  constructor(public query: (sql: string, args?: any[], m?: StringMap, bools?: Attribute[]) => Promise<T[]>, public table: string,
    public attributes?: Attributes,
    public provider?: string,
    buildQ?: (s: S, bparam: LikeType|((i: number ) => string), table?: string, attrs?: Attributes, sort?: string, fields?: string[], sq?: string, strExcluding?: string, buildSort3?: (sort: string, map?: Attributes|StringMap) => string) => Statement,
    public fromDB?: (v: T) => T,
    public sort?: string,
    q?: string,
    excluding?: string,
    buildSort?: (sort: string, map?: Attributes|StringMap) => string,
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
        this.buildParam = buildParam;
      } else {
        if (provider === oracle) {
          this.buildParam = buildOracleParam;
        } else if (provider === postgre) {
          this.buildParam = buildDollarParam;
        } else if (provider === mssql) {
          this.buildParam = buildMsSQLParam;
        } else {
          this.buildParam = param;
        }
      }
      this.total = (total && total.length > 0 ? total : 'total');
    }
  search(s: S, limit?: number, skip?: number, fields?: string[]): Promise<SearchResult<T>> {
    const st = (this.sort ? this.sort : 'sort');
    const sn = s[st] as string;
    delete s[st];
    const s1 = JSON.parse(JSON.stringify(s));
    const x = (this.provider === postgre ? 'ilike' : this.buildParam);
    const q2 = buildQuery(s1, x, this.table, this.attributes, sn, fields, this.q, this.excluding, this.buildSort);
    if (this.fromDB) {
      return buildFromQuery(this.query, q2.query, q2.params, limit, skip, this.map, this.bools, this.provider, this.total).then(r => {
        if (r.list && r.list.length > 0) {
          r.list = r.list.map(o => this.fromDB(o));
        } else {
          return r;
        }
      });
    } else {
      return buildFromQuery(this.query, q2.query, q2.params, limit, skip, this.map, this.bools, this.provider, this.total);
    }
  }
}
