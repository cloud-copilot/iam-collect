import {
  DescribeOrganizationCommand,
  DescribePolicyCommand,
  DescribeResourcePolicyCommand,
  ListAccountsForParentCommand,
  ListDelegatedAdministratorsCommand,
  ListDelegatedServicesForAccountCommand,
  ListOrganizationalUnitsForParentCommand,
  ListPoliciesCommand,
  ListPoliciesForTargetCommand,
  ListRootsCommand,
  ListTagsForResourceCommand,
  OrganizationsClient,
  PolicyType,
  PolicyTypeStatus
} from '@aws-sdk/client-organizations'
import { mockClient } from 'aws-sdk-client-mock'
import { afterEach, describe, expect, it } from 'vitest'
import { AwsClientPool } from '../../aws/ClientPool.js'
import { type AwsCredentialProviderWithMetaData } from '../../aws/coreAuth.js'
import { FileSystemAwsIamStore } from '../../persistence/file/FileSystemAwsIamStore.js'
import { InMemoryPathBasedPersistenceAdapter } from '../../persistence/InMemoryPathBasedPersistenceAdapter.js'
import { OrganizationSync } from './organizations.js'

const organizationsMock = mockClient(OrganizationsClient)
const accountId = '111111111111'
const organizationId = 'o-example'
const rootId = 'r-root'
const childOuId = 'ou-root-child'

const credentials: AwsCredentialProviderWithMetaData = {
  accountId,
  partition: 'aws',
  cacheKey: 'test-credentials',
  provider: async () => ({
    accessKeyId: 'test-access-key-id',
    secretAccessKey: 'test-secret-access-key'
  })
}

function createStore(): FileSystemAwsIamStore {
  return new FileSystemAwsIamStore(
    '/base/folder',
    'aws',
    '/',
    new InMemoryPathBasedPersistenceAdapter()
  )
}

async function executeOrganizationSync(
  store: FileSystemAwsIamStore,
  writeOnly = false
): Promise<void> {
  const clientPool = new AwsClientPool()
  await OrganizationSync.execute(accountId, 'us-east-1', credentials, store, undefined, {
    clientPool,
    writeOnly,
    workerPool: {} as any
  })
  clientPool.clear()
}

describe('OrganizationSync', () => {
  afterEach(() => {
    organizationsMock.reset()
  })

  it('collects enabled organization S3 policies and attachments', async () => {
    //Given an organization with S3 policies enabled and attached to the root, child OU, and account
    const store = createStore()
    setupOrganizationResponses({ s3PoliciesEnabled: true })

    organizationsMock.on(ListPoliciesForTargetCommand).callsFake((input) => {
      return {
        Policies: [
          {
            Id: `p-${input.TargetId}-${input.Filter}`,
            Arn: `arn:aws:organizations::${accountId}:policy/${organizationId}/${input.Filter}/p-${input.TargetId}`
          }
        ]
      }
    })
    organizationsMock.on(ListPoliciesCommand).resolves({ Policies: [] })
    organizationsMock.on(ListPoliciesCommand, { Filter: PolicyType.S3_POLICY }).resolves({
      Policies: [
        {
          Id: 'p-s3-policy',
          Arn: `arn:aws:organizations::${accountId}:policy/${organizationId}/s3_policy/p-s3-policy`,
          Name: 'LimitBucketSharing',
          Description: 'Synthetic S3 policy',
          AwsManaged: false
        }
      ]
    })
    organizationsMock.on(DescribePolicyCommand, { PolicyId: 'p-s3-policy' }).resolves({
      Policy: {
        Content: JSON.stringify({
          Version: '2012-10-17',
          Statement: [{ Effect: 'Deny', Action: 's3:PutBucketPolicy', Resource: '*' }]
        })
      }
    })
    organizationsMock.on(ListTagsForResourceCommand, { ResourceId: 'p-s3-policy' }).resolves({
      Tags: [{ Key: 'policy-family', Value: 's3' }]
    })

    //When the organization sync runs
    await executeOrganizationSync(store)

    //Then S3 policy attachments should be stored for accounts and OUs
    const accounts = await store.getOrganizationMetadata<Record<string, any>>(
      organizationId,
      'accounts'
    )
    const ous = await store.getOrganizationMetadata<Record<string, any>>(organizationId, 'ous')
    expect(accounts?.[accountId].s3Policies).toEqual([
      `arn:aws:organizations::${accountId}:policy/${organizationId}/${PolicyType.S3_POLICY}/p-${accountId}`
    ])
    expect(ous?.[rootId].s3Policies).toEqual([
      `arn:aws:organizations::${accountId}:policy/${organizationId}/${PolicyType.S3_POLICY}/p-${rootId}`
    ])
    expect(ous?.[childOuId].s3Policies).toEqual([
      `arn:aws:organizations::${accountId}:policy/${organizationId}/${PolicyType.S3_POLICY}/p-${childOuId}`
    ])

    //And S3 policy metadata, content, and tags should be stored under the S3 policy type
    await expect(store.listOrganizationPolicies(organizationId, 's3-policies')).resolves.toEqual([
      'p-s3-policy'
    ])
    await expect(
      store.getOrganizationPolicyMetadata(organizationId, 's3-policies', 'p-s3-policy', 'metadata')
    ).resolves.toEqual({
      arn: `arn:aws:organizations::${accountId}:policy/${organizationId}/s3_policy/p-s3-policy`,
      name: 'LimitBucketSharing',
      description: 'Synthetic S3 policy',
      awsManaged: false
    })
    await expect(
      store.getOrganizationPolicyMetadata(organizationId, 's3-policies', 'p-s3-policy', 'policy')
    ).resolves.toEqual({
      Version: '2012-10-17',
      Statement: [{ Effect: 'Deny', Action: 's3:PutBucketPolicy', Resource: '*' }]
    })
    await expect(
      store.getOrganizationPolicyMetadata(organizationId, 's3-policies', 'p-s3-policy', 'tags')
    ).resolves.toEqual({ 'policy-family': 's3' })

    //And the child OU policy attachment lookups should use the child OU ID for all policy types
    const childOuAttachmentCalls = organizationsMock
      .commandCalls(ListPoliciesForTargetCommand)
      .filter((call) => call.args[0].input.TargetId === childOuId)
      .map((call) => call.args[0].input.Filter)
    expect(childOuAttachmentCalls).toEqual([
      PolicyType.SERVICE_CONTROL_POLICY,
      PolicyType.RESOURCE_CONTROL_POLICY,
      PolicyType.S3_POLICY
    ])
  })

  it('deletes stale S3 policies when S3 policies are disabled and write-only mode is off', async () => {
    //Given a stored S3 policy and an organization with S3 policies disabled
    const store = createStore()
    await store.saveOrganizationPolicyMetadata(organizationId, 's3-policies', 'p-stale', 'policy', {
      Version: '2012-10-17',
      Statement: []
    })
    setupOrganizationResponses({ s3PoliciesEnabled: false })
    organizationsMock.on(ListPoliciesForTargetCommand).resolves({ Policies: [] })
    organizationsMock.on(ListPoliciesCommand).resolves({ Policies: [] })

    //When the organization sync runs in normal mode
    await executeOrganizationSync(store)

    //Then stale S3 policy records should be removed and attachment fields should be empty
    await expect(store.listOrganizationPolicies(organizationId, 's3-policies')).resolves.toEqual([])
    const accounts = await store.getOrganizationMetadata<Record<string, any>>(
      organizationId,
      'accounts'
    )
    expect(accounts?.[accountId].s3Policies).toEqual([])
    expect(
      organizationsMock
        .commandCalls(ListPoliciesCommand)
        .some((call) => call.args[0].input.Filter === PolicyType.S3_POLICY)
    ).toBe(false)
  })

  it('keeps stale S3 policies when S3 policies are disabled and write-only mode is on', async () => {
    //Given a stored S3 policy and an organization with S3 policies disabled
    const store = createStore()
    await store.saveOrganizationPolicyMetadata(organizationId, 's3-policies', 'p-stale', 'policy', {
      Version: '2012-10-17',
      Statement: []
    })
    setupOrganizationResponses({ s3PoliciesEnabled: false })
    organizationsMock.on(ListPoliciesForTargetCommand).resolves({ Policies: [] })
    organizationsMock.on(ListPoliciesCommand).resolves({ Policies: [] })

    //When the organization sync runs in write-only mode
    await executeOrganizationSync(store, true)

    //Then stale S3 policy records should remain and disabled S3 policies should not be listed
    await expect(store.listOrganizationPolicies(organizationId, 's3-policies')).resolves.toEqual([
      'p-stale'
    ])
    expect(
      organizationsMock
        .commandCalls(ListPoliciesCommand)
        .some((call) => call.args[0].input.Filter === PolicyType.S3_POLICY)
    ).toBe(false)
  })
})

