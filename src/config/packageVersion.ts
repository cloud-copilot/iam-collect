import { IAM_COLLECT_VERSION } from './version.js'

/**
 * Get the version of the package
 */
export async function iamCollectVersion(): Promise<string> {
  return IAM_COLLECT_VERSION
}
