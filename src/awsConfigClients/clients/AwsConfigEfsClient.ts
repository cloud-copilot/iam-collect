import {
  DescribeFileSystemPolicyCommand,
  DescribeFileSystemsCommand,
  EFSClient,
  FileSystemDescription
} from '@aws-sdk/client-efs'
import { AwsCredentialIdentityWithMetaData } from '../../aws/coreAuth.js'
import { AbstractClient } from '../../customClients/AbstractClient.js'
import { stringifyIfPresent } from '../../utils/json.js'
import { AwsConfigClientContext, awsConfigCommand } from '../AwsConfigClientContext.js'
import {
  executeConfigQuery,
  parseConfigItem,
  resourceStatusWhereClause
} from '../awsConfigUtils.js'

/**
 * AWS Config-based EFS client implementation
 */
export class AwsConfigEfsClient extends AbstractClient<AwsConfigClientContext> {
  static readonly clientName = EFSClient.name

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
   * Register all EFS command implementations
   */
  protected registerCommands(): void {
    this.registerCommand(AwsConfigDescribeFileSystemsCommand)
    this.registerCommand(AwsConfigDescribeFileSystemPolicyCommand)
  }
}

/**
 * Config-based implementation of EFS DescribeFileSystemPolicyCommand
 * Uses configuration.FileSystemPolicy from AWS Config
 */
const AwsConfigDescribeFileSystemPolicyCommand = awsConfigCommand({
  command: DescribeFileSystemPolicyCommand,
  execute: async (input, context) => {
    const configuration = context.getCache(input.FileSystemId!, 'configuration')

    return {
      FileSystemId: input.FileSystemId,
      Policy: stringifyIfPresent(configuration?.FileSystemPolicy)
    }
  }
})

/**
 * Config-based implementation of EFS DescribeFileSystemsCommand
 * Retrieves file system information from AWS Config with minimal required fields
 */
const AwsConfigDescribeFileSystemsCommand = awsConfigCommand({
  command: DescribeFileSystemsCommand,
  execute: async (input, context) => {
    let query = `
      SELECT
        resourceId,
        arn,
        configuration.Name,
        configuration.AvailabilityZoneId,
        configuration.KmsKeyId,
        configuration.Encrypted,
        configuration.CreationTime,
        configuration.FileSystemPolicy,
        tags
      WHERE
        resourceType = 'AWS::EFS::FileSystem'
        AND awsRegion = '${context.region}'
        AND accountId = '${context.accountId}'
        AND ${resourceStatusWhereClause}
    `

    // Add specific file system ID filter if provided
    if (input.FileSystemId) {
      query += ` AND resourceId = '${input.FileSystemId}'`
    }

    const results = await executeConfigQuery(query, context)

    // Transform Config results to match AWS SDK format with minimal required fields
    const fileSystems: FileSystemDescription[] = results.map((resultString: string) => {
      const { configItem, configuration, tags } = parseConfigItem(resultString)

      // Cache data that will be needed by other commands
      context.putCache(configItem.resourceId, 'configuration', configuration)

      return {
        FileSystemId: configItem.resourceId,
        FileSystemArn: configItem.arn,
        Name: configuration.Name,
        Encrypted: configuration.Encrypted || false,
        KmsKeyId: configuration.KmsKeyId,
        AvailabilityZoneId: configuration.AvailabilityZoneId,
        Tags: tags
      } as FileSystemDescription
    })

    return {
      FileSystems: fileSystems
    }
  }
})
