import {
  DescribeFileSystemPolicyCommand,
  DescribeFileSystemsCommand,
  EFSClient
} from '@aws-sdk/client-efs'
import { runAndCatch404 } from '../../utils/client-tools.js'
import { parseIfPresent } from '../../utils/json.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

export const ElasticFileSystemsSync = createTypedSyncOperation(
  'elasticfilesystem',
  'fileSystems',
  createResourceSyncType({
    client: EFSClient,
    command: DescribeFileSystemsCommand,
    key: 'FileSystems',
    paginationConfig: {
      inputKey: 'Marker',
      outputKey: 'NextMarker'
    },
    resourceTypeParts: (accountId: string, region: string) => ({
      service: 'elasticfilesystem',
      resourceType: 'file-system',
      account: accountId,
      region: region
    }),
    extraFields: {
      policy: async (client, fileSystem) => {
        return runAndCatch404(async () => {
          const policyResult = await client.send(
            new DescribeFileSystemPolicyCommand({ FileSystemId: fileSystem.FileSystemId })
          )
          return parseIfPresent(policyResult.Policy)
        })
      }
    },
    tags: (fileSystem) => fileSystem.Tags,
    arn: (fileSystem) => fileSystem.FileSystemArn!,
    results: (fileSystem) => ({
      metadata: {
        name: fileSystem.Name,
        id: fileSystem.FileSystemId,
        az: fileSystem.AvailabilityZoneId,
        key: fileSystem.KmsKeyId,
        encrypted: fileSystem.Encrypted
      },
      policy: fileSystem.extraFields.policy
    })
  })
)
