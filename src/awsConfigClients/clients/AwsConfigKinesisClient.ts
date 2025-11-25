import {
  DescribeStreamCommand,
  GetResourcePolicyCommand,
  KinesisClient,
  ListStreamsCommand,
  ListTagsForStreamCommand
} from '@aws-sdk/client-kinesis'
import { AwsCredentialProviderWithMetaData } from '../../aws/coreAuth.js'
import { AbstractClient } from '../../customClients/AbstractClient.js'
import { AwsConfigClientContext, awsConfigCommand } from '../AwsConfigClientContext.js'

/**
 * AWS Config-based Kinesis client implementation
 * Returns empty responses since stream policies are not tracked in AWS Config
 *
 * Since policies are not available in AWS Config, this client provides limited functionality
 * and returns empty results for all operations.
 */
export class AwsConfigKinesisClient extends AbstractClient<AwsConfigClientContext> {
  static readonly clientName = KinesisClient.name

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
   * Register all Kinesis command implementations
   */
  protected registerCommands(): void {
    this.registerCommand(AwsConfigListStreamsCommand)
    this.registerCommand(AwsConfigDescribeStreamCommand)
    this.registerCommand(AwsConfigGetResourcePolicyCommand)
    this.registerCommand(AwsConfigListTagsForStreamCommand)
  }
}

/**
 * Config-based implementation of Kinesis ListStreamsCommand
 * Returns empty list since stream policies are not available for analysis
 */
const AwsConfigListStreamsCommand = awsConfigCommand({
  command: ListStreamsCommand,
  execute: async (input, context) => {
    // Return empty list since we can't analyze stream policies from Config
    return {
      StreamNames: [],
      HasMoreStreams: false
    }
  }
})

/**
 * Config-based implementation of Kinesis DescribeStreamCommand
 * Returns minimal response since stream policies are not available for analysis
 */
const AwsConfigDescribeStreamCommand = awsConfigCommand({
  command: DescribeStreamCommand,
  execute: async (input, context) => {
    const { StreamName, StreamARN } = input

    if (!StreamName && !StreamARN) {
      throw new Error('StreamName or StreamARN is required for DescribeStreamCommand')
    }

    // Return minimal stream description since we can't analyze policies
    return {}
  }
})

/**
 * Config-based implementation of Kinesis GetResourcePolicyCommand
 * Returns empty result as stream policies are not tracked in AWS Config
 */
const AwsConfigGetResourcePolicyCommand = awsConfigCommand({
  command: GetResourcePolicyCommand,
  execute: async (input, context) => {
    // Stream resource policies are not available in AWS Config
    // Return empty response to maintain compatibility
    return {
      Policy: undefined
    }
  }
})

/**
 * Config-based implementation of Kinesis ListTagsForStreamCommand
 * Returns empty tags since stream policies are not available for analysis
 */
const AwsConfigListTagsForStreamCommand = awsConfigCommand({
  command: ListTagsForStreamCommand,
  execute: async (input, context) => {
    // Return empty tags since we can't analyze stream policies
    return {
      Tags: [],
      HasMoreTags: false
    }
  }
})
