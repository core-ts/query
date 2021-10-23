import {Attribute, StringMap} from './metadata';

export interface SearchResult<T> {
  list: T[];
  total?: number;
}
export function buildFromQuery<T>(query: (sql: string, args?: any[], m?: StringMap, bools?: Attribute[]) => Promise<T[]>, sql: string, params?: any[], limit?: number, offset?: number, mp?: StringMap, bools?: Attribute[], provider?: string, totalCol?: string): Promise<SearchResult<T>> {
  if (!limit || limit <= 0) {
    return query(sql, params, mp, bools).then(list => {
      const total = (list ? list.length : undefined);
      return {list, total};
    });
  } else {
    if (provider === oracle) {
      if (!totalCol || totalCol.length === 0) {
        totalCol = 'total';
      }
      const sql2 = buildPagingQueryForOracle(sql, limit, offset, totalCol);
      return queryAndCount(query, sql2, params, totalCol, mp, bools);
    } else {
      const sql2 = buildPagingQuery(sql, limit, offset);
      const countQuery = buildCountQuery(sql);
      const resultPromise = query(sql2, params, mp, bools);
      const countPromise = query(countQuery, params).then(r => {
        if (!r || r.length === 0) {
          return 0;
        } else {
          const r0 = r[0];
          const keys = Object.keys(r0);
          return (r0 as any)[keys[0]] as number;
        }
      });
      return Promise.all([resultPromise, countPromise]).then(r => {
        const [list, total] = r;
        return {list, total};
      });
    }
  }
}
export function queryAndCount<T>(query: (sql: string, args?: any[], m?: StringMap, bools?: Attribute[]) => Promise<T[]>, sql: string, params: any[]|undefined, total: string, mp?: StringMap, bools?: Attribute[]): Promise<SearchResult<T>> {
  if (!total || total.length === 0) {
    total = 'total';
  }
  return query(sql, params, mp, bools).then(list => {
    if (!list || list.length === 0) {
      return {list: [], total: 0};
    }
    const t = (list[0] as any)[total] as number;
    for (const obj of list) {
      delete (obj as any)[total];
    }
    return {list, total: t};
  });
}
export const oracle = 'oracle';
const s = 'select';
const S = 'SELECT';
const d = ' distinct ';
const D = ' DISTINCT ';
export function buildPagingQuery(sql: string, limit: number, offset?: number, provider?: string): string {
  if (limit === undefined || limit == null) {
    limit = 0;
  }
  if (offset === undefined || offset == null) {
    offset = 0;
  }
  if (provider !== oracle) {
    return `${sql} limit ${limit} offset ${offset}`;
  } else {
    return buildPagingQueryForOracle(sql, limit, offset);
  }
}
export function buildPagingQueryForOracle(sql: string, limit: number, offset?: number, total?: string) {
  if (!total || total.length === 0) {
    total = 'total';
  }
  if (!offset) {
    offset = 0;
  }
  let l = d.length;
  let i = sql.indexOf(d);
  if (i < 0) {
    i = sql.indexOf(D);
  }
  if (i < 0) {
    l = S.length;
    i = sql.indexOf(s);
  }
  if (i < 0) {
    i = sql.indexOf(S);
  }
  if (i >= 0) {
    return `${sql.substr(0, l)} count(*) over() as ${total}, ${sql.substr(l)} offset ${offset} rows fetch next ${limit} rows only`;
  } else {
    return `${sql} offset ${offset} rows fetch next ${limit} rows only`;
  }
}
export function buildCountQuery(sql: string): string {
  const sql2 = sql.trim();
  const i = sql2.indexOf('select ');
  if (i < 0) {
    return sql;
  }
  const j = sql2.indexOf(' from ', i + 6);
  if (j < 0) {
    return sql;
  }
  const k = sql2.indexOf(' order by ', j);
  const h = sql2.indexOf(' distinct ');
  if (h > 0) {
    const sql3 = 'select count(*) from (' + sql2.substring(i) + ') as main';
    return sql3;
  }
  if (k > 0) {
    const sql3 = 'select count(*) ' + sql2.substring(j, k);
    return sql3;
  } else {
    const sql3 = 'select count(*) ' + sql2.substring(j);
    return sql3;
  }
}
