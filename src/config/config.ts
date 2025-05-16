import { AwsService } from '../services.js'

export interface AuthConfig {
  /**
   * The profile to use when authenticating with AWS. If not present, the default AWS SDK credential resolution chain will be used.
   */
  profile?: string

  /**
   * An optional initial Role to assume in the first phase of the authentication process before
   * assuming any roles in the target accounts.
   */
  initialRole?: (
    | {
        /**
         * Specify the ARN OR the path and name of the role to assume.
         *
         * Use arn if you want to always assume a role in a specific account.
         */
        arn: string
      }
    | {
        /**
         * Specify the path and name OR the ARN of the role to assume.
         *
         * Use pathAndName if you want to assume a role in the same account as your default credentials.
         */
        pathAndName: string
      }
  ) & {
    /**
     * Optional, the external id to use when assuming the role.
     */
    externalId?: string

    /**
     * Optional, the session name to use when assuming the role.
     */
    sessionName?: string
  }

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

/**
 * An AuthConfig that is completely optional for all fields.
 * This is used to allow for partial auth configs in the account/service/region configs.
 */
export interface OptionalAuthConfig extends Omit<AuthConfig, 'role'> {
  role?: Partial<AuthConfig['role']>
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
  auth?: AuthConfig
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

interface ServiceConfig extends Omit<BaseConfig, 'auth'> {
  endpoint?: string
  regionConfigs?: Record<string, Omit<ServiceConfig, 'regionConfigs'>>
  syncConfigs?: Record<string, SyncConfig>
  auth?: OptionalAuthConfig
}

interface SyncConfig {
  regions?: {
    included?: string[]
    excluded?: string[]
  }
  auth?: AuthConfig
}

interface AccountConfig extends Omit<BaseConfig, 'auth'> {
  serviceConfigs?: Record<string, ServiceConfig>
  auth?: OptionalAuthConfig
}

export interface TopLevelConfig extends BaseConfig {
  name?: string
  iamCollectVersion: string
  storage?: StorageConfig
  auth?: AuthConfig
  accounts?: {
    included?: string[]
  }
  accountConfigs?: Record<string, AccountConfig>
  serviceConfigs?: Record<string, ServiceConfig>
}

type ServicesForAccount = AwsService[]
type RegionsForAccountService = string[]
interface AccountServiceRegionConfig {
  auth?: AuthConfig
  endpoint?: string
}

export interface ResolvedAccountServiceRegionConfig {
  accountId: string
  service: string
  region: string
  auth?: AuthConfig
  endpoint?: string
}

/**
 * Get the default auth config from the provided configs.
 *
 * @param configs the configs to search for the default auth config
 * @returns the default auth config, or an empty object if none found
 */
export function getDefaultAuthConfig(configs: TopLevelConfig[]): AuthConfig {
  // Return the last config with an auth config, or an empty object if none found
  for (let i = configs.length - 1; i >= 0; i--) {
    const configAuth = configs[i].auth
    if (configAuth) {
      return configAuth
    }
  }
  return {}
}

export function servicesForAccount(
  account: string,
  configs: TopLevelConfig[],
  allServices: string[]
): ServicesForAccount {
  let services = allServices
  for (const config of configs) {
    if (config.services?.included) {
      services = intersection(allServices, config.services.included)
    }

    if (config.services?.excluded) {
      services = difference(services, config.services.excluded)
    }

    const accountServices = config.accountConfigs?.[account]?.services
    if (accountServices) {
      if (accountServices.included) {
        for (const service of accountServices.included) {
          if (!services.includes(service) && allServices.includes(service)) {
            services.push(service)
          }
        }
      }
      if (accountServices.excluded) {
        services = difference(services, accountServices.excluded)
      }
    }
  }

  return services as ServicesForAccount
}

/**
 * Get the regions for a specific service and account.
 *
 * @param service the service to get the regions for
 * @param account the account to get the regions for
 * @param configs the configs to search
 * @param allRegions the list of all regions to filter from
 * @returns the regions for the service and account
 */
export function regionsForService(
  service: string,
  account: string,
  configs: TopLevelConfig[],
  allRegions: string[]
): RegionsForAccountService {
  let regions = allRegions
  for (const config of configs) {
    if (config.regions?.included) {
      regions = intersection(allRegions, config.regions.included)
    }
    if (config.regions?.excluded) {
      regions = difference(regions, config.regions.excluded)
    }

    const serviceConfig = config.serviceConfigs?.[service]
    if (serviceConfig) {
      if (serviceConfig.regions?.included) {
        regions = intersection(allRegions, serviceConfig.regions.included)
      }
      if (serviceConfig.regions?.excluded) {
        regions = difference(regions, serviceConfig.regions.excluded)
      }
    }

    const accountConfig = config.accountConfigs?.[account]
    if (accountConfig) {
      if (accountConfig.regions?.included) {
        regions = intersection(allRegions, accountConfig.regions.included)
      }
      if (accountConfig.regions?.excluded) {
        regions = difference(regions, accountConfig.regions.excluded)
      }

      const accountServices = accountConfig.serviceConfigs?.[service]
      if (accountServices) {
        if (accountServices.regions?.included) {
          regions = intersection(allRegions, accountServices.regions.included)
        }
        if (accountServices.regions?.excluded) {
          regions = difference(regions, accountServices.regions.excluded)
        }
      }
    }
  }

  return regions
}

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
        result.auth = mergeAuthConfigs(result.auth, serviceConfig.auth)
      }
      if (serviceConfig.endpoint) {
        result.endpoint = serviceConfig.endpoint
      }

