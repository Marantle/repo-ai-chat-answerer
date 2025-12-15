/**
 * Strict types for JSON values.
 * Used throughout the codebase to ensure type safety when working with JSON data.
 */

export interface JsonObject {
  [key: string]: JsonValue
}

export type JsonPrimitive = string | number | boolean | null

export type JsonArray = JsonValue[]

export type JsonValue = JsonPrimitive | JsonObject | JsonArray

function isPrimitive(type: string): boolean {
  return type === 'string' || type === 'number' || type === 'boolean'
}

function isJsonArray(value: unknown): value is JsonArray {
  return Array.isArray(value) && value.every(isJsonValue)
}

function isJsonObject(value: unknown): value is JsonObject {
  return (
    typeof value === 'object' && Object.values(value as Record<string, unknown>).every(isJsonValue)
  )
}

/**
 * Type guard to check if a value is a valid JSON value.
 */
export function isJsonValue(value: unknown): value is JsonValue {
  if (value === null) return true

  const type = typeof value
  if (isPrimitive(type)) return true
  if (Array.isArray(value)) return isJsonArray(value)
  if (type === 'object') return isJsonObject(value)

  return false
}
