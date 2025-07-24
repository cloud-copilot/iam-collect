/**
 *
 * @param operation The operation to run.
 * @returns If successful, returns the result of operation. If operation returns a 404, returns undefined.
 * @throws If operation returns a non 404 error, rethrows that error.
 */
export async function runAndCatch404<T>(
  operation: () => Promise<T | undefined>
): Promise<T | undefined> {
  try {
    const result = await operation()
    return result
  } catch (e: any) {
    if (e['$metadata']?.httpStatusCode == 404) {
      return undefined
    }
    throw e
  }
}

/**
 *
 * @param operation The operation to run.
 * @returns If successful, returns the result of operation. If operation returns a 404, returns undefined.
 * @throws If operation returns a non 400 error, rethrows that error.
 */
export async function runAndCatchAccessDenied<T>(
  operation: () => Promise<T | undefined>,
  onError?: (error: any) => Promise<T | undefined>
): Promise<T | undefined> {
  try {
    const result = await operation()
    return result
  } catch (e: any) {
    const errorName = e.name

    if (errorName == 'AccessDeniedException' || errorName == 'AccessDenied') {
      if (onError) {
        return onError(e)
      }
      return undefined
    }
    throw e
  }
}

/**
 * Run an operation and catch a specific error by name. Return undefined if the error matches, otherwise rethrow the error.
 *
 * @param errorName the name of the error to catch
 * @param operation the operation to run
 * @returns If successful, returns the result of operation. If operation throws an error with the specified name, returns undefined.
 * @throws If operation throws an error with a different name, rethrows that error.
 */

export async function runAndCatchError<T>(
  errorName: string,
  operation: () => Promise<T | undefined>,
  onError?: (error: any) => Promise<T | undefined>
): Promise<T | undefined> {
  try {
    const result = await operation()
    return result
  } catch (e: any) {
    if (e.name == errorName) {
      if (onError) {
        return onError(e)
      }
      return undefined
    }
    throw e
  }
}
