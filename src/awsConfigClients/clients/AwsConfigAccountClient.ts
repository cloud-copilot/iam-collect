import { AccountClient, ListRegionsCommand } from '@aws-sdk/client-account'
import { AwsCredentialIdentityWithMetaData } from '../../aws/coreAuth.js'
import { AbstractClient } from '../../customClients/AbstractClient.js'
import { AwsConfigClientContext, awsConfigCommand } from '../AwsConfigClientContext.js'
import { executeConfigQuery, resourceStatusWhereClause } from '../awsConfigUtils.js'

/**
 * KMS client implementation using AWS Config as data source
 */
export class AwsConfigAccountClient extends AbstractClient<AwsConfigClientContext> {
  static readonly clientName = AccountClient.name

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
   * Register all KMS command implementations
   */
  protected registerCommands(): void {
    this.registerCommand(
      awsConfigCommand({
        command: ListRegionsCommand,
        execute: async (input, context) => {
          const globalRegion = 'us-east-1'
          const partition = context.partition
          if (partition !== 'aws') {
            throw new Error(
              `Unknown global region for partition ${partition}. Please file an issue with the default region for your partition.`
            )
          }

          const accountId = context.accountId
          const query = `
            SELECT
              awsRegion
            WHERE
              accountId = '${accountId}'
              AND ${resourceStatusWhereClause}
            GROUP BY
              awsRegion
          `

          const results = await executeConfigQuery(query, context)

          // Convert the results to the expected format
          const uniqueRegions = new Set<string>()
          results.forEach((resultString) => {
            const result = JSON.parse(resultString)
            if (result.awsRegion === 'global') {
              uniqueRegions.add(globalRegion)
            } else if (result.awsRegion) {
              uniqueRegions.add(result.awsRegion)
            }
          })

          return {
            Regions: Array.from(uniqueRegions).map((regionName) => ({
              RegionName: regionName
            }))
          }
        }
      })
    )
  }
}
