import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FileSystemAdapter } from './FileSystemAdapter.js'

vi.mock('./FileSystemAdapter')

import { FileSystemAwsIamStore } from './FileSystemAwsIamStore.js'

describe('FileSystemAwsIamStore', () => {
  let store: FileSystemAwsIamStore
  let mockFsAdapter: FileSystemAdapter

  beforeEach(() => {
    mockFsAdapter = new FileSystemAdapter() as unknown as FileSystemAdapter
    store = new FileSystemAwsIamStore('/base/folder', 'aws', mockFsAdapter)
  })

  describe('saveResourceMetadata', () => {
    it('should save resource metadata', async () => {
      // Given a specific ARN and metadata type
      const data = JSON.stringify({ Version: '2012-10-17', Statement: [] })
      const writeFileSpy = vi.spyOn(mockFsAdapter, 'writeFile').mockResolvedValue()

      // When metadata is saved
      await store.saveResourceMetadata(
        '123456789012',
        'arn:aws:iam::123456789012:role/Test-Role',
        'trust-policy',
        data
      )

      // Then the correct file path should be used
      expect(writeFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/iam/role/test-role/trust-policy.json'.toLowerCase(),
        data
      )
    })

    it('should save aws managed policies metadata', async () => {
      // Given a specific ARN and metadata type
      const data = JSON.stringify({ Version: '2012-10-17', Statement: [] })
      const writeFileSpy = vi.spyOn(mockFsAdapter, 'writeFile').mockResolvedValue()

      // When metadata is saved
      await store.saveResourceMetadata(
        '123456789012',
        'arn:aws:iam::aws:policy/AWSLambdaBasicExecutionRole',
        'policy',
        data
      )

      // Then the correct file path should be used
      expect(writeFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/iam/aws/policy/AWSLambdaBasicExecutionRole/policy.json'.toLowerCase(),
        data
      )
    })

    it('should save s3 bucket metadata', async () => {
      // Given a specific ARN and metadata type
      const data = JSON.stringify({ Version: '2012-10-17', Statement: [] })
      const writeFileSpy = vi.spyOn(mockFsAdapter, 'writeFile').mockResolvedValue()

      // When metadata is saved
      await store.saveResourceMetadata(
        '123456789012',
        'arn:aws:s3:::my-bucket',
        'bucket-policy',
        data
      )

      // Then the correct file path should be used
      expect(writeFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/s3/my-bucket/bucket-policy.json'.toLowerCase(),
        data
      )
    })

    it('should delete the metadata file if data is empty', async () => {
      for (const emptyValue of ['', '   ', '{}', '[]', undefined, null, {}, []]) {
        // Given a specific ARN and metadata type
        const deleteFileSpy = vi.spyOn(mockFsAdapter, 'deleteFile').mockResolvedValue()

        // When metadata is saved with empty data
        await store.saveResourceMetadata(
          '123456789012',
          'arn:aws:iam::123456789012:role/test-role',
          'trust-policy',
          emptyValue
        )

        // Then the correct file path should be used
        expect(deleteFileSpy, `empty value: "${emptyValue}"`).toHaveBeenCalledWith(
          '/base/folder/aws/aws/accounts/123456789012/iam/role/test-role/trust-policy.json'
        )
      }
    })
  })

  describe('listResourceMetadata', () => {
    it('should list resource metadata types', async () => {
      // Given a specific ARN
      const expectedMetadataTypes = ['trust-policy', 'inline-policies']
      const listDirectorySpy = vi
        .spyOn(mockFsAdapter, 'listDirectory')
        .mockResolvedValue(expectedMetadataTypes.map((type) => `${type}.json`))

      // When metadata types are listed
      const result = await store.listResourceMetadata(
        '123456789012',
        'arn:aws:iam::123456789012:role/test-role'
      )

      // Then the correct file path should be used and the result should match
      expect(listDirectorySpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/iam/role/test-role'
      )
      expect(result).toEqual(expectedMetadataTypes)
    })

    it('should list s3 bucket metadata types', async () => {
      // Given a specific ARN
      const expectedMetadataTypes = ['bucket-policy']
      const listDirectorySpy = vi
        .spyOn(mockFsAdapter, 'listDirectory')
        .mockResolvedValue(expectedMetadataTypes.map((type) => `${type}.json`))

      // When metadata types are listed
      const result = await store.listResourceMetadata('123456789012', 'arn:aws:s3:::my-bucket')

      // Then the correct file path should be used and the result should match
      expect(listDirectorySpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/s3/my-bucket'
      )
      expect(result).toEqual(expectedMetadataTypes)
    })
  })

  describe('getResourceMetadata', () => {
    it('should get resource metadata', async () => {
      // Given a specific ARN and metadata type
      const expectedData = { Version: '2012-10-17', Statement: [] }
      const readFileSpy = vi
        .spyOn(mockFsAdapter, 'readFile')
        .mockResolvedValue(JSON.stringify(expectedData))

      // When metadata is retrieved
      const result = await store.getResourceMetadata(
        '123456789012',
        'arn:aws:iam::123456789012:role/test-role',
        'trust-policy'
      )

      // Then the correct file path should be used and the data should match
      expect(readFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/iam/role/test-role/trust-policy.json'
      )
      expect(result).toEqual(expectedData)
    })

    it('should get resource metadata for a managed policy', async () => {
      // Given a specific ARN and metadata type
      const expectedData = { Version: '2012-10-17', Statement: [] }
      const readFileSpy = vi
        .spyOn(mockFsAdapter, 'readFile')
        .mockResolvedValue(JSON.stringify(expectedData))

      // When metadata is retrieved
      const result = await store.getResourceMetadata(
        '123456789012',
        'arn:aws:iam::aws:policy/AdministratorAccess',
        'policy'
      )

      // Then the correct file path should be used and the data should match
      expect(readFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/iam/aws/policy/administratoraccess/policy.json'
      )
      expect(result).toEqual(expectedData)
    })

    it('should get s3 bucket metadata', async () => {
      // Given a specific ARN and metadata type
      const expectedData = { Version: '2012-10-17', Statement: [] }
      const readFileSpy = vi
        .spyOn(mockFsAdapter, 'readFile')
        .mockResolvedValue(JSON.stringify(expectedData))

      // When metadata is retrieved
      const result = await store.getResourceMetadata(
        '123456789012',
        'arn:aws:s3:::my-bucket',
        'bucket-policy'
      )

      // Then the correct file path should be used and the data should match
      expect(readFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/s3/my-bucket/bucket-policy.json'
      )
      expect(result).toEqual(expectedData)
    })

    it('should return undefined for non-existent metadata when there is no default', async () => {
      // Given a specific ARN and metadata type
      const readFileSpy = vi.spyOn(mockFsAdapter, 'readFile').mockResolvedValue(undefined)

      // When metadata is retrieved without a default value
      const result = await store.getResourceMetadata(
        '123456789012',
        'arn:aws:iam::123456789012:role/test-role',
        'trust-policy'
      )

      // Then the correct file path should be used and the result should be undefined
      expect(readFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/iam/role/test-role/trust-policy.json'
      )
      expect(result).toBeUndefined()
    })

    it('should return the default value for non-existent metadata', async () => {
      // Given a specific ARN and metadata type
      const defaultValue = {}
      const readFileSpy = vi.spyOn(mockFsAdapter, 'readFile').mockResolvedValue(undefined)

      // When metadata is retrieved with a default value
      const result = await store.getResourceMetadata(
        '123456789012',
        'arn:aws:iam::123456789012:role/test-role',
        'trust-policy',
        defaultValue
      )

      // Then the correct file path should be used and the result should match the default value
      expect(readFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/iam/role/test-role/trust-policy.json'
      )
      expect(result).toEqual(defaultValue)
    })
  })

  describe('deleteResourceMetadata', () => {
    it('should delete resource metadata', async () => {
      // Given a specific ARN and metadata type
      const deleteFileSpy = vi.spyOn(mockFsAdapter, 'deleteFile').mockResolvedValue()

      // When metadata is deleted
      await store.deleteResourceMetadata(
        '123456789012',
        'arn:aws:iam::123456789012:role/test-role',
        'trust-policy'
      )

      // Then the correct file path should be used
      expect(deleteFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/iam/role/test-role/trust-policy.json'
      )
    })

    it('should delete s3 bucket metadata', async () => {
      // Given a specific ARN and metadata type
      const deleteFileSpy = vi.spyOn(mockFsAdapter, 'deleteFile').mockResolvedValue()

      // When metadata is deleted
      await store.deleteResourceMetadata('123456789012', 'arn:aws:s3:::my-bucket', 'bucket-policy')

      // Then the correct file path should be used
      expect(deleteFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/s3/my-bucket/bucket-policy.json'
      )
    })
  })

  describe('deleteResource', () => {
    it('should delete a resource', async () => {
      // Given a specific ARN
      const deleteDirectorySpy = vi.spyOn(mockFsAdapter, 'deleteDirectory').mockResolvedValue()

      // When the resource is deleted
      await store.deleteResource('123456789012', 'arn:aws:iam::123456789012:role/test-role')

      // Then the correct directory path should be used
      expect(deleteDirectorySpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/iam/role/test-role'
      )
    })

    it('should delete s3 bucket resource', async () => {
      // Given a specific ARN
      const deleteDirectorySpy = vi.spyOn(mockFsAdapter, 'deleteDirectory').mockResolvedValue()

      // When the resource is deleted
      await store.deleteResource('123456789012', 'arn:aws:s3:::my-bucket')

      // Then the correct directory path should be used
      expect(deleteDirectorySpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/s3/my-bucket'
      )
    })
  })

  describe('listResources', () => {
    it('should list resources for IAM roles', async () => {
      // Given a specific account ID and options
      const expectedResources = ['test-role-1', 'test-role-2']
      const listDirectoriesSpy = vi
        .spyOn(mockFsAdapter, 'listDirectory')
        .mockResolvedValue(expectedResources)

      // When listing resources
      const result = await store.listResources('123456789012', {
        service: 'iam',
        resourceType: 'role'
      })

      // Then the correct directory path should be used and the result should match
      expect(listDirectoriesSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/iam/role'
      )
      expect(result).toEqual(expectedResources)
    })

    it('should list resources for S3 buckets', async () => {
      // Given a specific account ID and options
      const expectedResources = ['my-bucket']
      const listDirectoriesSpy = vi
        .spyOn(mockFsAdapter, 'listDirectory')
        .mockResolvedValue(expectedResources)

      // When listing resources
      const result = await store.listResources('123456789012', {
        service: 's3'
      })

      // Then the correct directory path should be used and the result should match
      expect(listDirectoriesSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/s3'
      )
      expect(result).toEqual(expectedResources)
    })

    it('should list return a regional resource', async () => {
      // Given a specific account ID and options
      const expectedResources = ['key-1', 'key-2']
      const listDirectoriesSpy = vi
        .spyOn(mockFsAdapter, 'listDirectory')
        .mockResolvedValue(expectedResources)

      // When listing resources
      const result = await store.listResources('123456789012', {
        service: 'kms',
        region: 'us-east-1',
        account: '123456789012',
        resourceType: 'key'
      })

      // Then the correct directory path should be used and the result should match
      expect(listDirectoriesSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/kms/us-east-1/key'
      )
      expect(result).toEqual(expectedResources)
    })
  })

  describe('syncResourceList', () => {
    it('should sync resource list for a given service', async () => {
      // Given a specific account ID and service
      const listSpy = vi.spyOn(mockFsAdapter, 'listDirectory').mockResolvedValue([
        // Mocking the directories that exist in the filesystem for the given service
        'my-bucket',
        'my-other-bucket'
      ])

      const deleteSpy = vi.spyOn(mockFsAdapter, 'deleteDirectory').mockResolvedValue()

      // When syncing the resource list
      await store.syncResourceList('123456789012', { service: 's3' }, ['arn:aws:s3:::my-bucket'])

      // Then the correct directory path should be used
      expect(listSpy).toHaveBeenCalledWith('/base/folder/aws/aws/accounts/123456789012/s3')
      expect(deleteSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/s3/my-other-bucket'
      )
    })

    it('should remove account id from the arn when syncing resources', async () => {
      // Given a specific account ID and service
      const listSpy = vi.spyOn(mockFsAdapter, 'listDirectory').mockResolvedValue([
        // Mocking the directories that exist in the filesystem for the given service
        'admin',
        'readonly'
      ])

      const deleteSpy = vi.spyOn(mockFsAdapter, 'deleteDirectory').mockResolvedValue()

      // When syncing the resource list
      await store.syncResourceList(
        '123456789012',
        { service: 'iam', account: '123456789012', resourceType: 'policy' },
        ['admin']
      )

      // Then the correct directory path should be used
      expect(listSpy).toHaveBeenCalledWith('/base/folder/aws/aws/accounts/123456789012/iam/policy')
      expect(deleteSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/iam/policy/readonly'
      )
    })

    it('should sync resource list with the account id if it is aws', async () => {
      // Given a specific account ID and service
      const listSpy = vi.spyOn(mockFsAdapter, 'listDirectory').mockResolvedValue([
        // Mocking the directories that exist in the filesystem for the given service
        'adminaccess',
        'readonly'
      ])

      const deleteSpy = vi.spyOn(mockFsAdapter, 'deleteDirectory').mockResolvedValue()

      // When syncing the resource list
      await store.syncResourceList(
        '123456789012',
        { service: 'iam', account: 'aws', resourceType: 'policy' },
        ['adminaccess']
      )

      // Then the correct directory path should be used
      expect(listSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/iam/aws/policy'
      )
      expect(deleteSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/iam/aws/policy/readonly'
      )
    })
  })

  describe('saveOrganizationMetadata', () => {
    it('should save organization metadata', async () => {
      // Given a specific account ID and metadata type
      const data = JSON.stringify({ Version: '2012-10-17', Statement: [] })
      const writeFileSpy = vi.spyOn(mockFsAdapter, 'writeFile').mockResolvedValue()

      // When metadata is saved
      await store.saveOrganizationMetadata('o-12345', 'organization-config', data)

      // Then the correct file path should be used
      expect(writeFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/organizations/o-12345/organization-config.json'.toLowerCase(),
        data
      )
    })

    it('should delete the organization metadata file if data is empty', async () => {
      for (const emptyValue of ['', '   ', '{}', '[]', undefined, null, {}, []]) {
        // Given a specific account ID and metadata type
        const deleteFileSpy = vi.spyOn(mockFsAdapter, 'deleteFile').mockResolvedValue()

        // When metadata is saved with empty data
        await store.saveOrganizationMetadata('o-12345', 'organization-config', emptyValue)

        // Then the correct file path should be used
        expect(deleteFileSpy, `empty value: "${emptyValue}"`).toHaveBeenCalledWith(
          '/base/folder/aws/aws/organizations/o-12345/organization-config.json'
        )
      }
    })
  })

  describe('deleteOrganizationMetadata', () => {
    it('should delete organization metadata', async () => {
      // Given a specific organization ID and metadata type
      const deleteFileSpy = vi.spyOn(mockFsAdapter, 'deleteFile').mockResolvedValue()

      // When metadata is deleted
      await store.deleteOrganizationMetadata('o-12345', 'organization-config')

      // Then the correct file path should be used
      expect(deleteFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/organizations/o-12345/organization-config.json'
      )
    })
  })

  describe('listOrganizationalUnits', () => {
    it('should list organizational units', async () => {
      // Given a specific organization ID
      const expectedOUs = ['ou-12345678', 'ou-87654321']
      const listDirectorySpy = vi
        .spyOn(mockFsAdapter, 'listDirectory')
        .mockResolvedValue(expectedOUs)

      // When organizational units are listed
      const result = await store.listOrganizationalUnits('o-12345')

      // Then the correct file path should be used and the result should match
      expect(listDirectorySpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/organizations/o-12345/ous'
      )
      expect(result).toEqual(expectedOUs)
    })
  })

  describe('deleteOrganizationalUnitMetadata', () => {
    it('should delete organizational unit metadata', async () => {
      // Given a specific organization ID and OU ID
      const deleteFileSpy = vi.spyOn(mockFsAdapter, 'deleteFile').mockResolvedValue()

      // When metadata is deleted
      await store.deleteOrganizationalUnitMetadata('o-12345', 'ou-12345678', 'metadata')

      // Then the correct file path should be used
      expect(deleteFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/organizations/o-12345/ous/ou-12345678/metadata.json'
      )
    })
  })

  describe('saveOrganizationalUnitMetadata', () => {
    it('should save organizational unit metadata', async () => {
      // Given a specific organization ID and OU ID
      const data = JSON.stringify({ Version: '2012-10-17', Statement: [] })
      const writeFileSpy = vi.spyOn(mockFsAdapter, 'writeFile').mockResolvedValue()

      // When metadata is saved
      await store.saveOrganizationalUnitMetadata('o-12345', 'ou-12345678', 'metadata', data)

      // Then the correct file path should be used
      expect(writeFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/organizations/o-12345/ous/ou-12345678/metadata.json'.toLowerCase(),
        data
      )
    })

    it('should delete the OU metadata file if data is empty', async () => {
      for (const emptyValue of ['', '   ', '{}', '[]', undefined, null, {}, []]) {
        // Given a specific organization ID and OU ID
        const deleteFileSpy = vi.spyOn(mockFsAdapter, 'deleteFile').mockResolvedValue()

        // When metadata is saved with empty data
        await store.saveOrganizationalUnitMetadata('o-12345', 'ou-12345678', 'metadata', emptyValue)

        // Then the correct file path should be used
        expect(deleteFileSpy, `empty value: "${emptyValue}"`).toHaveBeenCalledWith(
          '/base/folder/aws/aws/organizations/o-12345/ous/ou-12345678/metadata.json'
        )
      }
    })
  })

  describe('getOrganizationalUnitMetadata', () => {
    it('should get organizational unit metadata', async () => {
      // Given a specific organization ID and OU ID
      const expectedData = { Version: '2012-10-17', Statement: [] }
      const readFileSpy = vi
        .spyOn(mockFsAdapter, 'readFile')
        .mockResolvedValue(JSON.stringify(expectedData))

      // When metadata is retrieved
      const result = await store.getOrganizationalUnitMetadata('o-12345', 'ou-12345678', 'metadata')

      // Then the correct file path should be used and the data should match
      expect(readFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/organizations/o-12345/ous/ou-12345678/metadata.json'
      )
      expect(result).toEqual(expectedData)
    })

    it('should return the default value for non-existent OU metadata', async () => {
      // Given a specific organization ID and OU ID
      const defaultValue = { defaultValue: true }
      const readFileSpy = vi.spyOn(mockFsAdapter, 'readFile').mockResolvedValue(undefined)

      // When metadata is retrieved with a default value
      const result = await store.getOrganizationalUnitMetadata(
        'o-12345',
        'ou-12345678',
        'metadata',
        defaultValue
      )

      // Then the correct file path should be used and the result should match the default value
      expect(readFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/organizations/o-12345/ous/ou-12345678/metadata.json'
      )
      expect(result).toEqual(defaultValue)
    })
  })

  describe('deleteOrganizationalUnit', () => {
    it('should delete an organizational unit', async () => {
      // Given a specific organization ID and OU ID
      const deleteDirectorySpy = vi.spyOn(mockFsAdapter, 'deleteDirectory').mockResolvedValue()

      // When the organizational unit is deleted
      await store.deleteOrganizationalUnit('o-12345', 'ou-12345678')

      // Then the correct directory path should be used
      expect(deleteDirectorySpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/organizations/o-12345/ous/ou-12345678'
      )
    })
  })

  describe('deleteOrganizationPolicyMetadata', () => {
    it('should delete organization policy metadata', async () => {
      // Given a specific organization ID and policy type
      const deleteFileSpy = vi.spyOn(mockFsAdapter, 'deleteFile').mockResolvedValue()

      // When metadata is deleted
      await store.deleteOrganizationPolicyMetadata('o-12345', 'scps', 'p-12345678', 'policy')

      // Then the correct file path should be used
      expect(deleteFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/organizations/o-12345/scps/p-12345678/policy.json'
      )
    })
  })

  describe('saveOrganizationPolicyMetadata', () => {
    it('should save organization policy metadata', async () => {
      // Given a specific organization ID and policy type
      const data = JSON.stringify({ Version: '2012-10-17', Statement: [] })
      const writeFileSpy = vi.spyOn(mockFsAdapter, 'writeFile').mockResolvedValue()

      // When metadata is saved
      await store.saveOrganizationPolicyMetadata('o-12345', 'scps', 'p-12345678', 'policy', data)

      // Then the correct file path should be used
      expect(writeFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/organizations/o-12345/scps/p-12345678/policy.json'.toLowerCase(),
        data
      )
    })

    it('should delete the organization policy metadata file if data is empty', async () => {
      for (const emptyValue of ['', '   ', '{}', '[]', undefined, null, {}, []]) {
        // Given a specific organization ID and policy type
        const deleteFileSpy = vi.spyOn(mockFsAdapter, 'deleteFile').mockResolvedValue()

        // When metadata is saved with empty data
        await store.saveOrganizationPolicyMetadata(
          'o-12345',
          'scps',
          'p-12345678',
          'policy',
          emptyValue
        )

        // Then the correct file path should be used
        expect(deleteFileSpy, `empty value: "${emptyValue}"`).toHaveBeenCalledWith(
          '/base/folder/aws/aws/organizations/o-12345/scps/p-12345678/policy.json'
        )
      }
    })
  })

  describe('getOrganizationPolicyMetadata', () => {
    it('should get organization policy metadata', async () => {
      // Given a specific organization ID and policy type
      const expectedData = { Version: '2012-10-17', Statement: [] }
      const readFileSpy = vi
        .spyOn(mockFsAdapter, 'readFile')
        .mockResolvedValue(JSON.stringify(expectedData))

      // When metadata is retrieved
      const result = await store.getOrganizationPolicyMetadata(
        'o-12345',
        'scps',
        'p-12345678',
        'policy'
      )

      // Then the correct file path should be used and the data should match
      expect(readFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/organizations/o-12345/scps/p-12345678/policy.json'
      )
      expect(result).toEqual(expectedData)
    })

    it('should return a default value for non-existent organization policy metadata', async () => {
      // Given a specific organization ID and policy type
      const defaultValue = { defaultValue: true }
      const readFileSpy = vi.spyOn(mockFsAdapter, 'readFile').mockResolvedValue(undefined)

      // When metadata is retrieved with a default value
      const result = await store.getOrganizationPolicyMetadata(
        'o-12345',
        'scps',
        'p-12345678',
        'policy',
        defaultValue
      )

      // Then the correct file path should be used and the result should match the default value
      expect(readFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/organizations/o-12345/scps/p-12345678/policy.json'
      )
      expect(result).toEqual(defaultValue)
    })
  })

  describe('deleteOrganizationPolicy', () => {
    it('should delete an organization policy', async () => {
      // Given a specific organization ID and policy type
      const deleteDirectorySpy = vi.spyOn(mockFsAdapter, 'deleteDirectory').mockResolvedValue()

      // When the organization policy is deleted
      await store.deleteOrganizationPolicy('o-12345', 'scps', 'p-12345678')

      // Then the correct directory path should be used
      expect(deleteDirectorySpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/organizations/o-12345/scps/p-12345678'
      )
    })
  })

  describe('listOrganizationPolicies', () => {
    it('should list organization policies', async () => {
      // Given a specific organization ID and policy type
      const expectedPolicies = ['p-12345678', 'p-87654321']
      const listDirectorySpy = vi
        .spyOn(mockFsAdapter, 'listDirectory')
        .mockResolvedValue(expectedPolicies)

      // When organization policies are listed
      const result = await store.listOrganizationPolicies('o-12345', 'scps')

      // Then the correct file path should be used and the result should match
      expect(listDirectorySpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/organizations/o-12345/scps'
      )
      expect(result).toEqual(expectedPolicies)
    })
  })
})
