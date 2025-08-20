import {
  GetTableBucketEncryptionCommand,
  GetTableBucketPolicyCommand,
  ListTableBucketsCommand,
  S3TablesClient
} from '@aws-sdk/client-s3tables'
import { runAndCatch404 } from '../../utils/client-tools.js'
import { parseIfPresent } from '../../utils/json.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

export const S3TableBucketsSync = createTypedSyncOperation(
  's3tables',
  'tableBuckets',
  createResourceSyncType({
    client: S3TablesClient,
    command: ListTableBucketsCommand,
    key: 'tableBuckets',
    paginationConfig: {
      inputKey: 'continuationToken',
      outputKey: 'continuationToken'
    },
    arn: (bucket) => bucket.arn!,
    extraFields: {
      policy: async (client, bucket) => {
        return runAndCatch404(async () => {
          const policy = await client.send(
            new GetTableBucketPolicyCommand({ tableBucketARN: bucket.arn })
          )
          return parseIfPresent(policy.resourcePolicy)
        })
      },
      encryption: async (client, bucket) => {
        return runAndCatch404(async () => {
          const encryption = await client.send(
            new GetTableBucketEncryptionCommand({ tableBucketARN: bucket.arn })
          )
          return encryption.encryptionConfiguration
        })
      }
    },
    tags: (bucket) => undefined,
    resourceTypeParts: (account, region) => ({
      service: 's3tables',
      resourceType: 'bucket',
      account,
      region
    }),
    results: (bucket) => ({
      metadata: {
        name: bucket.name,
        id: bucket.tableBucketId,
        encryptionAlgorithm: bucket.extraFields.encryption?.sseAlgorithm,
        key: bucket.extraFields.encryption?.kmsKeyArn
      },
      policy: bucket.extraFields.policy
    })
  })
)
