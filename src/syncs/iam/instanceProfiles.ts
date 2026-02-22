import { IAMClient, ListInstanceProfilesCommand } from '@aws-sdk/client-iam'
import { type Sync } from '../sync.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

export const InstanceProfilesSync: Sync = createTypedSyncOperation(
  'iam',
  'instanceprofiles',
  createResourceSyncType({
    client: IAMClient,
    command: ListInstanceProfilesCommand,
    key: 'InstanceProfiles',
    paginationConfig: {
      inputKey: 'Marker',
      outputKey: 'Marker'
    },
    arn: (profile) => profile.Arn!,
    tags: (profile) => profile.Tags,
    resourceTypeParts: (account, region) => ({
      service: 'iam',
      account,
      resourceType: 'instance-profile'
    }),
    results: (profile) => ({
      metadata: {
        name: profile.Path,
        roles: profile.Roles?.map((role) => role.Arn),
        id: profile.InstanceProfileId,
        path: profile.Path
      }
    })
  })
)
