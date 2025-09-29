import { ConfigServiceClient } from '@aws-sdk/client-config-service'
import { AwsCredentialIdentityWithMetaData } from '../aws/coreAuth.js'
import { customCommandFactory } from '../customClients/AbstractCommand.js'

/**
 * Custom client context for AWS Config-based implementations
 */
export interface AwsConfigClientContext {
  configClient: ConfigServiceClient
  aggregatorName: string
  configCredentials: AwsCredentialIdentityWithMetaData
}

export const awsConfigCommand = customCommandFactory<AwsConfigClientContext>()
