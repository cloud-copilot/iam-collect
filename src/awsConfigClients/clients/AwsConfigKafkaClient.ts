import {
  DescribeClusterCommand,
  GetClusterPolicyCommand,
  KafkaClient,
  ListClustersV2Command,
  ListTagsForResourceCommand
} from '@aws-sdk/client-kafka'
import { AwsCredentialIdentityWithMetaData } from '../../aws/coreAuth.js'
import { AbstractClient } from '../../customClients/AbstractClient.js'
import { ResourceNotFoundException } from '../../customClients/ResourceNotFoundException.js'
import { stringifyIfPresent } from '../../utils/json.js'
import { AwsConfigClientContext, awsConfigCommand } from '../AwsConfigClientContext.js'
import {
  executeConfigQuery,
  parseConfigItem,
  resourceStatusWhereClause
} from '../awsConfigUtils.js'

/**
 * AWS Config-based Kafka client implementation
 */
export class AwsConfigKafkaClient extends AbstractClient<AwsConfigClientContext> {
  static readonly clientName = KafkaClient.name

  constructor(
    options: {
      credentials: AwsCredentialIdentityWithMetaData
      region: string | undefined
    },
    customContext: AwsConfigClientContext
  ) {
    super(options, customContext)
  }

  /**
   * Register all Kafka command implementations
   */
  protected registerCommands(): void {
    this.registerCommand(AwsConfigListClustersV2Command)
    this.registerCommand(AwsConfigDescribeClusterCommand)
    this.registerCommand(AwsConfigGetClusterPolicyCommand)
    this.registerCommand(AwsConfigListTagsForResourceCommand)
  }
}

/**
 * Config-based implementation of Kafka ListClustersV2Command
 */
const AwsConfigListClustersV2Command = awsConfigCommand({
  command: ListClustersV2Command,
  execute: async (input, context) => {
    const { NextToken, MaxResults } = input

    // Query AWS Config for all MSK clusters with only needed configuration fields
    const query = `
      SELECT
        resourceId,
        resourceName,
        awsRegion,
        configuration.EncryptionInfo,
        configuration.Policy,
        tags
      WHERE
        resourceType = 'AWS::MSK::Cluster'
        AND accountId = '${context.accountId}'
        AND awsRegion = '${context.region}'
        AND ${resourceStatusWhereClause}
    `

    const items = await executeConfigQuery(query, context)

    // Transform Config data to ListClustersV2Response format
    const clusterInfoList = items.map((item) => {
      const { configItem, configuration, tags } = parseConfigItem(item)

      // Cache data that will be needed by other commands
      const clusterArn = configItem.resourceId
      context.putCache(clusterArn, 'configuration', configuration)
      context.putCache(clusterArn, 'resourceName', configItem.resourceName)
      context.putCache(clusterArn, 'tags', tags)

      return {
        ClusterArn: clusterArn,
        ClusterName: configItem.resourceName,
        Tags: tags || {}
      }
    })

    return {
      ClusterInfoList: clusterInfoList
    }
  }
})

/**
 * Config-based implementation of Kafka DescribeClusterCommand
 */
const AwsConfigDescribeClusterCommand = awsConfigCommand({
  command: DescribeClusterCommand,
  execute: async (input, context) => {
    const { ClusterArn } = input

    if (!ClusterArn) {
      throw new Error('ClusterArn is required for DescribeClusterCommand')
    }

    const configuration = context.getCache(ClusterArn, 'configuration')
    const resourceName = context.getCache(ClusterArn, 'resourceName')

    // Transform Config data to DescribeClusterResponse format
    return {
      ClusterInfo: {
        ClusterArn: ClusterArn,
        ClusterName: configuration?.clusterName || resourceName,
        EncryptionInfo: configuration?.encryptionInfo
      }
    }
  }
})

/**
 * Config-based implementation of Kafka GetClusterPolicyCommand
 */
const AwsConfigGetClusterPolicyCommand = awsConfigCommand({
  command: GetClusterPolicyCommand,
  execute: async (input, context) => {
    const { ClusterArn } = input

    if (!ClusterArn) {
      throw new Error('ClusterArn is required for GetClusterPolicyCommand')
    }

    // Query AWS Config for MSK cluster policy
    const query = `
      SELECT
        resourceId,
        configuration.clusterArn,
        configuration.Policy
      WHERE
        resourceType = 'AWS::MSK::ClusterPolicy'
        AND resourceId = '${ClusterArn}'
        AND awsRegion = '${context.region}'
        AND accountId = '${context.accountId}'
        AND ${resourceStatusWhereClause}
    `

    const items = await executeConfigQuery(query, context)

    if (items.length === 0) {
      throw new ResourceNotFoundException(`Cluster policy not found for cluster: ${ClusterArn}`)
    }

    const { configuration } = parseConfigItem(items[0])

    // Transform Config data to GetClusterPolicyResponse format
    return {
      CurrentVersion: '1', // Config doesn't track policy version, use default
      Policy: stringifyIfPresent(configuration.Policy)
    }
  }
})

/**
 * Config-based implementation of Kafka ListTagsForResourceCommand
 */
const AwsConfigListTagsForResourceCommand = awsConfigCommand({
  command: ListTagsForResourceCommand,
  execute: async (input, context) => {
    const { ResourceArn } = input

    if (!ResourceArn) {
      throw new Error('ResourceArn is required for ListTagsForResourceCommand')
    }

    const tags = context.getCache(ResourceArn, 'tags')

    // Transform Config data to ListTagsForResourceResponse format
    return {
      Tags: tags
    }
  }
})
