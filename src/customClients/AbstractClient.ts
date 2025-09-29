import { AwsCredentialIdentityWithMetaData } from '../aws/coreAuth.js'
import { CommandContext, CustomCommand } from './AbstractCommand.js'

export type ClientConstructor<T> = new (args: any) => T

export interface CustomClientMetadata {
  clientName: string
}

export interface CommandWithInput {
  input: any
}

/**
 * Base class for Custom AWS service clients
 */
export abstract class AbstractClient<CustomClientContext = {}> {
  public config: any = {}
  public middlewareStack: any = {}

  protected commandRegistry = new Map<string, CustomCommand<any, CustomClientContext>>()

  protected credentials: AwsCredentialIdentityWithMetaData
  protected region: string | undefined
  protected detailsCache: Record<string, Partial<Record<string, any>>> = {}

  protected cache(resourceId: string, type: string, data: any) {
    if (!this.detailsCache[resourceId]) {
      this.detailsCache[resourceId] = {}
    }
    this.detailsCache[resourceId][type] = data
  }

  protected getCached(resourceId: string, type: string): any {
    const value = this.detailsCache[resourceId]?.[type]
    if (!value) {
      return undefined
    }
    delete this.detailsCache[resourceId][type]
    // Clear cache after retrieval
    if (Object.keys(this.detailsCache[resourceId] || {}).length === 0) {
      delete this.detailsCache[resourceId] // Remove resourceId entry if empty
    }
    return value
  }

  constructor(
    options: {
      credentials: AwsCredentialIdentityWithMetaData
      region: string | undefined
    },
    protected customContext: CustomClientContext
  ) {
    this.credentials = options.credentials
    this.region = options.region
    this.registerCommands()
  }

  /**
   * Abstract method that each service client implements to register its commands
   */
  protected abstract registerCommands(): void

  protected getCustomClientContext(): CustomClientContext {
    return this.customContext
  }

  /**
   * Register a command implementation
   */
  protected registerCommand(customCommand: CustomCommand<any, CustomClientContext>): void {
    this.commandRegistry.set(customCommand.commandName(), customCommand)
  }

  /**
   * Send a command using the registered implementation
   */
  async send<Input, Output>(command: CommandWithInput): Promise<Partial<Output> | undefined> {
    const commandName = command.constructor.name
    const implementation = this.commandRegistry.get(commandName)

    if (!implementation) {
      throw new Error(`No Config implementation found for ${this.constructor.name}.${commandName}`)
    }

    const customContext = this.getCustomClientContext()

    const context: CommandContext & CustomClientContext = {
      credentials: this.credentials,
      region: this.region,
      accountId: this.credentials.accountId,
      partition: this.credentials.partition,
      putCache: this.cache.bind(this),
      getCache: this.getCached.bind(this),
      ...customContext
    }

    return implementation.execute(command.input, context)
  }

  /**
   * Destroy the client and cleanup resources
   */
  destroy(): void {}
}
