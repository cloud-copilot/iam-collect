import {
  BackupClient,
  GetBackupVaultAccessPolicyCommand,
  ListBackupVaultsCommand,
  ListTagsCommand
} from '@aws-sdk/client-backup'
import { runAndCatch404, runAndCatchError } from '../../utils/client-tools.js'
import { parseIfPresent } from '../../utils/json.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

export const BackupVaultsSync = createTypedSyncOperation(
  'backup',
  'vaults',
  createResourceSyncType({
    client: BackupClient,
    command: ListBackupVaultsCommand,
    key: 'BackupVaultList',
    paginationConfig: {
      inputKey: 'NextToken',
      outputKey: 'NextToken'
    },
    resourceTypeParts: (accountId: string, region: string) => ({
      service: 'backup',
      resourceType: 'backup-vault',
      account: accountId,
      region: region
    }),
    extraFields: {
      tags: async (client, vault) => {
        return runAndCatchError('ResourceNotFoundException', async () => {
          return runAndCatch404(async () => {
            const tagResult = await client.send(
              new ListTagsCommand({ ResourceArn: vault.BackupVaultArn })
            )
            return tagResult.Tags
          })
        })
      },
      policy: async (client, vault) => {
        return runAndCatchError('ResourceNotFoundException', async () => {
          return runAndCatch404(async () => {
            const policyResult = await client.send(
              new GetBackupVaultAccessPolicyCommand({ BackupVaultName: vault.BackupVaultName })
            )
            return parseIfPresent(policyResult.Policy)
          })
        })
      }
    },
    tags: (vault) => vault.extraFields.tags,
    arn: (vault) => vault.BackupVaultArn!,
    results: (vault) => ({
      metadata: {
        name: vault.BackupVaultName,
        key: vault.EncryptionKeyArn,
        state: vault.VaultState
      },
      policy: vault.extraFields.policy
    })
  })
)
