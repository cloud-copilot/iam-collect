import { ConcurrentWorkerPool } from '@cloud-copilot/job'
import { getCredentials } from '../aws/auth.js'
import { AwsCredentialIdentityWithMetaData, getNewInitialCredentials } from '../aws/coreAuth.js'
import {
  accountServiceRegionConfig,
  configuredRegionListForAccount,
  customConfigForSync,
  getAccountAuthConfig,
  getConfiguredAccounts,
  getDefaultAuthConfig,
  getStorageConfig,
  regionsForService,
  servicesForAccount,
  syncEnabledForRegion,
  TopLevelConfig
} from '../config/config.js'
import { getPartitionDefaults } from '../config/partitionDefaults.js'
import { getIndexersForService } from '../indexing/indexMap.js'
import { IndexJob, runIndexJobs } from '../indexing/runIndexers.js'
import { JobRunner } from '../jobs/jobRunner.js'
import { defaultConcurrency } from '../jobs/util.js'
import { createStorageClient } from '../persistence/util.js'
import { getEnabledRegions } from '../regions.js'
import { allServices } from '../services.js'
import { getGlobalSyncsForService, getRegionalSyncsForService } from '../syncs/syncMap.js'
import { log } from '../utils/log.js'

/**
 * Download data from AWS services.
 *
 * @param configs the configurations to use for the download
 * @param accountIds the account IDs to download data for
 * @param regions the regions to download data from
 * @param services the services to download data from
 * @param concurrency the maximum number of concurrent downloads
 * @param skipIndex whether to skip indexing the downloaded data
 * @param writeOnly only write the data returned from AWS, do not delete any existing data
 */
export async function downloadData(
  configs: TopLevelConfig[],
  accountIds: string[],
  regions: string[],
  services: string[],
  concurrency: number | undefined,
  skipIndex: boolean,
  writeOnly: boolean
): Promise<void> {
  if (concurrency === undefined || concurrency <= 0) {
    concurrency = defaultConcurrency()
  }
  const deleteData = !writeOnly

  if (accountIds.length === 0) {
    const configuredAccounts = getConfiguredAccounts(configs)
    if (configuredAccounts.length > 0) {
      accountIds = configuredAccounts
    } else {
      const defaultAuthConfig = getDefaultAuthConfig(configs)
      const defaultCredentials = await getNewInitialCredentials(defaultAuthConfig, {
        phase: 'discover account'
      })
      accountIds = [defaultCredentials.accountId]
    }
  }

  const storageConfig = getStorageConfig(configs)
  if (!storageConfig) {
    throw new Error('No storage configuration found. Cannot download data.')
  }

  const indexJobs: IndexJob[] = []

  log.debug('Starting download runner', { concurrency })
  const downloadRunner = new JobRunner(concurrency)
  const workerPool = new ConcurrentWorkerPool(concurrency, log)

  for (const accountId of accountIds) {
    log.info('Queuing downloads for account', { accountId })
    const authForAccount = getAccountAuthConfig(accountId, configs)
    const credentials = await getCredentials(accountId, authForAccount)
    const partition = credentials.partition
    const partitionConfig = getPartitionDefaults(partition)
    const accountConfigs = [partitionConfig, ...configs]
    const accountRegions = await getAccountRegions(regions, accountId, configs, credentials)

    const storage = createStorageClient(storageConfig, partition, deleteData)
    if (services.length === 0) {
      services = allServices as unknown as string[]
    }
    const syncOptions = {
      workerPool,
      writeOnly
    }

    const enabledServices = servicesForAccount(accountId, accountConfigs, services)
    for (const service of enabledServices) {
      log.info('Queuing downloads', { service, accountId })
      const serviceRegions = regionsForService(service, accountId, accountConfigs, accountRegions)

      //Global syncs for the service
      const globalSyncs = getGlobalSyncsForService(service)
      const globalRegion = serviceRegions.at(0)!
      const globalConfig = accountServiceRegionConfig(
        service,
        accountId,
        globalRegion,
        accountConfigs
      )

      for (const globalSync of globalSyncs) {
        const customConfig = customConfigForSync(
          service,
          globalSync.name,
          accountId,
          globalRegion,
          accountConfigs
        )

        downloadRunner.enqueue({
          properties: { service, accountId, sync: globalSync.name },
          execute: async (context) => {
            const logDetails = {
              workerId: context.workerId,
              ...context.properties
            }
            const globalCredentials = await getCredentials(accountId, globalConfig.auth)
            log.debug(logDetails, 'Executing global sync')
            await globalSync.execute(
              accountId,
              globalRegion,
              globalCredentials,
              storage,
              globalConfig.endpoint,
              { ...syncOptions, customConfig }
            )
            log.trace(logDetails, 'Finished global sync')
          }
        })
      }

      const regionalSyncs = getRegionalSyncsForService(service)
      //Regional syncs for the service
      for (const region of serviceRegions) {
        if (regionalSyncs.length === 0) {
          continue
        }
        log.debug({ service, accountId, region }, 'Queuing regional syncs')
        const asrConfig = accountServiceRegionConfig(service, accountId, region, accountConfigs)

        for (const sync of regionalSyncs) {
          const includeSync = syncEnabledForRegion(
            accountId,
            service,
            sync.name,
            accountConfigs,
            region
          )
          if (!includeSync) {
            log.debug({ service, accountId, region, syncName: sync.name }, 'Skipping regional sync')
            continue
          }
          const customConfig = customConfigForSync(
            service,
            sync.name,
            accountId,
            region,
            accountConfigs
          )
          downloadRunner.enqueue({
            properties: { service, accountId, region, sync: sync.name },
            execute: async (context) => {
              const logDetails = {
                workerId: context.workerId,
                ...context.properties
              }
              log.debug(logDetails, 'Executing regional sync')
              const regionalCredentials = await getCredentials(accountId, asrConfig.auth)

              await sync.execute(
                accountId,
                region,
                regionalCredentials,
                storage,
                asrConfig.endpoint,
                { ...syncOptions, customConfig }
              )
              log.trace(logDetails, 'Finished regional sync')
            }
          })
        }
      }

      const indexers = getIndexersForService(service)
      for (const indexer of indexers) {
        indexJobs.push({
          indexer,
          partition,
          accountId,
          regions: serviceRegions
        })
      }
    }
  }

  log.info('Waiting for downloads to complete')
  await downloadRunner.finishAllWork()
  log.info('Finished downloads', { jobs: downloadRunner.getResults().length })
  const failedJobs = downloadRunner.getResults().filter((r) => r.status === 'rejected')
  if (failedJobs.length > 0) {
    log.error('Some downloads failed', { failedJobs: failedJobs.length })
    for (const failedJob of failedJobs) {
      log.error('Download failed', failedJob.reason, failedJob.properties)
    }
    throw new Error(`Failed to download some data. See logs for details.`)
  }

  if (skipIndex) {
    log.info('Skipping indexing')
    return
  }

  await runIndexJobs(indexJobs, storageConfig, concurrency)
}

async function getAccountRegions(
  allRegions: string[],
  accountId: string,
  configs: TopLevelConfig[],
  accountCredentials: AwsCredentialIdentityWithMetaData
): Promise<string[]> {
  if (allRegions.length > 0) {
    return allRegions
  }

  const configuredRegions = configuredRegionListForAccount(configs, accountId)
  if (configuredRegions) {
    log.debug('Using configured regions', { regions: configuredRegions, accountId })
    return configuredRegions
  } else {
    log.debug('No configured regions found, discovering regions for account', {
      accountId
    })
    return getEnabledRegions(accountCredentials)
  }
}
