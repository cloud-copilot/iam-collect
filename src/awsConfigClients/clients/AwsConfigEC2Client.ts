import { DescribeVpcEndpointsCommand, EC2Client } from '@aws-sdk/client-ec2'
import { type AwsCredentialProviderWithMetaData } from '../../aws/coreAuth.js'
import { AbstractClient } from '../../customClients/AbstractClient.js'
import { type AwsConfigClientContext, awsConfigCommand } from '../AwsConfigClientContext.js'
import {
  executeConfigQuery,
  parseConfigItem,
  resourceStatusWhereClause
} from '../awsConfigUtils.js'

/**
 * AWS Config-based EC2 client implementation
 */
export class AwsConfigEC2Client extends AbstractClient<AwsConfigClientContext> {
  static readonly clientName = EC2Client.name

  constructor(
    options: {
      credentials: AwsCredentialProviderWithMetaData
      region: string | undefined
    },
    customContext: AwsConfigClientContext
  ) {
    super(options, customContext)
  }

  /**
   * Register all EC2 command implementations
   */
  protected registerCommands(): void {
    this.registerCommand(AwsConfigDescribeVpcEndpointsCommand)
  }
}

/**
 * Config-based implementation of EC2 DescribeVpcEndpointsCommand
 * Retrieves VPC endpoint information including endpoint policies from AWS Config
 */
const AwsConfigDescribeVpcEndpointsCommand = awsConfigCommand({
  command: DescribeVpcEndpointsCommand,
  execute: async (input, context) => {
    let query = `
      SELECT
        configuration.vpcEndpointId,
        configuration.vpcEndpointType,
        configuration.serviceName,
        configuration.policyDocument
      WHERE
        resourceType = 'AWS::EC2::VPCEndpoint'
        AND awsRegion = '${context.region}'
        AND accountId = '${context.accountId}'
        AND ${resourceStatusWhereClause}
    `

    const results = await executeConfigQuery(query, context)

    // Transform Config results to match AWS SDK format with only essential fields
    const vpcEndpoints = results.map((resultString: string) => {
      const { configItem } = parseConfigItem(resultString)
      const config = configItem.configuration || {}

      return {
        VpcEndpointId: config.vpcEndpointId,
        VpcEndpointType: config.vpcEndpointType,
        ServiceName: config.serviceName,
        PolicyDocument: config.policyDocument // The endpoint policy as a string
      }
    })

    return {
      VpcEndpoints: vpcEndpoints,
      NextToken: undefined // Config doesn't support pagination in this context
    }
  }
})
