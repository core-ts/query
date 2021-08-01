import {attributes, buildToDelete, buildToInsert, buildToUpdate, exist, metadata, select, StringMap, version} from './build';
import {Attribute, Attributes, Statement} from './metadata';

export class SqlLoader<T, ID> {
  keys: Attribute[];
  map?: StringMap;
  attributes: Attributes;
  bools?: Attribute[];
  constructor(public table: string,
    public query: (sql: string, args?: any[], m?: StringMap, bools?: Attribute[]) => Promise<T[]>,
    attrs: Attributes|string[],
    protected param: (i: number) => string,
    protected fromDB?: (v: T) => T) {
    if (Array.isArray(attrs)) {
      this.keys = attributes(attrs);
    } else {
      const m = metadata(attrs);
      this.attributes = attrs;
      this.keys = m.keys;
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
  load(id: ID): Promise<T> {
    const stmt = select<ID>(id, this.table, this.keys, this.param);
    if (this.fromDB) {
      return this.query(stmt.query, stmt.args, this.map).then(res => {
        if (!res || res.length === 0) {
          return null;
        } else {
          const obj = res[0];
          return this.fromDB(obj);
        }
      });
    } else {
      return this.query(stmt.query, stmt.args, this.map).then(res => (!res || res.length === 0) ? null : res[0]);
    }
  }
  exist(id: ID): Promise<boolean> {
    const field = (this.keys[0].field ? this.keys[0].field : this.keys[0].name);
    const stmt = exist<ID>(id, this.table, this.keys, this.param, field);
    return this.query(stmt.query, stmt.args, this.map).then(res => (!res || res.length === 0) ? false : true);
  }
}
export interface Manager {
  exec(sql: string, args?: any[]): Promise<number>;
  execute(statements: Statement[]): Promise<number>;
  query<T>(sql: string, args?: any[], m?: StringMap, fields?: string[]): Promise<T[]>;
}
export function createSqlWriter<T, ID>(table: string,
    manager: Manager,
    attrs: Attributes,
    buildParam: (i: number) => string,
    toDB?: (v: T) => T,
    fromDB?: (v: T) => T) {
  const writer = new SqlWriter<T, ID>(table, manager.query, manager.exec, attrs, buildParam, toDB, fromDB);
  return writer;
}

export class SqlWriter<T, ID> extends SqlLoader<T, ID> {
  version?: string;
  constructor(table: string,
    query: (sql: string, args?: any[], m?: StringMap) => Promise<T[]>,
    public exec: (sql: string, args?: any[]) => Promise<number>,
    attrs: Attributes,
    buildParam: (i: number) => string,
    protected toDB?: (v: T) => T,
    fromDB?: (v: T) => T,
    public execute?: (statements: Statement[]) => Promise<number>) {
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
  insert(obj: T): Promise<number> {
    let obj2 = obj;
    if (this.toDB) {
      obj2 = this.toDB(obj);
    }
    const stmt = buildToInsert(obj2, this.table, this.attributes, this.param, this.version);
    if (stmt) {
      return this.exec(stmt.query, stmt.args);
    } else {
      return Promise.resolve(0);
    }
  }
  update(obj: T): Promise<number> {
    let obj2 = obj;
    if (this.toDB) {
      obj2 = this.toDB(obj);
    }
    const stmt = buildToUpdate(obj2, this.table, this.attributes, this.param, this.version);
    if (stmt) {
      return this.exec(stmt.query, stmt.args);
    } else {
      return Promise.resolve(0);
    }
  }
  patch(obj: T): Promise<number> {
    return this.update(obj);
  }
  delete(id: ID): Promise<number> {
    const stmt = buildToDelete<ID>(id, this.table, this.keys, this.param);
    if (stmt) {
      return this.exec(stmt.query, stmt.args);
    } else {
      return Promise.resolve(0);
    }
  }
}
