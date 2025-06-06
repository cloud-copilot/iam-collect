import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FileSystemAdapter } from './FileSystemAdapter.js'

vi.mock('./FileSystemAdapter')

import { FileSystemAwsIamStore } from './FileSystemAwsIamStore.js'

describe('FileSystemAwsIamStore', () => {
  let store: FileSystemAwsIamStore
  let mockFsAdapter: FileSystemAdapter

  beforeEach(() => {
    mockFsAdapter = new FileSystemAdapter() as unknown as FileSystemAdapter
    store = new FileSystemAwsIamStore('/base/folder', 'aws', '/', mockFsAdapter)
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

    it('should sync resources based on metadata if provided', async () => {
      // Given a specific account ID and service with metadata
      const listSpy = vi.spyOn(mockFsAdapter, 'listDirectory').mockResolvedValue([
        // Mocking the directories that exist in the filesystem for the given service
        'inregionA',
        'inregionB',
        'outregion',
        'noregion',
        'nodata'
      ])
      vi.spyOn(mockFsAdapter, 'readFile').mockImplementation(async (path) => {
        if (path.includes('inregionA') || path.includes('inregionB')) {
          return JSON.stringify({ region: 'us-east-1' })
        } else if (path.includes('outregion')) {
          return JSON.stringify({ region: 'us-west-2' })
        } else if (path.includes('noregion')) {
          return JSON.stringify({ other: 'data' })
        } else if (path.includes('nodata')) {
          return undefined // Simulating no metadata
        }
        throw new Error(`Unexpected path: ${path}`)
      })

      const deleteSpy = vi.spyOn(mockFsAdapter, 'deleteDirectory').mockResolvedValue()

      // When syncing the resource list with metadata
      await store.syncResourceList(
        '123456789012',
        {
          service: 'iam',
          account: 'aws',
          resourceType: 'policy',
          metadata: {
            region: 'us-east-1'
          }
        },
        ['inregionA']
      )

      // Then the correct directory path should be used
      expect(listSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/iam/aws/policy'
      )
      expect(deleteSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/iam/aws/policy/inregionB'
      )
    })
  })

  describe('deleteAccountMetadata', () => {
    it('should delete account metadata', async () => {
      // Given a specific account ID and metadata type
      const deleteFileSpy = vi.spyOn(mockFsAdapter, 'deleteFile').mockResolvedValue()

      // When metadata is deleted
      await store.deleteAccountMetadata('123456789012', 'account-config')

      // Then the correct file path should be used
      expect(deleteFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/account-config.json'
      )
    })
  })

  describe('saveAccountMetadata', () => {
    it('should save account metadata', async () => {
      // Given a specific account ID and metadata type
      const data = JSON.stringify({ Version: '2012-10-17', Statement: [] })
      const writeFileSpy = vi.spyOn(mockFsAdapter, 'writeFile').mockResolvedValue()

      // When metadata is saved
      await store.saveAccountMetadata('123456789012', 'account-config', data)

      // Then the correct file path should be used
      expect(writeFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/account-config.json'.toLowerCase(),
        data
      )
    })

    it('should delete the account metadata file if data is empty', async () => {
      for (const emptyValue of ['', '   ', '{}', '[]', undefined, null, {}, []]) {
        // Given a specific account ID and metadata type
        const deleteFileSpy = vi.spyOn(mockFsAdapter, 'deleteFile').mockResolvedValue()

        // When metadata is saved with empty data
        await store.saveAccountMetadata('123456789012', 'account-config', emptyValue)

        // Then the correct file path should be used
        expect(deleteFileSpy, `empty value: "${emptyValue}"`).toHaveBeenCalledWith(
          '/base/folder/aws/aws/accounts/123456789012/account-config.json'
        )
      }
    })
  })

  describe('getAccountMetadata', () => {
    it('should get account metadata', async () => {
      // Given a specific account ID and metadata type
      const expectedData = { Version: '2012-10-17', Statement: [] }
      const readFileSpy = vi
        .spyOn(mockFsAdapter, 'readFile')
        .mockResolvedValue(JSON.stringify(expectedData))

      // When metadata is retrieved
      const result = await store.getAccountMetadata('123456789012', 'account-config')

      // Then the correct file path should be used and the data should match
      expect(readFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/account-config.json'
      )
      expect(result).toEqual(expectedData)
    })

    it('should return the default value for non-existent account metadata', async () => {
      // Given a specific account ID and metadata type
      const defaultValue = { defaultValue: true }
      const readFileSpy = vi.spyOn(mockFsAdapter, 'readFile').mockResolvedValue(undefined)

      // When metadata is retrieved with a default value
      const result = await store.getAccountMetadata('123456789012', 'account-config', defaultValue)

      // Then the correct file path should be used and the result should match the default value
      expect(readFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/account-config.json'
      )
      expect(result).toEqual(defaultValue)
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

  describe('syncRamResources', () => {
    it('should sync RAM resources for the given account and region', async () => {
      // Given a specific account ID and region
      const listSpy = vi.spyOn(mockFsAdapter, 'listDirectory').mockResolvedValue([
        // Mocking the directories that exist in the filesystem for the given account and region
        'arn-aws-ram-us-east-1-123456789012-resource1.json',
        'arn-aws-ram-us-east-1-123456789012-resource2.json'
      ])

      const deleteSpy = vi.spyOn(mockFsAdapter, 'deleteFile').mockResolvedValue()

      // When syncing RAM resources
      await store.syncRamResources('123456789012', 'us-east-1', [
        'arn:aws:ram:us-east-1:123456789012:resource1'
      ])

      // Then the correct directory path should be used
      expect(listSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/ram/us-east-1'
      )
      expect(deleteSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/ram/us-east-1/arn-aws-ram-us-east-1-123456789012-resource2.json'
      )
    })
    it('should sync RAM resources for the global folder if no region is given', async () => {
      // Given a specific account ID and region
      const listSpy = vi.spyOn(mockFsAdapter, 'listDirectory').mockResolvedValue([
        // Mocking the directories that exist in the filesystem for the given account and region
        'arn-aws-ram--123456789012-resource1.json',
        'arn-aws-ram--123456789012-resource2.json'
      ])

      const deleteSpy = vi.spyOn(mockFsAdapter, 'deleteFile').mockResolvedValue()

      // When syncing RAM resources
      await store.syncRamResources('123456789012', '', ['arn:aws:ram::123456789012:resource1'])

      // Then the correct directory path should be used
      expect(listSpy).toHaveBeenCalledWith('/base/folder/aws/aws/accounts/123456789012/ram/global')
      expect(deleteSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/ram/global/arn-aws-ram--123456789012-resource2.json'
      )
    })
  })

  describe('saveRamResource', () => {
    it('should save the resource data', async () => {
      // Given a specific ARN and data
      const data = JSON.stringify({ Version: '2012-10-17', Statement: [] })
      const writeFileSpy = vi.spyOn(mockFsAdapter, 'writeFile').mockResolvedValue()

      // When the resource data is saved
      await store.saveRamResource(
        '123456789012',
        'arn:aws:ram:us-east-1:123456789012:resource1',
        data
      )

      // Then the correct file path should be used
      expect(writeFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/ram/us-east-1/arn-aws-ram-us-east-1-123456789012-resource1.json'.toLowerCase(),
        data
      )
    })

    it('should save the resource data in global folder if no region exists', async () => {
      // Given a specific ARN and data
      const data = JSON.stringify({ Version: '2012-10-17', Statement: [] })
      const writeFileSpy = vi.spyOn(mockFsAdapter, 'writeFile').mockResolvedValue()

      // When the resource data is saved
      await store.saveRamResource('123456789012', 'arn:aws:ram::123456789012:resource1', data)

      // Then the correct file path should be used
      expect(writeFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/ram/global/arn-aws-ram--123456789012-resource1.json'.toLowerCase(),
        data
      )
    })
  })

  describe('getRamResource', () => {
    it('should get the ram resource data', async () => {
      // Given a specific ARN and metadata type
      const expectedData = { Version: '2012-10-17', Statement: [] }
      const readFileSpy = vi
        .spyOn(mockFsAdapter, 'readFile')
        .mockResolvedValue(JSON.stringify(expectedData))

      // When metadata is retrieved
      const result = await store.getRamResource(
        '123456789012',
        'arn:aws:ram:us-east-1:123456789012:resource1'
      )

      // Then the correct file path should be used and the data should match
      expect(readFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/ram/us-east-1/arn-aws-ram-us-east-1-123456789012-resource1.json'
      )
      expect(result).toEqual(expectedData)
    })

    it('should get the ram resource data from the global folder if no region exists', async () => {
      // Given a specific ARN and metadata type
      const expectedData = { Version: '2012-10-17', Statement: [] }
      const readFileSpy = vi
        .spyOn(mockFsAdapter, 'readFile')
        .mockResolvedValue(JSON.stringify(expectedData))

      // When metadata is retrieved
      const result = await store.getRamResource(
        '123456789012',
        'arn:aws:ram::123456789012:resource1'
      )

      // Then the correct file path should be used and the data should match
      expect(readFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/ram/global/arn-aws-ram--123456789012-resource1.json'
      )
      expect(result).toEqual(expectedData)
    })

    it('should return the default if provided and no value exists', async () => {
      // Given a specific ARN and metadata type
      const defaultValue = { defaultValue: true }
      const readFileSpy = vi.spyOn(mockFsAdapter, 'readFile').mockResolvedValue(undefined)

      // When metadata is retrieved with a default value
      const result = await store.getRamResource(
        '123456789012',
        'arn:aws:ram::123456789012:resource1',
        defaultValue
      )

      // Then the correct file path should be used and the result should match the default value
      expect(readFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/ram/global/arn-aws-ram--123456789012-resource1.json'
      )
      expect(result).toEqual(defaultValue)
    })

    it('should return undefined if no value exists and no default provided', async () => {
      // Given a specific ARN and metadata type
      const readFileSpy = vi.spyOn(mockFsAdapter, 'readFile').mockResolvedValue(undefined)

      // When metadata is retrieved without a default value
      const result = await store.getRamResource(
        '123456789012',
        'arn:aws:ram::123456789012:resource1'
      )

      // Then the correct file path should be used and the result should be undefined
      expect(readFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/ram/global/arn-aws-ram--123456789012-resource1.json'
      )
      expect(result).toBeUndefined()
    })
  })

  describe('findResourceMetadata', () => {
    it('should pass the service', async () => {
      // Given a specific account ID and options
      const expectedResources = [{ id: 'a' }, { id: 'b' }]
      const findMetadataSpy = vi
        .spyOn(mockFsAdapter, 'findWithPattern')
        .mockResolvedValue(expectedResources.map((item) => JSON.stringify(item)))

      // When listing resources
      const result = await store.findResourceMetadata('123456789012', {
        service: 's3'
      })

      // Then the correct directory path should be used and the result should match
      expect(findMetadataSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012',
        ['s3', '*'],
        'metadata.json'
      )
      expect(result).toEqual(expectedResources)
    })

    it('should pass the region if present', async () => {
      // Given a specific account ID and options
      const expectedResources = [{ id: 'a' }, { id: 'b' }]
      const findMetadataSpy = vi
        .spyOn(mockFsAdapter, 'findWithPattern')
        .mockResolvedValue(expectedResources.map((item) => JSON.stringify(item)))

      // When listing resources
      const result = await store.findResourceMetadata('123456789012', {
        service: 's3',
        region: 'us-east-1'
      })

      // Then the correct directory path should be used and the result should match
      expect(findMetadataSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012',
        ['s3', 'us-east-1', '*'],
        'metadata.json'
      )
      expect(result).toEqual(expectedResources)
    })

    it('should pass the resource type if present', async () => {
      // Given a specific account ID and options
      const expectedResources = [{ id: 'a' }, { id: 'b' }]
      const findMetadataSpy = vi
        .spyOn(mockFsAdapter, 'findWithPattern')
        .mockResolvedValue(expectedResources.map((item) => JSON.stringify(item)))

      // When listing resources
      const result = await store.findResourceMetadata('123456789012', {
        service: 's3',
        region: '*',
        resourceType: 'bucket'
      })

      // Then the correct directory path should be used and the result should match
      expect(findMetadataSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012',
        ['s3', '*', 'bucket', '*'],
        'metadata.json'
      )
      expect(result).toEqual(expectedResources)
    })
  })

  describe('getOrganizationMetadata', () => {
    it('should return the data', async () => {
      // Given a specific organization ID and metadata type
      const expectedData = { Version: '2012-10-17', Statement: [] }
      const readFileSpy = vi
        .spyOn(mockFsAdapter, 'readFile')
        .mockResolvedValue(JSON.stringify(expectedData))

      // When metadata is retrieved
      const result = await store.getOrganizationMetadata('o-12345', 'organization-config')

      // Then the correct file path should be used and the data should match
      expect(readFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/organizations/o-12345/organization-config.json'
      )
      expect(result).toEqual(expectedData)
    })

    it('should return the data if present and a default provided', async () => {
      // Given a specific organization ID and metadata type
      const expectedData = { Version: '2012-10-17', Statement: [] }
      const readFileSpy = vi
        .spyOn(mockFsAdapter, 'readFile')
        .mockResolvedValue(JSON.stringify(expectedData))

      // When metadata is retrieved with a default value
      const result = await store.getOrganizationMetadata('o-12345', 'organization-config', {
        defaultValue: true
      })

      // Then the correct file path should be used and the result should match the default value
      expect(readFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/organizations/o-12345/organization-config.json'
      )
      expect(result).toEqual(expectedData)
    })

    it('should return the default if no data and default provided', async () => {
      // Given a specific organization ID and metadata type
      const defaultValue = { defaultValue: true }
      const readFileSpy = vi.spyOn(mockFsAdapter, 'readFile').mockResolvedValue(undefined)

      // When metadata is retrieved with a default value
      const result = await store.getOrganizationMetadata(
        'o-12345',
        'organization-config',
        defaultValue
      )

      // Then the correct file path should be used and the result should match the default value
      expect(readFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/organizations/o-12345/organization-config.json'
      )
      expect(result).toEqual(defaultValue)
    })

    it('should return undefined if no data and no default', async () => {
      // Given a specific organization ID and metadata type
      const readFileSpy = vi.spyOn(mockFsAdapter, 'readFile').mockResolvedValue(undefined)

      // When metadata is retrieved without a default value
      const result = await store.getOrganizationMetadata('o-12345', 'organization-config')

      // Then the correct file path should be used and the result should be undefined
      expect(readFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/organizations/o-12345/organization-config.json'
      )
      expect(result).toBeUndefined()
    })
  })

  describe('listAccountIds', () => {
    it('should list the accounts', async () => {
      // Given a specific organization ID
      const expectedAccounts = ['123456789012', '987654321098']
      const listDirectoriesSpy = vi
        .spyOn(mockFsAdapter, 'listDirectory')
        .mockResolvedValue(expectedAccounts)

      // When listing accounts
      const result = await store.listAccountIds()

      // Then the correct file path should be used and the result should match
      expect(listDirectoriesSpy).toHaveBeenCalledWith('/base/folder/aws/aws/accounts')
      expect(result).toEqual(expectedAccounts)
    })
  })

  describe('getIndex', () => {
    it('should return the data', async () => {
      // Given a specific index name
      const expectedData = { Version: '2012-10-17', Statement: [] }
      const readFileSpy = vi
        .spyOn(mockFsAdapter, 'readFileWithHash')
        .mockResolvedValue({ data: JSON.stringify(expectedData), hash: '39djd93' })

      // When metadata is retrieved
      const result = await store.getIndex('index', {})

      // Then the correct file path should be used and the data should match
      expect(readFileSpy).toHaveBeenCalledWith('/base/folder/aws/aws/indexes/index.json')
      expect(result).toEqual({ data: expectedData, lockId: '39djd93' })
    })

    it('should return the data if present and a default provided', async () => {
      // Given a specific index name
      const expectedData = { Version: '2012-10-17', Statement: [] }
      const readFileSpy = vi
        .spyOn(mockFsAdapter, 'readFileWithHash')
        .mockResolvedValue({ data: JSON.stringify(expectedData), hash: '39djd93' })

      // When metadata is retrieved with a default value
      const result = await store.getIndex('my-index', { defaultValue: true })

      // Then the correct file path should be used and the result should match the default value
      expect(readFileSpy).toHaveBeenCalledWith('/base/folder/aws/aws/indexes/my-index.json')
      expect(result).toEqual({ data: expectedData, lockId: '39djd93' })
    })

    it('should return the default if no data and default provided', async () => {
      // Given a specific index name
      const defaultValue = { defaultValue: true }
      const readFileSpy = vi.spyOn(mockFsAdapter, 'readFileWithHash').mockResolvedValue(undefined)

      // When metadata is retrieved with a default value
      const result = await store.getIndex('my-index', defaultValue)

      // Then the correct file path should be used and the result should match the default value
      expect(readFileSpy).toHaveBeenCalledWith('/base/folder/aws/aws/indexes/my-index.json')
      expect(result).toEqual({ data: defaultValue, lockId: '' })
    })
  })

  describe('saveIndex', () => {
    it('should save the contents', async () => {
      // Given a specific account ID and metadata type
      const data = JSON.stringify({ Version: '2012-10-17', Statement: [] })
      const writeFileSpy = vi
        .spyOn(mockFsAdapter, 'writeWithOptimisticLock')
        .mockResolvedValue(true)

      // When metadata is saved
      await store.saveIndex('index', data, '39djd93')

      // Then the correct file path should be used
      expect(writeFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/indexes/index.json',
        JSON.stringify(data),
        '39djd93'
      )
    })
  })
})
