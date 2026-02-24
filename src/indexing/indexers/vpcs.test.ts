import { describe, expect, it } from 'vitest'
import { FileSystemAwsIamStore } from '../../persistence/file/FileSystemAwsIamStore.js'
import { InMemoryPathBasedPersistenceAdapter } from '../../persistence/InMemoryPathBasedPersistenceAdapter.js'
import { VpcEndpointIndexer, type VpcIndex } from './vpcs.js'

describe('VpcEndpointIndexer', () => {
  describe('updateCache', () => {
    it('should sync endpoints for vpcs in the specified regions', async () => {
      //Given an existing cache
      const existingCache: VpcIndex = {
        vpcs: {
          'vpc-1': {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-1',
            endpoints: [
              { id: 'endpoint1A', service: 's3' },
              { id: 'endpoint1B', service: 'dynamodb' }
            ]
          },
          'vpc-2': {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-2',
            endpoints: [
              { id: 'endpoint2A', service: 's3' },
              { id: 'endpoint2B', service: 'dynamodb' }
            ]
          },
          'vpc-3': {
            arn: 'arn:aws:ec2:us-west-1:account1:vpc/vpc-3',
            endpoints: [{ id: 'endpoint3B', service: 'dynamodb' }]
          },
          'vpc-4': {
            arn: 'arn:aws:ec2:us-east-1:account2:vpc/vpc-4',
            endpoints: [{ id: 'endpoint4', service: 's3' }]
          }
        },
        endpoints: {
          endpoint1A: {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1A',
            vpc: 'vpc-1'
          },
          endpoint1B: {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1B',
            vpc: 'vpc-1'
          },
          endpoint2A: {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint2A',
            vpc: 'vpc-2'
          },
          endpoint2B: {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint2B',
            vpc: 'vpc-2'
          },
          endpoint3B: {
            arn: 'arn:aws:ec2:us-west-1:account1:vpc-endpoint/endpoint3B',
            vpc: 'vpc-3'
          },
          endpoint4: {
            arn: 'arn:aws:ec2:us-west-2:account2:vpc-endpoint/endpoint4',
            vpc: 'vpc-4'
          }
        }
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
          vpc: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-1',
          serviceName: 'com.amazonaws.us-east-1.s3'
        },
        {
          arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1B',
          vpc: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-1',
          serviceName: 'com.amazonaws.us-east-1.dynamodb'
        },
        {
          arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint5A',
          vpc: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-5',
          serviceName: 'com.amazonaws.us-east-1.s3'
        }
      ].forEach((endpoint) => {
        storage.saveResourceMetadata('account1', endpoint.arn, 'metadata', {
          vpc: endpoint.vpc,
          arn: endpoint.arn,
          serviceName: endpoint.serviceName
        })
      })

      // And some VPCs exist
      ;[
        { arn: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-1' },
        { arn: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-3' },
        { arn: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-4' },
        { arn: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-5' },
        { arn: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-6' }
      ].forEach((vpc) => {
        storage.saveResourceMetadata('account1', vpc.arn, 'metadata', {
          arn: vpc.arn
        })
      })

      // When updating the cache for account1 in us-east-1
      await VpcEndpointIndexer.updateCache(existingCache, 'account1', ['us-east-1'], storage)

      // Then the cache should be updated with the new endpoints
      expect(existingCache).toEqual({
        vpcs: {
          'vpc-1': {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-1',
            endpoints: [
              { id: 'endpoint1A', service: 's3' },
              { id: 'endpoint1B', service: 'dynamodb' }
            ]
          },
          // Removed
          // 'vpc-2': {
          //   arn: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-2',
          //   endpoints: [
          //     { id: 'endpoint2A', service: 's3' },
          //     { id: 'endpoint2B', service: 'dynamodb' }
          //   ]
          // },
          'vpc-3': {
            arn: 'arn:aws:ec2:us-west-1:account1:vpc/vpc-3',
            endpoints: [{ id: 'endpoint3B', service: 'dynamodb' }]
          },
          'vpc-4': {
            arn: 'arn:aws:ec2:us-east-1:account2:vpc/vpc-4',
            endpoints: [{ id: 'endpoint4', service: 's3' }]
          },
          // Added
          'vpc-5': {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-5',
            endpoints: [
              {
                id: 'endpoint5A',
                service: 's3'
              }
            ]
          },
          //Added, this is a vpc with no endpoints but should still be tracked
          'vpc-6': {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-6',
            endpoints: []
          }
        },
        endpoints: {
          endpoint1A: {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1A',
            vpc: 'vpc-1'
          },
          endpoint1B: {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1B',
            vpc: 'vpc-1'
          },
          // Removed
          // endpoint2A: {
          //   arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint2A',
          //   vpc: 'vpc-2'
          // },
          // endpoint2B: {
          //   arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint2B',
          //   vpc: 'vpc-2'
          // },
          endpoint3B: {
            arn: 'arn:aws:ec2:us-west-1:account1:vpc-endpoint/endpoint3B',
            vpc: 'vpc-3'
          },
          endpoint4: {
            arn: 'arn:aws:ec2:us-west-2:account2:vpc-endpoint/endpoint4',
            vpc: 'vpc-4'
          },
          // Added
          endpoint5A: {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint5A',
            vpc: 'vpc-5'
          }
        }
      })
    })

    it('should sync endpoints for vpcs in all regions if no regions are specified', async () => {
      //Given an existing cache
      const existingCache: VpcIndex = {
        vpcs: {
          'vpc-1': {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-1',
            endpoints: [
              { id: 'endpoint1A', service: 's3' },
              { id: 'endpoint1B', service: 'dynamodb' }
            ]
          },
          'vpc-2': {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-2',
            endpoints: [
              { id: 'endpoint2A', service: 's3' },
              { id: 'endpoint2B', service: 'dynamodb' }
            ]
          },
          'vpc-3': {
            arn: 'arn:aws:ec2:us-west-1:account1:vpc/vpc-3',
            endpoints: [{ id: 'endpoint3B', service: 'dynamodb' }]
          },
          'vpc-4': {
            arn: 'arn:aws:ec2:us-east-1:account2:vpc/vpc-4',
            endpoints: [{ id: 'endpoint4', service: 's3' }]
          }
        },

        endpoints: {
          endpoint1A: {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1A',
            vpc: 'vpc-1'
          },
          endpoint1B: {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1B',
            vpc: 'vpc-1'
          },
          endpoint2A: {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint2A',
            vpc: 'vpc-2'
          },
          endpoint2B: {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint2B',
            vpc: 'vpc-2'
          },
          endpoint3B: {
            arn: 'arn:aws:ec2:us-west-1:account1:vpc-endpoint/endpoint3B',
            vpc: 'vpc-3'
          },
          endpoint4: {
            arn: 'arn:aws:ec2:us-west-2:account2:vpc-endpoint/endpoint4',
            vpc: 'vpc-4'
          }
        }
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
          vpc: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-1',
          serviceName: 'com.amazonaws.us-east-1.s3'
        },
        {
          arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1B',
          vpc: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-1',
          serviceName: 'com.amazonaws.us-east-1.dynamodb'
        },
        {
          arn: 'arn:aws:ec2:us-west-1:account1:vpc-endpoint/endpoint3B',
          vpc: 'arn:aws:ec2:us-west-1:account1:vpc/vpc-3',
          serviceName: 'com.amazonaws.us-east-1.s3'
        },
        {
          arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint5A',
          vpc: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-5',
          serviceName: 'com.amazonaws.us-east-1.s3'
        },
        {
          arn: 'arn:aws:ec2:us-west-2:account1:vpc-endpoint/endpoint6A',
          vpc: 'arn:aws:ec2:us-west-2:account1:vpc/vpc-6',
          serviceName: 'com.amazonaws.us-east-1.s3'
        }
      ].forEach((endpoint) => {
        storage.saveResourceMetadata('account1', endpoint.arn, 'metadata', {
          vpc: endpoint.vpc,
          arn: endpoint.arn,
          serviceName: endpoint.serviceName
        })
      })

      // And some VPCs exist
      ;[
        { arn: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-1' },
        { arn: 'arn:aws:ec2:us-west-1:account1:vpc/vpc-3' },
        { arn: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-4' },
        { arn: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-5' },
        { arn: 'arn:aws:ec2:us-west-2:account1:vpc/vpc-6' }
      ].forEach((vpc) => {
        storage.saveResourceMetadata('account1', vpc.arn, 'metadata', {
          arn: vpc.arn
        })
      })

      // When updating the cache for account1 in all regions
      await VpcEndpointIndexer.updateCache(existingCache, 'account1', [], storage)

      // Then the cache should be updated with the new endpoints
      expect(existingCache).toEqual({
        vpcs: {
          'vpc-1': {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-1',
            endpoints: [
              { id: 'endpoint1A', service: 's3' },
              { id: 'endpoint1B', service: 'dynamodb' }
            ]
          },
          'vpc-3': {
            arn: 'arn:aws:ec2:us-west-1:account1:vpc/vpc-3',
            endpoints: [{ id: 'endpoint3B', service: 's3' }]
          },
          'vpc-4': {
            arn: 'arn:aws:ec2:us-east-1:account2:vpc/vpc-4',
            endpoints: [{ id: 'endpoint4', service: 's3' }]
          },
          // Added
          'vpc-5': {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc/vpc-5',
            endpoints: [
              {
                id: 'endpoint5A',
                service: 's3'
              }
            ]
          },
          // Added
          'vpc-6': {
            arn: 'arn:aws:ec2:us-west-2:account1:vpc/vpc-6',
            endpoints: [
              {
                id: 'endpoint6A',
                service: 's3'
              }
            ]
          }
        },

        endpoints: {
          endpoint1A: {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1A',
            vpc: 'vpc-1'
          },
          endpoint1B: {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint1B',
            vpc: 'vpc-1'
          },
          // Removed
          // endpoint2A: {
          //   arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint2A',
          //   vpc: 'vpc-2'
          // },
          // endpoint2B: {
          //   arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint2B',
          //   vpc: 'vpc-2'
          // },
          endpoint3B: {
            arn: 'arn:aws:ec2:us-west-1:account1:vpc-endpoint/endpoint3B',
            vpc: 'vpc-3'
          },
          endpoint4: {
            arn: 'arn:aws:ec2:us-west-2:account2:vpc-endpoint/endpoint4',
            vpc: 'vpc-4'
          },
          // Added
          endpoint5A: {
            arn: 'arn:aws:ec2:us-east-1:account1:vpc-endpoint/endpoint5A',
            vpc: 'vpc-5'
          },
          // Added
          endpoint6A: {
            arn: 'arn:aws:ec2:us-west-2:account1:vpc-endpoint/endpoint6A',
            vpc: 'vpc-6'
          }
        }
      })
    })
  })
})
