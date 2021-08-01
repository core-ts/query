import {StringMap} from './build';
import {Attribute} from './metadata';
import {createSqlWriter, SqlLoader, SqlWriter} from './services';
export {SqlLoader as SqlLoadRepository};
export {SqlWriter as SqlGenericRepository};
export {SqlLoader as SqlLoadService};
export {SqlWriter as SqlGenericService};
export {createSqlWriter as createGenericRepository};
export {createSqlWriter as createGenericService};

export * from './metadata';
export * from './build';
export * from './services';
export * from './batch';

export function toArray<T>(arr: T[]): T[] {
  if (!arr || arr.length === 0) {
    return [];
  }
  const p: T[] = [];
  const l = arr.length;
  for (let i = 0; i < l; i++) {
    if (arr[i] === undefined) {
      p.push(null);
    } else {
      p.push(arr[i]);
    }
  }
  return p;
}
export function handleResults<T>(r: T[], m?: StringMap, bools?: Attribute[]) {
  if (m) {
    const res = mapArray(r, m);
    if (bools && bools.length > 0) {
      return handleBool(res, bools);
    } else {
      return res;
    }
  } else {
    if (bools && bools.length > 0) {
      return handleBool(r, bools);
    } else {
      return r;
    }
  }
}
export function handleBool<T>(objs: T[], bools: Attribute[]) {
  if (!bools || bools.length === 0 || !objs) {
    return objs;
  }
  for (const obj of objs) {
    for (const field of bools) {
      const value = obj[field.name];
      if (value != null && value !== undefined) {
        const b = field.true;
        if (b == null || b === undefined) {
          // tslint:disable-next-line:triple-equals
          obj[field.name] = ('1' == value || 'T' == value || 'Y' == value);
        } else {
          // tslint:disable-next-line:triple-equals
          obj[field.name] = (value == b ? true : false);
        }
      }
    }
  }
  return objs;
}
export function map<T>(obj: T, m?: StringMap): any {
  if (!m) {
    return obj;
  }
  const mkeys = Object.keys(m);
  if (mkeys.length === 0) {
    return obj;
  }
  const obj2: any = {};
  const keys = Object.keys(obj);
  for (const key of keys) {
    let k0 = m[key];
    if (!k0) {
      k0 = key;
    }
    obj2[k0] = obj[key];
  }
  return obj2;
}
export function mapArray<T>(results: T[], m?: StringMap): T[] {
  if (!m) {
    return results;
  }
  const mkeys = Object.keys(m);
  if (mkeys.length === 0) {
    return results;
  }
  const objs = [];
  const length = results.length;
  for (let i = 0; i < length; i++) {
    const obj = results[i];
    const obj2: any = {};
    const keys = Object.keys(obj);
    for (const key of keys) {
      let k0 = m[key];
      if (!k0) {
        k0 = key;
      }
      obj2[k0] = (obj as any)[key];
    }
    objs.push(obj2);
  }
  return objs;
}
