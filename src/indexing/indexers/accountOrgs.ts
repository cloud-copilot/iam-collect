import { type Indexer } from '../indexer.js'

interface OrganizationMetadata {
  organizationId: string | undefined
}

const indexName = 'accounts-to-orgs'

export const AccountOrganizationIndexer: Indexer<Record<string, string>> = {
  awsService: 'organizations',
  name: 'accountsToOrganizations',
  getCache: async (storage) => {
    const data = await storage.getIndex(indexName, {})
    return data
  },
  saveCache: async (storage, cache, lockId) => {
    return storage.saveIndex(indexName, cache, lockId)
  },
  updateCache: async (existingCache, accountId, regions, storage) => {
    const orgForAccount = await storage.getAccountMetadata<OrganizationMetadata, any>(
      accountId,
      'organization',
      undefined
    )

    const organizationId = orgForAccount?.organizationId

    // If the account is not a organization management account, we don't need to update the cache
    if (!organizationId) {
      return
    }

    const currentCacheKeys = Object.keys(existingCache)

    // Remove all existing accounts for the organization
    for (const key of currentCacheKeys) {
      if (existingCache[key] == organizationId) {
        delete existingCache[key]
      }
    }

    const currentInfo = await storage.getOrganizationMetadata(organizationId, 'accounts')
    // If there are no accounts for the org, return
    if (!currentInfo) {
      return
    }

    //Add the current accounts to the cache
    const currentAccounts = Object.keys(currentInfo)
    for (const account of currentAccounts) {
      existingCache[account] = organizationId
    }
  }
}
