import { AccountClient, ListRegionsCommand, RegionOptStatus } from '@aws-sdk/client-account'
import { AwsCredentialIdentityWithMetaData } from './aws/coreAuth.js'
import { paginateResource } from './syncs/typedSync.js'
import { isDefined } from './utils/types.js'

export async function getEnabledRegions(
  credentials: AwsCredentialIdentityWithMetaData
): Promise<string[]> {
  const accountClient = new AccountClient({ credentials })

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
