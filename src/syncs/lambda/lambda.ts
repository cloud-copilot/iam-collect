import {
  GetPolicyCommand,
  LambdaClient,
  ListFunctionsCommand,
  ListTagsCommand
} from '@aws-sdk/client-lambda'
import { runAndCatch404 } from '../../utils/client-tools.js'
import { parseIfPresent } from '../../utils/json.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

export const LambdaSync = createTypedSyncOperation(
  'lambda',
  'lambdaFunctions',
  createResourceSyncType({
    client: LambdaClient,
    command: ListFunctionsCommand,
    key: 'Functions',
    paginationConfig: {
      inputKey: 'Marker',
      outputKey: 'NextMarker'
    },
    resourceTypeParts: (accountId: string, region: string) => ({
      service: 'lambda',
      resourceType: 'function',
      account: accountId,
      region: region
    }),
    extraFields: {
      tags: async (client, resource) => {
        return runAndCatch404(async () => {
          const tagResult = await client.send(
            new ListTagsCommand({ Resource: resource.FunctionArn })
          )
          return tagResult.Tags
        })
      },
      policy: async (client, resource) => {
        return runAndCatch404(async () => {
          const policyResult = await client.send(
            new GetPolicyCommand({ FunctionName: resource.FunctionName })
          )
          return parseIfPresent(policyResult.Policy)
        })
      }
    },
    tags: (func) => func.extraFields.tags,
    arn: (func) => func.FunctionArn!,
    results: (func) => ({
      metadata: {
        role: func.Role,
        name: func.FunctionName
      },
      policy: func.extraFields.policy
    })
  })
)
