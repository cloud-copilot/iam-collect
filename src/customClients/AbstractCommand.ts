import { AwsCredentialIdentityWithMetaData } from '../aws/coreAuth.js'
import { CommandConstructors, ExtractInputType, ExtractOutputType } from '../syncs/typedSync.js'

/**
 * Context provided to custom command implementations
 *
 * This context is specific the the client instance.
 * So information will be different for each Account/Client/Region combination
 */
export interface CommandContext {
  credentials: AwsCredentialIdentityWithMetaData
  region: string | undefined
  accountId: string
  partition: string
  /**
   * Save data to the Client specific cache
   *
   * @param resourceId the resource ID to cache data for
   * @param type the type of data being cached
   * @param data the data to cache
   */
  putCache(resourceId: string, type: string, data: any): void

  /**
   * Retrieve data from the Client specific cache and delete
   * the data after retrieval
   *
   * @param resourceId the resource ID to retrieve cached data for
   * @param type the type of data being retrieved
   * @returns the cached data or undefined if not found
   */
  getCache<T = any>(resourceId: string, type: string): T | undefined
}

/**
 * Base interface for custom command implementations
 */
export interface CustomCommand<Cmd extends CommandConstructors, CustomClientContext> {
  /**
   * Execute the command and return the expected output type
   */
  execute(
    input: ExtractInputType<Cmd>,
    context: CommandContext & CustomClientContext
  ): Promise<Partial<ExtractOutputType<Cmd>> | undefined>

  /**
   * The command constructor associated with this implementation
   */
  commandName(): string
}

/**
 * Typescript factory function to create a strongly typed custom command implementation
 *
 * @param CustomContext additional custom client context to be merged into the command context
 *
 * @returns a factory function that creates a custom command implementation
 */
export function customCommandFactory<const CustomContext>() {
  return <const Cmd extends CommandConstructors>(options: {
    command: Cmd
    execute: (
      input: ExtractInputType<Cmd>,
      context: CommandContext & CustomContext
    ) => Promise<Partial<ExtractOutputType<Cmd>> | undefined>
  }): CustomCommand<Cmd, CustomContext> => {
    return {
      commandName: () => options.command.name,
      execute: options.execute
    }
  }
}
