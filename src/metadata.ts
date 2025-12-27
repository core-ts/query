export interface Module {
  id?: string | number
  path?: string
  route?: string
}
export interface Config {
  host?: string
  port?: number
  user?: string
  password?: string
  database?: string
}
export interface StringMap {
  [key: string]: string
}
export interface Statement {
  query: string
  params?: any[]
}

export type DataType =
  | "ObjectId"
  | "date"
  | "datetime"
  | "time"
  | "boolean"
  | "number"
  | "integer"
  | "string"
  | "text"
  | "object"
  | "array"
  | "binary"
  | "primitives"
  | "booleans"
  | "numbers"
  | "integers"
  | "strings"
  | "dates"
  | "datetimes"
  | "times"
export type FormatType = "currency" | "percentage" | "email" | "url" | "phone" | "fax" | "ipv4" | "ipv6"
export type Operator = "=" | "like" | "!=" | "<>" | ">" | ">=" | "<" | "<="

export interface Model {
  name?: string
  attributes: Attributes
  source?: string
  table?: string
  collection?: string
  model?: any
  schema?: any
}
export interface Attribute {
  name?: string
  column?: string
  type?: DataType
  operator?: Operator
  default?: string | number | Date | boolean
  key?: boolean
  q?: boolean
  noinsert?: boolean
  noupdate?: boolean
  nopatch?: boolean
  version?: boolean
  ignored?: boolean
  true?: string | number
  false?: string | number
}
export interface Attributes {
  [key: string]: Attribute
}
