/**
 * Just chill for a bit. Used for testing.
 *
 * @param milliseconds the number of milliseconds to sleep
 * @returns A promise that resolves after the specified time
 */
export function sleep(milliseconds: number) {
  return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
