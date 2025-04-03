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
