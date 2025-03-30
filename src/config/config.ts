export interface AuthConfig {
  /**
   * The profile to use when authenticating with AWS. If not present, the default AWS SDK credential resolution chain will be used.
   */
  profile?: string

  // Optional if you want to assume a role, if profile and role are both present, the profile will be used to assume the role.
  role?: {
    /**
     * The path and name of the role to assume. Required if using a role.
     */
    pathAndName: string

    /**
     * Optional, the external id to use when assuming the role.
     */
    externalId?: string

    /**
     * Optional, the session name to use when assuming the role.
     */
    sessionName?: string
  }
}

export interface FileSystemStorageConfig {
  type: 'file'
  path: string
}

export interface S3StorageConfig {
  type: 's3'
  bucket: string
  prefix?: string
  region: string
  endpoint?: string
  auth?: AuthConfig & {
    accountId: string
  }
}

export type StorageConfig = FileSystemStorageConfig | S3StorageConfig

interface BaseConfig {
  regions?: {
    included?: string[]
    excluded?: string[]
  }
  services?: {
    included?: string[]
    excluded?: string[]
  }
  auth?: AuthConfig
}

interface ServiceConfig extends BaseConfig {
  endpoint?: string
  regionConfigs?: Record<string, Omit<ServiceConfig, 'regionConfigs'>>
}

interface AccountConfig extends BaseConfig {
  serviceConfigs?: Record<string, ServiceConfig>
}

export interface TopLevelConfig extends BaseConfig {
  name?: string
  iamCollectVersion: string
  storage?: StorageConfig
  auth?: AuthConfig
  accounts?: Record<string, AccountConfig>
  serviceConfigs?: Record<string, ServiceConfig>
}

type ServicesForAccount = string[]
type RegionsForAccountService = string[]
interface AccountServiceRegionConfig {
  auth: AuthConfig
  endpoint?: string
}

interface ResolvedAccountConfig {
  regions?: {
    included?: string[]
    excluded?: string[]
  }
  services?: {
    included?: string[]
    excluded?: string[]
  }
}

export interface ResolvedAccountServiceRegionConfig {
  accountId: string
  service: string
  region: string
  auth?: AuthConfig
  endpoint?: string
}

export function servicesForAccount(
  account: string,
  configs: TopLevelConfig[],
  allServices: string[]
): ServicesForAccount {
  let services = allServices
  for (const config of configs) {
    if (config.services?.included) {
      services = config.services.included
    }

    if (config.services?.excluded) {
      services = services.filter((service) => !config.services!.excluded?.includes(service))
    }

    const accountServices = config.accounts?.[account]?.services
    if (accountServices) {
      if (accountServices.included) {
        for (const service of accountServices.included) {
          if (!services.includes(service)) {
            services.push(service)
          }
        }
      }
      if (accountServices.excluded) {
        services = services.filter((service) => !accountServices.excluded?.includes(service))
      }
    }
  }

  return services
}

export function regionsForService(
  service: string,
  account: string,
  configs: TopLevelConfig[],
  allRegions: string[]
): RegionsForAccountService {
  let regions = allRegions
  for (const config of configs) {
    if (config.regions?.included) {
      regions = config.regions.included
    }
    if (config.regions?.excluded) {
      regions = regions.filter((region) => !config.regions!.excluded?.includes(region))
    }

    const serviceConfig = config.serviceConfigs?.[service]
    if (serviceConfig) {
      if (serviceConfig.regions?.included) {
        regions = serviceConfig.regions.included
      }
      if (serviceConfig.regions?.excluded) {
        regions = regions.filter((region) => !serviceConfig.regions!.excluded?.includes(region))
      }
    }

    const accountConfig = config.accounts?.[account]
    if (accountConfig) {
      if (accountConfig.regions?.included) {
        regions = accountConfig.regions.included
      }
      if (accountConfig.regions?.excluded) {
        regions = regions.filter((region) => !accountConfig.regions!.excluded?.includes(region))
      }

      const accountServices = accountConfig.serviceConfigs?.[service]
      if (accountServices) {
        if (accountServices.regions?.included) {
          regions = accountServices.regions.included
        }
        if (accountServices.regions?.excluded) {
          regions = regions.filter((region) => !accountServices.regions!.excluded?.includes(region))
        }
      }
    }
  }

  return regions
}

// export function defaultStsRegion(configs: TopLevelConfig[]): string {
//   for (const config of configs) {
//     if (config.regions?.included) {
//       return config.regions.included[0]
//     }
//   }

//   return 'us-east-1'
// }

export function accountServiceRegionConfig(
  service: string,
  accountId: string,
  region: string,
  configs: TopLevelConfig[]
): ResolvedAccountServiceRegionConfig {
  let result: ResolvedAccountServiceRegionConfig = {
    accountId: accountId,
    service,
    region
  }
  for (const config of configs) {
    if (config.auth) {
      result.auth = config.auth
    }

    const serviceConfig = config.serviceConfigs?.[service]
    if (serviceConfig) {
      if (serviceConfig.auth) {
        result.auth = { ...result.auth, ...serviceConfig.auth }
      }
      if (serviceConfig.endpoint) {
        result.endpoint = serviceConfig.endpoint
      }

      const regionConfig = serviceConfig.regionConfigs?.[region]
      if (regionConfig) {
        if (regionConfig.auth) {
          result.auth = { ...result.auth, ...regionConfig.auth }
        }
        if (regionConfig.endpoint) {
          result.endpoint = regionConfig.endpoint
        }
      }
    }

    const accountConfig = config.accounts?.[accountId]
    if (accountConfig) {
      if (accountConfig.auth) {
        result.auth = accountConfig.auth
      }

      const accountServiceConfig = accountConfig.serviceConfigs?.[service]
      if (accountServiceConfig) {
        if (accountServiceConfig.auth) {
          result.auth = { ...result.auth, ...accountServiceConfig.auth }
        }
        if (accountServiceConfig.endpoint) {
          result.endpoint = accountServiceConfig.endpoint
        }

        const accountRegionConfig = accountServiceConfig.regionConfigs?.[region]
        if (accountRegionConfig) {
          if (accountRegionConfig.auth) {
            result.auth = { ...result.auth, ...accountRegionConfig.auth }
          }
          if (accountRegionConfig.endpoint) {
            result.endpoint = accountRegionConfig.endpoint
          }
        }
      }
    }
  }

  return result
}

/**
 * Get the auth config for a specific account
 *
 * @param accountId the account id to get the auth config for
 * @param configs the configs to search
 * @returns the auth config for the account, or undefined if not found
 */
export function getAccountAuthConfig(
  accountId: string,
  configs: TopLevelConfig[]
): AuthConfig | undefined {
  let result: AuthConfig | undefined = undefined
  for (const config of configs) {
    if (config.auth) {
      result = config.auth
    }
    const accountConfig = config.accounts?.[accountId]
    if (accountConfig?.auth) {
      result = { ...(result || {}), ...accountConfig.auth }
    }
  }
  return result
}

export function getStorageConfig(configs: TopLevelConfig[]): StorageConfig | undefined {
  const reverseConfigs = [...configs].reverse()
  // Iterate through the configs to find the first storage config
  for (const config of configs) {
    if (config.storage) {
      return config.storage
    }
  }
  // Return undefined if no storage config is found
  return undefined
}
