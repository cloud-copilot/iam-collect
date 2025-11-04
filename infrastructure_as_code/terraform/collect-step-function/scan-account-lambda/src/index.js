const { downloadData } = require('@cloud-copilot/iam-collect')

exports.handler = async (event, context) => {
  const { s3Prefix, accountId } = event

  console.log({
    message: 'lambda-invoked',
    function: 'scan-account-lambda',
    requestId: context.awsRequestId,
    accountId: accountId,
    s3Prefix: s3Prefix
  })

  try {
    // Extract arguments from the event
    if (!s3Prefix || !accountId) {
      throw new Error(
        'Missing required parameters: s3Prefix and accountId must be provided in the event'
      )
    }

    // Read environment variables
    const storageBucketName = process.env.STORAGE_BUCKET_NAME
    const storageBucketRegion = process.env.STORAGE_BUCKET_REGION
    const initialCollectRoleArn = process.env.INITIAL_COLLECT_ROLE_ARN
    let collectRolePathAndName = process.env.COLLECT_ROLE_PATH_AND_NAME

    console.log({
      message: 'configuration-loaded',
      function: 'scan-account-lambda',
      requestId: context.awsRequestId,
      accountId: accountId,
      config: {
        storageBucketName: storageBucketName,
        storageBucketRegion: storageBucketRegion,
        hasInitialRole: !!initialCollectRoleArn,
        collectRolePathAndName: collectRolePathAndName
      }
    })

    // Create the config object as specified
    const config = {
      storage: {
        type: 's3',
        bucket: storageBucketName,
        prefix: s3Prefix,
        region: storageBucketRegion
      },
      auth: {
        // This is set conditionally below if an initialCollectRoleArn is provided
        // initialRole: {
        //     arn: initialCollectRoleArn
        // },
        role: {
          pathAndName: collectRolePathAndName,
          sessionName: `iam-collect-${accountId}`
        }
      }
    }

    if (initialCollectRoleArn && initialCollectRoleArn.length > 0) {
      config.auth.initialRole = {
        arn: initialCollectRoleArn
      }
    }

    console.log({
      message: 'starting-data-download',
      function: 'scan-account-lambda',
      requestId: context.awsRequestId,
      accountId: accountId,
      s3Prefix: s3Prefix,
      storageBucket: storageBucketName
    })

    await downloadData(
      [config], // Download configuration
      [accountId], // The account to scan
      [], // All regions
      [], // All services
      undefined, // Use default concurrency
      true, // Don't index
      true // Only write new data, don't delete stale data. We assume every run is a new full scan
    )

    console.log({
      message: 'account-scan-completed',
      function: 'scan-account-lambda',
      requestId: context.awsRequestId,
      accountId: accountId,
      s3Prefix: s3Prefix
    })

    const response = {
      status: 'SUCCESS',
      statusCode: 200,
      message: 'Account scanning completed successfully',
      accountId: accountId,
      s3Prefix: s3Prefix,
      timestamp: new Date().toISOString(),
      requestId: context.awsRequestId
    }

    return response
  } catch (error) {
    console.error({
      message: 'account-scan-failed',
      function: 'scan-account-lambda',
      requestId: context.awsRequestId,
      accountId: accountId,
      error: {
        message: error.message,
        type: error.constructor.name,
        stack: error.stack
      }
    })

    // For Step Functions, you can either:
    // 1. Return an error object (current approach)
    // 2. Throw the error and let Step Functions handle it

    // Option 1: Return error object (allows Step Function to continue with error handling)
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

    // Option 2: Uncomment this to let Step Functions catch the exception
    // throw error;
  }
}
