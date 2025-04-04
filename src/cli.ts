#!/usr/bin/env node

import { parseCliArguments } from '@cloud-copilot/cli'
import { loadConfigFiles } from './config/configFile.js'
import { createDefaultConfiguration } from './config/createConfigFile.js'
import { defaultConfigExists } from './config/defaultConfig.js'
import { iamCollectVersion } from './config/packageVersion.js'
import { downloadData } from './download/download.js'

const main = async () => {
  const version = await iamCollectVersion()
  const cli = parseCliArguments(
    'iam-collect',
    {
      init: {
        description: 'Initialize the iam-collect configuration file',
        options: {}
      },
      download: {
        description: 'Download IAM data',
        options: {
          configFiles: {
            type: 'string',
            description: 'The configuration files to use',
            values: 'multiple'
          },
          accountIds: {
            type: 'string',
            description: 'The account IDs to download from',
            values: 'multiple'
          },
          regions: {
            type: 'string',
            description: 'The regions to download from',
            values: 'multiple'
          },
          services: {
            type: 'string',
            description: 'The services to download',
            values: 'multiple'
          }
        }
      }
    },
    {},
    {
      envPrefix: 'IAM_COLLECT',
      showHelpIfNoArgs: true,
      requireSubcommand: true,
      version: version
    }
  )

  if (cli.subcommand === 'init') {
    if (defaultConfigExists()) {
      console.error('Configuration file already exists')
      process.exit(1)
    }
    console.log('Initializing...')
    await createDefaultConfiguration()
    process.exit(0)
  } else if (cli.subcommand === 'download') {
    const defaultConfig = './iam-collect.jsonc'
    const configFiles = cli.args.configFiles?.length > 0 ? cli.args.configFiles : [defaultConfig]
    const configs = loadConfigFiles(configFiles)
    await downloadData(configs, cli.args.accountIds, cli.args.regions, cli.args.services)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .then(() => {})
  .finally(() => {})
