import { ConfigServiceClient } from '@aws-sdk/client-config-service'
import { AwsCredentialProviderWithMetaData } from '../aws/coreAuth.js'
import { customCommandFactory } from '../customClients/AbstractCommand.js'

/**
 * Custom client context for AWS Config-based implementations
 */
export interface AwsConfigClientContext {
  configClient: ConfigServiceClient
  aggregatorName: string
  configCredentials: AwsCredentialProviderWithMetaData
}

export const awsConfigCommand = customCommandFactory<AwsConfigClientContext>()
