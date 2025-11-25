import {
  DescribeEventBusCommand,
  EventBridgeClient,
  ListEventBusesCommand,
  ListTagsForResourceCommand
} from '@aws-sdk/client-eventbridge'
import { AwsCredentialProviderWithMetaData } from '../../aws/coreAuth.js'
import { AbstractClient } from '../../customClients/AbstractClient.js'
import { AwsConfigClientContext, awsConfigCommand } from '../AwsConfigClientContext.js'
import {
  executeConfigQuery,
  parseConfigItem,
  resourceStatusWhereClause
} from '../awsConfigUtils.js'

/**
 * AWS Config-based EventBridge client implementation
 *
 */
export class AwsConfigEventBridgeClient extends AbstractClient<AwsConfigClientContext> {
  static readonly clientName = EventBridgeClient.name

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
   * Register all EventBridge command implementations
   */
  protected registerCommands(): void {
    this.registerCommand(AwsConfigDescribeEventBusCommand)
    this.registerCommand(AwsConfigListEventBusesCommand)
    this.registerCommand(AwsConfigListTagsForResourceCommand)
  }
}

/**
 * Config-based implementation of EventBridge DescribeEventBusCommand
 *
 * Maps Events::EventBus Config data to EventBridge DescribeEventBusCommand output format.
 * Returns event bus policy from configuration.Policy field for IAM analysis.
 */
const AwsConfigDescribeEventBusCommand = awsConfigCommand({
  command: DescribeEventBusCommand,
  execute: async (input, context) => {
    const eventBusName = input.Name || 'default'

    const configuration = context.getCache(eventBusName, 'configuration')

    return {
      Name: configuration.Name || eventBusName,
      Arn: configuration.Arn,
      Policy: configuration.Policy,
      // Note: KmsKeyIdentifier is not available in Config schema
      KmsKeyIdentifier: undefined
    }
  }
})

/**
 * Config-based implementation of EventBridge ListEventBusesCommand
 *
 * Maps Events::EventBus Config data to EventBridge ListEventBusesCommand output format.
 * Returns event bus listing for IAM analysis and resource discovery.
 */
const AwsConfigListEventBusesCommand = awsConfigCommand({
  command: ListEventBusesCommand,
  execute: async (input, context) => {
    const query = `
      SELECT
        arn,
        resourceId,
        resourceName,
        configuration.Name,
        configuration.Arn,
        configuration.EventSourceName,
        configuration.Policy,
        tags
      WHERE
        resourceType = 'AWS::Events::EventBus'
        AND awsRegion = '${context.region}'
        AND accountId = '${context.accountId}'
        AND ${resourceStatusWhereClause}
    `

    const results = await executeConfigQuery(query, context)

    const eventBuses = results.map((result) => {
      const { configItem, configuration, tags } = parseConfigItem(result)

      // Cache data that will be needed by other commands
      const eventBusName = configuration.Name || configItem.resourceName
      context.putCache(eventBusName, 'configuration', configuration)
      context.putCache(configItem.arn, 'tags', tags)

      return {
        Name: configuration.Name,
        Arn: configuration.Arn,
        EventSourceName: configuration.EventSourceName
      }
    })

    return {
      EventBuses: eventBuses
    }
  }
})

/**
 * Config-based implementation of EventBridge ListTagsForResourceCommand
 *
 * Maps Events::EventBus Config tag data to EventBridge ListTagsForResourceCommand output format.
 * Returns event bus tags for resource identification and compliance analysis.
 */
const AwsConfigListTagsForResourceCommand = awsConfigCommand({
  command: ListTagsForResourceCommand,
  execute: async (input, context) => {
    // Extract event bus name from ARN or use the ARN directly for resourceName lookup
    const resourceArn = input.ResourceARN!

    const tags = context.getCache(resourceArn, 'tags')

    return {
      Tags: tags
    }
  }
})
