import { StringMap } from "./metadata"

export interface SimpleDB {
  driver: string
  query<T>(sql: string): Promise<T[]>
}
export interface AnyMap {
  [key: string]: any
}
export class Checker {
  timeout: number
  service: string
  constructor(public select: (sql: string) => Promise<any[]>, public query: string, service?: string, timeout?: number) {
    this.timeout = timeout ? timeout : 4200
    this.service = service ? service : "sql"
    this.check = this.check.bind(this)
    this.name = this.name.bind(this)
    this.build = this.build.bind(this)
  }
  async check(): Promise<AnyMap> {
    const obj = {} as AnyMap
    const promise = this.select(this.query).then((r) => obj)
    if (this.timeout > 0) {
      return promiseTimeOut(this.timeout, promise)
    } else {
      return promise
    }
  }
  name(): string {
    return this.service
  }
  build(data: AnyMap, err: any): AnyMap {
    if (err) {
      if (!data) {
        data = {} as AnyMap
      }
      data["error"] = err
    }
    return data
  }
}

function promiseTimeOut(timeoutInMilliseconds: number, promise: Promise<any>): Promise<any> {
  return Promise.race([
    promise,
    new Promise((resolve, reject) => {
      setTimeout(() => {
        reject(`Timed out in: ${timeoutInMilliseconds} milliseconds!`)
      }, timeoutInMilliseconds)
    }),
  ])
}

export const driverMap: StringMap = {
  oracle: "SELECT SYSDATE FROM DUAL",
  postgres: "select now()",
  mssql: "select getdate()",
  mysql: "select current_time",
  sqlite: "select date()",
}
export function createChecker(query: SimpleDB | ((sql: string) => Promise<any[]>), sql?: string, service?: string, timeout?: number): Checker {
  if (typeof query === "function") {
    if (!sql) {
      sql = "select getdate()"
    }
    return new Checker(query, sql, service, timeout)
  } else {
    const db = query as SimpleDB
    let s = driverMap[db.driver]
    if (!s) {
      s = "select getdate()"
    }
    if (!service) {
      service = db.driver
    }
    return new Checker(db.query, s, service, timeout)
  }
}
