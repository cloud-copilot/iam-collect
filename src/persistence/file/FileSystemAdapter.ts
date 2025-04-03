import { access, mkdir, readdir, readFile, rm, unlink, writeFile } from 'fs/promises'
import { dirname } from 'path'

export class FileSystemAdapter {
  async writeFile(filePath: string, data: string | Buffer): Promise<void> {
    // Ensure the directory exists
    const dir = dirname(filePath)
    await mkdir(dir, { recursive: true })
    await writeFile(filePath, data)
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

  async deleteFile(filePath: string): Promise<void> {
    try {
      await unlink(filePath)
    } catch (err: any) {
      if (err.code !== 'ENOENT') {
        throw err
      }
    }
  }

  async deleteDirectory(dirPath: string): Promise<void> {
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
}
