import {
  GetKeyPolicyCommand,
  KMSClient,
  ListKeysCommand,
  ListResourceTagsCommand
} from '@aws-sdk/client-kms'
import { runAndCatch404, runAndCatchAccessDenied } from '../../utils/client-tools.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

export const KeySync = createTypedSyncOperation(
  'kms',
  'keys',
  createResourceSyncType({
    client: KMSClient,
    command: ListKeysCommand,
    key: 'Keys',
    paginationConfig: {
      inputKey: 'Marker',
      outputKey: 'NextMarker'
    },
    resourceTypeParts: (accountId: string, region: string) => ({
      service: 'kms',
      resourceType: 'key',
      account: accountId,
      region: region
    }),
    extraFields: {
      tags: async (client, key) => {
        return runAndCatchAccessDenied(async () => {
          return runAndCatch404(async () => {
            const tagResult = await client.send(new ListResourceTagsCommand({ KeyId: key.KeyId }))
            return tagResult.Tags
          })
        })
      },
      policy: async (client, key) => {
        return runAndCatch404(async () => {
          const policyResult = await client.send(
            new GetKeyPolicyCommand({ KeyId: key.KeyId, PolicyName: 'default' })
          )
          if (policyResult.Policy) {
            return JSON.parse(policyResult.Policy)
          }
          return undefined
        })
      }
    },
    tags: (func) => func.extraFields.tags,
    arn: (func) => func.KeyArn!,
    results: (func) => ({
      metadata: {
        id: func.KeyId
      },
      policy: func.extraFields.policy
    })
  })
)
