import { AwsCredentialIdentityWithMetaData } from '../aws/auth.js'
import { AwsIamStore, ResourceTypeParts } from '../persistence/AwsIamStore.js'
import { AwsService } from '../services.js'

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
    endpoint: string | undefined
  ): Promise<void>
}

type DataRecord = Record<string, any> & { arn: string }
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