      const regionConfig = serviceConfig.regionConfigs?.[region]
      if (regionConfig) {
        if (regionConfig.auth) {
          result.auth = mergeAuthConfigs(result.auth, regionConfig.auth)
        }
        if (regionConfig.endpoint) {
          result.endpoint = regionConfig.endpoint
        }
      }
    }

    const accountConfig = config.accountConfigs?.[accountId]
    if (accountConfig) {
      if (accountConfig.auth) {
        result.auth = mergeAuthConfigs(result.auth, accountConfig.auth)
      }

      const accountServiceConfig = accountConfig.serviceConfigs?.[service]
      if (accountServiceConfig) {
        if (accountServiceConfig.auth) {
          result.auth = mergeAuthConfigs(result.auth, accountServiceConfig.auth)
        }
        if (accountServiceConfig.endpoint) {
          result.endpoint = accountServiceConfig.endpoint
        }

        const accountRegionConfig = accountServiceConfig.regionConfigs?.[region]
        if (accountRegionConfig) {
          if (accountRegionConfig.auth) {
            result.auth = mergeAuthConfigs(result.auth, accountRegionConfig.auth)
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
    const accountConfig = config.accountConfigs?.[accountId]
    if (accountConfig?.auth) {
      result = mergeAuthConfigs(result, accountConfig.auth)
    }
  }
  return result
}

export function getStorageConfig(configs: TopLevelConfig[]): StorageConfig | undefined {
  const reverseConfigs = [...configs].reverse()
  // Iterate through the configs to find the first storage config
  for (const config of reverseConfigs) {
    if (config.storage) {
      return config.storage
    }
  }
  // Return undefined if no storage config is found
  return undefined
}

/**
 * Check if a specific sync is enabled for given region. This checks the specific sync config within the service.
 *
 * This should only be used after the sync has been validated to be enabled for the account and service.
 *
 * @param accountId the account id to check
 * @param service the service to check
 * @param syncName the specific name of the sync to check
 * @param configs the configs to check
 * @param region the region being tested
 * @returns true if the sync is enabled for the region, false otherwise
 */
export function syncEnabledForRegion(
  accountId: string,
  service: string,
  syncName: string,
  configs: TopLevelConfig[],
  region: string
): boolean {
  // go through the configs in reverse order,
  // If any have the sync enabled return true,
  // If any have the sync disabled return false
  // If none are found, return true
  for (const config of [...configs].reverse()) {
    const accountServiceConfig =
      config.accountConfigs?.[accountId]?.serviceConfigs?.[service]?.syncConfigs?.[syncName]
    if (accountServiceConfig) {
      if (accountServiceConfig.regions?.excluded?.includes(region)) {
        return false
      }
      if (accountServiceConfig.regions?.included) {
        return accountServiceConfig.regions.included.includes(region)
      }
    }
    const serviceConfig = config.serviceConfigs?.[service]?.syncConfigs?.[syncName]
    if (serviceConfig) {
      if (serviceConfig.regions?.excluded?.includes(region)) {
        return false
      }
      if (serviceConfig.regions?.included) {
        return serviceConfig.regions.included.includes(region)
      }
    }
  }
  return true
}

/**
 * Get the default accounts from the provided configs.
 *
 * @param configs the configs to search for the default accounts
 * @returns the default accounts, or an empty array if none found
 */
export function getConfiguredAccounts(configs: TopLevelConfig[]): string[] {
  const reverseConfigs = [...configs].reverse()
  for (const config of reverseConfigs) {
    if (config.accounts?.included) {
      return config.accounts.included
    }
  }
  return []
}

function mergeAuthConfigs(
  initialConfig: AuthConfig | undefined,
  newConfig: AuthConfig | OptionalAuthConfig | undefined
): AuthConfig {
  if (!initialConfig) {
    initialConfig = {}
  }
  if (!newConfig) {
    return initialConfig
  }

  if ('profile' in newConfig) {
    initialConfig.profile = newConfig.profile
  }

  if ('initialRole' in newConfig) {
    initialConfig.initialRole = {
      ...(initialConfig.initialRole || {}),
      ...newConfig.initialRole
    } as AuthConfig['initialRole']
  }

  if ('role' in newConfig) {
    initialConfig.role = {
      ...(initialConfig.role || {}),
      ...newConfig.role
    } as AuthConfig['role']
  }

  return initialConfig
}

function intersection<T>(a: T[], b: T[]): T[] {
  return a.filter((value) => b.includes(value))
}

function difference<T>(a: T[], b: T[]): T[] {
  return a.filter((value) => !b.includes(value))
}
