import { describe, expect, it } from 'vitest'
import {
  accountServiceRegionConfig,
  AuthConfig,
  getAccountAuthConfig,
  getConfiguredAccounts,
  getDefaultAuthConfig,
  getStorageConfig,
  regionsForService,
  ResolvedAccountServiceRegionConfig,
  servicesForAccount,
  StorageConfig,
  syncEnabledForRegion,
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
        accountConfigs: {
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
        accountConfigs: {
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
        accountConfigs: {
          '123456789012': {
            services: {
              included: ['s3']
            }
          }
        }
      }
    ],
    result: ['s3', 'kms', 'sns', 'sqs']
  },
  {
    name: 'account includes should not override all services',
    configs: [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        services: {
          excluded: ['s3']
        },
        accountConfigs: {
          '123456789012': {
            services: {
              included: ['s3', 'lambda']
            }
          }
        }
      }
    ],
    result: defaultServicesForAccount
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
  },
  {
    name: 'should remove excluded regions',
    configs: [
      {
        iamCollectVersion: defaultVersion,
        regions: {
          excluded: ['us-west-1', 'us-west-2']
        }
      }
    ],
    result: defaultRegionsForService.slice(0).filter((r) => r != 'us-west-1' && r != 'us-west-2')
  },
  {
    name: 'service includes should override top level excludes',
    configs: [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        regions: {
          excluded: ['us-west-1', 'us-west-2']
        },
        serviceConfigs: {
          s3: {
            regions: {
              included: ['us-west-1', 'us-east-2']
            }
          }
        }
      }
    ],
    result: ['us-west-1', 'us-east-2']
  },
  {
    name: 'service excludes should override top level includes',
    configs: [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        regions: {
          included: ['us-east-1', 'us-east-2']
        },
        serviceConfigs: {
          s3: {
            regions: {
              excluded: ['us-east-1']
            }
          }
        }
      }
    ],
    result: ['us-east-2']
  },
  {
    name: 'account includes should override top level excludes',
    configs: [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        regions: {
          excluded: ['us-west-1', 'us-west-2']
        },
        accountConfigs: {
          '123456789012': {
            regions: {
              included: ['us-west-1', 'us-east-2']
            }
          }
        }
      }
    ],
    result: ['us-west-1', 'us-east-2']
  },
  {
    name: 'account excludes should override top level includes',
    configs: [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        regions: {
          included: ['us-east-1', 'us-east-2']
        },
        accountConfigs: {
          '123456789012': {
            regions: {
              excluded: ['us-east-1']
            }
          }
        }
      }
    ],
    result: ['us-east-2']
  },
  {
    name: 'account service configs should override top level configs',
    configs: [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        regions: {
          included: ['us-east-1', 'us-east-2']
        },
        accountConfigs: {
          '123456789012': {
            serviceConfigs: {
              s3: {
                regions: {
                  included: ['us-east-1']
                }
              }
            }
          }
        }
      }
    ],
    result: ['us-east-1']
  },
  {
    name: 'account service excludes should override top level includes',
    configs: [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        regions: {
          included: ['us-east-1', 'us-east-2']
        },
        accountConfigs: {
          '123456789012': {
            serviceConfigs: {
              s3: {
                regions: {
                  excluded: ['us-east-1']
                }
              }
            }
          }
        }
      }
    ],
    result: ['us-east-2']
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
        accountConfigs: {
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
        accountConfigs: {
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
  },
  {
    name: 'should merge account specific role details with the default config',
    accountId: '123456789012',
    configs: [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        auth: {
          profile: 'iam-collect',
          role: {
            pathAndName: 'infra/iam-collect'
          }
        },
        accountConfigs: {
          '123456789012': {
            auth: {
              role: {
                externalId: 'my-external-id'
              }
            }
          },
          '222222222222': {
            auth: {
              role: {
                externalId: 'other-external-id'
              }
            }
          }
        }
      }
    ],
    result: {
      profile: 'iam-collect',
      role: {
        pathAndName: 'infra/iam-collect',
        externalId: 'my-external-id'
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

const accountServiceRegionConfigTests: {
  name: string
  configs: TopLevelConfig[]
  accountId: string
  service: string
  region: string
  only?: boolean
  result: Pick<ResolvedAccountServiceRegionConfig, 'auth' | 'endpoint'>
}[] = [
  {
    name: 'should return default config when no configs are provided',
    accountId: '123456789012',
    service: 's3',
    region: 'us-east-1',
    configs: [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        auth: {
          profile: 'default'
        }
      }
    ],
    result: {
      auth: {
        profile: 'default'
      }
    }
  },
  {
    name: 'should return service level auth and endpoint when provided',
    accountId: '123456789012',
    service: 's3',
    region: 'us-east-1',
    configs: [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        serviceConfigs: {
          s3: {
            auth: {
              profile: 'service-profile'
            },
            endpoint: 'https://s3.custom.endpoint'
          }
        }
      }
    ],
    result: {
      auth: {
        profile: 'service-profile'
      },
      endpoint: 'https://s3.custom.endpoint'
    }
  },
  {
    name: 'should return region level auth and endpoint when provided',
    accountId: '123456789012',
    service: 's3',
    region: 'us-east-1',
    configs: [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        serviceConfigs: {
          s3: {
            auth: {
              profile: 'service-profile'
            },
            endpoint: 'https://s3.custom.endpoint',
            regionConfigs: {
              'us-east-1': {
                auth: {
                  profile: 'region-profile'
                },
                endpoint: 'https://s3.us-east-1.endpoint'
              }
            }
          }
        }
      }
    ],
    result: {
      auth: {
        profile: 'region-profile'
      },
      endpoint: 'https://s3.us-east-1.endpoint'
    }
  },

  {
    name: 'should return account level auth when provided',
    accountId: '123456789012',
    service: 's3',
    region: 'us-east-1',
    configs: [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        serviceConfigs: {
          s3: {
            auth: {
              profile: 'service-profile'
            },
            endpoint: 'https://s3.custom.endpoint',
            regionConfigs: {
              'us-east-1': {
                auth: {
                  profile: 'region-profile'
                },
                endpoint: 'https://s3.us-east-1.endpoint'
              }
            }
          }
        },
        accountConfigs: {
          '123456789012': {
            auth: {
              profile: 'account-profile'
            }
          }
        }
      }
    ],
    result: {
      auth: {
        profile: 'account-profile' // Account level auth overrides service and region level
      },
      endpoint: 'https://s3.us-east-1.endpoint' // Endpoint from region level
    }
  },
  {
    name: 'should return account level service auth when provided',
    accountId: '123456789012',
    service: 's3',
    region: 'us-east-1',
    configs: [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        serviceConfigs: {
          s3: {
            auth: {
              profile: 'service-profile'
            },
            endpoint: 'https://s3.custom.endpoint',
            regionConfigs: {
              'us-east-1': {
                auth: {
                  profile: 'region-profile'
                },
                endpoint: 'https://s3.us-east-1.endpoint'
              }
            }
          }
        },
        accountConfigs: {
          '123456789012': {
            serviceConfigs: {
              s3: {
                auth: {
                  profile: 'account-service-profile'
                }
              }
            }
          }
        }
      }
    ],
    result: {
      auth: {
        profile: 'account-service-profile' // Account level service auth overrides service and region level
      },
      endpoint: 'https://s3.us-east-1.endpoint' // Endpoint from region level
    }
  },
  {
    name: 'should return account level service auth and endpoint when provided',
    accountId: '123456789012',
    service: 's3',
    region: 'us-east-1',
    configs: [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        serviceConfigs: {
          s3: {
            auth: {
              profile: 'service-profile'
            },
            endpoint: 'https://s3.custom.endpoint',
            regionConfigs: {
              'us-east-1': {
                auth: {
                  profile: 'region-profile'
                },
                endpoint: 'https://s3.us-east-1.endpoint'
              }
            }
          }
        },
        accountConfigs: {
          '123456789012': {
            serviceConfigs: {
              s3: {
                auth: {
                  profile: 'account-service-profile'
                },
                endpoint: 'https://s3.account.endpoint'
              }
            }
          }
        }
      }
    ],
    result: {
      auth: {
        profile: 'account-service-profile' // Account level service auth overrides service and region level
      },
      endpoint: 'https://s3.account.endpoint' // Endpoint from account service
    }
  },
  {
    name: 'should return account, service, region config when provided',
    accountId: '123456789012',
    service: 's3',
    region: 'us-east-1',
    configs: [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        serviceConfigs: {
          s3: {
            auth: {
              profile: 'service-profile'
            },
            endpoint: 'https://s3.custom.endpoint',
            regionConfigs: {
              'us-east-1': {
                auth: {
                  profile: 'region-profile'
                },
                endpoint: 'https://s3.us-east-1.endpoint'
              }
            }
          }
        },
        accountConfigs: {
          '123456789012': {
            auth: {
              profile: 'account-profile'
            },
            serviceConfigs: {
              s3: {
                auth: {
                  profile: 'account-service-profile'
                },
                endpoint: 'https://s3.account.endpoint',
                regionConfigs: {
                  'us-east-1': {
                    auth: {
                      profile: 'account-region-profile'
                    },
                    endpoint: 'https://s3.account.us-east-1.endpoint'
                  }
                }
              }
            }
          }
        }
      }
    ],
    result: {
      auth: {
        profile: 'account-region-profile' // Account level service auth overrides service and region level
      },
      endpoint: 'https://s3.account.us-east-1.endpoint' // Endpoint from account service
    }
  }
]

