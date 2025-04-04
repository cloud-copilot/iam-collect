import { getCredentials, getDefaultCredentials, getTokenInfo } from '../aws/auth.js'
import {
  accountServiceRegionConfig,
  getAccountAuthConfig,
  getStorageConfig,
  regionsForService,
  servicesForAccount,
  StorageConfig,
  TopLevelConfig
} from '../config/config.js'
import { AwsIamStore } from '../persistence/AwsIamStore.js'
import { FileSystemAwsIamStore } from '../persistence/file/FileSystemAwsIamStore.js'
import { getEnabledRegions } from '../regions.js'
import { allServices } from '../services.js'
import { getGlobalSyncsForService, getRegionalSyncsForService } from '../syncs/syncMap.js'

export async function downloadData(
  configs: TopLevelConfig[],
  accountIds: string[],
  regions: string[],
  services: string[]
): Promise<void> {
  if (accountIds.length === 0) {
    const defaultCredentials = await getDefaultCredentials()
    const tokenInfo = await getTokenInfo(defaultCredentials)
    accountIds = [tokenInfo.accountId]
  }

  const storageConfig = getStorageConfig(configs)
  if (!storageConfig) {
    throw new Error('No storage configuration found. Cannot download data.')
  }
  for (const accountId of accountIds) {
    console.log(`Downloading data for account ${accountId}`)
    const authForAccount = getAccountAuthConfig(accountId, configs)
    const credentials = await getCredentials(accountId, authForAccount)

    if (regions.length === 0) {
      regions = await getEnabledRegions(credentials)
      // console.log(`Enabled regions for account ${accountId}:`, enabledRegions)
    }

    const storage = createStorageClient(storageConfig, credentials.partition)

    if (services.length === 0) {
      services = allServices
    }
    const syncOptions = {}

    const enabledServices = servicesForAccount(accountId, configs, services)
    for (const service of enabledServices) {
      console.log(`Service ${service} for account ${accountId}`)
      const serviceRegions = regionsForService(service, accountId, configs, regions)

      //Global syncs for the service
      const globalSyncs = getGlobalSyncsForService(service)
      const globalRegion = serviceRegions.at(0)!
      const globalConfig = accountServiceRegionConfig(service, accountId, globalRegion, configs)
      const globalCredentials = await getCredentials(accountId, globalConfig.auth)

      for (const globalSync of globalSyncs) {
        await globalSync.execute(
          accountId,
          globalRegion,
          globalCredentials,
          storage,
          globalConfig.endpoint,
          syncOptions
        )
      }

      //Regional syncs for the service
      for (const region of serviceRegions) {
        console.log(`Service ${service} for account ${accountId} in region ${region}`)
        const regionalSyncs = getRegionalSyncsForService(service)
        if (regionalSyncs.length === 0) {
          continue
        }
        const asrConfig = accountServiceRegionConfig(service, accountId, region, configs)
        const regionalCredentials = await getCredentials(accountId, asrConfig.auth)

        for (const sync of regionalSyncs) {
          await sync.execute(
            accountId,
            region,
            regionalCredentials,
            storage,
            asrConfig.endpoint,
            syncOptions
          )
        }
      }
    }
  }
}

function createStorageClient(storageConfig: StorageConfig, partition: string): AwsIamStore {
  if (storageConfig.type === 'file') {
    return new FileSystemAwsIamStore(storageConfig.path, partition)
  }
  throw new Error(`Unsupported storage type: ${storageConfig.type}. Supported types are: file.`)
}
