import { readFileSync } from 'fs'
import { join } from 'path'

let root = join(__dirname, '..', '..')
if (__dirname.endsWith('src')) {
  root = join(__dirname, '..')
}

/**
 * Get a data file from the data directory in CommonJS
 *
 * @param file the path to the file to retrieve data for.
 * @returns the data from the file
 */
export function readRelativeFile<T>(pathParts: string[]): T {
  const contents = readFileSync(join(root, ...pathParts), 'utf8')
  return JSON.parse(contents)
}

interface PackageInfo {
  version: string
}

let packageCache: PackageInfo | undefined = undefined

/**
 * Get the package data version
 *
 * @returns the package data version
 */
function getPackageData(): PackageInfo {
  if (!packageCache) {
    const packageInfo = readRelativeFile<typeof packageCache>(['package.json'])
    packageCache = packageInfo
  }
  return packageCache!
}

/**
 * Get the version of the package
 */
export function iamCollectVersion(): string {
  const data = getPackageData()
  return data.version
}
