import type { Client } from '@smithy/smithy-client'
import { RETRY_MODES } from '@smithy/util-retry'
import { AwsCredentialIdentityWithMetaData } from './auth.js'

type ClientConstructor<T> = new (args: any) => T
type AnyClient = Client<any, any, any, any>

export class AwsClientPool {
  public static defaultInstance = new AwsClientPool()

  private clientCache = new Map<string, AnyClient>()

  /**
   * Returns a client of the specified type with the specified credentials and region.
   * Will create a new client if one does not already exist in the cache.
   *
   * @param ClientType The client constructor to create an instance of.
   * @param credentials The credentials to use for the client.
   * @param region The region to use for the client.
   * @returns A client of the specified type with the specified credentials and region.
   */
  public client<T extends AnyClient>(
    ClientType: ClientConstructor<T>,
    credentials: AwsCredentialIdentityWithMetaData,
    region: string | undefined,
    endpoint: string | undefined
  ): T {
    const cacheKey = this.getCacheKey(ClientType, credentials, region, endpoint)

    if (!this.clientCache.has(cacheKey)) {
      // logInfo('CreatingNewAwsClient', undefined, { cacheKey })
      const client = new ClientType({
        credentials,
        region,
        maxAttempts: 10,
        retryMode: RETRY_MODES.ADAPTIVE
      })
      this.clientCache.set(cacheKey, client)
    } else {
      // logInfo('ReusingAwsClient', undefined, { cacheKey })
    }

    return this.clientCache.get(cacheKey) as T
  }

  private getCacheKey<T extends AnyClient>(
    ClientType: ClientConstructor<T>,
    credentials: AwsCredentialIdentityWithMetaData,
    region: string | undefined,
    endpoint: string | undefined
  ): string {
    return `${ClientType.name}:${credentials.accountId}:${region}:${endpoint}`
  }

  /**
   * Destroys all clients in the pool and empties the cache.
   *
   * NOT THREAD SAFE, this should only be called when all other operations are complete.
   */
  public clear(): void {
    this.clientCache.forEach((client) => {
      if (typeof client.destroy === 'function') {
        client.destroy()
      }
    })
    this.clientCache.clear()
  }
}
