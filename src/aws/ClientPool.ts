import { RetryStrategyV2 } from '@aws-sdk/types'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import type { Client } from '@smithy/smithy-client'
import { AdaptiveRetryStrategy, DefaultRateLimiter, RETRY_MODES } from '@smithy/util-retry'
import { AwsCredentialIdentityWithMetaData } from './coreAuth.js'

type ClientConstructor<T> = new (args: any) => T
type AnyClient = Client<any, any, any, any>

export class AwsClientPool {
  public static defaultInstance = new AwsClientPool()

  private clientCache = new Map<string, AnyClient>()
  private retryStrategy: RetryStrategyV2 | undefined
  constructor() {
    this.slowDownRetries()
  }

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

    const supplementalArgs: any = {}
    if (this.retryStrategy) {
      supplementalArgs.retryStrategy = this.retryStrategy
    } else {
      supplementalArgs.retryMode = RETRY_MODES.ADAPTIVE
    }

    if (!this.clientCache.has(cacheKey)) {
      const client = new ClientType({
        credentials,
        region,
        maxAttempts: 10,
        requestHandler: new NodeHttpHandler({
          connectionTimeout: 5_000,
          socketTimeout: 15_000
        }),
        ...supplementalArgs
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

  public slowDownRetries(): void {
    this.retryStrategy = new AdaptiveRetryStrategy(async () => 20, {
      rateLimiter: new DefaultRateLimiter({
        beta: 0.5, // cut harder on throttle (default 0.7)
        minFillRate: 0.25, // lower baseline QPS (default 0.5)
        scaleConstant: 0.2, // slower cubic ramp (default 0.4)
        smooth: 0.6 // dampen measured rate (default 0.8)
      })
    })
  }
}
