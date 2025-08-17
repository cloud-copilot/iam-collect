import { createHash } from 'crypto'
import { access, mkdir, readFile, rmdir, stat, writeFile } from 'fs/promises'
import { join } from 'path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { FileSystemAdapter } from './FileSystemAdapter.js'

describe('FileSystemAdapter', () => {
  let adapter: FileSystemAdapter
  let testDir: string

  beforeEach(async () => {
    testDir = join(process.cwd(), 'test-fs-adapter-' + Date.now())
    await mkdir(testDir, { recursive: true })
  })

  afterEach(async () => {
    try {
      await rmdir(testDir, { recursive: true })
    } catch {
      // Ignore cleanup errors
    }
  })

  describe('constructor', () => {
    it('should create adapter with deleteData flag', () => {
      //Given a deleteData flag
      const deleteData = true

      //When creating a FileSystemAdapter
      const adapter = new FileSystemAdapter(deleteData)

      //Then the adapter should be created successfully
      expect(adapter).toBeInstanceOf(FileSystemAdapter)
    })
  })

  describe('writeFile', () => {
    beforeEach(() => {
      adapter = new FileSystemAdapter(true)
    })

    it('should write file to existing directory', async () => {
      //Given an existing directory and file content
      const filePath = join(testDir, 'test.txt')
      const content = 'Hello, World!'

      //When writing the file
      await adapter.writeFile(filePath, content)

      //Then the file should exist with correct content
      const written = await readFile(filePath, 'utf8')
      expect(written).toBe(content)
    })

    it('should create directory structure when writing file', async () => {
      //Given a nested directory path that does not exist
      const filePath = join(testDir, 'nested', 'deep', 'test.txt')
      const content = 'Test content'

      //When writing the file
      await adapter.writeFile(filePath, content)

      //Then the directory structure should be created and file written
      const written = await readFile(filePath, 'utf8')
      expect(written).toBe(content)

      const dirStat = await stat(join(testDir, 'nested', 'deep'))
      expect(dirStat.isDirectory()).toBe(true)
    })

    it('should write Buffer data to file', async () => {
      //Given Buffer data
      const filePath = join(testDir, 'buffer.bin')
      const buffer = Buffer.from('Binary data', 'utf8')

      //When writing the buffer
      await adapter.writeFile(filePath, buffer)

      //Then the file should contain the buffer data
      const written = await readFile(filePath)
      expect(written).toEqual(buffer)
    })
  })

  describe('readFile', () => {
    beforeEach(() => {
      adapter = new FileSystemAdapter(true)
    })

    it('should read existing file content', async () => {
      //Given an existing file with content
      const filePath = join(testDir, 'read-test.txt')
      const content = 'File content to read'
      await writeFile(filePath, content)

      //When reading the file
      const result = await adapter.readFile(filePath)

      //Then it should return the file content
      expect(result).toBe(content)
    })

    it('should return undefined for non-existent file', async () => {
      //Given a non-existent file path
      const filePath = join(testDir, 'non-existent.txt')

      //When reading the file
      const result = await adapter.readFile(filePath)

      //Then it should return undefined
      expect(result).toBeUndefined()
    })
  })

  describe('readFileWithHash', () => {
    beforeEach(() => {
      adapter = new FileSystemAdapter(true)
    })

    it('should read file content and compute SHA-256 hash', async () => {
      //Given an existing file with content
      const filePath = join(testDir, 'hash-test.txt')
      const content = 'Content to hash'
      await writeFile(filePath, content)

      const expectedHash = createHash('sha256').update(content).digest('hex')

      //When reading the file with hash
      const result = await adapter.readFileWithHash(filePath)

      //Then it should return content and correct hash
      expect(result).toEqual({
        data: content,
        hash: expectedHash
      })
    })

    it('should return undefined for non-existent file', async () => {
      //Given a non-existent file path
      const filePath = join(testDir, 'non-existent.txt')

      //When reading the file with hash
      const result = await adapter.readFileWithHash(filePath)

      //Then it should return undefined
      expect(result).toBeUndefined()
    })
  })

  describe('writeWithOptimisticLock', () => {
    beforeEach(() => {
      adapter = new FileSystemAdapter(true)
    })

    it('should write file when lockId matches current hash', async () => {
      //Given an existing file with known content
      const filePath = join(testDir, 'lock-test.txt')
      const originalContent = 'Original content'
      await writeFile(filePath, originalContent)

      const currentHash = createHash('sha256').update(originalContent).digest('hex')
      const newContent = 'Updated content'

      //When writing with matching lock ID
      const result = await adapter.writeWithOptimisticLock(filePath, newContent, currentHash)

      //Then the write should succeed and file should be updated
      expect(result).toBe(true)
      const written = await readFile(filePath, 'utf8')
      expect(written).toBe(newContent)
    })

    it('should fail to write when lockId does not match current hash', async () => {
      //Given an existing file with known content
      const filePath = join(testDir, 'lock-test.txt')
      const originalContent = 'Original content'
      await writeFile(filePath, originalContent)

      const incorrectHash = 'incorrect-hash'
      const newContent = 'Updated content'

      //When writing with non-matching lock ID
      const result = await adapter.writeWithOptimisticLock(filePath, newContent, incorrectHash)

      //Then the write should fail and file should remain unchanged
      expect(result).toBe(false)
      const unchanged = await readFile(filePath, 'utf8')
      expect(unchanged).toBe(originalContent)
    })

    it('should write file when it does not exist and any lockId is provided', async () => {
      //Given a non-existent file path
      const filePath = join(testDir, 'new-file.txt')
      const content = 'New file content'
      const anyLockId = 'any-lock-id'

      //When writing with optimistic lock
      const result = await adapter.writeWithOptimisticLock(filePath, content, anyLockId)

      //Then the write should succeed and file should be created
      expect(result).toBe(true)
      const written = await readFile(filePath, 'utf8')
      expect(written).toBe(content)
    })
  })

  describe('deleteFile', () => {
    it('should delete existing file when deleteData is true', async () => {
      //Given an adapter with deleteData enabled and an existing file
      adapter = new FileSystemAdapter(true)
      const filePath = join(testDir, 'delete-test.txt')
      await writeFile(filePath, 'Content to delete')

      //When deleting the file
      await adapter.deleteFile(filePath)

      //Then the file should no longer exist
      try {
        await access(filePath)
        expect.fail('File should have been deleted')
      } catch (error: any) {
        expect(error.code).toBe('ENOENT')
      }
    })

    it('should not delete file when deleteData is false', async () => {
      //Given an adapter with deleteData disabled and an existing file
      adapter = new FileSystemAdapter(false)
      const filePath = join(testDir, 'no-delete-test.txt')
      const content = 'Content to keep'
      await writeFile(filePath, content)

      //When attempting to delete the file
      await adapter.deleteFile(filePath)

      //Then the file should still exist
      const stillExists = await readFile(filePath, 'utf8')
      expect(stillExists).toBe(content)
    })

    it('should not throw error when deleting non-existent file', async () => {
      //Given an adapter and a non-existent file path
      adapter = new FileSystemAdapter(true)
      const filePath = join(testDir, 'non-existent.txt')

      //When deleting the non-existent file
      //Then it should not throw an error
      await expect(adapter.deleteFile(filePath)).resolves.not.toThrow()
    })
  })

  describe('deleteDirectory', () => {
    it('should delete existing directory when deleteData is true', async () => {
      //Given an adapter with deleteData enabled and an existing directory
      adapter = new FileSystemAdapter(true)
      const dirPath = join(testDir, 'dir-to-delete')
      await mkdir(dirPath, { recursive: true })
      await writeFile(join(dirPath, 'file.txt'), 'content')

      //When deleting the directory
      await adapter.deleteDirectory(dirPath)

      //Then the directory should no longer exist
      try {
        await access(dirPath)
        expect.fail('Directory should have been deleted')
      } catch (error: any) {
        expect(error.code).toBe('ENOENT')
      }
    })

    it('should not delete directory when deleteData is false', async () => {
      //Given an adapter with deleteData disabled and an existing directory
      adapter = new FileSystemAdapter(false)
      const dirPath = join(testDir, 'dir-to-keep')
      await mkdir(dirPath, { recursive: true })
      await writeFile(join(dirPath, 'file.txt'), 'content')

      //When attempting to delete the directory
      await adapter.deleteDirectory(dirPath)

      //Then the directory should still exist
      const dirStat = await stat(dirPath)
      expect(dirStat.isDirectory()).toBe(true)
    })

    it('should not throw error when deleting non-existent directory', async () => {
      //Given an adapter and a non-existent directory path
      adapter = new FileSystemAdapter(true)
      const dirPath = join(testDir, 'non-existent-dir')

      //When deleting the non-existent directory
      //Then it should not throw an error
      await expect(adapter.deleteDirectory(dirPath)).resolves.not.toThrow()
    })
  })

  describe('listDirectory', () => {
    beforeEach(() => {
      adapter = new FileSystemAdapter(true)
    })

    it('should list files and directories in existing directory', async () => {
      //Given a directory with files and subdirectories
      const dirPath = join(testDir, 'list-test')
      await mkdir(dirPath, { recursive: true })
      await writeFile(join(dirPath, 'file1.txt'), 'content1')
      await writeFile(join(dirPath, 'file2.txt'), 'content2')
      await mkdir(join(dirPath, 'subdir1'))
      await mkdir(join(dirPath, 'subdir2'))

      //When listing the directory
      const result = await adapter.listDirectory(dirPath)

      //Then it should return all entries
      expect(result).toHaveLength(4)
      expect(result).toContain('file1.txt')
      expect(result).toContain('file2.txt')
      expect(result).toContain('subdir1')
      expect(result).toContain('subdir2')
    })

    it('should return empty array for non-existent directory', async () => {
      //Given a non-existent directory path
      const dirPath = join(testDir, 'non-existent-dir')

      //When listing the directory
      const result = await adapter.listDirectory(dirPath)

      //Then it should return an empty array
      expect(result).toEqual([])
    })

    it('should return empty array for empty directory', async () => {
      //Given an empty directory
      const dirPath = join(testDir, 'empty-dir')
      await mkdir(dirPath, { recursive: true })

      //When listing the directory
      const result = await adapter.listDirectory(dirPath)

      //Then it should return an empty array
      expect(result).toEqual([])
    })
  })

  describe('findWithPattern', () => {
    beforeEach(() => {
      adapter = new FileSystemAdapter(true)
    })

    it('should find files matching pattern with specific path', async () => {
      //Given a directory structure with target files
      const baseDir = join(testDir, 'pattern-test')
      const targetPath = join(baseDir, 'level1', 'level2')
      await mkdir(targetPath, { recursive: true })

      const targetFile = 'target.json'
      const targetContent = '{"test": "data"}'
      await writeFile(join(targetPath, targetFile), targetContent)

      //When finding with specific path pattern
      const result = await adapter.findWithPattern(baseDir, ['level1', 'level2'], targetFile)

      //Then it should return the file content
      expect(result).toHaveLength(1)
      expect(result[0]).toBe(targetContent)
    })

    it('should find files matching pattern with wildcard', async () => {
      //Given a directory structure with multiple matching paths
      const baseDir = join(testDir, 'wildcard-test')
      await mkdir(join(baseDir, 'dir1', 'sub'), { recursive: true })
      await mkdir(join(baseDir, 'dir2', 'sub'), { recursive: true })
      await mkdir(join(baseDir, 'dir3', 'sub'), { recursive: true })

      const targetFile = 'config.json'
      const content1 = '{"config": 1}'
      const content2 = '{"config": 2}'

      await writeFile(join(baseDir, 'dir1', 'sub', targetFile), content1)
      await writeFile(join(baseDir, 'dir2', 'sub', targetFile), content2)

      //When finding with wildcard pattern
      const result = await adapter.findWithPattern(baseDir, ['*', 'sub'], targetFile)

      //Then it should return all matching file contents
      expect(result).toHaveLength(2)
      expect(result).toContain(content1)
      expect(result).toContain(content2)
    })

    it('should return empty array when no files match pattern', async () => {
      //Given a directory structure without target files
      const baseDir = join(testDir, 'no-match-test')
      await mkdir(join(baseDir, 'level1'), { recursive: true })

      //When finding with pattern that has no matches
      const result = await adapter.findWithPattern(baseDir, ['level1'], 'missing.json')

      //Then it should return an empty array
      expect(result).toEqual([])
    })

    it('should handle complex nested wildcard patterns', async () => {
      //Given a complex directory structure
      const baseDir = join(testDir, 'complex-test')
      await mkdir(join(baseDir, 'accounts', 'acc1', 'regions', 'us-east-1'), { recursive: true })
      await mkdir(join(baseDir, 'accounts', 'acc2', 'regions', 'us-west-2'), { recursive: true })

      const targetFile = 'data.json'
      const data1 = '{"account": "acc1", "region": "us-east-1"}'
      const data2 = '{"account": "acc2", "region": "us-west-2"}'

      await writeFile(join(baseDir, 'accounts', 'acc1', 'regions', 'us-east-1', targetFile), data1)
      await writeFile(join(baseDir, 'accounts', 'acc2', 'regions', 'us-west-2', targetFile), data2)

      //When finding with multiple wildcards
      const result = await adapter.findWithPattern(
        baseDir,
        ['accounts', '*', 'regions', '*'],
        targetFile
      )

      //Then it should return all matching files
      expect(result).toHaveLength(2)
      expect(result).toContain(data1)
      expect(result).toContain(data2)
    })

    it('should exclude target filename from directory listings', async () => {
      //Given a directory structure where target filename exists as a directory
      const baseDir = join(testDir, 'exclude-test')
      const targetFile = 'data.json'

      await mkdir(join(baseDir, 'level1', targetFile), { recursive: true }) // Directory with same name as target file
      await mkdir(join(baseDir, 'level1', 'valid-dir'), { recursive: true })

      const validContent = '{"valid": true}'
      await writeFile(join(baseDir, 'level1', 'valid-dir', targetFile), validContent)

      //When finding with wildcard that should exclude the filename directory
      const result = await adapter.findWithPattern(baseDir, ['level1', '*'], targetFile)

      //Then it should only return content from valid directory, not the filename directory
      expect(result).toHaveLength(1)
      expect(result[0]).toBe(validContent)
    })
  })
})
