import {buildToInsert, buildToInsertBatch, buildToUpdate, buildToUpdateBatch, version} from './build';
import {Attributes, Statement} from './metadata';

export class SqlInserter<T> {
  version?: string;
  constructor(public exec: (sql: string, args?: any[]) => Promise<number>, public table: string, public attributes: Attributes, public param: (i: number) => string, public map?: (v: T) => T) {
    this.write = this.write.bind(this);
    const x = version(attributes);
    if (x) {
      this.version = x.name;
    }
  }
  write(obj: T): Promise<number> {
    if (!obj) {
      return Promise.resolve(0);
    }
    let obj2 = obj;
    if (this.map) {
      obj2 = this.map(obj);
    }
    const stmt = buildToInsert(obj2, this.table, this.attributes, this.param, this.version);
    if (stmt) {
      return this.exec(stmt.query, stmt.params);
    } else {
      return Promise.resolve(0);
    }
  }
}
export class SqlUpdater<T> {
  version?: string;
  constructor(public exec: (sql: string, args?: any[]) => Promise<number>, public table: string, public attributes: Attributes, public param: (i: number) => string, public map?: (v: T) => T) {
    this.write = this.write.bind(this);
    const x = version(attributes);
    if (x) {
      this.version = x.name;
    }
  }
  write(obj: T): Promise<number> {
    if (!obj) {
      return Promise.resolve(0);
    }
    let obj2 = obj;
    if (this.map) {
      obj2 = this.map(obj);
    }
    const stmt = buildToUpdate(obj2, this.table, this.attributes, this.param, this.version);
    if (stmt) {
      return this.exec(stmt.query, stmt.params);
    } else {
      return Promise.resolve(0);
    }
  }
}
export class SqlBatchInserter<T> {
  version?: string;
  constructor(public exec: (sql: string, args?: any[]) => Promise<number>, public table: string, public attributes: Attributes, public param: (i: number) => string, public map?: (v: T) => T) {
    this.write = this.write.bind(this);
    const x = version(attributes);
    if (x) {
      this.version = x.name;
    }
  }
  write(objs: T[]): Promise<number> {
    if (!objs || objs.length === 0) {
      return Promise.resolve(0);
    }
    let list = objs;
    if (this.map) {
      list = [];
      for (const obj of objs) {
        const obj2 = this.map(obj);
        list.push(obj2);
      }
    }
    const stmt = buildToInsertBatch(list, this.table, this.attributes, this.param);
    if (stmt) {
      return this.exec(stmt.query, stmt.params);
    } else {
      return Promise.resolve(0);
    }
  }
}
export class SqlBatchUpdater<T> {
  version?: string;
  constructor(public execBatch: (statements: Statement[]) => Promise<number>, public table: string, public attributes: Attributes, public param: (i: number) => string, protected notSkipInvalid?: boolean, public map?: (v: T) => T) {
    this.write = this.write.bind(this);
    const x = version(attributes);
    if (x) {
      this.version = x.name;
    }
  }
  write(objs: T[]): Promise<number> {
    if (!objs || objs.length === 0) {
      return Promise.resolve(0);
    }
    let list = objs;
    if (this.map) {
      list = [];
      for (const obj of objs) {
        const obj2 = this.map(obj);
        list.push(obj2);
      }
    }
    const stmts = buildToUpdateBatch(list, this.table, this.attributes, this.param, this.notSkipInvalid);
    if (stmts && stmts.length > 0) {
      return this.execBatch(stmts);
    } else {
      return Promise.resolve(0);
    }
  }
}
