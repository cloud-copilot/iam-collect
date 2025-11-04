/**
 * AWS Lambda function for generating date-based S3 prefixes
 * Runtime: Node.js 22.x with CommonJS
 */

exports.handler = async (event, context) => {
  console.log({
    message: 'lambda-invoked',
    function: 'storage-prefix-lambda',
    requestId: context.awsRequestId,
    event: event
  })

  try {
    // Combined date and time formatting options - easy to customize for different formats
    const dateTimeFormatOptions = {
      year: 'numeric', // 4-digit year (2025)
      month: '2-digit', // 2-digit month (10)
      day: '2-digit', // 2-digit day (28)
      hour: '2-digit', // 2-digit hour (14)
      minute: '2-digit', // 2-digit minute (30)
      hour12: false // Use 24-hour format
    }

    // Get current date and time in one call
    const now = new Date()
    const dateTimeString = now.toLocaleString('en-US', dateTimeFormatOptions)
    // Format will be: "10/28/2025, 14:30"

    // We give you all the parts to build any prefix format you want
    const [month, day, year, hour, minute] = dateTimeString.split(/[\,\/\:\s]+/)

    // Extract base prefix from event
    let { basePrefix = 'iam-collect' } = event
    if (!basePrefix.endsWith('/')) {
      basePrefix += '/'
    }

    // Customize this to be what you want. Here we do YYYY-MM-DD
    const runPrefix = `${year}-${month}-${day}`

    // Generate the full S3 prefix with date and time
    const s3Prefix = `${basePrefix}${runPrefix}/`

    const response = {
      status: 'SUCCESS',
      statusCode: 200,
      message: 'Date prefix generated successfully',
      basePrefix: basePrefix,
      s3Prefix: s3Prefix,
      timestamp: new Date().toISOString(),
      requestId: context.awsRequestId
    }

    console.log({
      message: 'completed-successfully',
      function: 'storage-prefix-lambda',
      requestId: context.awsRequestId,
      s3Prefix: s3Prefix,
      basePrefix: basePrefix,
      runPrefix: runPrefix
    })
    return response
  } catch (error) {
    console.error({
      message: 'failed',
      function: 'storage-prefix-lambda',
      requestId: context.awsRequestId,
      error: {
        message: error.message,
        type: error.constructor.name,
        stack: error.stack
      }
    })

    const errorResponse = {
      status: 'FAILED',
      statusCode: 500,
      error: {
        message: error.message,
        type: error.constructor.name,
        timestamp: new Date().toISOString()
      },
      requestId: context.awsRequestId
    }

    return errorResponse
  }
}
