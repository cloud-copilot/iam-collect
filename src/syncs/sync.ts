import { AwsCredentialIdentityWithMetaData } from '../aws/coreAuth.js'
import { AwsIamStore, ResourceTypeParts } from '../persistence/AwsIamStore.js'
import { AwsService } from '../services.js'

export interface SyncOptions {}

export interface Sync {
  /**
   * What service the sync is for.
   */
  awsService: AwsService

  /**
   * The name of the sync. This should be a unique identifier for the sync.
   */
  name: string

  /**
   * Is the sync global. If so, it should only be one in one region per account.
   */
  global?: boolean

  /**
   * Execute the sync for a given account and region.
   */
  execute(
    accountId: string,
    region: string,
    credentials: AwsCredentialIdentityWithMetaData,
    storage: AwsIamStore,
    endpoint: string | undefined,
    syncOptions: SyncOptions
  ): Promise<void>
}

export type DataRecord = Record<string, any> & { arn: string }

/**
 * Synchronize the data for a given set of resources.
 * This will:
 * 1. Delete any resources that meet the `resourceTypeParts` and are not in the `records` list.
 * 2. Save all resources that are in the `records`.
 *
 * @param records
 * @param storage
 * @param accountId
 * @param resourceTypeParts
 */
export async function syncData(
  records: DataRecord[],
  storage: AwsIamStore,
  accountId: string,
  resourceTypeParts: ResourceTypeParts
) {
  const allArns = records.map((r) => r.arn)
  await storage.syncResourceList(accountId, resourceTypeParts, allArns)

  for (const record of records) {
    for (const [key, value] of Object.entries(record)) {
      if (key === 'arn') {
        continue
      }
      await storage.saveResourceMetadata(accountId, record.arn, key, value)
    }
  }
}