function setupOrganizationResponses(options: { s3PoliciesEnabled: boolean }): void {
  organizationsMock.on(DescribeOrganizationCommand).resolves({
    Organization: {
      Id: organizationId,
      Arn: `arn:aws:organizations::${accountId}:organization/${organizationId}`,
      MasterAccountArn: `arn:aws:organizations::${accountId}:account/${organizationId}/${accountId}`,
      MasterAccountId: accountId
    }
  })
  organizationsMock.on(ListRootsCommand).resolves({
    Roots: [
      {
        Id: rootId,
        Arn: `arn:aws:organizations::${accountId}:root/${organizationId}/${rootId}`,
        Name: 'Root',
        PolicyTypes: [
          { Type: PolicyType.SERVICE_CONTROL_POLICY, Status: PolicyTypeStatus.ENABLED },
          { Type: PolicyType.RESOURCE_CONTROL_POLICY, Status: PolicyTypeStatus.ENABLED },
          {
            Type: PolicyType.S3_POLICY,
            Status: options.s3PoliciesEnabled ? PolicyTypeStatus.ENABLED : PolicyTypeStatus.DISABLED
          }
        ]
      }
    ]
  })
  organizationsMock.on(ListOrganizationalUnitsForParentCommand, { ParentId: rootId }).resolves({
    OrganizationalUnits: [
      {
        Id: childOuId,
        Arn: `arn:aws:organizations::${accountId}:ou/${organizationId}/${childOuId}`,
        Name: 'Engineering'
      }
    ]
  })
  organizationsMock.on(ListOrganizationalUnitsForParentCommand, { ParentId: childOuId }).resolves({
    OrganizationalUnits: []
  })
  organizationsMock.on(ListAccountsForParentCommand, { ParentId: rootId }).resolves({
    Accounts: [
      {
        Id: accountId,
        Arn: `arn:aws:organizations::${accountId}:account/${organizationId}/${accountId}`
      }
    ]
  })
  organizationsMock.on(ListAccountsForParentCommand, { ParentId: childOuId }).resolves({
    Accounts: []
  })
  organizationsMock.on(ListTagsForResourceCommand).resolves({ Tags: [] })
  organizationsMock.on(ListDelegatedAdministratorsCommand).resolves({ DelegatedAdministrators: [] })
  organizationsMock.on(ListDelegatedServicesForAccountCommand).resolves({ DelegatedServices: [] })
  organizationsMock.on(DescribeResourcePolicyCommand).rejects({
    name: 'ResourcePolicyNotFoundException'
  })
}
