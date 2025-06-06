import { describe, expect, it } from 'vitest'
import { StorageConfig, TopLevelConfig } from '../config/config.js'
import { FileSystemAdapter } from './file/FileSystemAdapter.js'
import { FileSystemAwsIamStore } from './file/FileSystemAwsIamStore.js'
import { S3PathBasedPersistenceAdapter } from './s3/S3PathBasedPersistenceAdapter.js'
import { createStorageClient } from './util.js'

describe('createStorageClient', () => {
  it('should create a FileSystemAwsIamStore when type is file', () => {
    //Given a file storage config
    const storageConfig: StorageConfig = {
      type: 'file',
      path: '/path/to/storage'
    }

    //When createStorageClient is called
    const storageClient = createStorageClient(storageConfig, 'aws')

    //Then it should return a FileSystemAwsIamStore instance
    expect(storageClient).toBeInstanceOf(FileSystemAwsIamStore)
    expect((storageClient as any).fsAdapter).toBeInstanceOf(FileSystemAdapter)
  })

  it('should create a S3 Filestore when type is s3', () => {
    //Given an S3 storage config
    const storageConfig: StorageConfig = {
      type: 's3',
      bucket: 'my-bucket',
      region: 'us-east-1'
    }

    //When createStorageClient is called
    const storageClient = createStorageClient(storageConfig, 'aws')

    //Then it should return a FileSystemAwsIamStore instance
    expect(storageClient).toBeInstanceOf(FileSystemAwsIamStore)
    expect((storageClient as any).fsAdapter).toBeInstanceOf(S3PathBasedPersistenceAdapter)
  })

  it('should use the configs if they are passed in as an array', () => {
    //Given a configs array
    const configs: TopLevelConfig[] = [
      {
        iamCollectVersion: '1.0',
        storage: {
          type: 'file',
          path: '/path/to/storage'
        }
      }
    ]

    //When createStorageClient is called
    const storageClient = createStorageClient(configs, 'aws')

    //Then it should return a FileSystemAwsIamStore instance
    expect(storageClient).toBeInstanceOf(FileSystemAwsIamStore)
    expect((storageClient as any).fsAdapter).toBeInstanceOf(FileSystemAdapter)
  })

  it('should throw an error if no storage config is found', () => {
    //Given an empty configs array
    const configs: TopLevelConfig[] = []

    //When createStorageClient is called
    expect(() => createStorageClient(configs, 'aws')).toThrow(
      'No storage configuration found. Cannot create storage client.'
    )
  })
})
