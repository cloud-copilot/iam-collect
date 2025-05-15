import { describe, expect, it } from 'vitest'
import { FileSystemAwsIamStore } from '../../persistence/file/FileSystemAwsIamStore.js'
import { InMemoryPathBasedPersistenceAdapter } from '../../persistence/InMemoryPathBasedPersistenceAdapter.js'
import { VpcEndpointIndexer } from './vpcEndpoints.js'

describe('VpcEndpointIndexer', () => {
  describe('updateCache', () => {
    it('should sync endpoints for vpcs in the specified regions', async () => {
      //Given an existing cache
      const existingCache = {
        'arn:aws:ec2:us-east-1:account1:vpc/vpc-1': [
          'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1A',
          'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1B'
        ],
        'arn:aws:ec2:us-east-1:account1:vpc/vpc-2': [
          'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint2A'
        ],
        'arn:aws:ec2:us-west-1:account1:vpc/vpc-3': [
          'arn:aws:ec2:us-west-1:account1:vpc-endpoint/endpoint3B'
        ],
        'arn:aws:ec2:us-east-1:account2:vpc/vpc-4': [
          'arn:aws:ec2:us-west-2:account2:vpc-endpoint/endpoint4'
        ]
      }

      // And a store with some endpoints
      const storage = new FileSystemAwsIamStore(
        'mockStore',
        'aws',
        '/',
        new InMemoryPathBasedPersistenceAdapter()
      )

      ;[
        {
          arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1A',
          vpc: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-1'
        },
        {
          arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1B',
          vpc: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-1'
        },
        {
          arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint5A',
          vpc: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-5'
        }
      ].forEach((endpoint) => {
        storage.saveResourceMetadata('account1', endpoint.arn, 'metadata', {
          vpc: endpoint.vpc,
          arn: endpoint.arn
        })
      })

      // When updating the cache for account1 in us-east-1
      await VpcEndpointIndexer.updateCache(existingCache, 'account1', ['us-east-1'], storage)

      // Then the cache should be updated with the new endpoints
      expect(existingCache).toEqual({
        'arn:aws:ec2:us-east-1:account1:vpc/vpc-1': [
          'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1A',
          'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1B'
        ],
        // Removed
        // 'arn:aws:ec2:us-east-1:account1:vpc/vpc-2': [
        //   'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint2A'
        // ],
        'arn:aws:ec2:us-west-1:account1:vpc/vpc-3': [
          'arn:aws:ec2:us-west-1:account1:vpc-endpoint/endpoint3B'
        ],
        'arn:aws:ec2:us-east-1:account2:vpc/vpc-4': [
          'arn:aws:ec2:us-west-2:account2:vpc-endpoint/endpoint4'
        ],
        // Added
        'arn:aws:ec2:us-east-1:account1:vpc/vpc-5': [
          'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint5A'
        ]
      })
    })

    it('should sync buckets for vpcs in all regions if no regions are specified', async () => {
      //Given an existing cache
      const existingCache = {
        'arn:aws:ec2:us-east-1:account1:vpc/vpc-1': [
          'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1A',
          'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1B'
        ],
        'arn:aws:ec2:us-east-1:account1:vpc/vpc-2': [
          'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint2A'
        ],
        'arn:aws:ec2:us-west-2:account1:vpc/vpc-3': [
          'arn:aws:ec2:us-west-2:account1:vpc-endpoint/endpoint3B'
        ],
        'arn:aws:ec2:us-west-2:account1:vpc/vpc-4': [
          'arn:aws:ec2:us-west-2:account1:vpc-endpoint/endpoint4'
        ]
      }

      // And a store with some endpoints
      const storage = new FileSystemAwsIamStore(
        'mockStore',
        'aws',
        '/',
        new InMemoryPathBasedPersistenceAdapter()
      )

      ;[
        {
          arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1A',
          vpc: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-1'
        },
        {
          arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1B',
          vpc: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-1'
        },
        {
          arn: 'arn:aws:ec2:us-west-2:account1:vpc-endpoint/endpoint3A',
          vpc: 'arn:aws:ec2:us-west-2:account1:vpc/vpc-3'
        },
        {
          arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint5A',
          vpc: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-5'
        },
        {
          arn: 'arn:aws:ec2:us-west-2:account1:vpc-endpoint/endpoint6A',
          vpc: 'arn:aws:ec2:us-west-2:account1:vpc/vpc-6'
        }
      ].forEach((endpoint) => {
        storage.saveResourceMetadata('account1', endpoint.arn, 'metadata', {
          vpc: endpoint.vpc,
          arn: endpoint.arn
        })
      })

      // When updating the cache for account1 in all regions
      await VpcEndpointIndexer.updateCache(existingCache, 'account1', [], storage)

      // Then the cache should be updated with the new endpoints
      expect(existingCache).toEqual({
        'arn:aws:ec2:us-east-1:account1:vpc/vpc-1': [
          'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1A',
          'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1B'
        ],
        //Removed
        // 'arn:aws:ec2:us-east-1:account1:vpc/vpc-2': [
        //   'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint2A'
        // ],
        'arn:aws:ec2:us-west-2:account1:vpc/vpc-3': [
          'arn:aws:ec2:us-west-2:account1:vpc-endpoint/endpoint3A'
        ],
        // Removed
        // 'arn:aws:ec2:us-west-2:account1:vpc/vpc-4': [
        // 'arn:aws:ec2:us-west-2:account1:vpc-endpoint/endpoint4'
        // ]
        // Added
        'arn:aws:ec2:us-east-1:account1:vpc/vpc-5': [
          'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint5A'
        ],
        'arn:aws:ec2:us-west-2:account1:vpc/vpc-6': [
          'arn:aws:ec2:us-west-2:account1:vpc-endpoint/endpoint6A'
        ]
      })
    })
  })
})
