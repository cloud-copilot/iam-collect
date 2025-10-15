import { getStorageConfig, TopLevelConfig } from '../config/config.js'
import { Indexer } from '../indexing/indexer.js'
import { getIndexersForService } from '../indexing/indexMap.js'
import { IndexJob, runIndexJobs } from '../indexing/runIndexers.js'
import { defaultConcurrency } from '../jobs/util.js'
import { createStorageClient } from '../persistence/util.js'
import { allServices, AwsService } from '../services.js'

export async function index(
  configs: TopLevelConfig[],
  partition: string,
  accountIds: string[],
  regions: string[],
  services: AwsService[],
  concurrency: number | undefined
): Promise<void> {
  const storageConfig = getStorageConfig(configs)
  if (!storageConfig) {
    throw new Error('No storage configuration found. Cannot index data.')
  }
  const storage = await createStorageClient(storageConfig, partition, false)

  if (accountIds.length === 0) {
    accountIds = await storage.listAccountIds()
  }

  if (services.length === 0) {
    services = allServices as unknown as AwsService[]
  }

  if (!concurrency || concurrency <= 0) {
    concurrency = defaultConcurrency()
  }

  const indexers = services.reduce((allIndexers, service) => {
    allIndexers.push(...getIndexersForService(service))
    return allIndexers
  }, [] as Indexer<any>[])

  const jobs: IndexJob[] = []
  for (const accountId of accountIds) {
    for (const indexer of indexers) {
      jobs.push({
        indexer,
        accountId,
        regions: regions,
        partition
      })
    }
  }

  await runIndexJobs(jobs, storageConfig, concurrency)
}
