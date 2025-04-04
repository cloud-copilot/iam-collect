import type { Client, Command } from '@smithy/smithy-client'

export type ClientConstructor = new (args: any) => Client<any, any, any, any>
type CommandConstructor = new (args: any) => Command<any, any, any, any, any>
type ShortCommandConstructor = new (args: any) => Command<any, any, any>

export type CommandConstructors = CommandConstructor | ShortCommandConstructor

export type ExtractOutputType<T> = T extends CommandConstructors
  ? InstanceType<T> extends Command<any, infer Output, any, any, any>
    ? Output
    : never
  : never
type ExtractInputType<T> = T extends CommandConstructors
  ? InstanceType<T> extends Command<infer Input, any, any, any, any>
    ? Input
    : never
  : never

type Pagination<C extends CommandConstructors> =
  | {
      inputKey: Extract<keyof ExtractInputType<C>, string>
      outputKey: Extract<keyof ExtractOutputType<C>, string>
    }
  | '::no-pagination::'

type ClientInstanceOrConstructor = InstanceType<ClientConstructor>
/**
 * Paginates through all available resources for a given AWS API
 *
 * @param clientClass The AWS Client class to use
 * @param commandClass The command class to invoke for the resource
 * @param key The key of the resource in the command output to pull
 * @param paginationConfig The pagination configuration for the command, defines the keys to use for pagination, use `::no-pagination::` to indicate no pagination
 * @param params Optional parameters to pass to the command
 * @returns Returns an array of resources returned from the commandClass Response Type key
 */
export async function paginateResource<
  C extends CommandConstructors,
  K extends keyof ExtractOutputType<C>
>(
  clientClassOrInstance: ClientInstanceOrConstructor,
  commandClass: C,
  key: K,
  paginationConfig: Pagination<C>,
  params?: Partial<ExtractInputType<C>>
): Promise<NonNullable<ExtractOutputType<C>[K]>> {
  const client = clientClassOrInstance

  let nextToken: string | undefined = undefined

  const inputPaginationKey = paginationInputKey(paginationConfig)
  const outputPaginationKey = paginationOutputKey(paginationConfig)

  const resources: ExtractOutputType<C>[K] = []
  params = params || {}

  do {
    const args = { ...params } as any
    if (inputPaginationKey) {
      args[inputPaginationKey] = nextToken
    }

    const command = new commandClass(args)
    const results: any = await client.send(command)

    if (results[key]) {
      resources.push(...results[key])
    }

    if (outputPaginationKey) {
      nextToken = results[outputPaginationKey]
    }
  } while (nextToken)

  return resources
}

function paginationInputKey<C extends CommandConstructors>(
  paginationConfig: Pagination<C>
): string | undefined {
  if (paginationConfig === '::no-pagination::') {
    return undefined
  } else if (typeof paginationConfig === 'object') {
    return paginationConfig.inputKey
  } else {
    return undefined
  }
}

function paginationOutputKey<C extends CommandConstructors>(
  paginationConfig: Pagination<C>
): string | undefined {
  if (paginationConfig === '::no-pagination::') {
    return undefined
  } else if (typeof paginationConfig === 'object') {
    return paginationConfig.outputKey
  } else {
    return undefined
  }
}
