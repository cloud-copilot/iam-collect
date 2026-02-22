import {
  BackupClient,
  GetBackupVaultAccessPolicyCommand,
  ListBackupVaultsCommand,
  ListTagsCommand
} from '@aws-sdk/client-backup'
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
 * AWS Config-based Backup client implementation
 */
export class AwsConfigBackupClient extends AbstractClient<AwsConfigClientContext> {
  static readonly clientName = BackupClient.name

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
   * Register all Backup command implementations
   */
  protected registerCommands(): void {
    this.registerCommand(AwsConfigGetBackupVaultAccessPolicyCommand)
    this.registerCommand(AwsConfigListBackupVaultsCommand)
    this.registerCommand(AwsConfigListTagsCommand)
  }
}

/**
 * Config-based implementation of Backup ListBackupVaultsCommand
 * Retrieves backup vault list from AWS Config
 */
const AwsConfigListBackupVaultsCommand = awsConfigCommand({
  command: ListBackupVaultsCommand,
  execute: async (input, context) => {
    const query = `
      SELECT
        resourceName,
        arn,
        configuration.BackupVaultName,
        configuration.BackupVaultArn,
        configuration.EncryptionKeyArn,
        configuration.AccessPolicy,
        resourceCreationTime,
        tags
      WHERE
        resourceType = 'AWS::Backup::BackupVault'
        AND awsRegion = '${context.region}'
        AND accountId = '${context.accountId}'
        AND ${resourceStatusWhereClause}
    `

    const results = await executeConfigQuery(query, context)

    // Transform Config results to match AWS SDK format
    const vaultList = results
      .map((resultString: string) => {
        const { configItem, configuration, tags } = parseConfigItem(resultString)

        // Cache data that will be needed by other commands
        const vaultName = configuration?.BackupVaultName || configItem.resourceName
        context.putCache(vaultName, 'configuration', configuration)
        context.putCache(configItem.arn, 'tags', tags)

        return {
          BackupVaultName: vaultName,
          BackupVaultArn: configuration?.BackupVaultArn || configItem.arn,
          EncryptionKeyArn: configuration?.EncryptionKeyArn
        }
      })
      .filter((vault: any) => vault.BackupVaultName) // Filter out any malformed entries

    return {
      BackupVaultList: vaultList,
      NextToken: undefined // Config doesn't support pagination in this context
    }
  }
})

/**
 * Config-based implementation of Backup GetBackupVaultAccessPolicyCommand
 * Uses configuration.AccessPolicy from AWS Config BackupVault resource
 */
const AwsConfigGetBackupVaultAccessPolicyCommand = awsConfigCommand({
  command: GetBackupVaultAccessPolicyCommand,
  execute: async (input, context) => {
    const configuration = context.getCache(input.BackupVaultName!, 'configuration')

    return {
      BackupVaultName: input.BackupVaultName,
      BackupVaultArn: configuration.BackupVaultArn,
      Policy: stringifyIfPresent(configuration?.AccessPolicy)
    }
  }
})

/**
 * Config-based implementation of Backup ListTagsCommand
 * Retrieves tags for a specific backup vault from AWS Config
 */
const AwsConfigListTagsCommand = awsConfigCommand({
  command: ListTagsCommand,
  execute: async (input, context) => {
    const tags = context.getCache(input.ResourceArn!, 'tags')

    return { Tags: tags }
  }
})
