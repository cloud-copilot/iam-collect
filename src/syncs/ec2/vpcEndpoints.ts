import { DescribeVpcEndpointsCommand, EC2Client } from '@aws-sdk/client-ec2'
import { parseIfPresent } from '../../utils/json.js'
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
    arguments: (accountId, region) => ({
      Filters: [{ Name: 'vpc-endpoint-state', Values: ['available'] }]
    }),
    arn: (resource, region, accountId, partition) => {
      return `arn:${partition}:ec2:${region}:${accountId}:vpc-endpoint/${resource.VpcEndpointId}`
    },
    resourceTypeParts: (account, region) => ({
      service: 'ec2',
      resourceType: 'vpc-endpoint',
      account,
      region
    }),
    extraFields: {
      vpcArn: async (client, resource, accountId, region, partition) => {
        return vpcArn(accountId, region, partition, resource.VpcId!)
      }
    },
    tags: (resource) => resource.Tags,
    results: (resource) => ({
      metadata: {
        id: resource.VpcEndpointId,
        vpc: resource.extraFields.vpcArn,
        type: resource.VpcEndpointType,
        serviceName: resource.ServiceName
      },
      policy: undefined,
      'endpoint-policy': parseIfPresent(resource.PolicyDocument)
    })
  })
)

/**
 * Make a VPC ARN from the account ID, region, partition, and VPC ID.
 *
 * @param accountId
 * @param region
 * @param partition
 * @param vpcId
 * @returns
 */
function vpcArn(accountId: string, region: string, partition: string, vpcId: string): string {
  return `arn:${partition}:ec2:${region}:${accountId}:vpc/${vpcId}`
}
