import { AccountClient, ListRegionsCommand, RegionOptStatus } from '@aws-sdk/client-account'
import { AwsCredentialIdentityWithMetaData } from './aws/coreAuth.js'
import { isDefined } from './utils/types.js'

export async function getEnabledRegions(
  credentials: AwsCredentialIdentityWithMetaData
): Promise<string[]> {
  const accountClient = new AccountClient({ credentials })
  const getRegionsCommand = new ListRegionsCommand({
    RegionOptStatusContains: [RegionOptStatus.ENABLED, RegionOptStatus.ENABLED_BY_DEFAULT]
  })

  const result = await accountClient.send(getRegionsCommand)
  const regions = result.Regions?.map((r) => r.RegionName!).filter(isDefined) || []

  return regions
}
