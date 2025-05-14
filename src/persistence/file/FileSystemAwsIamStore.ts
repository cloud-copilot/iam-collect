import { join, sep } from 'path'
import { splitArnParts } from '../../utils/arn.js'
import { AwsIamStore, OrganizationPolicyType, ResourceTypeParts } from '../AwsIamStore.js'
import { resourcePrefix, resourceTypePrefix } from '../util.js'
import { FileSystemAdapter } from './FileSystemAdapter.js'

export class FileSystemAwsIamStore implements AwsIamStore {
  private fsAdapter: FileSystemAdapter

  constructor(
    private readonly baseFolder: string,
    private readonly partition: string,
    fsAdapter?: FileSystemAdapter
  ) {
    this.baseFolder = join(baseFolder, 'aws', partition)
    this.fsAdapter = fsAdapter || new FileSystemAdapter()
  }

  private organizationPath(organizationId: string): string {
    return join(this.baseFolder, 'organizations', organizationId).toLowerCase()
  }

  private organizationMetadataPath(organizationId: string, metadataType: string): string {
    return join(this.organizationPath(organizationId), `${metadataType}.json`).toLowerCase()
  }

  private organizationalUnitsPath(organizationId: string): string {
    return join(this.organizationPath(organizationId), 'ous').toLowerCase()
  }

  private organizationalUnitPath(organizationId: string, ouId: string): string {
    return join(this.organizationalUnitsPath(organizationId), ouId).toLowerCase()
  }

  private organizationPoliciesPath(
    organizationId: string,
    policyType: OrganizationPolicyType
  ): string {
    return join(this.organizationPath(organizationId), policyType).toLowerCase()
  }

  private organizationPolicyPath(
    organizationId: string,
    policyType: OrganizationPolicyType,
    policyId: string
  ): string {
    return join(this.organizationPoliciesPath(organizationId, policyType), policyId).toLowerCase()
  }

  private organizationPolicyMetadataPath(
    organizationId: string,
    policyType: OrganizationPolicyType,
    policyId: string,
    metadataType: string
  ): string {
    return join(
      this.organizationPolicyPath(organizationId, policyType, policyId),
      `${metadataType}.json`
    ).toLowerCase()
  }

  private organizationalUnitMetadataPath(
    organizationId: string,
    ouId: string,
    metadataType: string
  ): string {
    return join(
      this.organizationalUnitPath(organizationId, ouId),
      `${metadataType}.json`
    ).toLowerCase()
  }

  private accountsPath(): string {
    return join(this.baseFolder, 'accounts')
  }

  private accountPath(accountId: string): string {
    return join(this.accountsPath(), accountId).toLowerCase()
  }

  private accountMetadataPath(accountId: string, metadataType: string): string {
    return join(this.accountPath(accountId), `${metadataType}.json`).toLowerCase()
  }

  private buildResourcePath(accountId: string, arn: string): string {
    return resourcePrefix(this.accountPath(accountId), arn, sep).toLowerCase()
  }

  private buildMetadataPath(accountId: string, arn: string, metadataType: string): string {
    const prefix = this.buildResourcePath(accountId, arn)
    return join(prefix, `${metadataType}.json`).toLowerCase()
  }

  /**
   * Root RAM folder for a given account.
   */
  private ramRootPath(accountId: string): string {
    return join(this.accountPath(accountId), 'ram')
  }

  /**
   * Folder under ramRootPath for a specific region (or 'global').
   */
  private ramRegionPath(accountId: string, region: string | undefined): string {
    // normalize region or use 'global'
    const rg = region && region.trim() != '' ? region.toLowerCase() : 'global'
    return join(this.ramRootPath(accountId), rg)
  }

  /**
   * File name for a given resource ARN: replace ':' and '/' with '-'
   */
  private ramFileNameForArn(arn: string): string {
    return arn.replace(/[:/]/g, '-').toLowerCase() + '.json'
  }

  /**
   * Full path to the RAM policy file for this ARN in region.
   */
  private ramPolicyFilePath(accountId: string, region: string | undefined, arn: string): string {
    return join(this.ramRegionPath(accountId, region), this.ramFileNameForArn(arn))
  }

