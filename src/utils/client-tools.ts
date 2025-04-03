
/**
 *
 * @param operation The operation to run.
 * @returns If successful, returns the result of operation. If operation returns a 404, returns undefined.
 * @throws If operation returns a non 404 error, rethrows that error.
 */
export async function runAndCatch404<T>(operation: () => Promise<T|undefined>): Promise<T|undefined> {
  try {
    const result = await operation()
    return result
  } catch (e: any) {
    if (e['$metadata']?.httpStatusCode == 404) {
      console.log('404 from API operation, returning undefined')
      return undefined;
    }
    throw(e);
  }
}

/**
 *
 * @param operation The operation to run.
 * @returns If successful, returns the result of operation. If operation returns a 404, returns undefined.
 * @throws If operation returns a non 400 error, rethrows that error.
 */
export async function runAndCatchAccessDenied<T>(operation: () => Promise<T|undefined>): Promise<T|undefined> {
  try {
    const result = await operation()
    return result
  } catch (e: any) {
    const errorName =  e.name
    const httpStatusCode = e['$metadata']?.httpStatusCode

    if (errorName == 'AccessDeniedException' || errorName == 'AccessDenied') {
      console.error(`${errorName}(${httpStatusCode}) returned from API operation, returning undefined`)
      return undefined;
    }
    throw(e);
  }
}