import { createHash } from 'crypto'
import { PathBasedPersistenceAdapter } from './PathBasedPersistenceAdapter.js'

export class InMemoryPathBasedPersistenceAdapter implements PathBasedPersistenceAdapter {
  private fileSystem: Record<string, string> = {}

  async writeFile(filePath: string, data: string | Buffer): Promise<void> {
    this.fileSystem[filePath] = data.toString()
  }

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

  async readFile(filePath: string): Promise<string | undefined> {
    return this.fileSystem[filePath]
  }

  async readFileWithHash(filePath: string): Promise<{ data: string; hash: string } | undefined> {
    const contents = this.fileSystem[filePath]
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
    delete this.fileSystem[filePath]
  }

  async deleteDirectory(dirPath: string): Promise<void> {
    for (const key in this.fileSystem) {
      if (key.startsWith(dirPath + '/')) {
        delete this.fileSystem[key]
      }
    }
  }

  async listDirectory(dirPath: string): Promise<string[]> {
    const keys = Object.keys(this.fileSystem).filter((key) => key.startsWith(dirPath + '/'))
    const allMatches = new Set(
      keys.map(
        (key) =>
          key
            .slice(dirPath.length + 1)
            .split('/')
            .at(0)!
      )
    )
    return Array.from(allMatches)
  }

  async findWithPattern(baseDir: string, pathParts: string[], filename: string): Promise<string[]> {
    //convert the parts to a regex where some parts may have "*"
    const regexParts = pathParts.map((part) => {
      if (part === '*') {
        return '[^/]+'
      }
      return part
    })
    const regex = new RegExp(`^${baseDir}/(${regexParts.join('/')})/${filename}$`)
    const result: string[] = []
    for (const key in this.fileSystem) {
      if (regex.test(key)) {
        result.push(this.fileSystem[key])
      }
    }
    return result
  }
}
