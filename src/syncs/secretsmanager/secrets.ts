import {
  GetResourcePolicyCommand,
  ListSecretsCommand,
  SecretsManagerClient
} from '@aws-sdk/client-secrets-manager'
import { runAndCatch404 } from '../../utils/client-tools.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

/**
 * Sync AWS Secrets Manager secrets and their resource policies.
 */
export const SecretSync = createTypedSyncOperation(
  'secretsmanager',
  'secrets',
  createResourceSyncType({
    client: SecretsManagerClient,
    command: ListSecretsCommand,
    key: 'SecretList',
    paginationConfig: {
      inputKey: 'NextToken',
      outputKey: 'NextToken'
    },
    resourceTypeParts: (accountId: string, region: string) => ({
      service: 'secretsmanager',
      resourceType: 'secret',
      account: accountId,
      region: region
    }),
    extraFields: {
      policy: async (client, secret) => {
        return runAndCatch404(async () => {
          const response = await client.send(
            new GetResourcePolicyCommand({ SecretId: secret.ARN! })
          )
          if (response.ResourcePolicy) {
            return JSON.parse(response.ResourcePolicy)
          }
          return undefined
        })
      }
    },
    tags: (secret) => secret.Tags,
    arn: (secret) => secret.ARN!,
    results: (secret) => ({
      metadata: {
        name: secret.Name!,
        kmsKey: secret.KmsKeyId
      },
      policy: secret.extraFields.policy
    })
  })
)
