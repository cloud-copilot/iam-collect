import { AccountClient, ListRegionsCommand } from '@aws-sdk/client-account'
import { AwsClientPool } from './aws/ClientPool.js'
import { AwsCredentialProviderWithMetaData } from './aws/coreAuth.js'
import { paginateResource } from './syncs/typedSync.js'
import { isDefined } from './utils/types.js'

export async function getEnabledRegions(
  credentials: AwsCredentialProviderWithMetaData,
  clientPool: AwsClientPool
): Promise<string[]> {
  const accountClient = clientPool.client(AccountClient, credentials, undefined, undefined)

  const enabledRegions = await paginateResource(
    accountClient,
    ListRegionsCommand,
    'Regions',
    {
      inputKey: 'NextToken',
      outputKey: 'NextToken'
    },
    {
      RegionOptStatusContains: ['ENABLED', 'ENABLED_BY_DEFAULT']
    }
  )

  const regions = enabledRegions.map((r) => r.RegionName!).filter(isDefined) || []

  return regions
}
