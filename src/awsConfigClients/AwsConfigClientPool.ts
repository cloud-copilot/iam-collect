import { ConfigServiceClient } from '@aws-sdk/client-config-service'
import { getCredentials } from '../aws/auth.js'
import { AwsClientPool } from '../aws/ClientPool.js'
import {
  type AwsCredentialProviderWithMetaData,
  getNewInitialCredentials
} from '../aws/coreAuth.js'
import { type AuthConfig } from '../config/config.js'
import { type ClientConstructor } from '../customClients/AbstractClient.js'
import { AbstractClientPool } from '../customClients/AbstractClientPool.js'
import { type AwsService } from '../services.js'
import { type AwsConfigClientContext } from './AwsConfigClientContext.js'
import { AwsConfigAccountClient } from './clients/AwsConfigAccountClient.js'
import { AwsConfigApiGatewayClient } from './clients/AwsConfigApiGatewayClient.js'
import { AwsConfigBackupClient } from './clients/AwsConfigBackupClient.js'
import { AwsConfigDynamoDBClient } from './clients/AwsConfigDynamoDBClient.js'
import { AwsConfigEC2Client } from './clients/AwsConfigEC2Client.js'
import { AwsConfigEcrClient } from './clients/AwsConfigEcrClient.js'
import { AwsConfigEfsClient } from './clients/AwsConfigEfsClient.js'
import { AwsConfigEventBridgeClient } from './clients/AwsConfigEventBridgeClient.js'
import { AwsConfigGlueClient } from './clients/AwsConfigGlueClient.js'
import { AwsConfigIamClient } from './clients/AwsConfigIamClient.js'
import { AwsConfigKafkaClient } from './clients/AwsConfigKafkaClient.js'
import { AwsConfigKinesisClient } from './clients/AwsConfigKinesisClient.js'
import { AwsConfigKmsClient } from './clients/AwsConfigKmsClient.js'
import { AwsConfigLambdaClient } from './clients/AwsConfigLambdaClient.js'
import { AwsConfigOpenSearchClient } from './clients/AwsConfigOpenSearchClient.js'
import { AwsConfigOrganizationsClient } from './clients/AwsConfigOrganizationsClient.js'
import { AwsConfigS3Client } from './clients/AwsConfigS3Client.js'
import { AwsConfigS3ControlClient } from './clients/AwsConfigS3ControlClient.js'
import { AwsConfigSecretsManagerClient } from './clients/AwsConfigSecretsManagerClient.js'
import { AwsConfigSNSClient } from './clients/AwsConfigSNSClient.js'
import { AwsConfigSQSClient } from './clients/AwsConfigSQSClient.js'

interface AwsConfigClientPoolOptions {
  aggregatorName: string
  region: string
  accountId?: string
  auth?: AuthConfig
}

const fullySupportedServices: Set<AwsService> = new Set([
  'backup',
  'ec2',
  'ecr',
  'elasticfilesystem',
  'es',
  'events',
  'iam',
  'kafka',
  'kms',
  'sns',
  'sqs'
])

/**
 * AWS Config-based client pool using the new abstract base classes
 */
export class AwsConfigClientPool extends AbstractClientPool<AwsConfigClientContext> {
  private configClient: ConfigServiceClient | undefined
  private aggregatorName: string | undefined
  private configCredentials: AwsCredentialProviderWithMetaData | undefined

  /**
   * Constructor
   *
   * @param options Options for the Config client pool
   */
  constructor(private readonly options: AwsConfigClientPoolOptions) {
    super()
  }

  public override async init(): Promise<void> {
    this.aggregatorName = this.options.aggregatorName
    const authConfig = this.options.auth
    const defaultCredentials = await getNewInitialCredentials(authConfig, {
      phase: 'initial AwsConfig credentials'
    })
    let credentials = defaultCredentials
    if (this.options.accountId || authConfig?.role) {
      const targetAccountId = this.options.accountId || credentials.accountId
      credentials = await getCredentials(targetAccountId, authConfig)
    }
    this.configCredentials = credentials
    this.configClient = AwsClientPool.defaultInstance.client(
      ConfigServiceClient,
      credentials,
      this.options.region,
      undefined
    )
  }

  public override requiresAwsCredentials(): boolean {
    return false
  }

  /**
   * Register the default supported Config-based clients
   */
  protected override registerDefaultClients(): void {
    this.registerClient(AwsConfigAccountClient)
    this.registerClient(AwsConfigApiGatewayClient)
    this.registerClient(AwsConfigBackupClient)
    this.registerClient(AwsConfigDynamoDBClient)
    this.registerClient(AwsConfigEC2Client)
    this.registerClient(AwsConfigEcrClient)
    this.registerClient(AwsConfigEfsClient)
    this.registerClient(AwsConfigEventBridgeClient)
    this.registerClient(AwsConfigGlueClient)
    this.registerClient(AwsConfigIamClient)
    this.registerClient(AwsConfigKafkaClient)
    this.registerClient(AwsConfigKinesisClient)
    this.registerClient(AwsConfigKmsClient)
    this.registerClient(AwsConfigLambdaClient)
    this.registerClient(AwsConfigOpenSearchClient)
    this.registerClient(AwsConfigOrganizationsClient)
    this.registerClient(AwsConfigS3Client)
    this.registerClient(AwsConfigS3ControlClient)
    this.registerClient(AwsConfigSecretsManagerClient)
    this.registerClient(AwsConfigSNSClient)
    this.registerClient(AwsConfigSQSClient)
  }

  /**
   * Get custom client context for Config-based implementations
   */
  protected override getClientContext(
    ClientType: ClientConstructor<any>,
    credentials: AwsCredentialProviderWithMetaData,
    region: string | undefined,
    endpoint: string | undefined
  ): AwsConfigClientContext {
    return {
      configClient: this.configClient!,
      aggregatorName: this.aggregatorName!,
      configCredentials: this.configCredentials!
    }
  }

  public override isSyncSupported(service: AwsService, syncName: string, region: string): boolean {
    const fullySupported = fullySupportedServices.has(service)
    if (fullySupported) {
      return true
    }
    if (service === 'lambda') {
      return syncName === 'lambdaFunctions'
    }
    if (service === 's3') {
      return ['generalPurposeBuckets', 'accessPoints', 'accountBpa'].includes(syncName)
    }
    if (service === 's3express') {
      return syncName === 'directoryBuckets'
    }

    // By default, nothing is supported
    return false
  }
}
