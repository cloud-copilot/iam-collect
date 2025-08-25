import {
  GetAccessPointCommand,
  GetAccessPointPolicyCommand,
  ListAccessPointsForDirectoryBucketsCommand,
  ListTagsForResourceCommand,
  S3ControlClient
} from '@aws-sdk/client-s3-control'
import { runAndCatch404 } from '../../utils/client-tools.js'
import { parseIfPresent } from '../../utils/json.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

export const S3DirectoryAccessPointsSync = createTypedSyncOperation(
  's3express',
  'directoryAccessPoints',
  createResourceSyncType({
    client: S3ControlClient,
    command: ListAccessPointsForDirectoryBucketsCommand,
    key: 'AccessPointList',
    arguments: (accountId, region) => ({
      AccountId: accountId
    }),
    paginationConfig: {
      inputKey: 'NextToken',
      outputKey: 'NextToken'
    },
    arn: (accessPoint) => accessPoint.AccessPointArn!,
    resourceTypeParts: (account, region) => ({
      service: 's3express',
      resourceType: 'accesspoint',
      account,
      region
    }),
    extraFields: {
      details: async (client, accessPoint, accountId) => {
        const result = await client.send(
          new GetAccessPointCommand({
            AccountId: accountId,
            Name: accessPoint.Name!
          })
        )
        return result
      },
      policy: async (client, accessPoint, accountId) => {
        return runAndCatch404(async () => {
          const result = await client.send(
            new GetAccessPointPolicyCommand({
              Name: accessPoint.Name!,
              AccountId: accountId
            })
          )
          return parseIfPresent(result.Policy)
        })
      },
      tags: async (client, accessPoint, accountId) => {
        return runAndCatch404(async () => {
          const result = await client.send(
            new ListTagsForResourceCommand({
              ResourceArn: accessPoint.AccessPointArn!,
              AccountId: accountId
            })
          )
          return result.Tags
        })
      }
    },
    tags: (accessPoint) => accessPoint.extraFields.tags,
    results: (accessPoint) => ({
      metadata: {
        name: accessPoint.Name!,
        alias: accessPoint.extraFields.details?.Alias,
        networkOrigin: accessPoint.NetworkOrigin,
        vpc: accessPoint.VpcConfiguration?.VpcId,
        bucket: accessPoint.Bucket,
        bucketAccount: accessPoint.BucketAccountId,
        vpcEndpoints: accessPoint.extraFields.details?.Endpoints
      },
      bpa: accessPoint.extraFields.details?.PublicAccessBlockConfiguration,
      policy: accessPoint.extraFields.policy
    })
  })
)
