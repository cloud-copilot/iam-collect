import { describe, expect, it } from 'vitest'
import { regionsForService, servicesForAccount, StorageConfig, TopLevelConfig } from './config.js'

const defaultServicesForAccount = ['kms', 's3', 'sns', 'sqs']
const defaultVersion = '1.0.0'
const defaultStorage: StorageConfig = { type: 'file', path: './' }
const servicesForAccountTests: {
  name: string
  configs: TopLevelConfig[]
  result: string[]
  accountId?: string
  only?: boolean
}[] = [
  {
    name: 'should use defaults',
    configs: [],
    result: defaultServicesForAccount
  },
  {
    name: 'should use top level includes',
    configs: [
      {
        iamDownloadVersion: defaultVersion,
        storage: defaultStorage,
        services: {
          included: ['s3']
        }
      }
    ],
    result: ['s3']
  },
  {
    name: 'should use top level excludes',
    configs: [
      {
        iamDownloadVersion: defaultVersion,
        storage: defaultStorage,
        services: {
          excluded: ['s3']
        }
      }
    ],
    result: ['kms', 'sns', 'sqs']
  },
  {
    name: 'account includes should be merged with top level includes',
    configs: [
      {
        iamDownloadVersion: defaultVersion,
        storage: defaultStorage,
        services: {
          included: ['s3']
        },
        accounts: {
          '123456789012': {
            services: {
              included: ['sns']
            }
          }
        }
      }
    ],
    result: ['sns', 's3']
  },
  {
    name: 'account excludes should be combined with top level excludes',
    configs: [
      {
        iamDownloadVersion: defaultVersion,
        storage: defaultStorage,
        services: {
          excluded: ['s3']
        },
        accounts: {
          '123456789012': {
            services: {
              excluded: ['sns']
            }
          }
        }
      }
    ],
    result: ['kms', 'sqs']
  },
  {
    name: 'account includes should override top level excludes',
    configs: [
      {
        iamDownloadVersion: defaultVersion,
        storage: defaultStorage,
        services: {
          excluded: ['s3']
        },
        accounts: {
          '123456789012': {
            services: {
              included: ['s3']
            }
          }
        }
      }
    ],
    result: ['s3', 'kms', 'sns', 'sqs']
  }
]

describe('servicesForAccount', () => {
  for (const test of servicesForAccountTests) {
    const func = test.only ? it.only : it
    func(test.name, () => {
      const accountId = test.accountId || '123456789012'
      const result = servicesForAccount(accountId, test.configs, defaultServicesForAccount)

      expect(result.sort()).toEqual(test.result.sort())
    })
  }
})

const defaultRegionsForService = ['us-east-1', 'us-east-2', 'us-west-1', 'us-west-2']
const regionsForServiceTests: {
  name: string
  configs: TopLevelConfig[]
  result: string[]
  accountId?: string
  only?: boolean
}[] = [
  {
    name: 'should use the default regions',
    configs: [],
    result: defaultRegionsForService
  },
  {
    name: 'should use the top level regions',
    configs: [
      {
        iamDownloadVersion: defaultVersion,
        storage: defaultStorage,
        regions: {
          included: ['us-east-1']
        }
      }
    ],
    result: ['us-east-1']
  }
]
describe('regionsForService', () => {
  for (const test of regionsForServiceTests) {
    const func = test.only ? it.only : it
    func(test.name, () => {
      const accountId = test.accountId || '123456789012'
      const result = regionsForService('s3', accountId, test.configs, defaultRegionsForService)

      expect(result.sort()).toEqual(test.result.sort())
    })
  }
})