describe('accountServiceRegionConfig', () => {
  for (const test of accountServiceRegionConfigTests) {
    const func = test.only ? it.only : it
    func(test.name, () => {
      const result = accountServiceRegionConfig(
        test.service,
        test.accountId,
        test.region,
        test.configs
      )

      expect(result.auth).toEqual(test.result.auth)
      expect(result.endpoint).toEqual(test.result.endpoint)
      // expect(result).toEqual(test.result)
    })
  }
})

describe('getDefaultAuthConfig', () => {
  it('should return an empty object if no auth found', () => {
    // Given no auth config in the provided configs
    const configs: TopLevelConfig[] = [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage
      }
    ]

    // When getDefaultAuthConfig is called
    const result = getDefaultAuthConfig(configs)

    // Then it should return an empty object
    expect(result).toEqual({})
  })

  it('should return the default auth config if provided', () => {
    // Given a single config with auth details
    const configs: TopLevelConfig[] = [
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
    ]

    // When getDefaultAuthConfig is called
    const result = getDefaultAuthConfig(configs)

    // Then it should return the auth config
    expect(result).toEqual({
      profile: 'default',
      role: {
        pathAndName: 'my-role'
      }
    })
  })

  it('should return the last auth config if multiple are provided', () => {
    // Given multiple configs with auth details
    const configs: TopLevelConfig[] = [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        auth: {
          profile: 'first',
          role: {
            pathAndName: 'first-role'
          }
        }
      },
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        auth: {
          profile: 'second',
          role: {
            pathAndName: 'second-role'
          }
        }
      }
    ]

    // When getDefaultAuthConfig is called
    const result = getDefaultAuthConfig(configs)

    // Then it should return the last auth config
    expect(result).toEqual({
      profile: 'second',
      role: {
        pathAndName: 'second-role'
      }
    })
  })
})

