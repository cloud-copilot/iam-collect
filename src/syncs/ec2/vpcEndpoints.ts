import { DescribeVpcEndpointsCommand, EC2Client } from '@aws-sdk/client-ec2'
import { Sync } from '../sync.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

export const VpcEndpointsSync: Sync = createTypedSyncOperation(
  'ec2',
  'vpcEndpoints',
  createResourceSyncType({
    client: EC2Client,
    command: DescribeVpcEndpointsCommand,
    key: 'VpcEndpoints',
    paginationConfig: {
      inputKey: 'NextToken',
      outputKey: 'NextToken'
    },
    arn: (resource, region, accountId, partition) => {
      return `arn:${partition}:ec2:${region}:${accountId}:vpc-endpoint/${resource.VpcEndpointId}`
    },
    resourceTypeParts: (account, region) => ({
      service: 'ec2',
      resourceType: 'vpc-endpoint',
      account,
      region
    }),
    tags: (resource) => resource.Tags,
    results: (resource) => ({
      metadata: {
        id: resource.VpcEndpointId,
        vpc: resource.VpcId,
        type: resource.VpcEndpointType
      },
      policy: JSON.parse(resource.PolicyDocument || '{}')
    })
  })
)
