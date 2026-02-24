import { describe, expect, it } from 'vitest'
import type { StorageConfig, TopLevelConfig } from '../config/config.js'
import { FileSystemAdapter } from './file/FileSystemAdapter.js'
import { FileSystemAwsIamStore } from './file/FileSystemAwsIamStore.js'
import { S3PathBasedPersistenceAdapter } from './s3/S3PathBasedPersistenceAdapter.js'
import { SqliteAwsIamStore } from './sqlite/SqliteAwsIamStore.js'
import { createStorageClient } from './util.js'

describe('createStorageClient', () => {
  it('should create a FileSystemAwsIamStore when type is file', async () => {
    //Given a file storage config
    const storageConfig: StorageConfig = {
      type: 'file',
      path: '/path/to/storage'
    }

    //When createStorageClient is called
    const storageClient = createStorageClient(storageConfig, 'aws', true)

    //Then it should return a FileSystemAwsIamStore instance
    expect(storageClient).toBeInstanceOf(FileSystemAwsIamStore)
    expect((storageClient as any).fsAdapter).toBeInstanceOf(FileSystemAdapter)
  })

  it('should create a S3 Filestore when type is s3', async () => {
    //Given an S3 storage config
    const storageConfig: StorageConfig = {
      type: 's3',
      bucket: 'my-bucket',
      region: 'us-east-1'
    }

    //When createStorageClient is called
    const storageClient = createStorageClient(storageConfig, 'aws', true)

    //Then it should return a FileSystemAwsIamStore instance
    expect(storageClient).toBeInstanceOf(FileSystemAwsIamStore)
    expect((storageClient as any).fsAdapter).toBeInstanceOf(S3PathBasedPersistenceAdapter)
  })

  it('should create a SqliteAwsIamStore when type is sqlite', async () => {
    // Given a sqlite storage config
    const storageConfig: StorageConfig = {
      type: 'sqlite',
      path: ':memory:'
    }

    // When createStorageClient is called
    const storageClient = createStorageClient(storageConfig, 'aws', true)

    // Then it should return a SqliteAwsIamStore instance
    expect(storageClient).toBeInstanceOf(SqliteAwsIamStore)
  })

  it('should use the configs if they are passed in as an array', async () => {
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
    const storageClient = createStorageClient(configs, 'aws', true)

    //Then it should return a FileSystemAwsIamStore instance
    expect(storageClient).toBeInstanceOf(FileSystemAwsIamStore)
    expect((storageClient as any).fsAdapter).toBeInstanceOf(FileSystemAdapter)
  })

  it('should throw an error if no storage config is found', async () => {
    //Given an empty configs array
    const configs: TopLevelConfig[] = []

    //When createStorageClient is called
    expect(() => createStorageClient(configs, 'aws', true)).toThrow(
      'No storage configuration found. Cannot create storage client.'
    )
  })
})
