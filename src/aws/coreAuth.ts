import {
  fromIni,
  fromNodeProviderChain,
  fromTemporaryCredentials
} from '@aws-sdk/credential-providers'
import { AwsCredentialIdentity } from '@aws-sdk/types'
import { AuthConfig } from '../config/config.js'
import { log } from '../utils/log.js'
import { randomCharacters } from '../utils/strings.js'
import { getTokenInfo } from './tokens.js'

/**
 * Credentials with additional metadata, including the AWS account ID and partition.
 */
export interface AwsCredentialIdentityWithMetaData extends AwsCredentialIdentity {
  /**
   * The AWS partition (e.g., 'aws', 'aws-cn', 'aws-us-gov').
   */
  partition: string

  /**
   * The AWS account ID associated with these credentials.
   */
  accountId: string
}

/**
 * What time is it now?
 *
 * This exists to make unit tests of caching behavior easier.
 *
 * @returns the current timestamp in milliseconds since the Unix epoch
 */
export function now(): number {
  return Date.now()
}

/**
 * Get brand new credentials for the given account ID and auth configuration.
 *
 * DO NOT USE THIS DIRECTLY. Use `getCredentials` in `auth.ts` instead
 *
 * @param accountId the AWS account ID for which to get credentials
 * @param authConfig the authentication configuration to use for the account
 * @returns new credentials based on the provided account ID and auth configuration
 */
export async function getNewCredentials(
  accountId: string,
  authConfig: AuthConfig | undefined
): Promise<AwsCredentialIdentityWithMetaData> {
  const baseCredentials = await getNewInitialCredentials(authConfig, {
    accountId
  })

  let credentials = baseCredentials
  if (authConfig?.role) {
    const roleArn = `arn:${baseCredentials.partition}:iam::${accountId}:role/${authConfig.role.pathAndName}`
    log.trace(
      { accountId, roleArn, sourceAccount: baseCredentials.accountId },
      'Assuming role for account with credentials'
    )
    const roleProvider = fromTemporaryCredentials({
      masterCredentials: baseCredentials,
      params: {
        RoleArn: roleArn,
        ExternalId: authConfig.role.externalId,
        RoleSessionName: authConfig.role.sessionName || `iam-collect-${randomCharacters()}`
      }
    })

    const roleCredentials = await roleProvider()
    credentials = {
      ...roleCredentials,
      accountId: accountId,
      partition: baseCredentials.partition
    }
  } else if (baseCredentials.accountId != accountId) {
    // If the account ID from the credentials doesn't match the expected account ID and no role is specified
    // throw an error to indicate that the credentials do not match the expected account
    log.error('Auth config, account mismatch', {
      desiredAccountId: accountId,
      currentAccountId: baseCredentials.accountId
    })
    throw new Error(
      `The credentials provided do not match the expected account ID ${accountId}. Found ${baseCredentials.accountId}. Please check your auth configuration.`
    )
  }

  return credentials
}

/**
 * This gets a new set of initial credentials for an auth configuration. These are the initial
 * credentials that are the default credentials are used to then assume a role if one is specified.
 * There are very few cases where this should be used directly, and in most cases you should use
 * getNewCredentials instead.
 *
 * @param authConfig the authentication configuration to use
 * @param logInfo any additional information to log while getting the credentials
 * @returns new credentials based on the provided auth configuration
 */
export async function getNewInitialCredentials(
  authConfig: AuthConfig | undefined,
  logInfo: Record<string, unknown> = {}
): Promise<AwsCredentialIdentityWithMetaData> {
  let credentials: AwsCredentialIdentity
  if (authConfig?.profile) {
    log.trace({ ...logInfo, profile: authConfig.profile }, 'Using profile for credentials')
    const provider = fromIni({ profile: authConfig.profile })
    credentials = await provider()
  } else {
    log.trace(logInfo, 'Using default SDK credential chain')
    const provider = fromNodeProviderChain()
    credentials = await provider()
  }
  const tokenInfo = await getTokenInfo(credentials)
  return {
    ...credentials,
    accountId: tokenInfo.accountId,
    partition: tokenInfo.partition
  }
}
