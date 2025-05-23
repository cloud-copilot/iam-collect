import { describe, expect, it } from 'vitest'
import { createInMemoryStorageClient } from '../../persistence/util.js'
import { IamPrincipalsToTrustPoliciesIndexer } from './iamPrincipalsToTrustPolicies.js'

describe('iamPrincipalsToTrustPolicies', () => {
  it('should add all principals from trust policies to the cache', async () => {
    //Given an existing cache
    const existingCache: any = {}

    //And a store
    const storage = createInMemoryStorageClient()

    //And roles with trust polices for the account
    const accountId = 'account1'
    const roleArn = `arn:aws:iam::${accountId}:role/TestRole`
    const roleArn2 = `arn:aws:iam::${accountId}:role/SecondRole`
    const roleArn3 = `arn:aws:iam::${accountId}:role/ThirdRole`
    const otherAccountId = 'otheraccount'
    const otherRoleArn = `arn:aws:iam::${otherAccountId}:role/OtherRole`
    const principalArn = 'arn:aws:iam::otheraccount:root'

    // Save a role resource and its trust policy for account1, TestRole
    await storage.saveResourceMetadata(accountId, roleArn, 'metadata', { arn: roleArn })
    await storage.saveResourceMetadata(accountId, roleArn, 'trust-policy', {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: principalArn }
        }
      ]
    })

    // Save a second role in account1
    await storage.saveResourceMetadata(accountId, roleArn2, 'metadata', { arn: roleArn2 })
    await storage.saveResourceMetadata(accountId, roleArn2, 'trust-policy', {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: 'arn:aws:iam::anotherprincipal:root' }
        }
      ]
    })

    // Save a third role in account1
    await storage.saveResourceMetadata(accountId, roleArn3, 'metadata', { arn: roleArn3 })
    await storage.saveResourceMetadata(accountId, roleArn3, 'trust-policy', {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: 'arn:aws:iam::anotherprincipal:root' }
        }
      ]
    })

    // Save a role in another account
    await storage.saveResourceMetadata(otherAccountId, otherRoleArn, 'metadata', {
      arn: otherRoleArn
    })
    await storage.saveResourceMetadata(otherAccountId, otherRoleArn, 'trust-policy', {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: 'arn:aws:iam::someoneelse:root' }
        }
      ]
    })

    //When updateCache is called for one account
    await IamPrincipalsToTrustPoliciesIndexer.updateCache(existingCache, accountId, [], storage)

    //Then the cache should be updated for the account
    expect(existingCache[accountId]).toEqual({
      principal: {
        'arn:aws:iam::otheraccount:root': [roleArn],
        'arn:aws:iam::anotherprincipal:root': [roleArn2, roleArn3]
      }
    })
  })

  it('should not modify the cache for other accounts', async () => {
    // Given a cache with another account already present
    const existingCache: any = {
      otheraccount: {
        principal: {
          'arn:aws:iam::someoneelse:root': ['arn:aws:iam::otheraccount:role/OtherRole']
        }
      }
    }

    // And a store with roles only for account1
    const storage = createInMemoryStorageClient()
    const accountId = 'account1'
    const roleArn = `arn:aws:iam::${accountId}:role/TestRole`
    const principalArn = 'arn:aws:iam::otheraccount:root'

    await storage.saveResourceMetadata(accountId, roleArn, 'metadata', { arn: roleArn })
    await storage.saveResourceMetadata(accountId, roleArn, 'trust-policy', {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: { AWS: principalArn }
        }
      ]
    })

    // When updateCache is called for account1
    await IamPrincipalsToTrustPoliciesIndexer.updateCache(existingCache, accountId, [], storage)

    // Then the cache for other account should remain unchanged
    expect(existingCache).toEqual({
      otheraccount: {
        principal: {
          'arn:aws:iam::someoneelse:root': ['arn:aws:iam::otheraccount:role/OtherRole']
        }
      },
      account1: {
        principal: {
          'arn:aws:iam::otheraccount:root': [roleArn]
        }
      }
    })
  })
})
