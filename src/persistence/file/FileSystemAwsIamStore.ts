import { join, sep } from 'path'
import { AwsIamStore, ResourceTypeParts } from '../AwsIamStore.js'
import { resourcePrefix, resourceTypePrefix } from '../util.js'
import { FileSystemAdapter } from './FileSystemAdapter'

export class FileSystemAwsIamStore implements AwsIamStore {
  private fsAdapter: FileSystemAdapter

  constructor(
    private readonly baseFolder: string,
    private readonly partition: string,
    fsAdapter?: FileSystemAdapter
  ) {
    console.log(
      `Initializing FileSystemAwsIamStore with baseFolder: ${baseFolder}, partition: ${partition}`
    )
    this.baseFolder = join(baseFolder, 'aws', partition)
    this.fsAdapter = fsAdapter || new FileSystemAdapter()
  }

  private accountPath(accountId: string): string {
    return join(this.baseFolder, 'accounts', accountId)
  }

  private buildResourcePath(accountId: string, arn: string): string {
    return resourcePrefix(this.accountPath(accountId), arn, sep)
  }

  private buildMetadataPath(accountId: string, arn: string, metadataType: string): string {
    const prefix = this.buildResourcePath(accountId, arn)
    return join(prefix, `${metadataType}.json`)
  }

  async saveResourceMetadata(
    accountId: string,
    arn: string,
    metadataType: string,
    data: string | Buffer
  ): Promise<void> {
    const filePath = this.buildMetadataPath(accountId, arn, metadataType)
    await this.fsAdapter.writeFile(filePath, data)
  }

  async listResourceMetadata(accountId: string, arn: string): Promise<string[]> {
    // List all files in the resource directory to find metadata types
    const dirPath = this.buildResourcePath(accountId, arn)
    // console.log(dirPath)
    const files = await this.fsAdapter.listDirectory(dirPath)
    // console.log(files)
    // Filter for files that match the pattern of *.json
    const metadataTypes = files
      .filter((file) => file.endsWith('.json'))
      .map((file) => file.replace('.json', '')) // Remove the .json extension

    return metadataTypes
  }

  async getResourceMetadata(accountId: string, arn: string, metadataType: string): Promise<string> {
    const filePath = this.buildMetadataPath(accountId, arn, metadataType)
    return await this.fsAdapter.readFile(filePath)
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
    const dirPath = resourceTypePrefix(
      this.accountPath(accountId),
      { ...options, partition: this.partition },
      sep
    )
    return await this.fsAdapter.listDirectory(dirPath)
  }

  async syncResourceList(
    accountId: string,
    options: ResourceTypeParts,
    desiredResources: string[]
  ): Promise<void> {
    const dirPath = resourceTypePrefix(
      this.accountPath(accountId),
      { ...options, partition: this.partition },
      sep
    )

    const existingSubDirs = (await this.fsAdapter.listDirectory(dirPath)).map((subDir) =>
      join(dirPath, subDir)
    )

    const desiredDirs = new Set(
      desiredResources.map((desiredArn) => {
        const resourceDir = this.buildResourcePath(accountId, desiredArn)
        return resourceDir
      })
    )

    // console.log(desiredDirs)
    // Identify resources that exist in storage but not in desiredResources.
    const resourcesToDelete = existingSubDirs.filter((s) => !desiredDirs.has(s))

    for (const resource of resourcesToDelete) {
      // const resourceDir = join(dirPath, resource)
      // console.log('Deleting resource directory:', resource)
      await this.fsAdapter.deleteDirectory(resource)
    }
  }
}
