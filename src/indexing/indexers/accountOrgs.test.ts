import { describe, expect, it, vi } from 'vitest'

import { FileSystemAwsIamStore } from '../../persistence/file/FileSystemAwsIamStore.js'
import { InMemoryPathBasedPersistenceAdapter } from '../../persistence/InMemoryPathBasedPersistenceAdapter.js'
import { AccountOrganizationIndexer } from './accountOrgs.js'

vi.mock('../../persistence/file/FileSystemAwsIamStore.js')

describe('AccountOrganizationIndexer', () => {
  describe('updateCache', () => {
    it('should not change the cache if the account is not an organization management account', async () => {
      // Given an existing cache
      const existingCache = {
        account1: 'org1',
        account2: 'org2'
      }

      //And an account that is not an organization management account
      const mockStore = new FileSystemAwsIamStore(
        'mockStore',
        'aws',
        '/',
        new InMemoryPathBasedPersistenceAdapter()
      )
      vi.spyOn(mockStore, 'getAccountMetadata').mockResolvedValue(undefined)

      // When updateCache is called
      await AccountOrganizationIndexer.updateCache(existingCache, 'account1', [], mockStore)

      // Then the cache should not change
      expect(existingCache).toEqual({
        account1: 'org1',
        account2: 'org2'
      })
    })

    it('should remove all existing accounts for the org if there are no longer any accounts for the org', async () => {
      // Given an existing cache
      const existingCache = {
        account1: 'org1',
        account2: 'org2'
      }

      // And an account that is an organization management account
      const mockStore = new FileSystemAwsIamStore(
        'mockStore',
        'aws',
        '/',
        new InMemoryPathBasedPersistenceAdapter()
      )
      vi.spyOn(mockStore, 'getAccountMetadata').mockResolvedValue({ organizationId: 'org1' })
      vi.spyOn(mockStore, 'getOrganizationMetadata').mockResolvedValue(undefined)

      // When updateCache is called
      await AccountOrganizationIndexer.updateCache(existingCache, 'account1', [], mockStore)

      // Then the cache should be updated
      expect(existingCache).toEqual({
        account2: 'org2'
      })
    })

    it('should add the current accounts to the cache', async () => {
      // Given an existing cache
      const existingCache = {
        account1: 'org1',
        account2: 'org2'
      }

      // And an account that is an organization management account
      const mockStore = new FileSystemAwsIamStore(
        'mockStore',
        'aws',
        '/',
        new InMemoryPathBasedPersistenceAdapter()
      )
      vi.spyOn(mockStore, 'getAccountMetadata').mockResolvedValue({ organizationId: 'org1' })
      vi.spyOn(mockStore, 'getOrganizationMetadata').mockResolvedValue({
        account3: {},
        account4: {}
      })

      // When updateCache is called
      await AccountOrganizationIndexer.updateCache(existingCache, 'account1', [], mockStore)

      // Then the cache should be updated
      expect(existingCache).toEqual({
        account3: 'org1',
        account4: 'org1',
        account2: 'org2'
      })
    })

    it('should remove the account from the cache if it is not in the org anymore', async () => {
      // Given an existing cache
      const existingCache = {
        account1: 'org1',
        account2: 'org2'
      }

      // And an account that is an organization management account
      const mockStore = new FileSystemAwsIamStore(
        'mockStore',
        'aws',
        '/',
        new InMemoryPathBasedPersistenceAdapter()
      )
      vi.spyOn(mockStore, 'getAccountMetadata').mockResolvedValue({ organizationId: 'org1' })
      vi.spyOn(mockStore, 'getOrganizationMetadata').mockResolvedValue({
        account3: {}
      })

      // When updateCache is called
      await AccountOrganizationIndexer.updateCache(existingCache, 'account1', [], mockStore)

      // Then the cache should be updated
      expect(existingCache).toEqual({
        account3: 'org1',
        account2: 'org2'
      })
    })
  })
})
