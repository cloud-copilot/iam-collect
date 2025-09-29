import {
  GetLayerVersionPolicyCommand,
  GetPolicyCommand,
  LambdaClient,
  ListFunctionsCommand,
  ListLayersCommand,
  ListLayerVersionsCommand,
  ListTagsCommand
} from '@aws-sdk/client-lambda'
import { AwsCredentialIdentityWithMetaData } from '../../aws/coreAuth.js'
import { AbstractClient } from '../../customClients/AbstractClient.js'
import { AwsConfigClientContext, awsConfigCommand } from '../AwsConfigClientContext.js'
import {
  executeConfigQuery,
  parseConfigItem,
  resourceStatusWhereClause
} from '../awsConfigUtils.js'

/**
 * AWS Config-based Lambda client implementation
 *
 * Lambda Layers Only:
 * Since policies are not available in AWS Config for Lambda Layers, this client provides limited functionality
 * and returns empty results for all Lambda Layer operations.
 */
export class AwsConfigLambdaClient extends AbstractClient<AwsConfigClientContext> {
  static readonly clientName = LambdaClient.name

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
   * Register all Lambda command implementations
   */
  protected registerCommands(): void {
    this.registerCommand(AwsConfigGetLayerVersionPolicyCommand)
    this.registerCommand(AwsConfigGetPolicyCommand)
    this.registerCommand(AwsConfigListFunctionsCommand)
    this.registerCommand(AwsConfigListLayersCommand)
    this.registerCommand(AwsConfigListLayerVersionsCommand)
    this.registerCommand(AwsConfigListTagsCommand)
  }
}

/**
 * Config-based implementation of Lambda GetLayerVersionPolicyCommand
 * Returns undefined since layer policies are not available in Config
 */
const AwsConfigGetLayerVersionPolicyCommand = awsConfigCommand({
  command: GetLayerVersionPolicyCommand,
  execute: async (input, context) => {
    // Return undefined since layer policies are not tracked in Config
    return {
      Policy: undefined,
      RevisionId: undefined
    }
  }
})

/**
 * Config-based implementation of Lambda GetPolicyCommand
 *
 * Maps Lambda::Function Config data to Lambda GetPolicyCommand output format.
 * Returns function policy from supplementaryConfiguration.Policy field for IAM analysis.
 */
const AwsConfigGetPolicyCommand = awsConfigCommand({
  command: GetPolicyCommand,
  execute: async (input, context) => {
    const functionName = input.FunctionName!

    const configuration = context.getCache(functionName, 'configuration')
    const supplementaryConfiguration = context.getCache(functionName, 'supplementaryConfiguration')

    return {
      Policy: supplementaryConfiguration?.Policy,
      RevisionId: configuration?.revisionId
    }
  }
})

/**
 * Config-based implementation of Lambda ListFunctionsCommand
 *
 * Maps Lambda::Function Config data to Lambda ListFunctionsCommand output format.
 * Returns function listing for IAM analysis and resource discovery.
 */
const AwsConfigListFunctionsCommand = awsConfigCommand({
  command: ListFunctionsCommand,
  execute: async (input, context) => {
    const query = `
      SELECT
        arn,
        resourceId,
        resourceName,
        configuration.functionName,
        configuration.role,
        configuration.revisionId,
        supplementaryConfiguration.Policy,
        tags
      WHERE
        resourceType = 'AWS::Lambda::Function'
        AND awsRegion = '${context.region}'
        AND accountId = '${context.accountId}'
        AND ${resourceStatusWhereClause}
    `

    const results = await executeConfigQuery(query, context)

    const functions = results.map((result) => {
      const { configItem, configuration, supplementaryConfiguration, tags } =
        parseConfigItem(result)

      // Cache data that will be needed by other commands
      // Use function name as cache key for GetPolicyCommand
      if (configuration.functionName) {
        context.putCache(configuration.functionName, 'configuration', configuration)
        context.putCache(
          configuration.functionName,
          'supplementaryConfiguration',
          supplementaryConfiguration
        )
      }

      // Cache by ARN for ListTagsCommand
      context.putCache(configItem.arn, 'tags', tags)

      return {
        FunctionName: configuration.functionName,
        FunctionArn: configItem.arn,
        Role: configuration.role
      }
    })

    return {
      Functions: functions,
      NextMarker: undefined // Config doesn't provide pagination markers
    }
  }
})

/**
 * Config-based implementation of Lambda ListLayersCommand
 * Returns empty list since layer policies are not available for analysis
 */
const AwsConfigListLayersCommand = awsConfigCommand({
  command: ListLayersCommand,
  execute: async (input, context) => {
    // Return empty list since we can't analyze layer policies from Config
    return {
      Layers: [],
      NextMarker: undefined
    }
  }
})

/**
 * Config-based implementation of Lambda ListLayerVersionsCommand
 * Returns empty list since layer version policies are not available for analysis
 */
const AwsConfigListLayerVersionsCommand = awsConfigCommand({
  command: ListLayerVersionsCommand,
  execute: async (input, context) => {
    // Return empty list since we can't analyze layer version policies from Config
    return {
      LayerVersions: [],
      NextMarker: undefined
    }
  }
})

/**
 * Config-based implementation of Lambda ListTagsCommand
 *
 * Maps Lambda::Function Config tag data to Lambda ListTagsCommand output format.
 * Returns function tags for resource identification and compliance analysis.
 */
const AwsConfigListTagsCommand = awsConfigCommand({
  command: ListTagsCommand,
  execute: async (input, context) => {
    // Extract function name from ARN or use the Resource directly as function name
    const resourceArn = input.Resource!

    const tags = context.getCache(resourceArn, 'tags')

    return {
      Tags: tags || {}
    }
  }
})
