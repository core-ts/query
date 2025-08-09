import { Checker } from "./health"
export { Checker as SqlChecker }

import { resource } from "./build"
import { Attribute, StringMap } from "./metadata"
import { SqlLoader, SqlWriter } from "./services"
// export {SqlLoader as SqlLoadRepository};
export { SqlWriter as Repository, SqlWriter as SqlGenericRepository, SqlLoader as SqlViewRepository }

export { SqlWriter as SqlGenericService, SqlLoader as SqlLoadService, SqlLoader as SqlViewService }

export * from "./batch"
export * from "./build"
export * from "./client"
export * from "./health"
export * from "./metadata"
export * from "./query"
export * from "./search"
export * from "./SearchBuilder"
export * from "./services"

export interface Config {
  connectString?: string | undefined
  host?: string | undefined
  port?: number
  server?: string | undefined
  database?: string | undefined
  user?: string | undefined
  password?: string | undefined
  multipleStatements?: boolean | undefined
  max?: number | undefined
  min?: number | undefined
  idleTimeoutMillis?: number | undefined
}

// tslint:disable-next-line:max-classes-per-file
export class Loader<T> {
  map?: StringMap
  constructor(
    public query: (sql: string, args?: any[], m?: StringMap, bools?: Attribute[]) => Promise<T[]>,
    public sql: string,
    m?: StringMap,
    public bools?: Attribute[],
  ) {
    this.map = m
    this.load = this.load.bind(this)
  }
  load(): Promise<T[]> {
    return this.query(this.sql, [], this.map, this.bools)
  }
}
export function toArray(arr: any[]): any[] {
  if (!arr || arr.length === 0) {
    return []
  }
  const p: any[] = []
  const l = arr.length
  for (let i = 0; i < l; i++) {
    if (arr[i] === undefined || arr[i] == null) {
      p.push(null)
    } else {
      if (typeof arr[i] === "object") {
        if (arr[i] instanceof Date) {
          p.push(arr[i])
        } else {
          if (resource.string) {
            const s: string = JSON.stringify(arr[i])
            p.push(s)
          } else {
            p.push(arr[i])
          }
        }
      } else {
        p.push(arr[i])
      }
    }
  }
  return p
}
export function map<T>(obj: T, m?: StringMap): any {
  if (!m) {
    return obj
  }
  const mkeys = Object.keys(m)
  if (mkeys.length === 0) {
    return obj
  }
  const obj2: any = {}
  const keys = Object.keys(obj as any)
  for (const key of keys) {
    let k0 = m[key]
    if (!k0) {
      k0 = key
    }
    obj2[k0] = (obj as any)[key]
  }
  return obj2
}
