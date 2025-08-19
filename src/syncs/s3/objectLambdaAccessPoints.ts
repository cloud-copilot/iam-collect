import {
  GetAccessPointForObjectLambdaCommand,
  GetAccessPointPolicyForObjectLambdaCommand,
  ListAccessPointsForObjectLambdaCommand,
  S3ControlClient
} from '@aws-sdk/client-s3-control'
import { runAndCatch404 } from '../../utils/client-tools.js'
import { parseIfPresent } from '../../utils/json.js'
import { Sync } from '../sync.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

export const S3ObjectLambdaAccessPointsSync: Sync = createTypedSyncOperation(
  's3-object-lambda',
  'objectLambdaAccessPoints',
  createResourceSyncType({
    client: S3ControlClient,
    command: ListAccessPointsForObjectLambdaCommand,
    key: 'ObjectLambdaAccessPointList',
    arguments: (accountId, region) => ({
      AccountId: accountId
    }),
    paginationConfig: {
      inputKey: 'NextToken',
      outputKey: 'NextToken'
    },
    arn: (accessPoint, region, account, partition) => accessPoint.ObjectLambdaAccessPointArn!,
    resourceTypeParts: (account, region) => ({
      service: 's3-object-lambda',
      resourceType: 'accesspoint',
      account,
      region
    }),
    extraFields: {
      details: async (client, accessPoint, accountId) => {
        const result = await client.send(
          new GetAccessPointForObjectLambdaCommand({
            AccountId: accountId,
            Name: accessPoint.Name!
          })
        )
        return result
      },
      policy: async (client, accessPoint, accountId) => {
        return runAndCatch404(async () => {
          const result = await client.send(
            new GetAccessPointPolicyForObjectLambdaCommand({
              Name: accessPoint.Name!,
              AccountId: accountId
            })
          )
          return parseIfPresent(result.Policy)
        })
      }
    },
    tags: () => undefined, // Object Lambda Access Points do not support tags
    results: (accessPoint) => ({
      metadata: {
        name: accessPoint.Name!,
        alias: accessPoint.extraFields.details?.Alias
      },
      bpa: accessPoint.extraFields.details?.PublicAccessBlockConfiguration,
      policy: accessPoint.extraFields.policy
    })
  })
)
