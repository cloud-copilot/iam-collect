import { mkdtempSync, rmSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { SqliteAwsIamStore } from './SqliteAwsIamStore.js'

describe('SqliteAwsIamStore', () => {
  let dbPath: string
  let store: SqliteAwsIamStore

  beforeEach(() => {
    const dir = mkdtempSync(join(tmpdir(), 'iam-collect-'))
    dbPath = join(dir, 'test.db')
    store = new SqliteAwsIamStore(dbPath, 'aws', 'test-version')
  })

  afterEach(() => {
    store.close()
    rmSync(dbPath, { force: true })
  })

  describe('Resource Metadata', () => {
    it('saves and retrieves resource metadata', async () => {
      const arn = 'arn:aws:iam::123456789012:role/Test'
      await store.saveResourceMetadata('123456789012', arn, 'metadata', { a: 1 })
      const result = await store.getResourceMetadata('123456789012', arn, 'metadata')
      expect(result).toEqual({ a: 1 })
    })

    it('saves resource metadata as string', async () => {
      const arn = 'arn:aws:iam::123456789012:role/Test'
      await store.saveResourceMetadata('123456789012', arn, 'policy', '{"Version": "2012-10-17"}')
      const result = await store.getResourceMetadata('123456789012', arn, 'policy')
      expect(result).toEqual({ Version: '2012-10-17' })
    })

    it('returns default value when resource metadata not found', async () => {
      const arn = 'arn:aws:iam::123456789012:role/NotFound'
      const result = await store.getResourceMetadata('123456789012', arn, 'metadata', {
        default: true
      })
      expect(result).toEqual({ default: true })
    })

    it('returns undefined when resource metadata not found and no default', async () => {
      const arn = 'arn:aws:iam::123456789012:role/NotFound'
      const result = await store.getResourceMetadata('123456789012', arn, 'metadata')
      expect(result).toBeUndefined()
    })

    it('deletes empty content when saving', async () => {
      const arn = 'arn:aws:iam::123456789012:role/Test'
      await store.saveResourceMetadata('123456789012', arn, 'metadata', { a: 1 })
      await store.saveResourceMetadata('123456789012', arn, 'metadata', {})
      const result = await store.getResourceMetadata('123456789012', arn, 'metadata')
      expect(result).toBeUndefined()
    })

    it('deletes empty array content when saving', async () => {
      const arn = 'arn:aws:iam::123456789012:role/Test'
      await store.saveResourceMetadata('123456789012', arn, 'metadata', { a: 1 })
      await store.saveResourceMetadata('123456789012', arn, 'metadata', [])
      const result = await store.getResourceMetadata('123456789012', arn, 'metadata')
      expect(result).toBeUndefined()
    })

    it('normalizes case for account ID, ARN, and metadata type', async () => {
      const arn = 'arn:aws:iam::123456789012:role/Test'
      await store.saveResourceMetadata('123456789012', arn.toUpperCase(), 'METADATA', { a: 1 })
      const result = await store.getResourceMetadata('123456789012', arn.toLowerCase(), 'metadata')
      expect(result).toEqual({ a: 1 })
    })

    it('lists resource metadata types for a resource', async () => {
      const arn = 'arn:aws:iam::123456789012:role/Test'
      await store.saveResourceMetadata('123456789012', arn, 'metadata', { a: 1 })
      await store.saveResourceMetadata('123456789012', arn, 'policy', { b: 2 })
      await store.saveResourceMetadata('123456789012', arn, 'tags', { c: 3 })

      const result = await store.listResourceMetadata('123456789012', arn)
      expect(result.sort()).toEqual(['metadata', 'policy', 'tags'])
    })

    it('deletes specific resource metadata', async () => {
      const arn = 'arn:aws:iam::123456789012:role/Test'
      await store.saveResourceMetadata('123456789012', arn, 'metadata', { a: 1 })
      await store.saveResourceMetadata('123456789012', arn, 'policy', { b: 2 })

      await store.deleteResourceMetadata('123456789012', arn, 'metadata')

      const metadata = await store.getResourceMetadata('123456789012', arn, 'metadata')
      const policy = await store.getResourceMetadata('123456789012', arn, 'policy')

      expect(metadata).toBeUndefined()
      expect(policy).toEqual({ b: 2 })
    })

    it('deletes entire resource', async () => {
      const arn = 'arn:aws:iam::123456789012:role/Test'
      await store.saveResourceMetadata('123456789012', arn, 'metadata', { a: 1 })
      await store.saveResourceMetadata('123456789012', arn, 'policy', { b: 2 })

      await store.deleteResource('123456789012', arn)

      const metadata = await store.getResourceMetadata('123456789012', arn, 'metadata')
      const policy = await store.getResourceMetadata('123456789012', arn, 'policy')

      expect(metadata).toBeUndefined()
      expect(policy).toBeUndefined()
    })
  })

  describe('managed policies', () => {
    it('should sync data for AWS and customer managed policies', async () => {
      const arn = 'arn:aws:iam::123456789012:policy/TestPolicy'
      await store.saveResourceMetadata('123456789012', arn, 'metadata', { a: 1 })
      await store.saveResourceMetadata('123456789012', arn, 'policy', { b: 2 })

      const arn2 = 'arn:aws:iam::123456789012:policy/TestPolicy2'
      await store.saveResourceMetadata('123456789012', arn2, 'metadata', { a: 1 })
      await store.saveResourceMetadata('123456789012', arn2, 'policy', { b: 2 })

      const managedArn1 = 'arn:aws:iam::aws:policy/AdministratorAccess'
      await store.saveResourceMetadata('123456789012', managedArn1, 'metadata', { a: 1 })
      await store.saveResourceMetadata('123456789012', managedArn1, 'policy', { b: 2 })

      const managedArn2 = 'arn:aws:iam::aws:policy/ReadOnlyAccess'
      await store.saveResourceMetadata('123456789012', managedArn2, 'metadata', { a: 1 })
      await store.saveResourceMetadata('123456789012', managedArn2, 'policy', { b: 2 })

      const managedArn3 = 'arn:aws:iam::aws:policy/SecurityAudit'

      await store.syncResourceList(
        '123456789012',
        {
          service: 'iam',
          resourceType: 'policy',
          account: 'aws'
        },
        [managedArn1, managedArn3]
      )

      const customerPolicies = await store.listResources('123456789012', {
        service: 'iam',
        resourceType: 'policy',
        account: '123456789012'
      })

      expect(customerPolicies.sort()).toEqual([arn, arn2].map((arn) => arn.toLowerCase()))

      const awsPolicies = await store.listResources('123456789012', {
        service: 'iam',
        resourceType: 'policy',
        account: 'aws'
      })

      expect(awsPolicies.sort()).toEqual([managedArn1].map((arn) => arn.toLowerCase()))
    })
  })

  describe('buckets', () => {
    it('should list buckets without returning access points', async () => {
      //Given buckets are saved along with access points
      await store.saveResourceMetadata('123456789012', 'arn:aws:s3:::test-bucket', 'metadata', {
        name: 'test-bucket'
      })

      //save another bucket to ensure only buckets are returned
      await store.saveResourceMetadata('123456789012', 'arn:aws:s3:::test-bucket-2', 'metadata', {
        name: 'test-bucket-2'
      })

      //save an S3 access point in the same account
      await store.saveResourceMetadata(
        '123456789012',
        'arn:aws:s3:us-east-1:123456789012:accesspoint:test-access-point',
        'metadata',
        {
          name: 'test-access-point'
        }
      )

      //When buckets are listed
      const buckets = await store.listResources('123456789012', {
        service: 's3'
      })

      //Then the results should only include buckets
      expect(buckets.sort()).toEqual(['arn:aws:s3:::test-bucket', 'arn:aws:s3:::test-bucket-2'])

      //When access points are listed
      const accessPoints = await store.listResources('123456789012', {
        service: 's3',
        resourceType: 'accesspoint',
        region: 'us-east-1',
        account: '123456789012'
      })

      //Then the results should only include access points
      expect(accessPoints.sort()).toEqual([
        'arn:aws:s3:us-east-1:123456789012:accesspoint:test-access-point'
      ])
    })
  })

  describe('Resource Listing and Finding', () => {
    beforeEach(async () => {
      // Set up test data
      await store.saveResourceMetadata(
        '123456789012',
        'arn:aws:iam::123456789012:role/TestRole1',
        'metadata',
        { name: 'TestRole1', type: 'service' }
      )
      await store.saveResourceMetadata(
        '123456789012',
        'arn:aws:iam::123456789012:role/TestRole2',
        'metadata',
        { name: 'TestRole2', type: 'user' }
      )
      await store.saveResourceMetadata(
        '123456789012',
        'arn:aws:iam::123456789012:user/TestUser1',
        'metadata',
        { name: 'TestUser1' }
      )
      await store.saveResourceMetadata('123456789012', 'arn:aws:s3:::test-bucket', 'metadata', {
        name: 'test-bucket'
      })
      await store.saveResourceMetadata(
        '123456789012',
        'arn:aws:lambda:us-east-1:123456789012:function:test',
        'metadata',
        { name: 'test' }
      )
    })

    it('lists resources for a service and resource type', async () => {
      const result = await store.listResources('123456789012', {
        service: 'iam',
        account: '123456789012',
        resourceType: 'role'
      })
      expect(result.sort()).toEqual([
        'arn:aws:iam::123456789012:role/testrole1',
        'arn:aws:iam::123456789012:role/testrole2'
      ])
    })

    it('lists resources for a service and resource type', async () => {
      const result = await store.listResources('123456789012', {
        service: 'iam',
        resourceType: 'role',
        account: '123456789012'
      })
      expect(result.sort()).toEqual([
        'arn:aws:iam::123456789012:role/testrole1',
        'arn:aws:iam::123456789012:role/testrole2'
      ])
    })

    it('lists resources for a service and region', async () => {
      const result = await store.listResources('123456789012', {
        service: 'lambda',
        region: 'us-east-1',
        account: '123456789012',
        resourceType: 'function'
      })
      expect(result).toEqual(['arn:aws:lambda:us-east-1:123456789012:function:test'])
    })

    it('finds resource metadata for a service', async () => {
      const result = await store.findResourceMetadata<{ name: string; type?: string }>(
        '123456789012',
        {
          service: 'iam'
        }
      )
      expect(result).toHaveLength(3)
      expect(result.map((r) => r.name).sort()).toEqual(['TestRole1', 'TestRole2', 'TestUser1'])
    })

    it('finds resource metadata with JSON filtering', async () => {
      const result = await store.findResourceMetadata<{ name: string; type: string }>(
        '123456789012',
        {
          service: 'iam',
          resourceType: 'role',
          metadata: { type: 'service' }
        }
      )
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('TestRole1')
    })

    it('finds resource metadata with multiple JSON filters', async () => {
      const result = await store.findResourceMetadata<{ name: string; type: string }>(
        '123456789012',
        {
          service: 'iam',
          resourceType: 'role',
          metadata: { type: 'user', name: 'TestRole2' }
        }
      )
      expect(result).toHaveLength(1)
      expect(result[0].name).toBe('TestRole2')
    })

    it('returns empty array when no resources match JSON filter', async () => {
      const result = await store.findResourceMetadata<{ name: string; type: string }>(
        '123456789012',
        {
          service: 'iam',
          metadata: { type: 'nonexistent' }
        }
      )
      expect(result).toEqual([])
    })
  })

  describe('Resource Sync', () => {
    beforeEach(async () => {
      await store.saveResourceMetadata(
        '123456789012',
        'arn:aws:iam::123456789012:role/Role1',
        'metadata',
        { name: 'Role1', bucket: 'true' }
      )
      await store.saveResourceMetadata(
        '123456789012',
        'arn:aws:iam::123456789012:role/Role2',
        'metadata',
        { name: 'Role2', bucket: 'true' }
      )
      await store.saveResourceMetadata(
        '123456789012',
        'arn:aws:iam::123456789012:role/Role3',
        'metadata',
        { name: 'Role3', bucket: 'false' }
      )
    })

    it('syncs resource list and removes unlisted resources', async () => {
      await store.syncResourceList(
        '123456789012',
        {
          service: 'iam',
          resourceType: 'role'
        },
        ['arn:aws:iam::123456789012:role/Role1']
      )

      const remaining = await store.listResources('123456789012', {
        service: 'iam',
        resourceType: 'role',
        account: '123456789012'
      })
      expect(remaining).toEqual(['arn:aws:iam::123456789012:role/role1'])
    })

    it('syncs resource list with metadata filter', async () => {
      await store.syncResourceList(
        '123456789012',
        {
          service: 'iam',
          resourceType: 'role',
          metadata: { bucket: 'true' }
        },
        ['arn:aws:iam::123456789012:role/Role1']
      )

      const all = await store.listResources('123456789012', {
        service: 'iam',
        resourceType: 'role',
        account: '123456789012'
      })
      expect(all.sort()).toEqual([
        'arn:aws:iam::123456789012:role/role1',
        'arn:aws:iam::123456789012:role/role3'
      ])
    })
  })

  describe('Account Metadata', () => {
    it('saves and retrieves account metadata', async () => {
      await store.saveAccountMetadata('123456789012', 'info', { name: 'test' })
      const result = await store.getAccountMetadata('123456789012', 'info')
      expect(result).toEqual({ name: 'test' })
    })

    it('returns default value when account metadata not found', async () => {
      const result = await store.getAccountMetadata('123456789012', 'nonexistent', {
        default: true
      })
      expect(result).toEqual({ default: true })
    })

    it('deletes account metadata', async () => {
      await store.saveAccountMetadata('123456789012', 'info', { name: 'test' })
      await store.deleteAccountMetadata('123456789012', 'info')
      const result = await store.getAccountMetadata('123456789012', 'info')
      expect(result).toBeUndefined()
    })

    it('deletes empty content when saving account metadata', async () => {
      await store.saveAccountMetadata('123456789012', 'info', { name: 'test' })
      await store.saveAccountMetadata('123456789012', 'info', null)
      const result = await store.getAccountMetadata('123456789012', 'info')
      expect(result).toBeUndefined()
    })

    it('lists account IDs', async () => {
      await store.saveResourceMetadata(
        '123456789012',
        'arn:aws:iam::123456789012:role/test',
        'metadata',
        {
          name: 'test1'
        }
      )
      await store.saveResourceMetadata(
        '111111111111',
        'arn:aws:iam::111111111111:role/test',
        'metadata',
        {
          name: 'test2'
        }
      )
      await store.saveResourceMetadata(
        '987654321098',
        'arn:aws:iam::987654321098:role/test',
        'metadata',
        {
          name: 'test3'
        }
      )

      const result = await store.listAccountIds()
      expect(result.sort()).toEqual(['111111111111', '123456789012', '987654321098'])
    })
  })

  describe('Organization Metadata', () => {
    it('saves and retrieves organization metadata', async () => {
      await store.saveOrganizationMetadata('o-1234567890', 'info', { name: 'MyOrg' })
      const result = await store.getOrganizationMetadata('o-1234567890', 'info')
      expect(result).toEqual({ name: 'MyOrg' })
    })

    it('returns default value when organization metadata not found', async () => {
      const result = await store.getOrganizationMetadata('o-nonexistent', 'info', { default: true })
      expect(result).toEqual({ default: true })
    })

    it('deletes organization metadata', async () => {
      await store.saveOrganizationMetadata('o-1234567890', 'info', { name: 'MyOrg' })
      await store.deleteOrganizationMetadata('o-1234567890', 'info')
      const result = await store.getOrganizationMetadata('o-1234567890', 'info')
      expect(result).toBeUndefined()
    })

    it('normalizes case for organization metadata', async () => {
      await store.saveOrganizationMetadata('O-1234567890', 'INFO', { name: 'MyOrg' })
      const result = await store.getOrganizationMetadata('o-1234567890', 'info')
      expect(result).toEqual({ name: 'MyOrg' })
    })
  })

  describe('Organizational Unit Metadata', () => {
    it('saves and retrieves OU metadata', async () => {
      await store.saveOrganizationalUnitMetadata('o-1234567890', 'ou-123', 'metadata', {
        name: 'TestOU'
      })
      const result = await store.getOrganizationalUnitMetadata('o-1234567890', 'ou-123', 'metadata')
      expect(result).toEqual({ name: 'TestOU' })
    })

    it('returns default value when OU metadata not found', async () => {
      const result = await store.getOrganizationalUnitMetadata(
        'o-1234567890',
        'ou-nonexistent',
        'metadata',
        { default: true }
      )
      expect(result).toEqual({ default: true })
    })

    it('deletes OU metadata', async () => {
      await store.saveOrganizationalUnitMetadata('o-1234567890', 'ou-123', 'metadata', {
        name: 'TestOU'
      })
      await store.deleteOrganizationalUnitMetadata('o-1234567890', 'ou-123', 'metadata')
      const result = await store.getOrganizationalUnitMetadata('o-1234567890', 'ou-123', 'metadata')
      expect(result).toBeUndefined()
    })

    it('deletes entire OU', async () => {
      await store.saveOrganizationalUnitMetadata('o-1234567890', 'ou-123', 'metadata', {
        name: 'TestOU'
      })
      await store.saveOrganizationalUnitMetadata('o-1234567890', 'ou-123', 'tags', { env: 'prod' })

      await store.deleteOrganizationalUnit('o-1234567890', 'ou-123')

      const metadata = await store.getOrganizationalUnitMetadata(
        'o-1234567890',
        'ou-123',
        'metadata'
      )
      const tags = await store.getOrganizationalUnitMetadata('o-1234567890', 'ou-123', 'tags')

      expect(metadata).toBeUndefined()
      expect(tags).toBeUndefined()
    })

    it('lists organizational units', async () => {
      await store.saveOrganizationalUnitMetadata('o-1234567890', 'ou-123', 'metadata', {
        name: 'OU1'
      })
      await store.saveOrganizationalUnitMetadata('o-1234567890', 'ou-456', 'metadata', {
        name: 'OU2'
      })
      await store.saveOrganizationalUnitMetadata('o-1234567890', 'ou-123', 'tags', { env: 'prod' })

      const result = await store.listOrganizationalUnits('o-1234567890')
      expect(result.sort()).toEqual(['ou-123', 'ou-456'])
    })
  })

  describe('Organization Policy Metadata', () => {
    it('saves and retrieves organization policy metadata', async () => {
      await store.saveOrganizationPolicyMetadata('o-1234567890', 'scps', 'p-123', 'metadata', {
        name: 'TestPolicy'
      })
      const result = await store.getOrganizationPolicyMetadata(
        'o-1234567890',
        'scps',
        'p-123',
        'metadata'
      )
      expect(result).toEqual({ name: 'TestPolicy' })
    })

    it('returns default value when policy metadata not found', async () => {
      const result = await store.getOrganizationPolicyMetadata(
        'o-1234567890',
        'scps',
        'p-nonexistent',
        'metadata',
        { default: true }
      )
      expect(result).toEqual({ default: true })
    })

    it('deletes organization policy metadata', async () => {
      await store.saveOrganizationPolicyMetadata('o-1234567890', 'scps', 'p-123', 'metadata', {
        name: 'TestPolicy'
      })
      await store.deleteOrganizationPolicyMetadata('o-1234567890', 'scps', 'p-123', 'metadata')
      const result = await store.getOrganizationPolicyMetadata(
        'o-1234567890',
        'scps',
        'p-123',
        'metadata'
      )
      expect(result).toBeUndefined()
    })

    it('deletes entire organization policy', async () => {
      await store.saveOrganizationPolicyMetadata('o-1234567890', 'scps', 'p-123', 'metadata', {
        name: 'TestPolicy'
      })
      await store.saveOrganizationPolicyMetadata('o-1234567890', 'scps', 'p-123', 'content', {
        policy: 'document'
      })

      await store.deleteOrganizationPolicy('o-1234567890', 'scps', 'p-123')

      const metadata = await store.getOrganizationPolicyMetadata(
        'o-1234567890',
        'scps',
        'p-123',
        'metadata'
      )
      const content = await store.getOrganizationPolicyMetadata(
        'o-1234567890',
        'scps',
        'p-123',
        'content'
      )

      expect(metadata).toBeUndefined()
      expect(content).toBeUndefined()
    })

    it('lists organization policies', async () => {
      await store.saveOrganizationPolicyMetadata('o-1234567890', 'scps', 'p-123', 'metadata', {
        name: 'Policy1'
      })
      await store.saveOrganizationPolicyMetadata('o-1234567890', 'scps', 'p-456', 'metadata', {
        name: 'Policy2'
      })
      await store.saveOrganizationPolicyMetadata('o-1234567890', 'rcps', 'p-789', 'metadata', {
        name: 'Policy3'
      })

      const scps = await store.listOrganizationPolicies('o-1234567890', 'scps')
      const rcps = await store.listOrganizationPolicies('o-1234567890', 'rcps')

      expect(scps.sort()).toEqual(['p-123', 'p-456'])
      expect(rcps).toEqual(['p-789'])
    })

    it('normalizes case for organization policy operations', async () => {
      await store.saveOrganizationPolicyMetadata(
        'O-1234567890',
        'scps' as any,
        'P-123',
        'METADATA',
        { name: 'TestPolicy' }
      )
      const result = await store.getOrganizationPolicyMetadata(
        'o-1234567890',
        'scps',
        'p-123',
        'metadata'
      )
      expect(result).toEqual({ name: 'TestPolicy' })
    })
  })

  describe('RAM Resources', () => {
    it('saves and retrieves RAM resource', async () => {
      const arn = 'arn:aws:ec2:us-east-1:123456789012:vpc/vpc-123'
      const data = { arn, shares: ['share-123'], policy: { Version: '2012-10-17' } }

      await store.saveRamResource('123456789012', arn, data)
      const result = await store.getRamResource('123456789012', arn)

      expect(result).toEqual(data)
    })

    it('saves RAM resource for global region when no region in ARN', async () => {
      const arn = 'arn:aws:organizations::123456789012:account/o-123456789/111111111111'
      const data = { arn, shares: [] }

      await store.saveRamResource('123456789012', arn, data)
      const result = await store.getRamResource('123456789012', arn)

      expect(result).toEqual(data)
    })

    it('returns default value when RAM resource not found', async () => {
      const arn = 'arn:aws:ec2:us-east-1:123456789012:vpc/vpc-nonexistent'
      const result = await store.getRamResource('123456789012', arn, { default: true })
      expect(result).toEqual({ default: true })
    })

    it('syncs RAM resources and removes unlisted ones', async () => {
      const arn1 = 'arn:aws:ec2:us-east-1:123456789012:vpc/vpc-123'
      const arn2 = 'arn:aws:ec2:us-east-1:123456789012:vpc/vpc-456'
      const arn3 = 'arn:aws:ec2:us-east-1:123456789012:vpc/vpc-789'

      await store.saveRamResource('123456789012', arn1, { arn: arn1 })
      await store.saveRamResource('123456789012', arn2, { arn: arn2 })
      await store.saveRamResource('123456789012', arn3, { arn: arn3 })

      await store.syncRamResources('123456789012', 'us-east-1', [arn1, arn3])

      const result1 = await store.getRamResource('123456789012', arn1)
      const result2 = await store.getRamResource('123456789012', arn2)
      const result3 = await store.getRamResource('123456789012', arn3)

      expect(result1).toBeDefined()
      expect(result2).toBeUndefined()
      expect(result3).toBeDefined()
    })

    it('syncs RAM resources in global region', async () => {
      const arn1 = 'arn:aws:organizations::123456789012:account/o-123456789/111111111111'
      const arn2 = 'arn:aws:organizations::123456789012:account/o-123456789/222222222222'

      await store.saveRamResource('123456789012', arn1, { arn: arn1 })
      await store.saveRamResource('123456789012', arn2, { arn: arn2 })

      await store.syncRamResources('123456789012', '', [arn1])

      const result1 = await store.getRamResource('123456789012', arn1)
      const result2 = await store.getRamResource('123456789012', arn2)

      expect(result1).toBeDefined()
      expect(result2).toBeUndefined()
    })
  })

  describe('Indexes', () => {
    it('supports indexes with optimistic locking', async () => {
      const first = await store.getIndex('sample', {})
      const saved = await store.saveIndex('sample', { a: 1 }, first.lockId)
      expect(saved).toBe(true)
      const second = await store.getIndex('sample', {})
      const fail = await store.saveIndex('sample', { a: 2 }, first.lockId)
      expect(fail).toBe(false)
      expect(second.data).toEqual({ a: 1 })
    })

    it('returns default value for non-existent index', async () => {
      const result = await store.getIndex('nonexistent', { default: 'value' })
      expect(result.data).toEqual({ default: 'value' })
      expect(result.lockId).toBe('')
    })

    it('fails to save with wrong lock ID', async () => {
      await store.saveIndex('test', { initial: true }, '')
      const saved = await store.saveIndex('test', { updated: true }, 'wrong-lock-id')
      expect(saved).toBe(false)
    })

    it('fails to save existing index with empty lock ID', async () => {
      await store.saveIndex('test', { initial: true }, '')
      const updated = await store.saveIndex('test', { updated: true }, '')
      expect(updated).toBe(false)
    })

    it('normalizes case for index names', async () => {
      await store.saveIndex('TEST-INDEX', { a: 1 }, '')
      const result = await store.getIndex('test-index', {})
      expect(result.data).toEqual({ a: 1 })
    })

    it('generates different lock IDs for different content', async () => {
      const first = await store.getIndex('test', {})
      await store.saveIndex('test', { a: 1 }, first.lockId)
      const second = await store.getIndex('test', {})

      await store.saveIndex('test', { a: 2 }, second.lockId)
      const third = await store.getIndex('test', {})

      expect(second.lockId).not.toBe(third.lockId)
      expect(third.data).toEqual({ a: 2 })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('handles special characters in string values', async () => {
      const arn = 'arn:aws:iam::123456789012:role/Test'
      const data = { message: "It's a test with 'quotes' and \"double quotes\"" }

      await store.saveResourceMetadata('123456789012', arn, 'metadata', data)
      const result = await store.getResourceMetadata('123456789012', arn, 'metadata')

      expect(result).toEqual(data)
    })

    it('handles empty string values', async () => {
      const arn = 'arn:aws:iam::123456789012:role/Test'
      await store.saveResourceMetadata('123456789012', arn, 'metadata', { name: '' })
      const result = await store.getResourceMetadata('123456789012', arn, 'metadata')
      expect(result).toEqual({ name: '' })
    })

    it('handles null and undefined values', async () => {
      const arn = 'arn:aws:iam::123456789012:role/Test'
      await store.saveResourceMetadata('123456789012', arn, 'metadata', null)
      const result = await store.getResourceMetadata('123456789012', arn, 'metadata')
      expect(result).toBeUndefined()
    })

    it('handles very large JSON objects', async () => {
      //Given a large JSON object
      const arn = 'arn:aws:iam::123456789012:role/Test'
      const largeObject = {
        data: Array(1000)
          .fill(0)
          .map((_, i) => ({ id: i, value: `item-${i}` }))
      }

      //When saving and retrieving the large object
      await store.saveResourceMetadata('123456789012', arn, 'metadata', largeObject)
      const result = await store.getResourceMetadata('123456789012', arn, 'metadata')

      //Then the retrieved object should match the original
      const comparator = (a: any, b: any) => a.id - b.id

      largeObject.data.sort(comparator)
      ;(result as typeof largeObject).data.sort(comparator)

      expect(result).toEqual(largeObject)
    })

    it('properly handles case normalization across all operations', async () => {
      const operations = [
        () =>
          store.saveResourceMetadata(
            'ACCOUNT123',
            'ARN:AWS:IAM::ACCOUNT123:ROLE/TEST',
            'METADATA',
            { test: true }
          ),
        () =>
          store.getResourceMetadata('account123', 'arn:aws:iam::account123:role/test', 'metadata'),
        () => store.saveAccountMetadata('ACCOUNT123', 'INFO', { name: 'test' }),
        () => store.getAccountMetadata('account123', 'info')
      ]

      await operations[0]()
      const resourceResult = await operations[1]()
      await operations[2]()
      const accountResult = await operations[3]()

      expect(resourceResult).toEqual({ test: true })
      expect(accountResult).toEqual({ name: 'test' })
    })
  })
})
