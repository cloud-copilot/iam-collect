import {
  DescribeDomainCommand,
  DomainStatus,
  ListDomainNamesCommand,
  ListTagsCommand,
  OpenSearchClient
} from '@aws-sdk/client-opensearch'
import { AwsCredentialIdentityWithMetaData } from '../../aws/coreAuth.js'
import { AbstractClient } from '../../customClients/AbstractClient.js'
import { AwsConfigClientContext, awsConfigCommand } from '../AwsConfigClientContext.js'
import {
  executeConfigQuery,
  parseConfigItem,
  resourceStatusWhereClause
} from '../awsConfigUtils.js'

/**
 * AWS Config-based OpenSearch client implementation
 */
export class AwsConfigOpenSearchClient extends AbstractClient<AwsConfigClientContext> {
  static readonly clientName = OpenSearchClient.name

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
   * Register all OpenSearch command implementations
   */
  protected registerCommands(): void {
    this.registerCommand(AwsConfigDescribeDomainCommand)
    this.registerCommand(AwsConfigListDomainNamesCommand)
    this.registerCommand(AwsConfigListTagsCommand)
  }
}

/**
 * Config-based implementation of OpenSearch ListDomainNamesCommand
 * Returns all domain names from AWS Config
 */
const AwsConfigListDomainNamesCommand = awsConfigCommand({
  command: ListDomainNamesCommand,
  execute: async (input, context) => {
    const query = `
      SELECT
        arn,
        resourceId,
        resourceName,
        configuration.AccessPolicies,
        configuration.Id,
        configuration.DomainName,
        configuration.EncryptionAtRestOptions,
        tags
      WHERE
        resourceType = 'AWS::OpenSearch::Domain'
        AND awsRegion = '${context.region}'
        AND accountId = '${context.accountId}'
        AND ${resourceStatusWhereClause}
    `

    const results = await executeConfigQuery(query, context)
    const domains = results
      .map((result) => {
        const { configItem, configuration, tags } = parseConfigItem(result)

        // Cache data that will be needed by other commands
        // Use domain name as cache key since that's what DescribeDomainCommand uses
        if (configuration?.DomainName) {
          context.putCache(configuration.DomainName, 'configuration', configuration)
          context.putCache(configuration.DomainName, 'configItem', configItem)
          // Also cache by ARN for ListTagsCommand
          context.putCache(configItem.arn, 'tags', tags)
        }

        return {
          DomainName: configuration?.DomainName
        }
      })
      .filter((domain) => domain.DomainName)

    return {
      DomainNames: domains
    }
  }
})

/**
 * Config-based implementation of OpenSearch DescribeDomainCommand
 * Returns domain info including access policies from AWS Config
 */
const AwsConfigDescribeDomainCommand = awsConfigCommand({
  command: DescribeDomainCommand,
  execute: async (input, context) => {
    if (!input.DomainName) {
      throw new Error('DomainName is required')
    }

    const configuration = context.getCache(input.DomainName, 'configuration')
    const configItem = context.getCache(input.DomainName, 'configItem')

    // Parse the access policies from the configuration JSON string
    let accessPolicies: string | undefined = undefined
    if (configuration?.AccessPolicies) {
      accessPolicies = JSON.stringify(configuration.AccessPolicies)
    }

    return {
      DomainStatus: {
        DomainId: configuration?.Id || configItem.resourceId,
        DomainName: configuration?.DomainName,
        ARN: configItem.arn,
        AccessPolicies: accessPolicies,
        EncryptionAtRestOptions: {
          Enabled: configuration?.EncryptionAtRestOptions?.Enabled || false,
          KmsKeyId: configuration?.EncryptionAtRestOptions?.KmsKeyId
        }
      } as DomainStatus
    }
  }
})

/**
 * Config-based implementation of OpenSearch ListTagsCommand
 * Returns domain tags from AWS Config
 */
const AwsConfigListTagsCommand = awsConfigCommand({
  command: ListTagsCommand,
  execute: async (input, context) => {
    if (!input.ARN) {
      throw new Error('ARN is required')
    }

    const tags = context.getCache(input.ARN, 'tags')

    // Convert Config tags format to OpenSearch tags format
    const tagList = tags
      ? Object.entries(tags).map(([key, value]) => ({
          Key: key,
          Value: value as string
        }))
      : []

    return {
      TagList: tagList
    }
  }
})
