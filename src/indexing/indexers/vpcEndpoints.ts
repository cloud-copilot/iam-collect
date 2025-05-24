import { splitArnParts } from '@cloud-copilot/iam-utils'
import { Indexer } from '../indexer.js'

interface VpcEndpointMetadata {
  vpc: string
  arn: string
}

const indexName = 'vpcs-to-endpoints'

export const VpcEndpointIndexer: Indexer<Record<string, string[]>> = {
  awsService: 'ec2',
  name: 'vpcsToEndpoints',
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

    // Remove all existing vpcs for the account in the specified regions
    for (const key of currentCacheKeys) {
      const arnParts = splitArnParts(key)
      if (arnParts.accountId == accountId && matchesRegion(arnParts.region)) {
        delete existingCache[key]
      }
    }

    const currentEndpoints: VpcEndpointMetadata[] = []

    if (regions.length == 0) {
      const gateways = await storage.findResourceMetadata<VpcEndpointMetadata>(accountId, {
        service: 'ec2',
        region: '*',
        resourceType: 'vpc-endpoint'
      })
      currentEndpoints.push(...gateways)
    } else {
      for (const region of regions) {
        const gateways = await storage.findResourceMetadata<VpcEndpointMetadata>(accountId, {
          service: 'ec2',
          region: region,
          resourceType: 'vpc-endpoint'
        })
        currentEndpoints.push(...gateways)
      }
    }

    for (const endpoint of currentEndpoints) {
      const vpcId = endpoint.vpc
      if (!existingCache[vpcId]) {
        existingCache[vpcId] = []
      }
      existingCache[vpcId].push(endpoint.arn)
    }
  }
}
