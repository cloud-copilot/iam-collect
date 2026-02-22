import { type Indexer } from '../indexer.js'

interface S3BucketIndex {
  accountId: string
  region: string
}

interface BucketMetadata {
  arn: string
  name: string
  region: string | undefined
}

const indexName = 'buckets-to-accounts'

export const S3BucketIndexer: Indexer<Record<string, S3BucketIndex>> = {
  awsService: 's3',
  name: 'bucketsToAccounts',
  getCache: async (storage) => {
    const data = await storage.getIndex(indexName, {})
    return data
  },
  saveCache: async (storage, cache, lockId) => {
    return storage.saveIndex(indexName, cache, lockId)
  },
  updateCache: async (existingCache, accountId, regions, storage) => {
    const regionsSet = new Set(regions)
    const matchesRegion = (region: string | undefined) => {
      return region && (regionsSet.size == 0 || regionsSet.has(region))
    }
    const currentCacheKeys = Object.keys(existingCache)

    // Remove all existing buckets for the account in the specified regions
    for (const key of currentCacheKeys) {
      if (existingCache[key].accountId == accountId && matchesRegion(existingCache[key].region)) {
        delete existingCache[key]
      }
    }

    const currentBuckets = await storage.findResourceMetadata<BucketMetadata>(accountId, {
      service: 's3'
    })

    for (const bucket of currentBuckets) {
      if (matchesRegion(bucket.region)) {
        existingCache[bucket.name] = {
          accountId: accountId,
          region: bucket.region!
        }
      }
    }
  }
}
