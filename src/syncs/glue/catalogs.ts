import { GetResourcePolicyCommand, GlueClient } from '@aws-sdk/client-glue'
import { runAndCatchError } from '../../utils/client-tools.js'
import { parseIfPresent } from '../../utils/json.js'
import { type Sync } from '../sync.js'

export const GlueCatalogSync: Sync = {
  name: 'GlueCatalogSync',
  awsService: 'glue',
  execute: async (accountId, region, credentials, storage, endpoint, syncOptions) => {
    const glueClient = syncOptions.clientPool.client(GlueClient, credentials, region, endpoint)

    const policy = await runAndCatchError('EntityNotFoundException', async () => {
      const result = await glueClient.send(new GetResourcePolicyCommand())
      return parseIfPresent(result.PolicyInJson)
    })

    const arn = rootCatalogArn(credentials.partition, accountId, region)
    if (policy) {
      await storage.saveResourceMetadata(accountId, arn, 'policy', policy)
      await storage.saveResourceMetadata(accountId, arn, 'metadata', {
        arn
      })
    } else {
      await storage.deleteResource(accountId, arn)
    }
  }
}

/**
 * Get the ARN for a root Glue catalog
 *
 * @param partition the partition (aws, aws-cn, aws-us-gov)
 * @param accountId the account id
 * @param region the region
 * @returns the ARN for the root Glue catalog
 */
function rootCatalogArn(partition: string, accountId: string, region: string) {
  return `arn:${partition}:glue:${region}:${accountId}:catalog`
}
