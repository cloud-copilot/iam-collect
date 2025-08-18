import { createHash } from 'crypto'
import { access, mkdir, readdir, readFile, rm, unlink, writeFile } from 'fs/promises'
import { dirname, join } from 'path'
import { PathBasedPersistenceAdapter } from '../PathBasedPersistenceAdapter.js'

export class FileSystemAdapter implements PathBasedPersistenceAdapter {
  constructor(private readonly deleteData: boolean) {}

  async writeFile(filePath: string, data: string | Buffer): Promise<void> {
    // Ensure the directory exists
    const dir = dirname(filePath)
    await mkdir(dir, { recursive: true })
    await writeFile(filePath, data)
  }

  /**
   * Write the contents of a file. If the file already exists, it will be overwritten if the
   * lock ID matches the current hash of the file.
   *
   * @param filePath The path to the file to write
   * @param data The data to write to the file
   */
  async writeWithOptimisticLock(
    filePath: string,
    data: string | Buffer,
    lockId: string
  ): Promise<boolean> {
    const currentData = await this.readFileWithHash(filePath)
    if (currentData && currentData.hash !== lockId) {
      return false
    }
    await this.writeFile(filePath, data)
    return true
  }

  /**
   * Read the contents of a file. If the file does not exist, return undefined.
   *
   * @param filePath The path to the file to read
   * @returns The contents of the file as a string, or undefined if the file does not exist.
   */
  async readFile(filePath: string): Promise<string | undefined> {
    try {
      await access(filePath)
    } catch (err: any) {
      // If the file does not exist, return undefined
      return undefined
    }
    return await readFile(filePath, { encoding: 'utf8' })
  }

  /**
   * Read the contents of a file and compute its SHA-256 hash. If the file does not exist, return undefined.
   *
   * @param filePath The path to the file to read
   * @returns An object containing the contents of the file as a string and its SHA-256 hash as a hex string, or undefined if the file does not exist.
   */
  async readFileWithHash(filePath: string): Promise<{ data: string; hash: string } | undefined> {
    const contents = await this.readFile(filePath)
    if (!contents) {
      return undefined
    }

    const hash = createHash('sha256')
    hash.update(contents)

    return {
      data: contents,
      hash: hash.digest('hex')
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    if (!this.deleteData) {
      return
    }
    try {
      await unlink(filePath)
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        throw err
      }
    }
  }

  async deleteDirectory(dirPath: string): Promise<void> {
    if (!this.deleteData) {
      return
    }
    try {
      await rm(dirPath, { recursive: true, force: true })
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        throw err
      }
    }
  }

  /**
   * List the contents of a directory. Will return the names of the subdirectories and files without the full path.
   *
   * @param dirPath The path to the directory to list
   * @returns An array of strings representing the names of the subdirectories or files in the specified directory.
   */
  async listDirectory(dirPath: string): Promise<string[]> {
    try {
      await access(dirPath)
    } catch (err: any) {
      // If the directory does not exist, return an empty array
      return []
    }

    try {
      const entries = await readdir(dirPath, { withFileTypes: true })
      // return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name)
      return entries.map((e) => e.name)
    } catch (err: any) {
      if (err.code === 'ENOENT') {
        return []
      }
      throw err
    }
  }

  /**
   * Find files based on a pattern of directories and a filename. The pattern can include wildcards (*) to match any directory.
   *
   * @param baseDir the base directory to start searching from
   * @param pathParts the parts of the path to search for, where '*' can be used as a wildcard
   * @param filename the name of the file to search for
   * @returns an array of strings representing the paths to the files that match the pattern and filename
   */
  async findWithPattern(baseDir: string, pathParts: string[], filename: string): Promise<string[]> {
    let baseDirs = [baseDir]
    for (const part of pathParts) {
      if (part == '*') {
        const subDirs = []
        for (const dir of baseDirs) {
          const entries = await this.listDirectory(dir)
          for (const entry of entries) {
            if (entry !== filename) {
              subDirs.push(join(dir, entry))
            }
          }
        }
        baseDirs = subDirs
      } else {
        baseDirs = baseDirs.map((dir) => join(dir, part))
      }
    }

    const results: string[] = []
    for (const dir of baseDirs) {
      const data = await this.readFile(join(dir, filename))
      if (data) {
        results.push(data)
      }
    }

    return results
  }
}
