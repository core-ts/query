import {buildToInsert, buildToInsertBatch, buildToUpdate, buildToUpdateBatch} from './build';
import {handleResults} from './map';
import {Attribute, Attributes, Statement, StringMap} from './metadata';

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
  insert?<T>(table: string, attrs: Attributes, obj: T, buildParam: (i: number) => string, ver?: string): Promise<number>;
  update?<T>(table: string, attrs: Attributes, obj: T, buildParam: (i: number) => string, ver?: string): Promise<number>;
  insertBatch?<T>(table: string, attrs: Attributes, objs: T[], buildParam: (i: number) => string, driver?: string): Promise<number>;
  updateBatch?<T>(table: string, attrs: Attributes, objs: T[], buildParam: (i: number) => string, notSkipInvalid?: boolean): Promise<number>;
  insertWithTx?<T>(tx: string, commit: boolean, table: string, attrs: Attributes, obj: T, buildParam: (i: number) => string, ver?: string): Promise<number>;
  updateWithTx?<T>(tx: string, commit: boolean, table: string, attrs: Attributes, obj: T, buildParam: (i: number) => string, ver?: string): Promise<number>;
  insertBatchWithTx?<T>(tx: string, commit: boolean, table: string, attrs: Attributes, objs: T[], buildParam: (i: number) => string, driver?: string): Promise<number>;
  updateBatchWithTx?<T>(tx: string, commit: boolean, table: string, attrs: Attributes, objs: T[], buildParam: (i: number) => string, notSkipInvalid?: boolean): Promise<number>;
  save?<T>(table: string, attrs: Attributes, obj: T, buildParam: (i: number) => string, ver?: string): Promise<number>;
  saveBatch?<T>(table: string, attrs: Attributes, objs: T[], buildParam: (i: number) => string, ver?: string): Promise<number>;
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
export function toDates(args?: any[]): number[] {
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
export class ProxyClient {
  constructor(protected httpRequest: HttpRequest, protected url: string) {
    this.query = this.query.bind(this);
    this.exec = this.exec.bind(this);
    this.execBatch = this.execBatch.bind(this);

    this.insert = this.insert.bind(this);
    this.update = this.update.bind(this);
    this.insertBatch = this.insertBatch.bind(this);
    this.updateBatch = this.updateBatch.bind(this);
    this.insertWithTx = this.insertWithTx.bind(this);
    this.updateWithTx = this.updateWithTx.bind(this);
    this.insertBatchWithTx = this.insertBatchWithTx.bind(this);
    this.updateBatchWithTx = this.updateBatchWithTx.bind(this);

    this.beginTransaction = this.beginTransaction.bind(this);
    this.commitTransaction = this.commitTransaction.bind(this);
    this.rollbackTransaction = this.rollbackTransaction.bind(this);
    this.queryWithTx = this.queryWithTx.bind(this);
    this.execWithTx = this.execWithTx.bind(this);
    this.execBatchWithTx = this.execBatchWithTx.bind(this);
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

  beginTransaction(timeout?: number): Promise<string> {
    const st = (timeout && timeout > 0 ? '?timeout=' + timeout : '');
    return this.httpRequest.post<string>(this.url + '/begin' + st, '');
  }
  commitTransaction(tx: string): Promise<boolean> {
    return this.httpRequest.post<boolean>(this.url + '/end?tx=' + tx, '');
  }
  rollbackTransaction(tx: string): Promise<boolean> {
    return this.httpRequest.post<boolean>(this.url + '/end?roleback=true&tx=' + tx, '');
  }
  queryWithTx<T>(tx: string, commit: boolean, sql: string, args?: any[], m?: StringMap, bools?: Attribute[]): Promise<T[]> {
    const dates = toDates(args);
    const j: JStatement = {query: sql, params: args, dates};
    const sc = (commit ? '&commit=true' : '');
    if (m || bools) {
      return this.httpRequest.post<T[]>(this.url + '/query?tx=' + tx + sc, j).then(r => handleResults(r, m, bools));
    } else {
      return this.httpRequest.post<T[]>(this.url + '/query?tx=' + tx + sc, j);
    }
  }
  execWithTx(tx: string, commit: boolean, sql: string, args?: any[]): Promise<number> {
    const dates = toDates(args);
    const j: JStatement = {query: sql, params: args, dates};
    const sc = (commit ? '&commit=true' : '');
    return this.httpRequest.post<number>(this.url + '/exec?tx=' + tx + sc, j);
  }
  execBatchWithTx(tx: string, commit: boolean, stmts: Statement[]): Promise<number> {
    const d = buildStatements(stmts);
    const sc = (commit ? '&commit=true' : '');
    return this.httpRequest.post<number>(this.url + '/exec-batch?tx=' + tx + sc, d);
  }

  insert<T>(table: string, attrs: Attributes, obj: T, buildParam: (i: number) => string, ver?: string): Promise<number> {
    const s = buildToInsert(obj, table, attrs, buildParam, ver);
    if (s) {
      return this.exec(s.query, s.params);
    } else {
      return Promise.resolve(-1);
    }
  }
  update<T>(table: string, attrs: Attributes, obj: T, buildParam: (i: number) => string, ver?: string): Promise<number> {
    const s = buildToUpdate(obj, table, attrs, buildParam, ver);
    if (s) {
      return this.exec(s.query, s.params);
    } else {
      return Promise.resolve(-1);
    }
  }
  insertBatch<T>(table: string, attrs: Attributes, objs: T[], buildParam: (i: number) => string, driver?: string): Promise<number> {
    const s = buildToInsertBatch(objs, table, attrs, buildParam);
    if (s) {
      return this.exec(s.query, s.params);
    } else {
      return Promise.resolve(-1);
    }
  }
  updateBatch<T>(table: string, attrs: Attributes, objs: T[], buildParam: (i: number) => string, notSkipInvalid?: boolean): Promise<number> {
    const s = buildToUpdateBatch(objs, table, attrs, buildParam, notSkipInvalid);
    if (s && s.length > 0) {
      return this.execBatch(s);
    } else {
      return Promise.resolve(-1);
    }
  }
  insertWithTx<T>(tx: string, commit: boolean, table: string, attrs: Attributes, obj: T, buildParam: (i: number) => string, ver?: string): Promise<number> {
    const s = buildToInsert(obj, table, attrs, buildParam, ver);
    if (s) {
      return this.execWithTx(tx, commit, s.query, s.params);
    } else {
      return Promise.resolve(-1);
    }
  }
  updateWithTx<T>(tx: string, commit: boolean, table: string, attrs: Attributes, obj: T, buildParam: (i: number) => string, ver?: string): Promise<number> {
    const s = buildToUpdate(obj, table, attrs, buildParam, ver);
    if (s) {
      return this.execWithTx(tx, commit, s.query, s.params);
    } else {
      return Promise.resolve(-1);
    }
  }
  insertBatchWithTx<T>(tx: string, commit: boolean, table: string, attrs: Attributes, objs: T[], buildParam: (i: number) => string, driver?: string): Promise<number> {
    const s = buildToInsertBatch(objs, table, attrs, buildParam);
    if (s) {
      return this.execWithTx(tx, commit, s.query, s.params);
    } else {
      return Promise.resolve(-1);
    }
  }
  updateBatchWithTx<T>(tx: string, commit: boolean, table: string, attrs: Attributes, objs: T[], buildParam: (i: number) => string, notSkipInvalid?: boolean): Promise<number> {
    const s = buildToUpdateBatch(objs, table, attrs, buildParam, notSkipInvalid);
    if (s && s.length > 0) {
      return this.execBatchWithTx(tx, commit, s);
    } else {
      return Promise.resolve(-1);
    }
  }
}
