import { GetCallerIdentityCommand, STSClient } from '@aws-sdk/client-sts'
import {
  fromIni,
  fromNodeProviderChain,
  fromTemporaryCredentials
} from '@aws-sdk/credential-providers'
import { AwsCredentialIdentity } from '@aws-sdk/types'
import { AuthConfig } from '../config/config.js'
import { randomCharacters } from '../utils/strings.js'

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

export async function getCredentials(
  accountId: string,
  authConfig: AuthConfig | undefined
): Promise<AwsCredentialIdentityWithMetaData> {
  //If there is no auth config specific to that account, use the default auth config
  if (!authConfig) {
    const provider = fromNodeProviderChain()
    const credentials = await provider()
    const tokenInfo = await getTokenInfo(credentials)
    if (tokenInfo.accountId !== accountId) {
      throw new Error(
        `No auth config found for account ${accountId} and no default auth config found. The account ID of the current credentials does not match.`
      )
    }

    return {
      ...credentials,
      accountId: tokenInfo.accountId,
      partition: tokenInfo.partition
    }
  }

  let credentials: AwsCredentialIdentity | undefined = undefined
  if (authConfig.profile) {
    const provider = fromIni({ profile: authConfig.profile })
    credentials = await provider()
  } else {
    const provider = fromNodeProviderChain()
    credentials = await provider()
  }

  const sessionInfo = await getTokenInfo(credentials)
  if (authConfig.role) {
    const roleProvider = fromTemporaryCredentials({
      // Optional. The master credentials used to get and refresh temporary credentials from AWS STS.
      // If skipped, it uses the default credential resolved by internal STS client.
      masterCredentials: credentials,
      // Required. Options passed to STS AssumeRole operation.
      params: {
        // Required. ARN of role to assume.
        RoleArn: `arn:${sessionInfo.partition}:iam::${accountId}:role/${authConfig.role.pathAndName}`,
        ExternalId: authConfig.role.externalId,

        // Optional. An identifier for the assumed role session. If skipped, it generates a random
        // session name with prefix of 'aws-sdk-js-'.
        RoleSessionName: authConfig.role.sessionName || `iam-collect-${randomCharacters()}`
        // Optional. The duration, in seconds, of the role session.
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

  return { ...credentials, accountId, partition: sessionInfo.partition }
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
