import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts'
import {
  fromIni,
  fromNodeProviderChain,
  fromTemporaryCredentials
} from '@aws-sdk/credential-providers'
import { AwsCredentialIdentity } from '@aws-sdk/types'
import { AuthConfig } from '../config/config.js'
import { log } from '../utils/log.js'
import { randomCharacters } from '../utils/strings.js'

const CREDENTIAL_CACHE_TIMEOUT = 300 * 1000

export interface AwsCredentialIdentityWithMetaData extends AwsCredentialIdentity {
  partition: string
  accountId: string
}

export interface CollectIdentityProvider {
  getCredentials: () => Promise<AwsCredentialIdentityWithMetaData>
}

export async function getDefaultCredentials(): Promise<AwsCredentialIdentity> {
  const provider = fromNodeProviderChain()
  return provider()
}

//Cache credentials based on the auth config with a timeout

const credentialsCache: Map<
  string,
  {
    expiration: number
    credentials: AwsCredentialIdentityWithMetaData
  }
> = new Map()

function credentialsCacheKey(accountId: string, authConfig: AuthConfig | undefined): string {
  return authConfig ? `${accountId}:${JSON.stringify(authConfig)}` : accountId
}

function getCachedCredentials(
  accountId: string,
  authConfig: AuthConfig | undefined
): AwsCredentialIdentityWithMetaData | undefined {
  const cacheKey = credentialsCacheKey(accountId, authConfig)
  const cached = credentialsCache.get(cacheKey)
  if (cached && cached.expiration > Date.now()) {
    return cached.credentials
  }
  credentialsCache.delete(cacheKey)
  return undefined
}

function setCachedCredentials(
  accountId: string,
  authConfig: AuthConfig | undefined,
  credentials: AwsCredentialIdentityWithMetaData
): void {
  const cacheKey = credentialsCacheKey(accountId, authConfig)
  const expiration = Date.now() + CREDENTIAL_CACHE_TIMEOUT
  credentialsCache.set(cacheKey, { expiration, credentials })
}

export async function getCredentials(
  accountId: string,
  authConfig: AuthConfig | undefined
): Promise<AwsCredentialIdentityWithMetaData> {
  const cachedCredentials = getCachedCredentials(accountId, authConfig)
  if (cachedCredentials) {
    log.trace({ accountId }, 'Using cached credentials')
    return cachedCredentials
  }

  //If there is no auth config specific to that account, use the default auth config
  if (!authConfig) {
    log.trace(
      {
        accountId
      },
      'Using default SDK credential chain'
    )
    const provider = fromNodeProviderChain()
    const credentials = await provider()
    const tokenInfo = await getTokenInfo(credentials)
    if (tokenInfo.accountId !== accountId) {
      throw new Error(
        `No auth config found for account ${accountId} and no default auth config found. The account ID of the current credentials does not match.`
      )
    }

    const defaultCredentials: AwsCredentialIdentityWithMetaData = {
      ...credentials,
      accountId: tokenInfo.accountId,
      partition: tokenInfo.partition
    }
    setCachedCredentials(accountId, authConfig, defaultCredentials)
    return defaultCredentials
  }

  let credentials: AwsCredentialIdentity | undefined = undefined
  if (authConfig.profile) {
    log.trace(
      {
        accountId,
        profile: authConfig.profile
      },
      'Using profile for credentials'
    )
    const provider = fromIni({ profile: authConfig.profile })
    credentials = await provider()
  } else {
    log.trace(
      {
        accountId
      },
      'Using default SDK credential chain'
    )
    const provider = fromNodeProviderChain()
    credentials = await provider()
  }

  const sessionInfo = await getTokenInfo(credentials)
  if (authConfig.role) {
    const roleArn = `arn:${sessionInfo.partition}:iam::${accountId}:role/${authConfig.role.pathAndName}`
    log.trace({ accountId, roleArn, sessionInfo }, 'Assuming role for account with credentials')
    const roleProvider = fromTemporaryCredentials({
      masterCredentials: credentials,
      params: {
        RoleArn: roleArn,
        ExternalId: authConfig.role.externalId,
        RoleSessionName: authConfig.role.sessionName || `iam-collect-${randomCharacters()}`
      }
    })

    credentials = await roleProvider()
  } else if (sessionInfo.accountId != accountId) {
    // If the account ID from the credentials doesn't match the expected account ID and no role is specified
    // throw an error to indicate that the credentials do not match the expected account
    throw new Error(
      `The credentials provided do not match the expected account ID ${accountId}. Found ${sessionInfo.accountId}. Please check your auth configuration.`
    )
  }

  const accountCredentials = { ...credentials, accountId, partition: sessionInfo.partition }
  setCachedCredentials(accountId, authConfig, accountCredentials)
  return accountCredentials
}

export async function getTokenInfo(credentials: AwsCredentialIdentity): Promise<{
  accountId: string
  partition: string
}> {
  const stsClient = new STSClient({ credentials })
  const command = new GetCallerIdentityCommand({})
  const response = await stsClient.send(command)
  const accountId = response.Account
  const arn = response.Arn
  const arnParts = arn!.split(':')
  const partition = arnParts[1]
  return {
    accountId: accountId!,
    partition: partition
  }
}
