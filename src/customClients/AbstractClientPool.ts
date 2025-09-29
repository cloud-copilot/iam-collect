import type { Client } from '@smithy/smithy-client'
import { AwsClientPool } from '../aws/ClientPool.js'
import { AwsCredentialIdentityWithMetaData } from '../aws/coreAuth.js'
import { AbstractClient, ClientConstructor } from './AbstractClient.js'

type AnyClient = Client<any, any, any, any>

/**
 * Type for custom client constructors
 */
type CustomClientConstructor<CustomClientContext = {}> = (new (
  options: {
    credentials: AwsCredentialIdentityWithMetaData
    region: string | undefined
    endpoint?: string | undefined
  },
  customContext: CustomClientContext
) => AbstractClient<CustomClientContext>) & { clientName: string }

/**
 * AWS Config-based client pool using dedicated Config client classes with registry
 */
export class AbstractClientPool<CustomClientContext = {}> extends AwsClientPool {
  private configClientCache = new Map<string, any>()
  private clientRegistry = new Map<string, CustomClientConstructor<CustomClientContext>>()

  constructor() {
    super()
    this.registerDefaultClients()
  }

  /**
   * Register the default supported clients
   */
  protected registerDefaultClients(): void {}

  /**
   * Get the custom client context for a specific client type and configuration
   * @param ClientType The client constructor
   * @param credentials AWS credentials
   * @param region AWS region
   * @param endpoint Custom endpoint
   * @returns Custom client context
   */
  protected getClientContext(
    ClientType: ClientConstructor<any>,
    credentials: AwsCredentialIdentityWithMetaData,
    region: string | undefined,
    endpoint: string | undefined
  ): CustomClientContext {
    return {} as CustomClientContext
  }

  /**
   * Register a Config client implementation - automatically extracts SDK client name
   *
   * @param customClientConstructor The custom client constructor
   */
  public registerClient(
    customClientConstructor: CustomClientConstructor<CustomClientContext>
  ): void {
    this.clientRegistry.set((customClientConstructor as any).clientName, customClientConstructor)
  }

  /**
   * Returns a Config-based client that implements the same interface as the AWS SDK client
   *
   * @param ClientType The AWS SDK client constructor
   * @param credentials AWS credentials
   * @param region AWS region
   * @param endpoint Custom endpoint
   */
  public client<T extends AnyClient>(
    ClientType: ClientConstructor<T>,
    credentials: AwsCredentialIdentityWithMetaData,
    region: string | undefined,
    endpoint: string | undefined
  ): T {
    const cacheKey = `${ClientType.name}:${credentials.accountId}:${credentials.accessKeyId}:${region}`

    if (this.configClientCache.has(cacheKey)) {
      return this.configClientCache.get(cacheKey)
    }

    const ClientConstructor = this.clientRegistry.get(ClientType.name)
    if (!ClientConstructor) {
      throw new Error(`No Config implementation registered for ${ClientType.name}`)
    }

    const customClientContext = this.getClientContext(ClientType, credentials, region, endpoint)
    const configClient = new ClientConstructor(
      {
        credentials,
        region,
        endpoint
      },
      customClientContext
    )
    this.configClientCache.set(cacheKey, configClient)
    return configClient as unknown as T
  }
}
