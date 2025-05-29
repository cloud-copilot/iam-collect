#!/usr/bin/env node

import { parseCliArguments } from '@cloud-copilot/cli'
import { conductLogAnalysis } from './analysis/analyze.js'
import { loadConfigFiles } from './config/configFile.js'
import { createDefaultConfiguration } from './config/createConfigFile.js'
import { defaultConfigExists } from './config/defaultConfig.js'
import { iamCollectVersion } from './config/packageVersion.js'
import { downloadData } from './download/download.js'
import { index } from './index/index.js'
import { AwsService } from './services.js'
import { LogLevels, setLogLevel } from './utils/log.js'

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
        description: 'Download IAM data and update indexes',
        options: {
          configFiles: {
            type: 'string',
            description: 'The configuration files to use',
            values: 'multiple'
          },
          accounts: {
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
          },
          concurrency: {
            type: 'number',
            description:
              'The maximum number of concurrent downloads to allow. Defaults based on your system CPUs',
            values: 'single'
          },
          noIndex: {
            type: 'boolean',
            description: 'Skip refreshing the indexes after downloading',
            character: 'n'
          }
        }
      },
      index: {
        description: 'Refresh the IAM data indexes',
        options: {
          configFiles: {
            type: 'string',
            description: 'The configuration files to use',
            values: 'multiple'
          },
          partition: {
            type: 'string',
            description: 'The partition to refresh index data for. Defaults to aws',
            values: 'single'
          },
          accounts: {
            type: 'string',
            description: 'The account IDs to refresh index data for',
            values: 'multiple'
          },
          regions: {
            type: 'string',
            description: 'The regions to refresh index data for',
            values: 'multiple'
          },
          services: {
            type: 'string',
            description: 'The services to refresh index data for',
            values: 'multiple'
          },
          concurrency: {
            type: 'number',
            description:
              'The maximum number of concurrent indexers to run. Defaults based on your system CPUs',
            values: 'single'
          }
        }
      },
      'analyze-logs': {
        description: 'Analyze iam-collect trace logs and summarize job execution times',
        options: {
          logFile: {
            type: 'string',
            description: 'The path to the log file to analyze',
            values: 'single'
          }
        }
      }
    },
    {
      log: {
        type: 'enum',
        description: 'The log level to use',
        values: 'single',
        validValues: LogLevels
      }
    },
    {
      envPrefix: 'IAM_COLLECT',
      showHelpIfNoArgs: true,
      requireSubcommand: true,
      version: version
    }
  )

  if (cli.args.log) {
    setLogLevel(cli.args.log)
  }

  if (cli.subcommand === 'init') {
    if (defaultConfigExists()) {
      console.error('Configuration file already exists')
      process.exit(1)
    }
    console.log('Initializing...')
    await createDefaultConfiguration()
  } else if (cli.subcommand === 'download') {
    const defaultConfig = './iam-collect.jsonc'
    const configFiles = cli.args.configFiles?.length > 0 ? cli.args.configFiles : [defaultConfig]
    const configs = loadConfigFiles(configFiles)
    await downloadData(
      configs,
      cli.args.accounts,
      cli.args.regions,
      cli.args.services,
      cli.args.concurrency,
      cli.args.noIndex
    )
  } else if (cli.subcommand === 'index') {
    const defaultConfig = './iam-collect.jsonc'
    const configFiles = cli.args.configFiles?.length > 0 ? cli.args.configFiles : [defaultConfig]
    const configs = loadConfigFiles(configFiles)
    await index(
      configs,
      cli.args.partition || 'aws',
      cli.args.accounts,
      cli.args.regions,
      cli.args.services as AwsService[],
      cli.args.concurrency
    )
  } else if (cli.subcommand === 'analyze-logs') {
    if (!cli.args.logFile) {
      console.error('You must specify a log file to analyze using --log-file')
      process.exit(1)
    }
    const allComplete = await conductLogAnalysis(cli.args.logFile)
    if (!allComplete) {
      process.exit(1)
    }
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .then(() => {})
  .finally(() => {})
