import { APIGatewayClient, GetRestApisCommand } from '@aws-sdk/client-api-gateway'
import { AwsCredentialIdentityWithMetaData } from '../../aws/coreAuth.js'
import { AbstractClient } from '../../customClients/AbstractClient.js'
import { AwsConfigClientContext, awsConfigCommand } from '../AwsConfigClientContext.js'

/**
 * API Gateway client implementation using AWS Config as data source
 *
 * Since policies are not available in AWS Config, this client provides limited functionality
 * and returns empty results for all operations.
 */
export class AwsConfigApiGatewayClient extends AbstractClient<AwsConfigClientContext> {
  static readonly clientName = APIGatewayClient.name

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
   * Register all API Gateway command implementations
   */
  protected registerCommands(): void {
    this.registerCommand(AwsConfigGetRestApisCommand)
  }
}

/**
 * Config-based implementation of API Gateway GetRestApisCommand
 */
const AwsConfigGetRestApisCommand = awsConfigCommand({
  command: GetRestApisCommand,
  execute: async (input, context) => {
    return {
      items: [] // API Gateway is not fully supported in Config, so return empty result
    }
  }
})
