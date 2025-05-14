export interface PathBasedPersistenceAdapter {
  /**
   * Ensure the directory exists and write data to a file
   */
  writeFile(filePath: string, data: string | Buffer): Promise<void>

  /**
   * Write with optimistic locking: only overwrite if current hash matches lockId
   */
  writeWithOptimisticLock(filePath: string, data: string | Buffer, lockId: string): Promise<boolean>

  /**
   * Read a file’s contents; return undefined if it does not exist
   */
  readFile(filePath: string): Promise<string | undefined>

  /**
   * Read a file’s contents and compute its SHA‑256 hash; return undefined if missing
   */
  readFileWithHash(filePath: string): Promise<{ data: string; hash: string } | undefined>

  /**
   * Delete a single file; ignore if it doesn’t exist
   */
  deleteFile(filePath: string): Promise<void>

  /**
   * Recursively delete a directory; ignore if it doesn’t exist
   */
  deleteDirectory(dirPath: string): Promise<void>

  /**
   * List top‐level entries in a directory; return empty array if missing
   */
  listDirectory(dirPath: string): Promise<string[]>

  /**
   * Find files matching a pattern under baseDir, with wildcards in pathParts
   */
  findWithPattern(baseDir: string, pathParts: string[], filename: string): Promise<string[]>
}
