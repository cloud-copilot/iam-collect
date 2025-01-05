#!/usr/bin/env node

import { parseCliArguments } from './cliUtils.js'
import { createDefaultConfiguration } from './config/createConfigFile.js'
import { defaultConfigExists } from './config/defaultConfig.js'

const rawArgs = process.argv.slice(2) // Ignore the first two elements
const parsedArgs = parseCliArguments(rawArgs)

if (parsedArgs.unrecognizedParams) {
  console.error(`Unrecognized parameters: ${parsedArgs.unrecognizedParams.join(', ')}`)
  process.exit(1)
}

const command = parsedArgs.cliArguments?.command || 'download'

if (command === 'init') {
  if (defaultConfigExists()) {
    console.error('Configuration file already exists')
    process.exit(1)
  }
  console.log('Initializing...')
  createDefaultConfiguration()
  process.exit(0)
}
