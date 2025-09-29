import {
  SelectAggregateResourceConfigCommand,
  SelectAggregateResourceConfigCommandOutput
} from '@aws-sdk/client-config-service'
import { AwsConfigClientContext } from './AwsConfigClientContext.js'

/**
 * Common utility functions for AWS Config-based command implementations
 */

/**
 * Execute AWS Config query and return all paginated results
 *
 * @param query The AWS Config query string
 * @param context The AWS Config client context
 *
 * @returns An array of results
 */
export async function executeConfigQuery(
  query: string,
  context: AwsConfigClientContext
): Promise<string[]> {
  const { configClient } = context
  const allResults: string[] = []
  let nextToken: string | undefined = undefined

  do {
    const result: SelectAggregateResourceConfigCommandOutput = await configClient.send(
      new SelectAggregateResourceConfigCommand({
        ConfigurationAggregatorName: context.aggregatorName,
        Expression: query,
        MaxResults: 100,
        NextToken: nextToken
      })
    )

    // Add current page results to the collection
    if (result.Results) {
      allResults.push(...result.Results)
    }

    // Update nextToken for next iteration
    nextToken = result.NextToken
  } while (nextToken)

  return allResults
}

/**
 * Parse a Config result item into structured data
 *
 * @param configItemString The JSON string of the config item
 * @returns An object containing the parsed config item and its components
 */
export function parseConfigItem(configItemString: string): {
  configItem: any
  configuration: any | undefined
  supplementaryConfiguration: any | undefined
  tags: any
} {
  const configItem = JSON.parse(configItemString)
  let configuration = configItem.configuration
  if (typeof configuration === 'string') {
    configuration = JSON.parse(configuration || '{}')
  }

  let supplementaryConfiguration = configItem.supplementaryConfiguration
  if (typeof supplementaryConfiguration === 'string') {
    supplementaryConfiguration = JSON.parse(supplementaryConfiguration || '{}')
  }

  let tags = configItem.tags
  if (typeof tags === 'string') {
    tags = JSON.parse(tags || '{}')
  }

  return { configItem, configuration, supplementaryConfiguration, tags }
}

/**
 * Where clause to filter for resources that are active/discovered
 */
export const resourceStatusWhereClause = `configurationItemStatus IN ('ResourceDiscovered', 'OK')`
