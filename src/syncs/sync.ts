import { AwsCredentialIdentityWithMetaData } from '../aws/auth.js'
import { AwsIamStore } from '../persistence/AwsIamStore.js'
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
