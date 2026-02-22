import {
  GetAccessPointCommand,
  GetAccessPointForObjectLambdaCommand,
  GetAccessPointPolicyCommand,
  GetAccessPointPolicyForObjectLambdaCommand,
  GetBucketPolicyCommand,
  GetBucketTaggingCommand,
  GetMultiRegionAccessPointPolicyCommand,
  GetPublicAccessBlockCommand,
  ListAccessPointsCommand,
  ListAccessPointsForDirectoryBucketsCommand,
  ListAccessPointsForObjectLambdaCommand,
  ListMultiRegionAccessPointsCommand,
  ListRegionalBucketsCommand,
  ListTagsForResourceCommand,
  S3ControlClient
} from '@aws-sdk/client-s3-control'
import { type AwsCredentialProviderWithMetaData } from '../../aws/coreAuth.js'
import { AbstractClient } from '../../customClients/AbstractClient.js'
import { stringifyIfPresent } from '../../utils/json.js'
import { type AwsConfigClientContext, awsConfigCommand } from '../AwsConfigClientContext.js'
import {
  executeConfigQuery,
  parseConfigItem,
  resourceStatusWhereClause
} from '../awsConfigUtils.js'

/**
 * AWS Config client for S3 Control operations.
 *
 * Supported Commands:
 * - ListAccessPointsCommand: Returns access point listing from Config using AWS::S3::AccessPoint
 * - GetAccessPointCommand: Returns access point details from Config including alias, public access block config
 * - GetPublicAccessBlockCommand: Returns account-level public access block configuration from Config
 *
 * Limitations:
 * S3 access point policies, multi-region access point policies, and Object Lambda policies
 * are not available in AWS Config. The Config service tracks access point configuration
 * but not access policies. Most policy-related commands return undefined/empty responses.
 */
export class AwsConfigS3ControlClient extends AbstractClient<AwsConfigClientContext> {
  static readonly clientName = S3ControlClient.name

  constructor(
    options: {
      credentials: AwsCredentialProviderWithMetaData
      region: string | undefined
    },
    customContext: AwsConfigClientContext
  ) {
    super(options, customContext)
  }

  protected registerCommands(): void {
    this.registerCommand(AwsConfigGetAccessPointCommand)
    this.registerCommand(AwsConfigGetAccessPointPolicyCommand)
    this.registerCommand(AwsConfigGetAccessPointForObjectLambdaCommand)
    this.registerCommand(AwsConfigGetAccessPointPolicyForObjectLambdaCommand)
    this.registerCommand(AwsConfigGetBucketPolicyCommand)
    this.registerCommand(AwsConfigGetBucketTaggingCommand)
    this.registerCommand(AwsConfigGetMultiRegionAccessPointPolicyCommand)
    this.registerCommand(AwsConfigGetPublicAccessBlockCommand)
    this.registerCommand(AwsConfigListAccessPointsCommand)
    this.registerCommand(AwsConfigListAccessPointsForDirectoryBucketsCommand)
    this.registerCommand(AwsConfigListAccessPointsForObjectLambdaCommand)
    this.registerCommand(AwsConfigListMultiRegionAccessPointsCommand)
    this.registerCommand(AwsConfigListRegionalBucketsCommand)
    this.registerCommand(AwsConfigListTagsForResourceCommand)
  }
}

/**
 * Config-based implementation of S3Control ListAccessPointsCommand
 * Uses AWS::S3::AccessPoint resource type from Config
 */