describe('syncEnabledForRegion', () => {
  it('should return false if the sync is excluded for the account/service', () => {
    // Given a sync with an excluded account/service
    const configs: TopLevelConfig[] = [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        accountConfigs: {
          '123456789012': {
            serviceConfigs: {
              s3: {
                syncConfigs: {
                  multiRegionAccessPoints: {
                    regions: {
                      excluded: ['us-east-1']
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]

    /// When syncEnabledForRegion is called
    const result = syncEnabledForRegion(
      '123456789012',
      's3',
      'multiRegionAccessPoints',
      configs,
      'us-east-1'
    )

    // Then it should return false
    expect(result).toBe(false)
  })

  it('should return false if the sync is excluded for the service', () => {
    // Given a sync with an excluded service
    const configs: TopLevelConfig[] = [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        serviceConfigs: {
          s3: {
            syncConfigs: {
              multiRegionAccessPoints: {
                regions: {
                  excluded: ['us-east-1']
                }
              }
            }
          }
        }
      }
    ]

    // When syncEnabledForRegion is called
    const result = syncEnabledForRegion(
      '123456789012',
      's3',
      'multiRegionAccessPoints',
      configs,
      'us-east-1'
    )

    // Then it should return false
    expect(result).toBe(false)
  })

  it('should return true if the sync is included for the account/service', () => {
    // Given a sync with an included account/service
    const configs: TopLevelConfig[] = [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        accountConfigs: {
          '123456789012': {
            serviceConfigs: {
              s3: {
                syncConfigs: {
                  multiRegionAccessPoints: {
                    regions: {
                      included: ['us-east-1']
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]

    // When syncEnabledForRegion is called
    const result = syncEnabledForRegion(
      '123456789012',
      's3',
      'multiRegionAccessPoints',
      configs,
      'us-east-1'
    )

    // Then it should return true
    expect(result).toBe(true)
  })
  it('should return true if the sync is included for the service', () => {
    // Given a sync with an included service
    const configs: TopLevelConfig[] = [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        serviceConfigs: {
          s3: {
            syncConfigs: {
              multiRegionAccessPoints: {
                regions: {
                  included: ['us-east-1']
                }
              }
            }
          }
        }
      }
    ]

    // When syncEnabledForRegion is called
    const result = syncEnabledForRegion(
      '123456789012',
      's3',
      'multiRegionAccessPoints',
      configs,
      'us-east-1'
    )

    // Then it should return true
    expect(result).toBe(true)
  })
  it('should return false if the account/service has an include list and the sync is not in it', () => {
    // Given a sync with an included account/service
    const configs: TopLevelConfig[] = [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        accountConfigs: {
          '123456789012': {
            serviceConfigs: {
              s3: {
                syncConfigs: {
                  multiRegionAccessPoints: {
                    regions: {
                      included: ['us-east-1']
                    }
                  }
                }
              }
            }
          }
        }
      }
    ]

    // When syncEnabledForRegion is called
    const result = syncEnabledForRegion(
      '123456789012',
      's3',
      'multiRegionAccessPoints',
      configs,
      'us-west-1'
    )

    // Then it should return false
    expect(result).toBe(false)
  })
  it('should return false if the service has an include list and the sync is not in it', () => {
    // Given a sync with an included service
    const configs: TopLevelConfig[] = [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        serviceConfigs: {
          s3: {
            syncConfigs: {
              multiRegionAccessPoints: {
                regions: {
                  included: ['us-east-1']
                }
              }
            }
          }
        }
      }
    ]

    // When syncEnabledForRegion is called
    const result = syncEnabledForRegion(
      '123456789012',
      's3',
      'multiRegionAccessPoints',
      configs,
      'us-west-1'
    )

    // Then it should return false
    expect(result).toBe(false)
  })
  it('should return true if the sync is not explicitly excluded or included', () => {
    // Given a sync with no exclusions or inclusions
    const configs: TopLevelConfig[] = [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        serviceConfigs: {
          s3: {
            syncConfigs: {
              multiRegionAccessPoints: {}
            }
          }
        }
      }
    ]

    // When syncEnabledForRegion is called
    const result = syncEnabledForRegion(
      '123456789012',
      's3',
      'multiRegionAccessPoints',
      configs,
      'us-west-1'
    )

    // Then it should return true
    expect(result).toBe(true)
  })
})

describe('getStorageConfig', () => {
  it('should return the last storage config found', () => {
    // Given multiple configs with storage details
    const configs: TopLevelConfig[] = [
      {
        iamCollectVersion: defaultVersion,
        storage: {
          type: 'file',
          path: './first-storage'
        }
      },
      {
        iamCollectVersion: defaultVersion,
        storage: {
          type: 'file',
          path: './second-storage'
        }
      }
    ]

    //When getStorageConfig is called
    const result = getStorageConfig(configs)

    // Then it should return the last storage config
    expect(result).toEqual({
      type: 'file',
      path: './second-storage'
    })
  })

  it('should return undefined if no storage config is found', () => {
    // Given no storage config in the provided configs
    const configs: TopLevelConfig[] = [
      {
        iamCollectVersion: defaultVersion
      },
      {
        iamCollectVersion: defaultVersion
      }
    ]

    // When getStorageConfig is called
    const result = getStorageConfig(configs)

    // Then it should return undefined
    expect(result).toBeUndefined()
  })
})

describe('getConfiguredAccounts', () => {
  it('should return the default accounts', () => {
    // Given multiple configs with account details
    const configs: TopLevelConfig[] = [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        accounts: { included: ['123456789012', '987654321098'] }
      },
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        accounts: { included: ['111111111111'] }
      }
    ]

    // When getDefaultAccounts is called
    const result = getConfiguredAccounts(configs)

    // Then it should return the default accounts
    expect(result).toEqual(['111111111111'])
  })

  it('should return the default accounts of the last config that has it', () => {
    // Given multiple configs with account details
    const configs: TopLevelConfig[] = [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        accounts: { included: ['123456789012', '987654321098'] }
      },
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage,
        accounts: { included: ['111111111111'] }
      }
    ]

    // When getDefaultAccounts is called
    const result = getConfiguredAccounts(configs)

    // Then it should return the default accounts
    expect(result).toEqual(['111111111111'])
  })

  it('should return an empty array if no config has accounts', () => {
    // Given multiple configs without account details
    const configs: TopLevelConfig[] = [
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage
      },
      {
        iamCollectVersion: defaultVersion,
        storage: defaultStorage
      }
    ]

    // When getDefaultAccounts is called
    const result = getConfiguredAccounts(configs)

    // Then it should return an empty array
    expect(result).toEqual([])
  })
})
