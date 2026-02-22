import { type AwsIamStore } from '../persistence/AwsIamStore.js'
import { type AwsService } from '../services.js'

export interface Indexer<T> {
  /**
   * The service that this indexer is for
   */
  awsService: AwsService

  /**
   * The name of the indexer
   */
  name: string

  /**
   * Get the cache for the execute method to update
   */
  getCache(storage: AwsIamStore): Promise<{ data: T; lockId: string }>

  /**
   * Save the cache after the execute method has updated it
   *
   * @param storage the storage to save the cache to
   * @param cache the updated cache data to save
   * @param lockId the lock ID to use for validation
   * @returns true if the cache was saved successfully, false if there was an optimistic locking failure
   */
  saveCache(storage: AwsIamStore, cache: T, lockId: string): Promise<boolean>

  /**
   * Update the the cache in place.
   *
   * @param existingCache the existing cache to update
   * @param accounts the accounts to update the cache for
   * @param regions the regions to update the cache for
   */
  updateCache: (
    existingCache: T,
    account: string,
    regions: string[],
    storage: AwsIamStore
  ) => Promise<void>
}