const AwsConfigListAccessPointsCommand = awsConfigCommand({
  command: ListAccessPointsCommand,
  execute: async (input, context) => {
    const query = `
      SELECT
        arn,
        resourceId,
        resourceName,
        configuration.Name,
        configuration.Bucket,
        configuration.BucketAccountId,
        configuration.NetworkOrigin,
        configuration.VpcConfiguration.VpcId,
        configuration.Policy,
        configuration.Alias,
        configuration.VpcConfiguration.VpcId,
        configuration.PublicAccessBlockConfiguration.BlockPublicAcls,
        configuration.PublicAccessBlockConfiguration.BlockPublicPolicy,
        configuration.PublicAccessBlockConfiguration.IgnorePublicAcls,
        configuration.PublicAccessBlockConfiguration.RestrictPublicBuckets,
        resourceCreationTime
      WHERE
        resourceType = 'AWS::S3::AccessPoint'
        AND awsRegion = '${context.region}'
        AND accountId = '${context.accountId}'
        AND ${resourceStatusWhereClause}
    `

    const results = await executeConfigQuery(query, context)

    const accessPoints =
      results?.map((resultString) => {
        const { configItem, configuration } = parseConfigItem(resultString)
        context.putCache(`ap#${configuration.Name}`, 'policy', configuration?.Policy)
        context.putCache(`ap#${configuration.Name}`, 'details', { configItem, configuration })

        return {
          Name: configuration?.Name || configItem.resourceName, //keep
          NetworkOrigin: configuration?.NetworkOrigin, // Keep
          VpcConfiguration: configuration?.VpcConfiguration?.VpcId // Keep
            ? {
                VpcId: configuration.VpcConfiguration.VpcId
              }
            : undefined,
          Bucket: configuration?.Bucket, // Keep
          BucketAccountId: configuration?.BucketAccountId, // Keep
          AccessPointArn: configItem.arn // Keep
        }
      }) || []

    return {
      AccessPointList: accessPoints
    }
  }
})

/**
 * Config-based implementation of S3Control GetAccessPointCommand
 * Uses AWS::S3::AccessPoint resource type from Config
 */
const AwsConfigGetAccessPointCommand = awsConfigCommand({
  command: GetAccessPointCommand,
  execute: async (input, context) => {
    const { configItem, configuration } = context.getCache(`ap#${input.Name}`, 'details')

    return {
      Name: configuration?.Name || configItem.resourceName,
      Bucket: configuration?.Bucket,
      NetworkOrigin: configuration?.NetworkOrigin,
      VpcConfiguration: configuration?.VpcConfiguration?.VpcId
        ? {
            VpcId: configuration.VpcConfiguration.VpcId
          }
        : undefined,
      PublicAccessBlockConfiguration: configuration?.PublicAccessBlockConfiguration
        ? {
            BlockPublicAcls: configuration.PublicAccessBlockConfiguration.BlockPublicAcls,
            BlockPublicPolicy: configuration.PublicAccessBlockConfiguration.BlockPublicPolicy,
            IgnorePublicAcls: configuration.PublicAccessBlockConfiguration.IgnorePublicAcls,
            RestrictPublicBuckets:
              configuration.PublicAccessBlockConfiguration.RestrictPublicBuckets
          }
        : undefined,
      CreationDate: configItem.resourceCreationTime
        ? new Date(configItem.resourceCreationTime)
        : undefined,
      Alias: configuration?.Alias,
      AccessPointArn: configItem.arn,
      BucketAccountId: configuration?.BucketAccountId
    }
  }
})

/**
 * Config-based implementation of S3Control GetAccessPointPolicyCommand
 * Returns undefined since access point policies are not available in Config
 */
const AwsConfigGetAccessPointPolicyCommand = awsConfigCommand({
  command: GetAccessPointPolicyCommand,
  execute: async (input, context) => {
    const { Name, AccountId } = input

    if (!Name || !AccountId) {
      throw new Error('Name and AccountId are required')
    }

    const policy = context.getCache(`ap#${Name}`, 'policy')
    return {
      Policy: stringifyIfPresent(policy)
    }
  }
})

/**
 * Config-based implementation of S3Control GetAccessPointForObjectLambdaCommand
 * Returns minimal Object Lambda access point info since configuration is not available in Config
 */
const AwsConfigGetAccessPointForObjectLambdaCommand = awsConfigCommand({
  command: GetAccessPointForObjectLambdaCommand,
  execute: async (input, context) => {
    // Return minimal info since Object Lambda config is not tracked in Config
    return { Name: input.Name }
  }
})

/**
 * Config-based implementation of S3Control GetAccessPointPolicyForObjectLambdaCommand
 * Returns undefined since Object Lambda access point policies are not available in Config
 */
const AwsConfigGetAccessPointPolicyForObjectLambdaCommand = awsConfigCommand({
  command: GetAccessPointPolicyForObjectLambdaCommand,
  execute: async (input, context) => {
    // Return undefined since Object Lambda policies are not tracked in Config
    return undefined
  }
})

/**
 * Config-based implementation of S3Control GetBucketPolicyCommand
 * Returns undefined since Outpost bucket policies are not available in Config
 */
