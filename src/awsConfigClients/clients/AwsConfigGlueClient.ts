import { GetResourcePolicyCommand, GlueClient } from '@aws-sdk/client-glue'
import { type AwsCredentialProviderWithMetaData } from '../../aws/coreAuth.js'
import { AbstractClient } from '../../customClients/AbstractClient.js'
import { type AwsConfigClientContext, awsConfigCommand } from '../AwsConfigClientContext.js'

/**
 * AWS Config-based Glue client implementation
 *
 * Since policies are not available in AWS Config, this client provides limited functionality
 * and returns empty results for all operations.
 */
export class AwsConfigGlueClient extends AbstractClient<AwsConfigClientContext> {
  static readonly clientName = GlueClient.name

  constructor(
    options: {
      credentials: AwsCredentialProviderWithMetaData
      region: string | undefined
    },
    customContext: AwsConfigClientContext
  ) {
    super(options, customContext)
  }

  /**
   * Register all Glue command implementations
   */
  protected registerCommands(): void {
    this.registerCommand(AwsConfigGetResourcePolicyCommand)
  }
}

/**
 * Config-based implementation of Glue GetResourcePolicyCommand
 *
 * Note: The Glue data catalog resource and its policies are not tracked by AWS Config.
 * AWS Config only tracks individual Glue jobs, transforms, and classifiers - not the catalog itself.
 * Therefore, no catalog policy analysis is possible from Config data.
 */
const AwsConfigGetResourcePolicyCommand = awsConfigCommand({
  command: GetResourcePolicyCommand,
  execute: async (input, context) => {
    // Note: The Glue data catalog resource and its policies are not tracked by AWS Config.
    // AWS Config only tracks individual Glue jobs, transforms, and classifiers - not the catalog itself.
    // Therefore, no catalog policy analysis is possible from Config data.
    return {
      PolicyInJson: undefined // Empty - no catalog policy data available in Config
    }
  }
})
