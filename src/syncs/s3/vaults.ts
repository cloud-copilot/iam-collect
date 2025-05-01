import {
  GetVaultAccessPolicyCommand,
  GlacierClient,
  ListTagsForVaultCommand,
  ListVaultsCommand
} from '@aws-sdk/client-glacier'
import { runAndCatch404 } from '../../utils/client-tools.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

export const GlacierVaultsSync = createTypedSyncOperation(
  'glacier',
  'glacierVaults',
  createResourceSyncType({
    client: GlacierClient,
    command: ListVaultsCommand,
    key: 'VaultList',
    paginationConfig: {
      inputKey: 'marker',
      outputKey: 'Marker'
    },
    arn: (vault) => vault.VaultARN!,
    resourceTypeParts: (account, region) => ({
      account,
      region,
      resourceType: 'vaults',
      service: 'glacier'
    }),
    tags: (vault) => vault.extraFields.tags,
    extraFields: {
      policy: async (client, vault, accountId) => {
        const policy = await runAndCatch404(async () => {
          const result = await client.send(
            new GetVaultAccessPolicyCommand({
              accountId,
              vaultName: vault.VaultName
            })
          )

          return JSON.parse(result.policy?.Policy || '{}')
        })

        return policy
      },
      tags: async (client, vault, accountId) => {
        const tags = await client.send(
          new ListTagsForVaultCommand({
            accountId,
            vaultName: vault.VaultName
          })
        )
        return tags.Tags
      }
    },
    results: (vault) => ({
      metadata: {
        name: vault.VaultName
      },
      policy: vault.extraFields.policy
    })
  })
)
