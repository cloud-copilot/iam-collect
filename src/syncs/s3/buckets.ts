import {
  Bucket,
  GetBucketEncryptionCommand,
  GetBucketPolicyCommand,
  GetBucketTaggingCommand,
  GetPublicAccessBlockCommand,
  ListBucketsCommand,
  PublicAccessBlockConfiguration,
  S3Client,
  ServerSideEncryptionConfiguration,
  ServerSideEncryptionRule
} from '@aws-sdk/client-s3'
import { AwsCredentialIdentityWithMetaData } from '../../aws/auth.js'
import { AwsClientPool } from '../../aws/ClientPool.js'
import { AwsIamStore } from '../../persistence/AwsIamStore.js'
import { runAndCatch404 } from '../../utils/client-tools.js'
import { Sync, syncData, SyncOptions } from '../sync.js'
import { paginateResource } from '../typedSync.js'

export interface S3BucketWithData extends Bucket {
  arn: string
  tags: Record<string, string> | undefined
  bpa: PublicAccessBlockConfiguration | undefined
  policy: any
  encryption: ServerSideEncryptionRule[] | undefined
  metadata: {
    name: string
    region: string
  }
}

export const S3GeneralPurposeBucketSync: Sync = {
  awsService: 's3',
  name: 'generalPurposeBuckets',
  global: true,
  execute: async (
    accountId: string,
    region: string,
    credentials: AwsCredentialIdentityWithMetaData,
    storage: AwsIamStore,
    endpoint: string | undefined,
    syncOptions: SyncOptions
  ): Promise<void> => {
    const s3Client = AwsClientPool.defaultInstance.client(S3Client, credentials, region, endpoint)

    const allBuckets = await paginateResource(
      s3Client,
      ListBucketsCommand,
      'Buckets',
      {
        inputKey: 'ContinuationToken',
        outputKey: 'ContinuationToken'
      },
      { MaxBuckets: 1000 }
    )

    const bucketsByRegion: Record<string, Bucket[]> = {}
    for (const bucket of allBuckets) {
      const bucketRegion = bucket.BucketRegion!
      if (!bucketsByRegion[bucketRegion]) {
        bucketsByRegion[bucketRegion] = []
      }
      bucketsByRegion[bucketRegion].push(bucket)
    }

    const augmentedResponses: S3BucketWithData[] = []
    for (const bucketRegion of Object.keys(bucketsByRegion)) {
      const regionClient = AwsClientPool.defaultInstance.client(
        S3Client,
        credentials,
        bucketRegion,
        endpoint
      )
      const regionBuckets = bucketsByRegion[bucketRegion]
      const augmentedRegionBuckets = await Promise.all(
        regionBuckets.map(async (bucket) => {
          const [tags, blockPublicAccessConfig, bucketPolicy, encryption] = await Promise.all([
            getTagsForBucket(regionClient, bucket),
            getBucketPublicAccessSettings(regionClient, bucket),
            getBucketPolicy(regionClient, bucket, credentials.accountId),
            getBucketEncryptionSettings(regionClient, bucket)
          ])

          return {
            arn: `arn:${credentials.partition}:s3:::${bucket.Name}`,
            tags: tags,
            bpa: blockPublicAccessConfig,
            policy: bucketPolicy,
            encryption: encryption?.Rules,
            metadata: {
              name: bucket.Name!,
              region: bucketRegion
            }
          }
        })
      )
      augmentedResponses.push(...augmentedRegionBuckets)

      syncData(augmentedResponses, storage, accountId, {
        service: 's3'
      })
    }
  }
}

/**
 * Get the tags for a bucket.
 *
 * @param client the S3 client to use
 * @param bucket the bucket to get the tags for
 * @returns the tags for the bucket, if any
 */
async function getTagsForBucket(
  client: S3Client,
  bucket: Bucket
): Promise<Record<string, string> | undefined> {
  const tagCommand = new GetBucketTaggingCommand({ Bucket: bucket.Name! })
  const tags = await runAndCatch404<Record<string, string>>(async () => {
    const response = await client.send(tagCommand)
    return response.TagSet?.reduce(
      (acc, tag) => {
        acc[tag.Key!] = tag.Value!
        return acc
      },
      {} as Record<string, string>
    )
  })
  return tags
}

/**
 * Get the bucket policy for a bucket.
 *
 * @param client the S3 client to use
 * @param bucket the bucket to get the policy for
 * @param accountId the account ID of the bucket owner
 * @returns the bucket policy for the bucket, if any
 */
async function getBucketPolicy(
  client: S3Client,
  bucket: Bucket | string,
  accountId: string
): Promise<any | undefined> {
  if (typeof bucket !== 'string') {
    bucket = bucket.Name!
  }
  const policyCommand = new GetBucketPolicyCommand({
    Bucket: bucket,
    ExpectedBucketOwner: accountId
  })
  const policy = await runAndCatch404<any>(async () => {
    const response = await client.send(policyCommand)
    return response.Policy ? JSON.parse(response.Policy) : undefined
  })
  return policy
}

/**
 * Get the public access block configuration for a bucket.
 *
 * @param client The S3 client to use.
 * @param bucket the bucket to get the public access settings for
 * @returns the public access block configuration for the bucket, if any
 */
async function getBucketPublicAccessSettings(
  client: S3Client,
  bucket: Bucket
): Promise<PublicAccessBlockConfiguration | undefined> {
  const command = new GetPublicAccessBlockCommand({ Bucket: bucket.Name! })
  const response = await runAndCatch404(async () => {
    return await client.send(command)
  })
  return response?.PublicAccessBlockConfiguration
}

/**
 * Get the bucket encryption settings for a bucket.
 *
 * @param client the S3 client to use
 * @param bucket the bucket to get the encryption settings for
 * @returns encryption settings for the bucket, if any
 */
async function getBucketEncryptionSettings(
  client: S3Client,
  bucket: Bucket
): Promise<ServerSideEncryptionConfiguration | undefined> {
  const command = new GetBucketEncryptionCommand({ Bucket: bucket.Name! })
  const response = await runAndCatch404(async () => {
    return await client.send(command)
  })
  return response?.ServerSideEncryptionConfiguration
}
