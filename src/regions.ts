import { AccountClient, ListRegionsCommand, RegionOptStatus } from '@aws-sdk/client-account'
import { AwsClientPool } from './aws/ClientPool.js'
import { AwsCredentialIdentityWithMetaData } from './aws/coreAuth.js'
import { paginateResource } from './syncs/typedSync.js'
import { isDefined } from './utils/types.js'

export async function getEnabledRegions(
  credentials: AwsCredentialIdentityWithMetaData,
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
      RegionOptStatusContains: [RegionOptStatus.ENABLED, RegionOptStatus.ENABLED_BY_DEFAULT]
    }
  )

  const regions = enabledRegions.map((r) => r.RegionName!).filter(isDefined) || []

  return regions
}
