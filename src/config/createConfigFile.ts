import { writeFileSync } from 'fs'
import {
  defaultConfigExists,
  fullDefaultConfigPath,
  getDefaultConfig,
  type DefaultConfigOptions
} from './defaultConfig.js'

/**
 * Create a default configuration file.
 */
export async function createDefaultConfiguration(options: DefaultConfigOptions) {
  if (defaultConfigExists()) {
    throw new Error('Configuration file already exists')
  }

  const configContent = await getDefaultConfig(options)
  // Write the default configuration to a file
  writeFileSync(fullDefaultConfigPath(), configContent)
}
