import { consistentStringify } from '../utils/json.js'
import { type StorageClientOptions } from './AwsIamStore.js'

/**
 * A function that stringifies JSON data for storage.
 */
export type StorageStringifier = (data: any) => string

/**
 * Create a JSON stringifier function for storage client writes.
 *
 * @param options - Options controlling storage client behavior.
 * @returns A stringifier function for the configured JSON serialization mode.
 */
export function createStorageStringifier(options: StorageClientOptions = {}): StorageStringifier {
  if (options.jsonSerialization === 'passthrough') {
    return (data: any): string => JSON.stringify(data, null, 2)
  }

  return consistentStringify
}
