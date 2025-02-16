import { writeFileSync } from 'fs'
import { defaultConfigExists, fullDefaultConfigPath, getDefaultConfig } from './defaultConfig.js'

/**
 * Create a default configuration file.
 */
export function createDefaultConfiguration() {
  if (defaultConfigExists()) {
    throw new Error('Configuration file already exists')
  }

  const configContent = getDefaultConfig()
  // Write the default configuration to a file
  writeFileSync(fullDefaultConfigPath(), configContent)
}
