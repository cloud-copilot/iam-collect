import {
  GetMultiRegionAccessPointPolicyCommand,
  ListMultiRegionAccessPointsCommand,
  S3ControlClient
} from '@aws-sdk/client-s3-control'
import { runAndCatch404 } from '../../utils/client-tools.js'
import { parseIfPresent } from '../../utils/json.js'
import { type Sync } from '../sync.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

export const S3MultiRegionAccessPointsSync: Sync = createTypedSyncOperation(
  's3',
  'multiRegionAccessPoints',
  createResourceSyncType({
    client: S3ControlClient,
    command: ListMultiRegionAccessPointsCommand,
    key: 'AccessPoints',
    arguments: (accountId, region) => ({
      AccountId: accountId
    }),
    paginationConfig: {
      inputKey: 'NextToken',
      outputKey: 'NextToken'
    },
    arn: (accessPoint, region, account, partition) =>
      `arn:${partition}:s3::${account}:accesspoint/${accessPoint.Alias}`,
    resourceTypeParts: (account, region) => ({
      service: 's3',
      resourceType: 'accesspoint',
      account
    }),
    extraFields: {
      policy: async (client, accessPoint, accountId) => {
        const policy = runAndCatch404(async () => {
          const result = await client.send(
            new GetMultiRegionAccessPointPolicyCommand({
              Name: accessPoint.Name!,
              AccountId: accountId
            })
          )
          return parseIfPresent(result.Policy?.Established?.Policy)
        })
        return policy
      }
    },
    tags: () => undefined, // Multi region access points do not have tags
    results: (accessPoint) => ({
      metadata: {
        name: accessPoint.Name!,
        alias: accessPoint.Alias,
        regions: accessPoint.Regions
      },
      bpa: accessPoint.PublicAccessBlock,
      policy: accessPoint.extraFields.policy
    })
  })
)
