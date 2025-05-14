import { describe, expect, it } from 'vitest'
import { FileSystemAwsIamStore } from '../../persistence/file/FileSystemAwsIamStore.js'
import { InMemoryPathBasedPersistenceAdapter } from '../../persistence/InMemoryPathBasedPersistenceAdapter.js'
import { ApiGatewayIndexer } from './apigateways.js'

describe('ApiGatewayIndexer', () => {
  describe('updateCache', () => {
    it('should sync gateways for the specified regions', async () => {
      //Given an existing cache
      const existingCache = {
        'arn:aws:apigateway:us-east-1::/restapis/A': 'account1',
        'arn:aws:apigateway:us-east-1::/restapis/B': 'account1',
        'arn:aws:apigateway:us-west-1::/restapis/C': 'account1',
        'arn:aws:apigateway:us-east-1::/restapis/D': 'account2',
        'arn:aws:apigateway:us-east-1::/restapis/E': 'account2',
        'arn:aws:apigateway:us-east-1::/restapis/F': 'account2'
      }

      //And a store
      const storage = new FileSystemAwsIamStore(
        'mockStore',
        'aws',
        new InMemoryPathBasedPersistenceAdapter()
      )
      ;[
        'arn:aws:apigateway:us-east-1::/restapis/A',
        'arn:aws:apigateway:us-east-1::/restapis/G'
      ].map((arn) => {
        storage.saveResourceMetadata('account1', arn, 'metadata', { arn })
      })

      // When updateCache is called for one region
      await ApiGatewayIndexer.updateCache(existingCache, 'account1', ['us-east-1'], storage)

      // And the cache should be updated
      expect(existingCache).toEqual({
        'arn:aws:apigateway:us-east-1::/restapis/A': 'account1',
        // 'arn:aws:apigateway:us-east-1::/restapis/B': 'account1', // Removed
        'arn:aws:apigateway:us-west-1::/restapis/C': 'account1',
        'arn:aws:apigateway:us-east-1::/restapis/D': 'account2',
        'arn:aws:apigateway:us-east-1::/restapis/E': 'account2',
        'arn:aws:apigateway:us-east-1::/restapis/F': 'account2',
        'arn:aws:apigateway:us-east-1::/restapis/G': 'account1' // Added
      })
    })

    it('should sync gateways for all regions if no regions are specified', async () => {
      //Given an existing cache
      const existingCache = {
        'arn:aws:apigateway:us-east-1::/restapis/A': 'account1',
        'arn:aws:apigateway:us-east-1::/restapis/B': 'account1',
        'arn:aws:apigateway:us-west-2::/restapis/C': 'account1',
        'arn:aws:apigateway:us-west-2::/restapis/D': 'account1',
        'arn:aws:apigateway:us-east-1::/restapis/E': 'account2',
        'arn:aws:apigateway:us-west-2::/restapis/F': 'account2'
      }

      //And a store
      const storage = new FileSystemAwsIamStore(
        'mockStore',
        'aws',
        new InMemoryPathBasedPersistenceAdapter()
      )
      ;[
        'arn:aws:apigateway:us-east-1::/restapis/A',
        'arn:aws:apigateway:us-west-2::/restapis/C',
        'arn:aws:apigateway:us-east-1::/restapis/G',
        'arn:aws:apigateway:us-west-2::/restapis/H'
      ].map((arn) => {
        storage.saveResourceMetadata('account1', arn, 'metadata', { arn })
      })

      // When updateCache is called for one region
      await ApiGatewayIndexer.updateCache(existingCache, 'account1', [], storage)

      // And the cache should be updated
      expect(existingCache).toEqual({
        'arn:aws:apigateway:us-east-1::/restapis/A': 'account1',
        // 'arn:aws:apigateway:us-east-1::/restapis/B': 'account1', // Removed
        'arn:aws:apigateway:us-west-2::/restapis/C': 'account1',
        // 'arn:aws:apigateway:us-west-2::/restapis/D': 'account1', // Removed
        'arn:aws:apigateway:us-east-1::/restapis/E': 'account2',
        'arn:aws:apigateway:us-west-2::/restapis/F': 'account2',
        'arn:aws:apigateway:us-east-1::/restapis/G': 'account1', // Added
        'arn:aws:apigateway:us-west-2::/restapis/H': 'account1' // Added
      })
    })
  })
})
