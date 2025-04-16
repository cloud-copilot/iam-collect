import { AwsService } from '../services.js'
import { AuthorizationDetailsSync } from './iam/authorizationDetails.js'
import { KeySync } from './kms/key.js'
import { LambdaSync } from './lambda/lambda.js'
import { OrganizationSync } from './organizations/organizations.js'
import { S3GeneralPurposeBucketSync } from './s3/buckets.js'
import { SecretSync } from './secretsmanager/secrets.js'
import { Sync } from './sync.js'

const allSyncs = [
  AuthorizationDetailsSync,
  KeySync,
  LambdaSync,
  OrganizationSync,
  S3GeneralPurposeBucketSync,
  SecretSync
]

const syncMap = new Map<AwsService, { regional: Sync[]; global: Sync[] }>()

for (const sync of allSyncs) {
  const service = sync.awsService
  if (!syncMap.has(service)) {
    syncMap.set(service, {
      regional: [],
      global: []
    })
  }
  const syncs = syncMap.get(service)!
  if (sync.global) {
    syncs.global.push(sync)
  } else {
    syncs.regional.push(sync)
  }
}

/**
 * Get the global syncs for a given AWS service.
 *
 * @param service The AWS service to get the syncs for
 * @returns An array of syncs that are global for the specified service.
 */
export function getGlobalSyncsForService(service: AwsService): Sync[] {
  const syncs = syncMap.get(service)
  if (!syncs) {
    return []
  }
  return syncs.global
}

/**
 * Get the regional syncs for a given AWS service.
 *
 * @param service The AWS service to get the syncs for
 * @returns An array of syncs that are regional for the specified service.
 */
export function getRegionalSyncsForService(service: AwsService): Sync[] {
  const syncs = syncMap.get(service)
  if (!syncs) {
    return []
  }
  return syncs.regional
}
