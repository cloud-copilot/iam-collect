/**
 * Parse a JSON string if it is present, otherwise return undefined.
 *
 * @param value the JSON string to parse, or undefined if not present
 * @returns the parsed JSON object, or undefined if value is undefined
 */
export function parseIfPresent(value: string | undefined): any {
  if (value === undefined || value === null || value.trim() === '') {
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

/**
 * Keys that should be ordered predictably in IAM policy documents.
 */
const predictableIamKeys: Record<string, number> = {
  Version: 1,
  Statement: 2,
  Sid: 3,
  Effect: 4,
  Action: 5,
  Principal: 6,
  Resource: 7,
  Condition: 8
}

/**
 * Comparator function to sort IAM keys predictably.
 *
 * @param a the first key
 * @param b the second key
 * @returns the comparison result using predictable IAM key order, or standard system order otherwise
 */
function iamComparator(a: any, b: any): number {
  const aRank = typeof a == 'string' ? predictableIamKeys[a] : undefined
  const bRank = typeof b == 'string' ? predictableIamKeys[b] : undefined

  if (aRank !== undefined && bRank !== undefined) {
    return aRank - bRank
  }

  return a.localeCompare(b)
}

/**
 * Consistently stringify a JSON object with predictable key ordering.
 * This includes consistently ordering array elements.
 *
 * IAM policy documents have special predictable key ordering for better semantic readability.
 *
 * This intentionally does not handle custom classes or circular references.
 *
 * @param node the JSON object to stringify
 * @param spacer the string to use for one level of indentation
 * @param startingSpaces the current indentation string
 * @returns the consistently stringified JSON, or undefined if the input was undefined
 */
export function consistentStringify(
  node: any,
  spacer: string = '  ',
  startingSpaces: string = ''
): string {
  if (node === undefined) {
    return undefined as any
  }

  if (node && node.toJSON && typeof node.toJSON === 'function') {
    node = node.toJSON()
  }
  if (typeof node === 'number') return isFinite(node) ? '' + node : 'null'
  if (typeof node !== 'object') return JSON.stringify(node)

  if (Array.isArray(node)) {
    if (node.length === 0) return '[]'
    const arrayValues = node.map(
      (v) => consistentStringify(v, spacer, startingSpaces + spacer) || 'null'
    )
    arrayValues.sort()
    let out = '['
    for (let i = 0; i < arrayValues.length; i++) {
      if (arrayValues[i] === undefined) {
        continue
      }
      if (i > 0) {
        out += ','
      }
      out += `\n${startingSpaces + spacer}${arrayValues[i]}`
    }

    return out + `\n${startingSpaces}]`
  }

  if (node === null) return 'null'

  var keys = Object.keys(node).sort(iamComparator)
  if (keys.length === 0) return '{}'
  const keySpace = startingSpaces + spacer
  let out = `{\n`
  let valuePrinted = false
  for (let i = 0; i < keys.length; i++) {
    var key = keys[i]
    var value = consistentStringify(node[key], spacer, startingSpaces + spacer)
    if (!value) continue
    if (valuePrinted) out += ',\n'
    out += keySpace + JSON.stringify(key) + ': ' + value
    valuePrinted = true
  }
  return out + `\n${startingSpaces}}`
}
