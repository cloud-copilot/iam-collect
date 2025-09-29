/**
 * Parse a JSON string if it is present, otherwise return undefined.
 *
 * @param value the JSON string to parse, or undefined if not present
 * @returns the parsed JSON object, or undefined if value is undefined
 */
export function parseIfPresent(value: string | undefined): any {
  if (value === undefined) {
    return undefined
  }
  return JSON.parse(value)
}

/**
 * Stringify a value to JSON if it is present, otherwise return undefined.
 *
 * @param value the value to stringify, or undefined if not present
 * @returns the JSON string or undefined
 */
export function stringifyIfPresent(value: any): string | undefined {
  if (value === undefined) {
    return undefined
  }
  if (typeof value === 'string') {
    return value
  }
  return JSON.stringify(value)
}
