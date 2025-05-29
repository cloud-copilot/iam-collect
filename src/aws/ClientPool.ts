import { NodeHttpHandler } from '@smithy/node-http-handler'
import type { Client } from '@smithy/smithy-client'
import { RETRY_MODES } from '@smithy/util-retry'
import { AwsCredentialIdentityWithMetaData } from './coreAuth.js'

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
      const client = new ClientType({
        credentials,
        region,
        maxAttempts: 10,
        retryMode: RETRY_MODES.ADAPTIVE,
        requestHandler: new NodeHttpHandler({
          connectionTimeout: 5_000,
          socketTimeout: 15_000
        })
      })
      this.clientCache.set(cacheKey, client)
    }

    return this.clientCache.get(cacheKey) as T
  }

  private getCacheKey<T extends AnyClient>(
    ClientType: ClientConstructor<T>,
    credentials: AwsCredentialIdentityWithMetaData,
    region: string | undefined,
    endpoint: string | undefined
  ): string {
    return `${ClientType.name}:${credentials.accountId}:${credentials.accessKeyId}:${region}:${endpoint}`
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
