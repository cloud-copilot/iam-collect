import { AwsService, lowerCaseService } from '../services.js'
import { RestApisSync } from './apigateway/gateways.js'
import { BackupVaultsSync } from './backup/backupVaults.js'
import { DynamoDBTableSync } from './dynamodb/tables.js'
import { VpcEndpointsSync } from './ec2/vpcEndpoints.js'
import { EcrSyncs } from './ecr/ecrSyncs.js'
import { ElasticFileSystemsSync } from './efs/fileSystems.js'
import { GlueCatalogSync } from './glue/catalogs.js'
import { AuthorizationDetailsSync } from './iam/authorizationDetails.js'
import { IdentityProviderSyncs } from './iam/identityProviders.js'
import { InstanceProfilesSync } from './iam/instanceProfiles.js'
import { KeySync } from './kms/key.js'
import { LambdaSync } from './lambda/lambda.js'
import { OrganizationSync } from './organizations/organizations.js'
import { RamResourcesSync } from './ram/ramShares.js'
import { S3AccessPointsSync } from './s3/accessPoints.js'
import { AccountS3BpaSync } from './s3/accountBpa.js'
import { S3GeneralPurposeBucketSync } from './s3/buckets.js'
import { S3MultiRegionAccessPointsSync } from './s3/multiRegionAccessPoints.js'
import { GlacierVaultsSync } from './s3/vaults.js'
import { S3DirectoryBucketsSync } from './s3express/s3DirectoryBucketsSync.js'
import { S3TableBucketsSync } from './s3tables/s3TablesSync.js'
import { SecretSync } from './secretsmanager/secrets.js'
import { SnsTopicsSync } from './sns/topics.js'
import { SqsQueueSync } from './sqs/queues.js'
import { SsoDataSync } from './sso/ssoInstances.js'
import { Sync } from './sync.js'

const allSyncs = [
  AccountS3BpaSync,
  AuthorizationDetailsSync,
  BackupVaultsSync,
  DynamoDBTableSync,
  ...EcrSyncs,
  ElasticFileSystemsSync,
  InstanceProfilesSync,
  ...IdentityProviderSyncs,
  GlacierVaultsSync,
  GlueCatalogSync,
  KeySync,
  LambdaSync,
  OrganizationSync,
  RamResourcesSync,
  RestApisSync,
  S3AccessPointsSync,
  S3DirectoryBucketsSync,
  S3GeneralPurposeBucketSync,
  S3MultiRegionAccessPointsSync,
  S3TableBucketsSync,
  SecretSync,
  SnsTopicsSync,
  SqsQueueSync,
  SsoDataSync,
  VpcEndpointsSync
]

const syncMap = new Map<AwsService, { regional: Sync[]; global: Sync[] }>()

for (const sync of allSyncs) {
  const service = lowerCaseService(sync.awsService)
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
  const syncs = syncMap.get(lowerCaseService(service))
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
  const syncs = syncMap.get(lowerCaseService(service))
  if (!syncs) {
    return []
  }
  return syncs.regional
}
