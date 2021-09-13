import {handleResults} from './map';
import {Attribute, Statement, StringMap} from './metadata';

export interface JStatement {
  query: string;
  params?: any[];
  dates?: number[];
}
export interface Headers {
  [key: string]: any;
}
export interface HttpOptionsService {
  getHttpOptions(): { headers?: Headers };
}
export interface HttpRequest {
  post<T>(url: string, obj: any, options?: {headers?: Headers}): Promise<T>;
}
export interface Proxy {
  query<T>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[]): Promise<T[]>;
  exec(sql: string, args?: any[]): Promise<number>;
  execBatch(stmts: Statement[]): Promise<number>;
  beginTransaction?(timeout?: number): Promise<string>;
  commitTransaction?(tx: string): Promise<boolean>;
  rollbackTransaction?(tx: string): Promise<boolean>;
  queryWithTx?<T>(tx: string, commit: boolean, sql: string, args?: any[], m?: StringMap, bools?: Attribute[]): Promise<T[]>;
  execWithTx?(tx: string, commit: boolean, sql: string, args?: any[]): Promise<number>;
  execBatchWithTx?(tx: string, commit: boolean, stmts: Statement[]): Promise<number>;
}
export function buildStatements(s: Statement[]): JStatement[] {
  const d: JStatement[] = [];
  if (!s || s.length === 0) {
    return d;
  }
  for (const t of s) {
    const dates = toDates(t.params);
    const j: JStatement = {query: t.query, params: t.params, dates};
    d.push(j);
  }
  return d;
}
export function toDates(args: any[]): number[] {
  const d: number[] = [];
  if (!args || args.length === 0) {
    return d;
  }
  const l = args.length;
  for (let i = 0; i < l; i++) {
    if (args[i] && args[i] instanceof Date) {
      d.push(i);
    }
  }
  return d;
}
export class ProxyClient implements Proxy {
  constructor(protected httpRequest: HttpRequest, protected url: string) {
    this.query = this.query.bind(this);
    this.exec = this.exec.bind(this);
    this.execBatch = this.execBatch.bind(this);
  }
  query<T>(sql: string, args?: any[], m?: StringMap, bools?: Attribute[]): Promise<T[]> {
    const dates = toDates(args);
    const j: JStatement = {query: sql, params: args, dates};
    if (m || bools) {
      return this.httpRequest.post<T[]>(this.url + '/query', j).then(r => handleResults(r, m, bools));
    } else {
      return this.httpRequest.post<T[]>(this.url + '/query', j);
    }

  }
  exec(sql: string, args?: any[]): Promise<number> {
    const dates = toDates(args);
    const j: JStatement = {query: sql, params: args, dates};
    return this.httpRequest.post<number>(this.url + '/exec', j);
  }
  execBatch(stmts: Statement[]): Promise<number> {
    const d = buildStatements(stmts);
    return this.httpRequest.post<number>(this.url + '/exec-batch', d);
  }
  beginTransaction?(timeout?: number): Promise<string> {
    const st = (timeout && timeout > 0 ? '?timeout=' + timeout : '');
    return this.httpRequest.post<string>(this.url + '/begin' + st, '');
  }
  commitTransaction?(tx: string): Promise<boolean> {
    return this.httpRequest.post<boolean>(this.url + '/end?tx=' + tx, '');
  }
  rollbackTransaction?(tx: string): Promise<boolean> {
    return this.httpRequest.post<boolean>(this.url + '/end?roleback=true&tx=' + tx, '');
  }
  queryWithTx?<T>(tx: string, commit: boolean, sql: string, args?: any[], m?: StringMap, bools?: Attribute[]): Promise<T[]> {
    const dates = toDates(args);
    const j: JStatement = {query: sql, params: args, dates};
    const sc = (commit ? '&commit=true' : '');
    if (m || bools) {
      return this.httpRequest.post<T[]>(this.url + '/query?tx=' + tx + sc, j).then(r => handleResults(r, m, bools));
    } else {
      return this.httpRequest.post<T[]>(this.url + '/query?tx=' + tx + sc, j);
    }
  }
  execWithTx?(tx: string, commit: boolean, sql: string, args?: any[]): Promise<number> {
    const dates = toDates(args);
    const j: JStatement = {query: sql, params: args, dates};
    const sc = (commit ? '&commit=true' : '');
    return this.httpRequest.post<number>(this.url + '/exec?tx=' + tx + sc, j);
  }
  execBatchWithTx?(tx: string, commit: boolean, stmts: Statement[]): Promise<number> {
    const d = buildStatements(stmts);
    const sc = (commit ? '&commit=true' : '');
    return this.httpRequest.post<number>(this.url + '/exec-batch?tx=' + tx + sc, d);
  }
}
