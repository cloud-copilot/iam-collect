import {
  FunctionConfiguration,
  GetPolicyCommand,
  LambdaClient,
  ListFunctionsCommand,
  ListTagsCommand
} from '@aws-sdk/client-lambda'
import { AwsCredentialIdentityWithMetaData } from '../../aws/auth.js'
import { AwsClientPool } from '../../aws/ClientPool.js'
import { AwsIamStore } from '../../persistence/AwsIamStore.js'
import { runAndCatch404 } from '../../utils/client-tools.js'
import { Sync, syncData } from '../sync.js'

export const LambdaSync: Sync = {
  awsService: 'lambda',
  name: 'lambda',
  global: false,
  execute: async (
    accountId: string,
    region: string,
    credentials: AwsCredentialIdentityWithMetaData,
    storage: AwsIamStore,
    endpoint: string | undefined
  ): Promise<void> => {
    const lambdaClient = AwsClientPool.defaultInstance.client(
      LambdaClient,
      credentials,
      region,
      endpoint
    )

    const command = new ListFunctionsCommand()

    const functions: FunctionConfiguration[] = []
    let marker: string | undefined = undefined
    do {
      const response = await lambdaClient.send(command)
      functions.push(...(response.Functions || []))
      marker = response.NextMarker
    } while (marker)

    const functionData: ({ arn: string } & Record<string, any>)[] = []
    for (const func of functions) {
      const policy = await runAndCatch404(async () => {
        const policyResult = await lambdaClient.send(
          new GetPolicyCommand({ FunctionName: func.FunctionName })
        )
        if (policyResult.Policy) {
          return JSON.parse(policyResult.Policy)
        }
        return undefined
      })
      const tags = await runAndCatch404(async () => {
        const tagsResult = await lambdaClient.send(
          new ListTagsCommand({ Resource: func.FunctionArn })
        )
        return tagsResult.Tags
      })

      functionData.push({
        arn: func.FunctionArn!,
        metadata: {
          role: func.Role,
          arn: func.FunctionArn,
          name: func.FunctionName
        },
        policy,
        tags
      })
    }

    await syncData(functionData, storage, accountId, {
      service: 'lambda',
      resourceType: 'function',
      account: accountId,
      region: region
    })
  }
}
