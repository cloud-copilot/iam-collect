import crypto from 'crypto'

const characters = '0123456789abcdefghijklmnopqrstuvwxyz'
/**
 * Generates a random string of a given length
 *
 * @param length The length of the string you would like to generate
 * @returns
 */
export function randomCharacters(length: number = 5): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * characters.length)
    result += characters[randomIndex]
  }

  return result
}

/**
 * Generates a short hash of the input string using SHA-256 and encodes it in base64url format.
 * The resulting hash is truncated to 8 characters.
 *
 * @param input The input string to hash.
 * @returns A short hash string.
 */
export async function shortHash(input: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(input)

  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = new Uint8Array(hashBuffer)

  let base64 = btoa(String.fromCharCode(...hashArray))

  return base64.slice(0, 8)
}
