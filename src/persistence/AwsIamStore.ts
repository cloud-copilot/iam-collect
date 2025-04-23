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

  /**
   * Specific metadata to filter the resources by.
   */
  metadata?: Record<string, string>
}

export type OrganizationPolicyType = 'scps' | 'rcps'

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

  /**
   * Delete metadata for an AWS Account
   *
   * @param accountId the AWS account ID
   * @param metadataType the type of metadata to delete (e.g., "metadata")
   */
  deleteAccountMetadata(accountId: string, metadataType: string): Promise<void>

  /**
   * Save metadata for an AWS Account
   *
   * @param accountId The AWS account ID.
   * @param metadataType The type of metadata to save (e.g., "metadata").
   * @param data - The metadata content to save as an object.
   */
  saveAccountMetadata(accountId: string, metadataType: string, data: any): Promise<void>

  /**
   * Get metadata for an AWS Account
   *
   * @param accountId the AWS account ID
   * @param metadataType the type of metadata to retrieve (e.g., "metadata")
   * @param defaultValue the default value to return if the metadata is not found
   */
  getAccountMetadata<T, D extends T>(
    accountId: string,
    metadataType: string,
    defaultValue?: D
  ): Promise<D extends undefined ? T | undefined : T>

  /**
   * Save metadata for an AWS Organization
   *
   * @param organizationId - The AWS organization ID.
   * @param metadataType - The type of metadata to save (e.g., "metadata").
   * @param data - The metadata content to save an an object.
   */
  saveOrganizationMetadata(organizationId: string, metadataType: string, data: any): Promise<void>

  /**
   * Delete metadata for an AWS Organization
   *
   * @param organizationId - The AWS organization ID.
   * @param metadataType - The type of metadata to delete (e.g., "metadata").
   */
  deleteOrganizationMetadata(organizationId: string, metadataType: string): Promise<void>

  /**
   * List the Organizational Units (OUs) that have been saved for a given organization.
   *
   * @param organizationId - The AWS organization ID.
   */
  listOrganizationalUnits(organizationId: string): Promise<string[]>

  /**
   * Save metadata for an Organizational Unit (OU) within an AWS Organization.
   *
   * @param organizationId - The AWS organization ID.
   * @param ouId - The AWS ID of the Organizational Unit.
   * @param metadataType - The type of metadata to save (e.g., "metadata").
   * @param data - The metadata content to save as an object.
   */
  saveOrganizationalUnitMetadata(
    organizationId: string,
    ouId: string,
    metadataType: string,
    data: any
  ): Promise<void>

  /**
   * Delete metadata for an Organizational Unit (OU) within an AWS Organization.
   *
   * @param organizationId - The AWS organization ID.
   * @param ouId - The AWS ID of the Organizational Unit.
   * @param metadataType - The type of metadata to delete (e.g., "metadata").
   */
  deleteOrganizationalUnitMetadata(
    organizationId: string,
    ouId: string,
    metadataType: string
  ): Promise<void>

  /**
   * Get metadata for an Organizational Unit (OU) within an AWS Organization.
   *
   * @param organizationId - The AWS organization ID.
   * @param ouId - The AWS ID of the Organizational Unit.
   * @param metadataType - The type of metadata to retrieve (e.g., "metadata").
   * @param defaultValue - The default value to return if the metadata is not found.
   */
  getOrganizationalUnitMetadata<T, D extends T>(
    organizationId: string,
    ouId: string,
    metadataType: string,
    defaultValue?: D
  ): Promise<D extends undefined ? T | undefined : T>

  /**
   * Delete an Organizational Unit (OU) from an AWS Organization.
   *
   * @param organizationId - The AWS organization ID.
   * @param ouId - The AWS ID of the Organizational Unit.
   */
  deleteOrganizationalUnit(organizationId: string, ouId: string): Promise<void>

  /**
   * Delete metadata for an Organization Policy.
   *
   * @param organizationId the AWS organization ID
   * @param policyType the type of policy (e.g., "scps", "rcps")
   * @param policyId the ID of the policy to delete metadata for
   * @param metadataType the type of metadata to delete (e.g., "metadata")
   */
  deleteOrganizationPolicyMetadata(
    organizationId: string,
    policyType: OrganizationPolicyType,
    policyId: string,
    metadataType: string
  ): Promise<void>

  /**
   *
   * @param organizationId the AWS organization ID
   * @param policyType the type of policy (e.g., "scps", "rcps")
   * @param policyId the ID of the policy to save metadata for
   * @param metadataType the type of metadata to save (e.g., "metadata")
   * @param data the content to save
   */
  saveOrganizationPolicyMetadata(
    organizationId: string,
    policyType: OrganizationPolicyType,
    policyId: string,
    metadataType: string,
    data: any
  ): Promise<void>

  /**
   * Get metadata for an Organization Policy.
   *
   * @param organizationId the AWS organization ID
   * @param policyType the type of policy (e.g., "scps", "rcps")
   * @param policyId the ID of the policy to retrieve metadata for
   * @param metadataType the type of metadata to retrieve (e.g., "metadata")
   * @param defaultValue the default value to return if the metadata is not found
   */
  getOrganizationPolicyMetadata<T, D extends T>(
    organizationId: string,
    policyType: OrganizationPolicyType,
    policyId: string,
    metadataType: string,
    defaultValue?: D
  ): Promise<D extends undefined ? T | undefined : T>

  /**
   * Delete an Organization Policy.
   *
   * @param organizationId the AWS organization ID
   * @param policyType the type of policy (e.g., "scps", "rcps")
   * @param policyId the ID of the policy to delete
   */
  deleteOrganizationPolicy(
    organizationId: string,
    policyType: OrganizationPolicyType,
    policyId: string
  ): Promise<void>

  /**
   * List the Organization Policies for a given organization and type
   *
   * @param organizationId the AWS organization ID
   * @param policyType the type of policy (e.g., "scps", "rcps")
   * @returns An array of policy IDs
   */
  listOrganizationPolicies(
    organizationId: string,
    policyType: OrganizationPolicyType
  ): Promise<string[]>
}
