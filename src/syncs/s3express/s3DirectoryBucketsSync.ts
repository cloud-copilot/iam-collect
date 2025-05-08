import {
  GetBucketEncryptionCommand,
  GetBucketPolicyCommand,
  ListDirectoryBucketsCommand,
  S3Client
} from '@aws-sdk/client-s3'
import { runAndCatch404 } from '../../utils/client-tools.js'
import { parseIfPresent } from '../../utils/json.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

export const S3DirectoryBucketsSync = createTypedSyncOperation(
  's3express',
  'directoryBuckets',
  createResourceSyncType({
    client: S3Client,
    command: ListDirectoryBucketsCommand,
    key: 'Buckets',
    arguments: () => ({ MaxDirectoryBuckets: 1000 }),
    paginationConfig: {
      inputKey: 'ContinuationToken',
      outputKey: 'ContinuationToken'
    },
    arn: (bucket, region, account, partition) =>
      directoryBucketArn(partition, region, account, bucket.Name!),
    extraFields: {
      policy: async (client, bucket) => {
        new S3Client({})
        return runAndCatch404(async () => {
          const policy = await client.send(new GetBucketPolicyCommand({ Bucket: bucket.Name! }))
          return parseIfPresent(policy.Policy)
        })
      },
      encryption: async (client, bucket) => {
        const encryption = await client.send(
          new GetBucketEncryptionCommand({ Bucket: bucket.Name! })
        )
        return encryption.ServerSideEncryptionConfiguration
      }
    },
    tags: (bucket) => undefined,
    resourceTypeParts: (account, region) => ({
      service: 's3express',
      resourceType: 'bucket',
      account,
      region
    }),
    results: (bucket) => ({
      metadata: {
        name: bucket.Name,
        encryption: bucket.extraFields.encryption?.Rules
      },
      policy: bucket.extraFields.policy
    })
  })
)

/**
 * Create an ARN for a directory bucket
 *
 * @param partition the partition of the bucket
 * @param region the region of the bucket
 * @param account the account the bucket is in
 * @param bucketName the name of the bucket
 * @returns the full arn of the directory bucket
 */
function directoryBucketArn(
  partition: string,
  region: string,
  account: string,
  bucketName: string
) {
  return `arn:${partition}:s3express:${region}:${account}:bucket/${bucketName}`
}
