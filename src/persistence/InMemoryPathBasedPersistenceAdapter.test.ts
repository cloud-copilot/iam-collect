import { describe, expect, it } from 'vitest'
import { InMemoryPathBasedPersistenceAdapter } from './InMemoryPathBasedPersistenceAdapter.js'

describe('InMemoryPathBasedPersistenceAdapter', () => {
  describe('readFile', () => {
    it('should return the contents of the file', async () => {
      // Given a file with some contents
      const filePath = 'test.txt'
      const contents = 'Hello, world!'
      const adapter = new InMemoryPathBasedPersistenceAdapter()
      await adapter.writeFile(filePath, contents)

      // When the file is read
      const result = await adapter.readFile(filePath)

      // Then the contents should be returned
      expect(result).toBe(contents)
    })
    it('should return undefined if the file does not exist', async () => {
      // Given a file new adapter
      const adapter = new InMemoryPathBasedPersistenceAdapter()

      // When the file is read that does not exist
      const result = await adapter.readFile('nonexistent.txt')

      // Then undefined should be returned
      expect(result).toBeUndefined()
    })
  })

  describe('readFileWithHash', () => {
    it('should return the contents and hash of the file', async () => {
      // Given a file with some contents
      const filePath = 'test.txt'
      const contents = 'Hello, world!'
      const adapter = new InMemoryPathBasedPersistenceAdapter()
      await adapter.writeFile(filePath, contents)

      // When the file is read with hash
      const result = await adapter.readFileWithHash(filePath)

      // Then the contents and hash should be returned
      expect(result).toBeDefined()
      expect(result?.data).toBe(contents)
      expect(result?.hash).toBeDefined()
    })

    it('should return undefined if the file does not exist', async () => {
      // Given a file new adapter
      const adapter = new InMemoryPathBasedPersistenceAdapter()

      // When the file is read that does not exist
      const result = await adapter.readFileWithHash('nonexistent.txt')

      // Then undefined should be returned
      expect(result).toBeUndefined()
    })
  })

  describe('writeFileWithOptimisticLock', () => {
    it('should write the file if the hash matches', async () => {
      // Given a file with some contents
      const filePath = 'test.txt'
      const contents = 'Hello, world!'
      const adapter = new InMemoryPathBasedPersistenceAdapter()
      await adapter.writeFile(filePath, contents)

      const hash = (await adapter.readFileWithHash(filePath))?.hash!

      const newContents = 'Hello, universe!'
      // When the file is written with optimistic lock and the hash matches
      const result = await adapter.writeWithOptimisticLock(filePath, newContents, hash)

      // Then the file should be written successfully
      expect(result).toBe(true)

      // And when the file is read again
      const newResult = await adapter.readFile(filePath)
      // Then the contents should be the same
      expect(newResult).toBe(newContents)
    })
    it('should not write the file if the lockId does not match', async () => {
      // Given a file with some contents
      const filePath = 'test.txt'
      const contents = 'Hello, world!'
      const adapter = new InMemoryPathBasedPersistenceAdapter()
      await adapter.writeFile(filePath, contents)

      const newContents = 'Hello, universe!'
      // When the file is written with optimistic lock and the hash does not match
      const result = await adapter.writeWithOptimisticLock(filePath, newContents, 'invalid-hash')

      // Then the file should not be written
      expect(result).toBe(false)

      // And when the file is read again
      const newResult = await adapter.readFile(filePath)
      // Then the contents should be the same
      expect(newResult).toBe(contents)
    })
  })

  describe('deleteFile', () => {
    it('should delete the file', async () => {
      // Given a file with some contents
      const filePath = 'test.txt'
      const contents = 'Hello, world!'
      const adapter = new InMemoryPathBasedPersistenceAdapter()
      await adapter.writeFile(filePath, contents)

      // When the file is deleted
      await adapter.deleteFile(filePath)

      // Then the file should no longer exist
      const result = await adapter.readFile(filePath)
      expect(result).toBeUndefined()
    })

    it('should ignore if the file does not exist', async () => {
      // Given a file new adapter
      const adapter = new InMemoryPathBasedPersistenceAdapter()

      // When the file is deleted that does not exist
      await adapter.deleteFile('nonexistent.txt')

      // Then no error should be thrown
    })
  })

  describe('deleteDirectory', () => {
    it('should delete the directory and its contents', async () => {
      // Given a directory with some files
      const dirPath = 'testDir'
      const filePath1 = `${dirPath}/file1.txt`
      const filePath2 = `${dirPath}/file2.txt`
      const subDirPath1 = `${dirPath}/subDir/file3.txt`
      const subDirPath2 = `${dirPath}/subDir/file4.txt`
      const dir2Path = `otherTestDir`
      const filePath3 = `${dir2Path}/file1.txt`
      const filePath4 = `${dir2Path}/file2.txt`
      const contents1 = 'Hello, world!'
      const contents2 = 'Hello, universe!'
      const adapter = new InMemoryPathBasedPersistenceAdapter()
      await adapter.writeFile(filePath1, contents1)
      await adapter.writeFile(filePath2, contents2)

      // When the directory is deleted
      await adapter.deleteDirectory(dirPath)

      // Then the files should no longer exist
      const deleted1 = await adapter.readFile(filePath1)
      const deleted2 = await adapter.readFile(filePath2)
      const deleted3 = await adapter.readFile(subDirPath1)
      const deleted4 = await adapter.readFile(subDirPath2)
      expect(deleted1).toBeUndefined()
      expect(deleted2).toBeUndefined()
      expect(deleted3).toBeUndefined()
      expect(deleted4).toBeUndefined()

      // And other directories should not be affected
      const result3 = await adapter.readFile(filePath3)
      const result4 = await adapter.readFile(filePath4)
      expect(result3).toBeUndefined()
      expect(result4).toBeUndefined()
    })

    it('should ignore if the directory does not exist', async () => {
      // Given a file new adapter
      const adapter = new InMemoryPathBasedPersistenceAdapter()

      // When the directory is deleted that does not exist
      await adapter.deleteDirectory('nonexistentDir')

      // Then no error should be thrown
    })

    it('should not delete directories that start with the same characters', async () => {
      // Given a directory with some files
      const filePath1 = `dirA/file1.txt`
      const filePath2 = `dirAA/file2.txt`
      const contents1 = 'Hello, world!'
      const contents2 = 'Hello, universe!'
      const adapter = new InMemoryPathBasedPersistenceAdapter()
      await adapter.writeFile(filePath1, contents1)
      await adapter.writeFile(filePath2, contents2)

      // When the directory is deleted
      await adapter.deleteDirectory('dirA')

      // Then the dirA directory should no longer exist
      const result1 = await adapter.readFile(filePath1)
      expect(result1).toBeUndefined()

      // And the dirAA directory should still exist
      const result2 = await adapter.readFile(filePath2)
      expect(result2).toBe(contents2)
    })
  })

  describe('listDirectory', () => {
    it('should list the files in the directory', async () => {
      // Given a directory with some files
      const dirPath = 'testDir'
      const filePath1 = `${dirPath}/file1.txt`
      const filePath2 = `${dirPath}/file2.txt`
      const contents1 = 'Hello, world!'
      const contents2 = 'Hello, universe!'
      const adapter = new InMemoryPathBasedPersistenceAdapter()
      await adapter.writeFile(filePath1, contents1)
      await adapter.writeFile(filePath2, contents2)

      // When the directory is listed
      const result = await adapter.listDirectory(dirPath)

      // Then the files should be listed
      expect(result).toEqual(['file1.txt', 'file2.txt'])
    })
    it('should return an empty array if the directory does not exist', async () => {
      // Given a file new adapter
      const adapter = new InMemoryPathBasedPersistenceAdapter()

      // When the directory is listed that does not exist
      const result = await adapter.listDirectory('nonexistentDir')

      // Then an empty array should be returned
      expect(result).toEqual([])
    })
    it('should not return files in subdirectories', async () => {
      // Given a directory with some files and subdirectories
      const dirPath = 'testDir'
      const filePath1 = `${dirPath}/file1.txt`
      const filePath2 = `${dirPath}/subDir/file2.txt`
      const contents1 = 'Hello, world!'
      const contents2 = 'Hello, universe!'
      const adapter = new InMemoryPathBasedPersistenceAdapter()
      await adapter.writeFile(filePath1, contents1)
      await adapter.writeFile(filePath2, contents2)

      // When the directory is listed
      const result = await adapter.listDirectory(dirPath)

      // Then only the top-level files should be listed
      expect(result).toEqual(['file1.txt', 'subDir'])
    })
  })

  describe('findWithPattern', () => {
    it('should find files matching the pattern', async () => {
      // Given a directory with some files
      const adapter = new InMemoryPathBasedPersistenceAdapter()
      await adapter.writeFile('dir/aws/apigateway/us-east-1/restapis/aaaaa/metadata.json', 'aaaaa')
      await adapter.writeFile('dir/aws/apigateway/us-east-1/restapis/bbbbb/metadata.json', 'bbbbb')
      await adapter.writeFile('dir/aws/apigateway/us-east-2/restapis/ccccc/metadata.json', 'ccccc')

      // When the files are searched with a pattern
      const result = await adapter.findWithPattern(
        'dir/aws',
        ['apigateway', 'us-east-1', 'restapis', '*'],
        'metadata.json'
      )

      // Then the matching files should be returned
      expect(result).toEqual(['aaaaa', 'bbbbb'])
    })

    it('should support wildcards', async () => {
      // Given a directory with some files
      const adapter = new InMemoryPathBasedPersistenceAdapter()
      await adapter.writeFile('dir/aws/apigateway/us-east-1/restapis/aaaaa/metadata.json', 'aaaaa')
      await adapter.writeFile('dir/aws/apigateway/us-east-1/restapis/bbbbb/metadata.json', 'bbbbb')
      await adapter.writeFile('dir/aws/apigateway/us-east-2/restapis/ccccc/metadata.json', 'ccccc')

      // When the files are searched with a pattern
      const result = await adapter.findWithPattern(
        'dir/aws',
        ['apigateway', '*', 'restapis', '*'],
        'metadata.json'
      )

      // Then the matching files should be returned
      expect(result).toEqual(['aaaaa', 'bbbbb', 'ccccc'])
    })

    it('should return an empty array if no files match', async () => {
      // Given a directory with nothing
      const adapter = new InMemoryPathBasedPersistenceAdapter()

      // When the files are searched with a pattern that does not match
      const result = await adapter.findWithPattern(
        'dir/aws',
        ['apigateway', 'us-east-1', 'restapis', 'nonexistent'],
        'metadata.json'
      )

      // Then an empty array should be returned
      expect(result).toEqual([])
    })
  })
})
