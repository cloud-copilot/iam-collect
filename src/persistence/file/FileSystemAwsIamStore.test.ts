import { beforeEach, describe, expect, it, vi } from 'vitest'
import { FileSystemAdapter } from './FileSystemAdapter'

vi.mock('./FileSystemAdapter')

import { FileSystemAwsIamStore } from './FileSystemAwsIamStore'

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
        '/base/folder/aws/aws/accounts/123456789012/aws/iam/123456789012/role/test-role/trust-policy.json'.toLowerCase(),
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
        '/base/folder/aws/aws/accounts/123456789012/aws/s3/my-bucket/bucket-policy.json'.toLowerCase(),
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
          '/base/folder/aws/aws/accounts/123456789012/aws/iam/123456789012/role/test-role/trust-policy.json'
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
        '/base/folder/aws/aws/accounts/123456789012/aws/iam/123456789012/role/test-role'
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
        '/base/folder/aws/aws/accounts/123456789012/aws/s3/my-bucket'
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
        '/base/folder/aws/aws/accounts/123456789012/aws/iam/123456789012/role/test-role/trust-policy.json'
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
        '/base/folder/aws/aws/accounts/123456789012/aws/s3/my-bucket/bucket-policy.json'
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
        '/base/folder/aws/aws/accounts/123456789012/aws/iam/123456789012/role/test-role/trust-policy.json'
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
        '/base/folder/aws/aws/accounts/123456789012/aws/iam/123456789012/role/test-role/trust-policy.json'
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
        '/base/folder/aws/aws/accounts/123456789012/aws/iam/123456789012/role/test-role/trust-policy.json'
      )
    })

    it('should delete s3 bucket metadata', async () => {
      // Given a specific ARN and metadata type
      const deleteFileSpy = vi.spyOn(mockFsAdapter, 'deleteFile').mockResolvedValue()

      // When metadata is deleted
      await store.deleteResourceMetadata('123456789012', 'arn:aws:s3:::my-bucket', 'bucket-policy')

      // Then the correct file path should be used
      expect(deleteFileSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/aws/s3/my-bucket/bucket-policy.json'
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
        '/base/folder/aws/aws/accounts/123456789012/aws/iam/123456789012/role/test-role'
      )
    })

    it('should delete s3 bucket resource', async () => {
      // Given a specific ARN
      const deleteDirectorySpy = vi.spyOn(mockFsAdapter, 'deleteDirectory').mockResolvedValue()

      // When the resource is deleted
      await store.deleteResource('123456789012', 'arn:aws:s3:::my-bucket')

      // Then the correct directory path should be used
      expect(deleteDirectorySpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/aws/s3/my-bucket'
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
        '/base/folder/aws/aws/accounts/123456789012/aws/iam/role'
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
        '/base/folder/aws/aws/accounts/123456789012/aws/s3'
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
        '/base/folder/aws/aws/accounts/123456789012/aws/kms/us-east-1/123456789012/key'
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
      expect(listSpy).toHaveBeenCalledWith('/base/folder/aws/aws/accounts/123456789012/aws/s3')
      expect(deleteSpy).toHaveBeenCalledWith(
        '/base/folder/aws/aws/accounts/123456789012/aws/s3/my-other-bucket'
      )
    })
  })
})
