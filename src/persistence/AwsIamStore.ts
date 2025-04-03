/**
 * The parts of the a resource type that can be used for categories.
 */
export interface ResourceTypeParts {
  /**
   * The AWS partition (e.g., "aws", "aws-cn", "aws-gov").
   */
  partition?: string

  /**
   * Optional AWS account ID. This can be used to specify a particular account.
   */
  account?: string

  /**
   * The AWS service (e.g., "iam", "s3", "ec2").
   */
  service: string

  /**
   * For regional services, this should be specified.
   */
  region?: string

  /**
   * The type of resource being referenced (e.g., "roles", "users", "buckets").
   *
   * Optional for for legacy resource types like s3 buckets or sqs queues where the resource type is not explicitly defined in the ARN.
   */
  resourceType?: string
}

/**
 * An interface for persisting AWS resource metadata.
 * Implementations can be backed by S3 or the local file system.
 */
export interface AwsIamStore {
  /**
   * Saves metadata for a given AWS resource.
   *
   * If the data is any form of empty content (undefined, null, empty string, empty object, or empty array)
   * then the data will not be persisted and the existing metadata for that key will be deleted instead.
   *
   * @param accountId - The AWS account ID where the resource exists.
   * @param arn - The ARN of the resource.
   * @param metadataType - A key representing the metadata type (e.g., "trust-policy", "inline-policies").
   * @param data - The metadata content to save (as a string or Buffer).
   */
  saveResourceMetadata(
    accountId: string,
    arn: string,
    metadataType: string,
    data: string | any
  ): Promise<void>

  /**
   * Retrieves a list of metadata types for a given AWS resource.
   *
   * @param accountId - The AWS account ID where the resource exists.
   * @param arn - The ARN of the resource.
   * @returns An array of metadata types (e.g., ["trust-policy", "inline-policies"]).
   */
  listResourceMetadata(accountId: string, arn: string): Promise<string[]>

  /**
   * Retrieves metadata for a given AWS resource.
   *
   * @param accountId - The AWS account ID where the resource exists.
   * @param arn - The ARN of the resource.
   * @param metadataType - The key representing the metadata type.
   * @returns The content of the metadata, as a string.
   */
  getResourceMetadata<T, D extends T>(
    accountId: string,
    arn: string,
    metadataType: string,
    defaultValue?: D
  ): Promise<D extends undefined ? T | undefined : T>

  /**
   * Deletes metadata for a given AWS resource.
   *
   * @param accountId - The AWS account ID where the resource exists.
   * @param arn - The ARN of the resource.
   * @param metadataType - The metadata type to delete.
   */
  deleteResourceMetadata(accountId: string, arn: string, metadataType: string): Promise<void>

  /**
   * Deletes all data for a given AWS resource
   *
   * @param accountId - The AWS account ID where the resource exists.
   * @param arn - The ARN of the resource.
   */
  deleteResource(accountId: string, arn: string): Promise<void>

  /**
   * Lists resources based on partition, account, service, region, and resource type.
   *
   * @param accountId - The AWS account ID to list resources for.
   * @param options - the resource type parts to list resources for.
   * @returns A list of resource identifiers (e.g., role names or ARNs).
   */
  listResources(accountId: string, options: ResourceTypeParts): Promise<string[]>

  /**
   * Synchronizes the list of stored resources with the provided list.
   * This method can be used to remove resources that no longer exist in the account.
   *
   * @param accountId - The AWS account ID to list resources for.
   * @param options - the resource type parts to sync in advance
   * @param desiredResources - The list of resource arns that should exist.
   */
  syncResourceList(
    accountId: string,
    options: ResourceTypeParts,
    desiredResources: string[]
  ): Promise<void>
}
