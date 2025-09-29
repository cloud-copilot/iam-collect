import {
  GetResourcePolicyCommand,
  ListSecretsCommand,
  SecretsManagerClient
} from '@aws-sdk/client-secrets-manager'
import { AwsCredentialIdentityWithMetaData } from '../../aws/coreAuth.js'
import { AbstractClient } from '../../customClients/AbstractClient.js'
import { AwsConfigClientContext, awsConfigCommand } from '../AwsConfigClientContext.js'

/**
 * Secrets Manager client implementation using AWS Config as data source
 *
 * Since policies are not available in AWS Config, this client provides limited functionality
 * and returns empty results for all operations.
 */
export class AwsConfigSecretsManagerClient extends AbstractClient<AwsConfigClientContext> {
  static readonly clientName = SecretsManagerClient.name

  constructor(
    options: {
      credentials: AwsCredentialIdentityWithMetaData
      region: string | undefined
    },
    customContext: AwsConfigClientContext
  ) {
    super(options, customContext)
  }

  /**
   * Register all Secrets Manager command implementations
   */
  protected registerCommands(): void {
    this.registerCommand(AwsConfigListSecretsCommand)
    this.registerCommand(AwsConfigGetResourcePolicyCommand)
  }
}

/**
 * Config-based implementation of Secrets Manager ListSecretsCommand
 */
const AwsConfigListSecretsCommand = awsConfigCommand({
  command: ListSecretsCommand,
  execute: async (input, context) => {
    // Policy not available in Config, so return an empty list

    return {
      SecretList: []
    }
  }
})

/**
 * Config-based implementation of Secrets Manager GetResourcePolicyCommand
 */
const AwsConfigGetResourcePolicyCommand = awsConfigCommand({
  command: GetResourcePolicyCommand,
  execute: async (input, context) => {
    const { SecretId } = input

    // Policy not available in Config, so fetch directly from Secrets Manager
    return {}
  }
})
