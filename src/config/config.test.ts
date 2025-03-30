import { describe, expect, it } from 'vitest'
import {
  AuthConfig,
  getAccountAuthConfig,
  regionsForService,
  servicesForAccount,
  StorageConfig,
  TopLevelConfig
} from './config.js'

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
        iamCollectVersion: defaultVersion,
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
        iamCollectVersion: defaultVersion,
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
        iamCollectVersion: defaultVersion,
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
        iamCollectVersion: defaultVersion,
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
        iamCollectVersion: defaultVersion,
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
        iamCollectVersion: defaultVersion,
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

const getAccountAuthConfigTests: {
  name: string
  configs: TopLevelConfig[]
  accountId: string
  only?: boolean
  result?: AuthConfig
}[] = [
  {
    name: 'should return nothing if no configs are provided',
    accountId: '123456789012',
    configs: [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage
      }
    ],
    result: undefined
  },
  {
    name: 'should return the default config if no account config is provided',
    accountId: '123456789012',
    configs: [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        auth: {
          profile: 'default',
          role: {
            pathAndName: 'my-role'
          }
        }
      }
    ],
    result: {
      profile: 'default',
      role: {
        pathAndName: 'my-role'
      }
    }
  },
  {
    name: 'should return the override details if any',
    accountId: '123456789012',
    configs: [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        auth: {
          profile: 'default',
          role: {
            pathAndName: 'my-role'
          }
        },
        accounts: {
          '123456789012': {
            auth: {
              role: {
                pathAndName: 'override-role'
              }
            }
          }
        }
      }
    ],
    result: {
      profile: 'default',
      role: {
        pathAndName: 'override-role'
      }
    }
  },
  {
    name: 'should return the account specific config if no default config is provided',
    accountId: '123456789012',
    configs: [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        accounts: {
          '123456789012': {
            auth: {
              profile: 'my-account-profile',
              role: {
                pathAndName: 'override-role'
              }
            }
          }
        }
      }
    ],
    result: {
      profile: 'my-account-profile',
      role: {
        pathAndName: 'override-role'
      }
    }
  }
]

describe('getAccountAuthConfig', () => {
  for (const test of getAccountAuthConfigTests) {
    const func = test.only ? it.only : it
    func(test.name, async () => {
      const result = await getAccountAuthConfig(test.accountId, test.configs)

      expect(result).toEqual(test.result)
    })
  }
})
