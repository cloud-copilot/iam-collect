/**
 * Parse a JSON string if it is present, otherwise return undefined.
 *
 * @param value the JSON string to parse, or undefined if not present
 * @returns the parsed JSON object, or undefined if value is undefined
 */
export function parseIfPresent(value: string | undefined): any {
  if (!value) {
    return undefined
  }
  return JSON.parse(value)
}