  /**
   * Get the path to the indexes directory.
   *
   * @returns The path to the indexes directory.
   */
  private indexesPath(): string {
    return join(this.baseFolder, 'indexes')
  }

  /**
   * The path to the index file for a given index name.
   *
   * @param indexName the name of the index
   * @returns The path to the index file.
   */
  private indexPath(indexName: string): string {
    return join(this.indexesPath(), `${indexName}.json`).toLowerCase()
  }

  async saveResourceMetadata(
    accountId: string,
    arn: string,
    metadataType: string,
    data: string | any
  ): Promise<void> {
    const filePath = this.buildMetadataPath(accountId, arn, metadataType)
    await this.saveOrDeleteFile(filePath, data)
  }

  async listResourceMetadata(accountId: string, arn: string): Promise<string[]> {
    // List all files in the resource directory to find metadata types
    const dirPath = this.buildResourcePath(accountId, arn)
    const files = await this.fsAdapter.listDirectory(dirPath)
    // Filter for files that match the pattern of *.json
    const metadataTypes = files
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace('.json', '')) // Remove the .json extension

    return metadataTypes
  }

  async getResourceMetadata<T, D extends T>(
    accountId: string,
    arn: string,
    metadataType: string,
    defaultValue?: D
  ): Promise<D extends undefined ? T | undefined : T> {
    const filePath = this.buildMetadataPath(accountId, arn, metadataType)
    return this.contentOrDefault(filePath, defaultValue)
  }

  async deleteResourceMetadata(
    accountId: string,
    arn: string,
    metadataType: string
  ): Promise<void> {
    const filePath = this.buildMetadataPath(accountId, arn, metadataType)
    await this.fsAdapter.deleteFile(filePath)
  }

  async deleteResource(accountId: string, arn: string): Promise<void> {
    const dirPath = this.buildResourcePath(accountId, arn)
    await this.fsAdapter.deleteDirectory(dirPath)
  }

  async listResources(accountId: string, options: ResourceTypeParts): Promise<string[]> {
    const dirPath = resourceTypePrefix(this.accountPath(accountId), { ...options }, sep)
    return await this.fsAdapter.listDirectory(dirPath)
  }

  async findResourceMetadata<T>(accountId: string, options: ResourceTypeParts): Promise<T[]> {
    let searchBase = this.accountPath(accountId)

    const pathParts = [options.service]
    if (options.region) {
      pathParts.push(options.region)
    }
    if (options.resourceType) {
      pathParts.push(options.resourceType)
    }
    pathParts.push('*')

    const strings = await this.fsAdapter.findWithPattern(searchBase, pathParts, 'metadata.json')

    return strings.map((s) => JSON.parse(s))
  }

  async syncResourceList(
    accountId: string,
    options: ResourceTypeParts,
    desiredResources: string[]
  ): Promise<void> {
    const dirPath = resourceTypePrefix(this.accountPath(accountId), { ...options }, sep)
    const existingSubDirs = (await this.fsAdapter.listDirectory(dirPath)).map((subDir) =>
      join(dirPath, subDir)
    )

    let filteredSubDirs: string[] = existingSubDirs

    if (options.metadata && Object.keys(options.metadata).length > 0) {
      filteredSubDirs = []
      // If metadata is provided, filter existing sub dirs based on metadata
      const metadataFilter = (metadataString: string | undefined) => {
        if (!metadataString) {
          return false
        }
        const metadata = JSON.parse(metadataString)
        return Object.entries(options.metadata!).every(([key, value]) => metadata[key] === value)
      }

      for (const subDir of existingSubDirs) {
        const metadata = await this.fsAdapter.readFile(join(subDir, `metadata.json`))
        if (metadataFilter(metadata)) {
          filteredSubDirs.push(subDir)
        }
      }
    }

    const desiredDirs = new Set(
      desiredResources.map((desiredArn) => {
        const resourceDir = this.buildResourcePath(accountId, desiredArn)
        return resourceDir
      })
    )

    // Identify resources that exist in storage but not in desiredResources.
    const resourcesToDelete = filteredSubDirs.filter((s) => !desiredDirs.has(s))

    for (const resource of resourcesToDelete) {
      await this.fsAdapter.deleteDirectory(resource)
    }
  }

  async deleteAccountMetadata(accountId: string, metadataType: string): Promise<void> {
    const filePath = this.accountMetadataPath(accountId, metadataType)
    await this.fsAdapter.deleteFile(filePath)
  }

  async saveAccountMetadata(accountId: string, metadataType: string, data: any): Promise<void> {
    const filePath = this.accountMetadataPath(accountId, metadataType)
    await this.saveOrDeleteFile(filePath, data)
  }

  async getAccountMetadata<T, D extends T>(
    accountId: string,
    metadataType: string,
    defaultValue?: D
  ): Promise<D extends undefined ? T | undefined : T> {
    const filePath = this.accountMetadataPath(accountId, metadataType)
    return this.contentOrDefault(filePath, defaultValue)
  }

  async getOrganizationMetadata<T, D extends T>(
    organizationId: string,
    metadataType: string,
    defaultValue?: D
  ): Promise<D extends undefined ? T | undefined : T> {
    const filePath = this.organizationMetadataPath(organizationId, metadataType)
    return this.contentOrDefault(filePath, defaultValue)
  }

  async saveOrganizationMetadata(
    organizationId: string,
    metadataType: string,
    data: any
  ): Promise<void> {
    const filePath = this.organizationMetadataPath(organizationId, metadataType)
    await this.saveOrDeleteFile(filePath, data)
  }

  async deleteOrganizationMetadata(organizationId: string, metadataType: string): Promise<void> {
    const filePath = this.organizationMetadataPath(organizationId, metadataType)
    await this.fsAdapter.deleteFile(filePath)
  }

  async listOrganizationalUnits(organizationId: string): Promise<string[]> {
    const dirPath = this.organizationalUnitsPath(organizationId)
    return await this.fsAdapter.listDirectory(dirPath)
  }

  async deleteOrganizationalUnitMetadata(
    organizationId: string,
    ouId: string,
    metadataType: string
  ): Promise<void> {
    const filePath = this.organizationalUnitMetadataPath(organizationId, ouId, metadataType)
    await this.fsAdapter.deleteFile(filePath)
  }

  async saveOrganizationalUnitMetadata(
    organizationId: string,
    ouId: string,
    metadataType: string,
    data: any
  ): Promise<void> {
    const filePath = this.organizationalUnitMetadataPath(organizationId, ouId, metadataType)
    await this.saveOrDeleteFile(filePath, data)
  }

  async getOrganizationalUnitMetadata<T, D extends T>(
    organizationId: string,
    ouId: string,
    metadataType: string,
    defaultValue?: D
  ): Promise<D extends undefined ? T | undefined : T> {
    const filePath = this.organizationalUnitMetadataPath(organizationId, ouId, metadataType)
    return this.contentOrDefault(filePath, defaultValue)
  }

  async deleteOrganizationalUnit(organizationId: string, ouId: string): Promise<void> {
    const dirPath = this.organizationalUnitPath(organizationId, ouId)
    await this.fsAdapter.deleteDirectory(dirPath)
  }

  async deleteOrganizationPolicyMetadata(
    organizationId: string,
    policyType: OrganizationPolicyType,
    policyId: string,
    metadataType: string
  ): Promise<void> {
    const filePath = this.organizationPolicyMetadataPath(
      organizationId,
      policyType,
      policyId,
      metadataType
    )
    await this.fsAdapter.deleteFile(filePath)
  }

  async saveOrganizationPolicyMetadata(
    organizationId: string,
    policyType: OrganizationPolicyType,
    policyId: string,
    metadataType: string,
    data: any
  ): Promise<void> {
    const filePath = this.organizationPolicyMetadataPath(
      organizationId,
      policyType,
      policyId,
      metadataType
    )
    await this.saveOrDeleteFile(filePath, data)
  }

  async getOrganizationPolicyMetadata<T, D extends T>(
    organizationId: string,
    policyType: OrganizationPolicyType,
    policyId: string,
    metadataType: string,
    defaultValue?: D
  ): Promise<D extends undefined ? T | undefined : T> {
    const filePath = this.organizationPolicyMetadataPath(
      organizationId,
      policyType,
      policyId,
      metadataType
    )
    return this.contentOrDefault(filePath, defaultValue)
  }

  async deleteOrganizationPolicy(
    organizationId: string,
    policyType: OrganizationPolicyType,
    policyId: string
  ): Promise<void> {
    const dirPath = this.organizationPolicyPath(organizationId, policyType, policyId)
    await this.fsAdapter.deleteDirectory(dirPath)
  }

  async listOrganizationPolicies(
    organizationId: string,
    policyType: OrganizationPolicyType
  ): Promise<string[]> {
    const dirPath = this.organizationPoliciesPath(organizationId, policyType)
    return await this.fsAdapter.listDirectory(dirPath)
  }

  async syncRamResources(
    accountId: string,
    region: string | undefined,
    arns: string[]
  ): Promise<void> {
    const dirPath = this.ramRegionPath(accountId, region)

    const files = await this.fsAdapter.listDirectory(dirPath)
    const keepSet = new Set(arns.map((a) => this.ramFileNameForArn(a)))

    for (const file of files) {
      if (!keepSet.has(file.toLowerCase())) {
        await this.fsAdapter.deleteFile(join(dirPath, file))
      }
    }
  }

  async saveRamResource(accountId: string, arn: string, data: any): Promise<void> {
    const region = splitArnParts(arn).region
    const filePath = this.ramPolicyFilePath(accountId, region, arn)
    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    await this.fsAdapter.writeFile(filePath, content)
  }

  async getRamResource<T, D extends T>(
    accountId: string,
    arn: string,
    defaultValue?: D
  ): Promise<D extends undefined ? T | undefined : T> {
    const region = splitArnParts(arn).region
    const filePath = this.ramPolicyFilePath(accountId, region, arn)
    return this.contentOrDefault(filePath, defaultValue)
  }

  async listAccountIds(): Promise<string[]> {
    return this.fsAdapter.listDirectory(this.accountsPath())
  }

  async getIndex<T>(indexName: string, defaultValue: T): Promise<{ data: T; lockId: string }> {
    const filePath = this.indexPath(indexName)
    const contents = await this.fsAdapter.readFileWithHash(filePath)

    if (contents) {
      return { data: JSON.parse(contents.data), lockId: contents.hash }
    }

    return { data: defaultValue, lockId: '' }
  }

  async saveIndex(indexName: string, data: any, lockId: string): Promise<boolean> {
    const filePath = this.indexPath(indexName)
    return this.fsAdapter.writeWithOptimisticLock(filePath, JSON.stringify(data, null, 2), lockId)
  }

  /**
   * Checks if a given content value is empty.
   *
   * @param content The content to check.
   * @returns true if the content is empty, false otherwise.
   */
  private isEmptyContent(content: any): boolean {
    return (
      content === undefined ||
      content === null ||
      content === '' ||
      content === '{}' ||
      content === '[]' ||
      (Array.isArray(content) && content.length === 0) ||
      (typeof content === 'object' && Object.keys(content).length === 0)
    )
  }

  /**
   * Read the content of a file or return a default value if the file does not exist.
   *
   * @param filePath the path to the file
   * @param defaultValue the default value to return if the file does not exist
   * @returns the content of the file or the default value
   */
  private async contentOrDefault<T, D extends T>(
    filePath: string,
    defaultValue?: T
  ): Promise<D extends undefined ? T | undefined : T> {
    const contents = await this.fsAdapter.readFile(filePath)
    if (!contents) {
      return defaultValue as T
    }
    return JSON.parse(contents) as T
  }

  /**
   * Either saves the provided data to a file or deletes the file if the data is empty.
   *
   * @param filePath the path to the file
   * @param data the data to save in the file
   */
  private async saveOrDeleteFile(filePath: string, data: any): Promise<void> {
    if (typeof data === 'string') {
      data = data.trim()
    }
    if (this.isEmptyContent(data)) {
      await this.fsAdapter.deleteFile(filePath)
      return
    }

    const content = typeof data === 'string' ? data : JSON.stringify(data, null, 2)
    await this.fsAdapter.writeFile(filePath, content)
  }
}
