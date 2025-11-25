import {
  DynamoDBClient,
  ListTablesCommand,
  ListTagsOfResourceCommand
} from '@aws-sdk/client-dynamodb'
import { AwsCredentialProviderWithMetaData } from '../../aws/coreAuth.js'
import { AbstractClient } from '../../customClients/AbstractClient.js'
import { AwsConfigClientContext, awsConfigCommand } from '../AwsConfigClientContext.js'

/**
 * AWS Config-based DynamoDB client implementation
 *
 * Since policies are not available in AWS Config, this client provides limited functionality
 * and returns empty results for all operations.
 */
export class AwsConfigDynamoDBClient extends AbstractClient<AwsConfigClientContext> {
  static readonly clientName = DynamoDBClient.name

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
   * Register all DynamoDB command implementations
   */
  protected registerCommands(): void {
    this.registerCommand(AwsConfigListTablesCommand)
    this.registerCommand(AwsConfigListTagsOfResourceCommand)
  }
}

/**
 * Config-based implementation of DynamoDB ListTablesCommand
 *
 * Note: DynamoDB resource policies are not available in AWS Config.
 * Without policy data, this service provides no meaningful value for IAM analysis.
 * Returning empty result to indicate no actionable data available.
 */
const AwsConfigListTablesCommand = awsConfigCommand({
  command: ListTablesCommand,
  execute: async (input, context) => {
    // Note: DynamoDB resource policies are not available in AWS Config.
    // Without policy data, this service provides no meaningful value for IAM analysis.
    return {
      TableNames: [] // Empty - no actionable data without policies
    }
  }
})

/**
 * Config-based implementation of DynamoDB ListTagsOfResourceCommand
 *
 * Note: DynamoDB resource policies are not available in AWS Config.
 * Without policy data, tag information provides no meaningful value for IAM analysis.
 * Returning empty result to indicate no actionable data available.
 */
const AwsConfigListTagsOfResourceCommand = awsConfigCommand({
  command: ListTagsOfResourceCommand,
  execute: async (input, context) => {
    // Note: Without resource policies, tag information provides no IAM analysis value
    return {
      Tags: [] // Empty - no actionable data without policies
    }
  }
})
