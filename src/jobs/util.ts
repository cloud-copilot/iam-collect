import { cpus } from 'os'

/**
 * Calculate the default concurrency level for downloading.
 *
 * @returns The default concurrency level based on the number of CPU cores.
 */
export function defaultConcurrency(): number {
  const numCpus = cpus().length || 1
  return Math.min(50, Math.max(1, numCpus * 2))
}