const AwsConfigGetBucketPolicyCommand = awsConfigCommand({
  command: GetBucketPolicyCommand,
  execute: async (input, context) => {
    // Return undefined since Outpost bucket policies are not tracked in Config
    return undefined
  }
})

/**
 * Config-based implementation of S3Control GetBucketTaggingCommand
 * Returns undefined since Outpost bucket tags are not available in Config
 */
const AwsConfigGetBucketTaggingCommand = awsConfigCommand({
  command: GetBucketTaggingCommand,
  execute: async (input, context) => {
    // Return undefined since Outpost bucket tags are not tracked in Config
    return undefined
  }
})

/**
 * Config-based implementation of S3Control GetMultiRegionAccessPointPolicyCommand
 * Returns undefined since multi-region access point policies are not available in Config
 */
const AwsConfigGetMultiRegionAccessPointPolicyCommand = awsConfigCommand({
  command: GetMultiRegionAccessPointPolicyCommand,
  execute: async (input, context) => {
    // Return undefined since MRAP policies are not tracked in Config
    return undefined
  }
})

/**
 * Config-based implementation of S3Control GetPublicAccessBlockCommand
 * Uses AWS::S3::AccountPublicAccessBlock resource type from Config
 */
const AwsConfigGetPublicAccessBlockCommand = awsConfigCommand({
  command: GetPublicAccessBlockCommand,
  execute: async (input, context) => {
    const query = `
      SELECT
        configuration.blockPublicAcls,
        configuration.blockPublicPolicy,
        configuration.ignorePublicAcls,
        configuration.restrictPublicBuckets
      WHERE
        resourceType = 'AWS::S3::AccountPublicAccessBlock'
        AND accountId = '${context.accountId}'
        AND ${resourceStatusWhereClause}
    `

    const results = await executeConfigQuery(query, context)

    if (results.length === 0) {
      return {}
    }

    const { configuration } = parseConfigItem(results[0])

    return {
      PublicAccessBlockConfiguration: {
        BlockPublicAcls: configuration?.blockPublicAcls,
        BlockPublicPolicy: configuration?.blockPublicPolicy,
        IgnorePublicAcls: configuration?.ignorePublicAcls,
        RestrictPublicBuckets: configuration?.restrictPublicBuckets
      }
    }
  }
})

/**
 * Config-based implementation of S3Control ListAccessPointsForDirectoryBucketsCommand
 * Returns empty array since directory bucket access point listings are not available in Config
 */
const AwsConfigListAccessPointsForDirectoryBucketsCommand = awsConfigCommand({
  command: ListAccessPointsForDirectoryBucketsCommand,
  execute: async (input, context) => {
    // Return empty array since directory bucket access points are not tracked in Config
    return { AccessPointList: [] }
  }
})

/**
 * Config-based implementation of S3Control ListAccessPointsForObjectLambdaCommand
 * Returns empty array since Object Lambda access point listings are not available in Config
 */
const AwsConfigListAccessPointsForObjectLambdaCommand = awsConfigCommand({
  command: ListAccessPointsForObjectLambdaCommand,
  execute: async (input, context) => {
    // Return empty array since Object Lambda access points are not tracked in Config
    return { ObjectLambdaAccessPointList: [] }
  }
})

/**
 * Config-based implementation of S3Control ListMultiRegionAccessPointsCommand
 * Returns empty array since multi-region access point listings are not available in Config
 */
const AwsConfigListMultiRegionAccessPointsCommand = awsConfigCommand({
  command: ListMultiRegionAccessPointsCommand,
  execute: async (input, context) => {
    // Return empty array since MRAPs are not tracked in Config
    return { AccessPoints: [] }
  }
})

/**
 * Config-based implementation of S3Control ListRegionalBucketsCommand
 * Returns empty array since regional bucket listings are not available in Config
 */
const AwsConfigListRegionalBucketsCommand = awsConfigCommand({
  command: ListRegionalBucketsCommand,
  execute: async (input, context) => {
    // Return empty array since regional buckets are not tracked in Config
    return { RegionalBucketList: [] }
  }
})

/**
 * Config-based implementation of S3Control ListTagsForResourceCommand
 * Returns empty array since resource tags are not available in Config for policy analysis
 */
const AwsConfigListTagsForResourceCommand = awsConfigCommand({
  command: ListTagsForResourceCommand,
  execute: async (input, context) => {
    // Return empty array since resource tags are not tracked in Config
    return { Tags: [] }
  }
})
