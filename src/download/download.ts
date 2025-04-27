import { getCredentials } from '../aws/auth.js'
import { getNewInitialCredentials } from '../aws/coreAuth.js'
import {
  accountServiceRegionConfig,
  getAccountAuthConfig,
  getDefaultAuthConfig,
  getStorageConfig,
  regionsForService,
  servicesForAccount,
  TopLevelConfig
} from '../config/config.js'
import { createStorageClient } from '../persistence/util.js'
import { getEnabledRegions } from '../regions.js'
import { allServices } from '../services.js'
import { getGlobalSyncsForService, getRegionalSyncsForService } from '../syncs/syncMap.js'
import { log } from '../utils/log.js'
import { Job, runJobs } from './jobQueue.js'
import { defaultConcurrency } from './util.js'

export async function downloadData(
  configs: TopLevelConfig[],
  accountIds: string[],
  regions: string[],
  services: string[],
  concurrency: number | undefined
): Promise<void> {
  if (concurrency === undefined || concurrency <= 0) {
    concurrency = defaultConcurrency()
  }

  if (accountIds.length === 0) {
    const defaultAuthConfig = getDefaultAuthConfig(configs)
    const defaultCredentials = await getNewInitialCredentials(defaultAuthConfig, {
      phase: 'discover account'
    })
    accountIds = [defaultCredentials.accountId]
  }

  const storageConfig = getStorageConfig(configs)
  if (!storageConfig) {
    throw new Error('No storage configuration found. Cannot download data.')
  }

  const jobs: Job[] = []

  for (const accountId of accountIds) {
    log.info('Queuing downloads for account', { accountId })
    const authForAccount = getAccountAuthConfig(accountId, configs)
    const credentials = await getCredentials(accountId, authForAccount)

    if (regions.length === 0) {
      regions = await getEnabledRegions(credentials)
    }

    const storage = createStorageClient(storageConfig, credentials.partition)

    if (services.length === 0) {
      services = allServices as unknown as string[]
    }
    const syncOptions = {}

    const enabledServices = servicesForAccount(accountId, configs, services)
    for (const service of enabledServices) {
      log.info('Queuing downloads', { service, accountId })
      const serviceRegions = regionsForService(service, accountId, configs, regions)

      //Global syncs for the service
      const globalSyncs = getGlobalSyncsForService(service)
      const globalRegion = serviceRegions.at(0)!
      const globalConfig = accountServiceRegionConfig(service, accountId, globalRegion, configs)

      for (const globalSync of globalSyncs) {
        jobs.push({
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
              syncOptions
            )
            log.debug(logDetails, 'Finished global sync')
          }
        })
      }

      //Regional syncs for the service
      for (const region of serviceRegions) {
        log.debug({ service, accountId, region }, 'Queuing regional syncs')
        const regionalSyncs = getRegionalSyncsForService(service)
        if (regionalSyncs.length === 0) {
          continue
        }
        const asrConfig = accountServiceRegionConfig(service, accountId, region, configs)

        for (const sync of regionalSyncs) {
          jobs.push({
            properties: { service, accountId, region, sync: sync.name },
            execute: async (context) => {
              const logDetails = {
                workerId: context.workerId,
                ...context.properties
              }
              log.trace(logDetails, 'Executing regional sync')
              const regionalCredentials = await getCredentials(accountId, asrConfig.auth)

              await sync.execute(
                accountId,
                region,
                regionalCredentials,
                storage,
                asrConfig.endpoint,
                syncOptions
              )
              log.trace(logDetails, 'Finished regional sync')
            }
          })
        }
      }
    }
  }

  log.debug('Starting downloads', { jobs: jobs.length, concurrency })
  const results = await runJobs(jobs, concurrency)
  const failedJobs = results.filter((r) => r.status === 'rejected')
  if (failedJobs.length > 0) {
    log.error('Some jobs failed', { failedJobs: failedJobs.length })
    for (const failedJob of failedJobs) {
      log.error('Job failed', failedJob.reason, failedJob.properties)
    }
    throw new Error(`Failed to download download some data. See logs for details.`)
  }
  log.info('Finished downloads', { jobs: jobs.length })
}
