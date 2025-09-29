import {
  DescribeRepositoriesCommand,
  ECRClient,
  GetRegistryPolicyCommand,
  GetRepositoryPolicyCommand,
  ListTagsForResourceCommand
} from '@aws-sdk/client-ecr'
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
 * Config-based ECR client implementation
 */
export class AwsConfigEcrClient extends AbstractClient<AwsConfigClientContext> {
  static readonly clientName = ECRClient.name

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
   * Register all ECR command implementations
   */
  protected registerCommands(): void {
    this.registerCommand(AwsConfigDescribeRepositoriesCommand)
    this.registerCommand(AwsConfigGetRepositoryPolicyCommand)
    this.registerCommand(AwsConfigListTagsForResourceCommand)
    this.registerCommand(AwsConfigGetRegistryPolicyCommand)
  }
}

/**
 * Config-based implementation of ECR GetRegistryPolicyCommand
 * Uses AWS::ECR::RegistryPolicy resource type from Config
 */
const AwsConfigGetRegistryPolicyCommand = awsConfigCommand({
  command: GetRegistryPolicyCommand,
  execute: async (input, context) => {
    const query = `
      SELECT
        configuration.PolicyText
      WHERE
        resourceType = 'AWS::ECR::RegistryPolicy'
        AND accountId = '${context.accountId}'
        AND awsRegion = '${context.region}'
        AND ${resourceStatusWhereClause}
    `

    const results = await executeConfigQuery(query, context)

    if (results.length === 0) {
      // Return undefined when no registry policy is configured
      return {
        policyText: undefined
      }
    }

    const { configuration } = parseConfigItem(results[0])

    return {
      policyText: configuration?.PolicyText ? JSON.stringify(configuration.PolicyText) : undefined
    }
  }
})

/**
 * Config-based implementation of ECR DescribeRepositoriesCommand
 *
 * Note: Without repository policies, repository listing provides no meaningful IAM analysis value.
 * ECR is primarily used for policy analysis, but policies are not available in Config.
 * Returning empty result to indicate no actionable data available.
 */
const AwsConfigDescribeRepositoriesCommand = awsConfigCommand({
  command: DescribeRepositoriesCommand,
  execute: async (input, context) => {
    const sql = `
    SELECT
      resourceId,
      arn,
      configuration.RepositoryName,
      configuration.RepositoryPolicyText,
      tags
    WHERE
      resourceType = 'AWS::ECR::Repository'
      AND awsRegion = '${context.region}'
      AND accountId = '${context.accountId}'
      AND ${resourceStatusWhereClause}
    `
    const results = await executeConfigQuery(sql, context)

    const repositories = results.map((resultString: string) => {
      const { configItem, configuration, tags } = parseConfigItem(resultString)

      // Cache data that will be needed by other commands
      context.putCache(configItem.resourceId, 'configuration', configuration)
      // Also cache by ARN for ListTagsForResourceCommand
      context.putCache(configItem.arn, 'configuration', configuration)

      return {
        repositoryName: configuration.RepositoryName
      }
    })

    return {
      repositories
    }
  }
})

/**
 * Config-based implementation of ECR GetRepositoryPolicyCommand
 *
 */
const AwsConfigGetRepositoryPolicyCommand = awsConfigCommand({
  command: GetRepositoryPolicyCommand,
  execute: async (input, context) => {
    const configuration = context.getCache(input.repositoryName!, 'configuration')

    return {
      policyText: stringifyIfPresent(configuration?.RepositoryPolicyText)
    }
  }
})

/**
 * Config-based implementation of ECR ListTagsForResourceCommand
 *
 */
const AwsConfigListTagsForResourceCommand = awsConfigCommand({
  command: ListTagsForResourceCommand,
  execute: async (input, context) => {
    const tags = context.getCache(input.resourceArn!, 'tags')

    return {
      tags: tags
    }
  }
})
