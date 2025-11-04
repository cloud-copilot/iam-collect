const { ListAccountsCommand, OrganizationsClient } = require('@aws-sdk/client-organizations')
const { AssumeRoleCommand, STSClient } = require('@aws-sdk/client-sts')

exports.handler = async (event, context) => {
  console.log({
    message: 'lambda-invoked',
    function: 'list-accounts-lambda',
    requestId: context.awsRequestId,
    event: event
  })

  try {
    const listAccountsRoleArns = process.env.LIST_ACCOUNTS_ROLE_ARNS

    if (!listAccountsRoleArns) {
      throw new Error('LIST_ACCOUNTS_ROLE_ARNS environment variable is required')
    }

    // Parse the comma-separated role ARNs
    const roleArns = listAccountsRoleArns
      .split(',')
      .map((arn) => arn.trim())
      .filter((arn) => arn.length > 0)

    if (roleArns.length === 0) {
      throw new Error('No valid role ARNs found in LIST_ACCOUNTS_ROLE_ARNS')
    }

    console.log({
      message: 'listing-accounts-start',
      function: 'list-accounts-lambda',
      requestId: context.awsRequestId,
      roleCount: roleArns.length,
      roleArns: roleArns
    })

    // Step 1: Get an STS client (this assumes INITIAL_ROLE_ARN first if it set)
    const stsClient = await createStsClient()

    // Step 2: Assume each ListAccounts role and collect accounts
    const allAccounts = []
    const results = []

    for (const roleArn of roleArns) {
      try {
        console.log({
          message: 'assuming-role',
          function: 'list-accounts-lambda',
          requestId: context.awsRequestId,
          roleArn: roleArn
        })

        const assumeListRoleCommand = new AssumeRoleCommand({
          RoleArn: roleArn,
          RoleSessionName: `list-accounts-${Date.now()}-${roleArns.indexOf(roleArn)}`
        })

        const listRoleCredentials = await stsClient.send(assumeListRoleCommand)

        // Create Organizations client with the assumed role credentials
        const orgClient = new OrganizationsClient({
          credentials: {
            accessKeyId: listRoleCredentials.Credentials.AccessKeyId,
            secretAccessKey: listRoleCredentials.Credentials.SecretAccessKey,
            sessionToken: listRoleCredentials.Credentials.SessionToken
          }
        })

        // Step 3: List accounts using the assumed role
        const accounts = await listAccountsWithPagination(orgClient, roleArn)

        allAccounts.push(...accounts)

        console.log({
          message: 'list-accounts-for-role',
          function: 'list-accounts-lambda',
          requestId: context.awsRequestId,
          roleArn: roleArn,
          accountCount: accounts.length
        })
      } catch (roleError) {
        console.error({
          message: 'error-listing-accounts-for-role',
          function: 'list-accounts-lambda',
          requestId: context.awsRequestId,
          roleArn: roleArn,
          error: {
            message: roleError.message,
            type: roleError.name
          }
        })
        results.push({
          roleArn: roleArn,
          accountCount: 0,
          accounts: [],
          status: 'error',
          error: {
            message: roleError.message,
            type: roleError.name
          }
        })
      }
    }

    const result = {
      status: 'SUCCESS',
      totalAccounts: allAccounts.length,
      accounts: allAccounts,
      statusCode: 200,
      message: 'Successfully retrieved account list',
      timestamp: new Date().toISOString(),
      requestId: context.awsRequestId
    }

    console.log({
      message: 'completed',
      function: 'list-accounts-lambda',
      requestId: context.awsRequestId,
      totalAccounts: allAccounts.length,
      roleCount: roleArns.length
    })
    return result
  } catch (error) {
    console.error({
      message: 'error-listing-accounts',
      function: 'list-accounts-lambda',
      requestId: context.awsRequestId,
      error: {
        message: error.message,
        type: error.name,
        stack: error.stack
      }
    })

    const errorResult = {
      statusCode: 500,
      error: {
        message: error.message,
        type: error.name,
        timestamp: new Date().toISOString()
      }
    }

    // For Step Functions, we want to return the error, not throw it
    return errorResult
  }
}

// Helper function to list accounts with pagination
async function listAccountsWithPagination(orgClient, roleArn) {
  const accounts = []
  let nextToken = undefined

  do {
    const command = new ListAccountsCommand({
      NextToken: nextToken,
      MaxResults: 20 // Maximum allowed by Organizations API
    })

    console.log({
      message: 'listing-accounts',
      function: 'list-accounts-lambda',
      roleArn: roleArn,
      hasNextToken: !!nextToken
    })
    const response = await orgClient.send(command)

    if (response.Accounts) {
      accounts.push(...response.Accounts.map((account) => account.Id))
      console.log({
        message: 'retrieved-accounts-batch',
        function: 'list-accounts-lambda',
        roleArn: roleArn,
        batchSize: response.Accounts.length,
        hasMore: !!response.NextToken
      })
    }

    nextToken = response.NextToken
  } while (nextToken)

  return accounts
}

async function createStsClient() {
  // if INITIAL_ROLE_ARN environment variable is set, assume that role first and return STS client with those credentials
  // otherwise return default STS client
  const initialRoleArn = process.env.INITIAL_ROLE_ARN
  if (!initialRoleArn || initialRoleArn.length === 0) {
    return new STSClient()
  }
  const stsClient = new STSClient({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      sessionToken: process.env.AWS_SESSION_TOKEN
    }
  })

  const assumeRoleCommand = new AssumeRoleCommand({
    RoleArn: initialRoleArn,
    RoleSessionName: `list-accounts-${Date.now()}`
  })

  const assumedRoleCredentials = await stsClient.send(assumeRoleCommand)
  return new STSClient({
    credentials: {
      accessKeyId: assumedRoleCredentials.Credentials.AccessKeyId,
      secretAccessKey: assumedRoleCredentials.Credentials.SecretAccessKey,
      sessionToken: assumedRoleCredentials.Credentials.SessionToken
    }
  })
}
