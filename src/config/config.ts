import { existsSync } from 'fs'
import { resolve } from 'path'

export const configFileName = 'iam-download.jsonc'

/**
 * Get the full path to the config file.
 *
 * @returns The full path to the config file.
 */
export function fullDefaultConfigPath(): string {
  return resolve(process.cwd(), configFileName)
}

/**
 *
 * @returns Whether the default config file exists
 */
export function defaultConfigExists(): boolean {
  return existsSync(fullDefaultConfigPath())
}
