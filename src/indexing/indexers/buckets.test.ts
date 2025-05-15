import { describe, expect, it } from 'vitest'
import { FileSystemAwsIamStore } from '../../persistence/file/FileSystemAwsIamStore.js'
import { InMemoryPathBasedPersistenceAdapter } from '../../persistence/InMemoryPathBasedPersistenceAdapter.js'
import { S3BucketIndexer } from './buckets.js'

describe('S3BucketIndexer', () => {
  describe('updateCache', () => {
    it('should sync buckets for the specified regions', async () => {
      // Given an existing cache
      const existingCache = {
        bucket1: { accountId: 'account1', region: 'us-east-1' },
        bucket2: { accountId: 'account1', region: 'us-east-1' },
        bucket3: { accountId: 'account2', region: 'us-west-2' },
        bucket4: { accountId: 'account2', region: 'us-west-2' }
      }

      // And a store with some buckets
      const storage = new FileSystemAwsIamStore(
        'mockStore',
        'aws',
        '/',
        new InMemoryPathBasedPersistenceAdapter()
      )

      ;[
        { arn: 'arn:aws:s3:::bucket1', accountId: 'account1', region: 'us-east-1' },
        { arn: 'arn:aws:s3:::bucket5', accountId: 'account1', region: 'us-east-1' }
      ].map((bucket) => {
        storage.saveResourceMetadata(bucket.accountId, bucket.arn, 'metadata', {
          arn: bucket.arn,
          name: bucket.arn.split(':').at(-1),
          region: bucket.region
        })
      })

      // When updateCache is called for one region
      await S3BucketIndexer.updateCache(existingCache, 'account1', ['us-east-1'], storage)

      // And the cache should be updated
      expect(existingCache).toEqual({
        bucket1: { accountId: 'account1', region: 'us-east-1' },
        // bucket2: { accountId: 'account1', region: 'us-east-1' }, // Removed
        bucket3: { accountId: 'account2', region: 'us-west-2' },
        bucket4: { accountId: 'account2', region: 'us-west-2' },
        bucket5: { accountId: 'account1', region: 'us-east-1' } // Added
      })
    })

    it('should sync buckets for all regions if no regions are specified', async () => {
      // Given an existing cache
      const existingCache = {
        bucket1: { accountId: 'account1', region: 'us-east-1' },
        bucket2: { accountId: 'account1', region: 'us-east-1' },
        bucket3: { accountId: 'account1', region: 'us-west-2' },
        bucket4: { accountId: 'account1', region: 'us-west-2' }
      }

      // And a store with some buckets
      const storage = new FileSystemAwsIamStore(
        'mockStore',
        'aws',
        '/',
        new InMemoryPathBasedPersistenceAdapter()
      )

      ;[
        { arn: 'arn:aws:s3:::bucket1', accountId: 'account1', region: 'us-east-1' },
        { arn: 'arn:aws:s3:::bucket3', accountId: 'account1', region: 'us-west-2' },
        { arn: 'arn:aws:s3:::bucket5', accountId: 'account1', region: 'us-east-1' },
        { arn: 'arn:aws:s3:::bucket6', accountId: 'account1', region: 'us-west-2' }
      ].map((bucket) => {
        storage.saveResourceMetadata(bucket.accountId, bucket.arn, 'metadata', {
          arn: bucket.arn,
          name: bucket.arn.split(':').at(-1),
          region: bucket.region
        })
      })

      // When updateCache is called for one region
      await S3BucketIndexer.updateCache(existingCache, 'account1', [], storage)

      // And the cache should be updated
      expect(existingCache).toEqual({
        bucket1: { accountId: 'account1', region: 'us-east-1' },
        // bucket2: { accountId: 'account1', region: 'us-east-1' }, // Removed
        bucket3: { accountId: 'account1', region: 'us-west-2' },
        // bucket4: { accountId: 'account1', region: 'us-west-2' } // Removed
        bucket5: { accountId: 'account1', region: 'us-east-1' }, // Added
        bucket6: { accountId: 'account1', region: 'us-west-2' } // Added
      })
    })
  })
})
