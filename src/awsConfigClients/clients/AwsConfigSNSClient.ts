import {
  GetTopicAttributesCommand,
  ListTagsForResourceCommand,
  ListTopicsCommand,
  SNSClient
} from '@aws-sdk/client-sns'
import { type AwsCredentialProviderWithMetaData } from '../../aws/coreAuth.js'
import { AbstractClient } from '../../customClients/AbstractClient.js'
import { type AwsConfigClientContext, awsConfigCommand } from '../AwsConfigClientContext.js'
import {
  executeConfigQuery,
  parseConfigItem,
  resourceStatusWhereClause
} from '../awsConfigUtils.js'

/**
 * AWS Config-based SNS client implementation
 */
export class AwsConfigSNSClient extends AbstractClient<AwsConfigClientContext> {
  static readonly clientName = SNSClient.name

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
   * Register all SNS command implementations
   */
  protected registerCommands(): void {
    this.registerCommand(AwsConfigGetTopicAttributesCommand)
    this.registerCommand(AwsConfigListTagsForResourceCommand)
    this.registerCommand(AwsConfigListTopicsCommand)
  }
}

/**
 * Config-based implementation of SNS GetTopicAttributesCommand
 *
 * Maps SNS::Topic Config data to SNS GetTopicAttributesCommand output format.
 * Returns only the attributes used by the sync: DisplayName, KmsMasterKeyId, Owner, Policy.
 */
const AwsConfigGetTopicAttributesCommand = awsConfigCommand({
  command: GetTopicAttributesCommand,
  execute: async (input, context) => {
    const topicArn = input.TopicArn!

    const configuration = context.getCache(topicArn, 'configuration')

    // Return only the attributes used by the sync operations
    const attributes: Record<string, string> = {}

    if (configuration.DisplayName) {
      attributes['DisplayName'] = configuration.DisplayName
    }
    if (configuration.KmsMasterKeyId) {
      attributes['KmsMasterKeyId'] = configuration.KmsMasterKeyId
    }
    if (configuration.Owner) {
      attributes['Owner'] = configuration.Owner
    }
    if (configuration.Policy) {
      attributes['Policy'] = configuration.Policy
    }

    return {
      Attributes: attributes
    }
  }
})

/**
 * Config-based implementation of SNS ListTagsForResourceCommand
 *
 * Maps SNS::Topic Config tag data to SNS ListTagsForResourceCommand output format.
 * Returns topic tags for resource identification and compliance analysis.
 */
const AwsConfigListTagsForResourceCommand = awsConfigCommand({
  command: ListTagsForResourceCommand,
  execute: async (input, context) => {
    const resourceArn = input.ResourceArn!

    const tags = context.getCache(resourceArn, 'tags')

    return {
      Tags: tags || {}
    }
  }
})

/**
 * Config-based implementation of SNS ListTopicsCommand
 *
 * Maps SNS::Topic Config data to SNS ListTopicsCommand output format.
 * Returns topic listing for IAM analysis and resource discovery.
 */
const AwsConfigListTopicsCommand = awsConfigCommand({
  command: ListTopicsCommand,
  execute: async (input, context) => {
    const query = `
      SELECT
        arn,
        resourceId,
        resourceName,
        configuration.TopicArn,
        configuration.DisplayName,
        configuration.KmsMasterKeyId,
        configuration.Owner,
        configuration.Policy,
        tags
      WHERE
        resourceType = 'AWS::SNS::Topic'
        AND awsRegion = '${context.region}'
        AND accountId = '${context.accountId}'
        AND ${resourceStatusWhereClause}
    `

    const results = await executeConfigQuery(query, context)

    const topics = results.map((result) => {
      const { configItem, configuration, tags } = parseConfigItem(result)

      // Cache data that will be needed by other commands
      context.putCache(configItem.arn, 'configuration', configuration)
      context.putCache(configItem.arn, 'tags', tags)

      return {
        TopicArn: configItem.arn
      }
    })

    return {
      Topics: topics,
      NextToken: undefined // Config doesn't provide pagination markers
    }
  }
})
