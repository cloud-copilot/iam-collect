import {
  GetQueueAttributesCommand,
  ListQueuesCommand,
  ListQueueTagsCommand,
  SQSClient
} from '@aws-sdk/client-sqs'
import { AwsCredentialProviderWithMetaData } from '../../aws/coreAuth.js'
import { AbstractClient } from '../../customClients/AbstractClient.js'
import { AwsConfigClientContext, awsConfigCommand } from '../AwsConfigClientContext.js'
import {
  executeConfigQuery,
  parseConfigItem,
  resourceStatusWhereClause
} from '../awsConfigUtils.js'

/**
 * AWS Config-based SQS client implementation
 */
export class AwsConfigSQSClient extends AbstractClient<AwsConfigClientContext> {
  static readonly clientName = SQSClient.name

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
   * Register all SQS command implementations
   */
  protected registerCommands(): void {
    this.registerCommand(AwsConfigGetQueueAttributesCommand)
    this.registerCommand(AwsConfigListQueueTagsCommand)
    this.registerCommand(AwsConfigListQueuesCommand)
  }
}

/**
 * Config-based implementation of SQS ListQueuesCommand
 *
 * Maps SQS::Queue Config data to SQS ListQueuesCommand output format.
 * Returns queue URL listing for IAM analysis and resource discovery.
 */
const AwsConfigListQueuesCommand = awsConfigCommand({
  command: ListQueuesCommand,
  execute: async (input, context) => {
    const query = `
      SELECT
        arn,
        resourceId,
        resourceName,
        configuration.QueueUrl,
        configuration.QueueName,
        configuration.KmsMasterKeyId,
        configuration.Policy,
        tags
      WHERE
        resourceType = 'AWS::SQS::Queue'
        AND awsRegion = '${context.region}'
        AND accountId = '${context.accountId}'
        AND ${resourceStatusWhereClause}
    `

    const results = await executeConfigQuery(query, context)

    const queueUrls = results.map((result) => {
      const { configItem, configuration, tags } = parseConfigItem(result)
      context.putCache(configItem.resourceId, 'configuration', configuration)
      context.putCache(configItem.resourceId, 'tags', tags)

      // Use QueueUrl from config if available, otherwise construct from QueueName
      return configItem.resourceId
    })

    return {
      QueueUrls: queueUrls,
      NextToken: undefined // Config doesn't provide pagination markers
    }
  }
})

/**
 * Config-based implementation of SQS GetQueueAttributesCommand
 *
 * Maps SQS::Queue Config data to SQS GetQueueAttributesCommand output format.
 * Returns only the attributes used by the sync: KmsMasterKeyId, Policy.
 */
const AwsConfigGetQueueAttributesCommand = awsConfigCommand({
  command: GetQueueAttributesCommand,
  execute: async (input, context) => {
    const queueUrl = input.QueueUrl!

    const configuration = context.getCache(queueUrl, 'configuration')

    // Return only the attributes used by the sync operations
    const attributes: Record<string, string> = {}

    if (configuration.KmsMasterKeyId) {
      attributes['KmsMasterKeyId'] = configuration.KmsMasterKeyId
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
 * Config-based implementation of SQS ListQueueTagsCommand
 *
 * Maps SQS::Queue Config tag data to SQS ListQueueTagsCommand output format.
 * Returns queue tags for resource identification and compliance analysis.
 */
const AwsConfigListQueueTagsCommand = awsConfigCommand({
  command: ListQueueTagsCommand,
  execute: async (input, context) => {
    const queueUrl = input.QueueUrl!

    const value = context.getCache(queueUrl, 'tags')

    return {
      Tags: value || {}
    }
  }
})
