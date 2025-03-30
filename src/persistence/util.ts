import { splitArnParts } from '../utils/arn.js'

/**
 * Generate a resource prefix given a starting path, a resource ARN, and a separator.
 * The function uses splitArnParts to get the parts of the ARN and then joins each non-empty part
 * with the provided separator. The last segment (resourcePath) is URL encoded.
 *
 * @param startingPath - The starting path (e.g. a base folder)
 * @param resourceArn - The full resource ARN.
 * @param separator - The separator to use (e.g. '/' or '-').
 * @returns A string that represents the resource prefix.
 */
export function resourcePrefix(
  startingPath: string,
  resourceArn: string,
  separator: string
): string {
  const parts = splitArnParts(resourceArn)

  return joinPathParts(
    [
      startingPath,
      parts.partition,
      parts.service,
      parts.region,
      parts.accountId,
      parts.resourceType,
      parts.resourcePath ? encodeURIComponent(parts.resourcePath.trim()) : undefined
    ],
    separator
  )
}

/**
 * Generate a resource type prefix based on the provided starting path and resource type parts.
 *
 * @param startingPath - The starting path (e.g. a base folder)
 * @param parts - An object containing the components of the resource type
 * @param separator - the separator to use for joining the parts. This could be '/' or any other string.
 * @returns A string that represents the resource type prefix.
 */
export function resourceTypePrefix(
  startingPath: string,
  parts: {
    partition: string
    account?: string
    service: string
    region?: string
    resourceType?: string
  },
  separator: string
): string {
  return joinPathParts(
    [startingPath, parts.partition, parts.service, parts.region, parts.account, parts.resourceType],
    separator
  )
}

export function joinPathParts(parts: (string | undefined)[], separator: string): string {
  // Filter out undefined or empty strings
  const filteredParts = parts.filter((part) => part !== undefined && part.trim() !== '')
  // Join the remaining parts with a '/'
  return filteredParts.join(separator)
}
