/**
 * Custom exception for indicating that a resource was not found
 * Compatible with AWS SDK error structure and can be caught by runAndCatch404
 */
export class ResourceNotFoundException extends Error {
  public readonly name = 'ResourceNotFoundException'
  public readonly $metadata: {
    httpStatusCode: number
    requestId: string
    attempts: number
    totalRetryDelay: number
  }

  constructor(message: string, requestId?: string) {
    super(message)

    // Set up metadata to match AWS SDK error structure
    this.$metadata = {
      httpStatusCode: 404,
      requestId: requestId || `custom-client-${Date.now()}`,
      attempts: 1,
      totalRetryDelay: 0
    }

    // Ensure proper prototype chain for instanceof checks
    Object.setPrototypeOf(this, ResourceNotFoundException.prototype)
  }

  /**
   * Create a ResourceNotFoundException for a missing resource
   */
  static forResource(
    resourceType: string,
    identifier: string,
    requestId?: string
  ): ResourceNotFoundException {
    return new ResourceNotFoundException(
      `${resourceType} '${identifier}' does not exist`,
      requestId
    )
  }

  /**
   * Create a ResourceNotFoundException with a custom message
   */
  static withMessage(message: string, requestId?: string): ResourceNotFoundException {
    return new ResourceNotFoundException(message, requestId)
  }
}
