import {
  DescribeRepositoriesCommand,
  ECRClient,
  GetRegistryPolicyCommand,
  GetRepositoryPolicyCommand,
  ListTagsForResourceCommand,
  Repository
} from '@aws-sdk/client-ecr'
import { AwsClientPool } from '../../aws/ClientPool.js'
import { runAndCatchError } from '../../utils/client-tools.js'
import { parseIfPresent } from '../../utils/json.js'
import { Sync } from '../sync.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

export const EcrSyncs: Sync[] = [
  createTypedSyncOperation(
    'ecr',
    'repositories',
    createResourceSyncType({
      client: ECRClient,
      command: DescribeRepositoriesCommand,
      key: 'repositories',
      paginationConfig: {
        inputKey: 'nextToken',
        outputKey: 'nextToken'
      },
      arn: (repository, region, account, partition) =>
        repositoryArn(repository, region, account, partition),
      tags: (repository) => repository.extraFields.tags,
      resourceTypeParts: (account, region) => ({
        account,
        service: 'ecr',
        region,
        resourceType: 'repository'
      }),
      extraFields: {
        tags: async (client, repository, account, region, partition) => {
          const result = await client.send(
            new ListTagsForResourceCommand({
              resourceArn: repositoryArn(repository, region, account, partition)
            })
          )
          return result.tags
        },
        policy: async (client, repository, account, region, partition) => {
          const policy = await runAndCatchError('RepositoryPolicyNotFoundException', async () => {
            const result = await client.send(
              new GetRepositoryPolicyCommand({
                repositoryName: repository.repositoryName
              })
            )
            return parseIfPresent(result.policyText)
          })

          return policy
        }
      },
      results: (repository) => ({
        metadata: {
          repositoryName: repository.repositoryName,
          key: repository.encryptionConfiguration?.kmsKey
        },
        policy: repository.extraFields.policy
      })
    })
  ),
  {
    awsService: 'ecr',
    name: 'registry',
    execute: async (accountId, region, credentials, storage, endpoint, syncOptions) => {
      const client = AwsClientPool.defaultInstance.client(ECRClient, credentials, region, endpoint)
      const policyText = await runAndCatchError('RegistryPolicyNotFoundException', async () => {
        const result = await client.send(new GetRegistryPolicyCommand({}))
        return result.policyText
      })

      const policy = policyText ? JSON.parse(policyText) : undefined
      await storage.saveAccountMetadata(accountId, `ecr-registry-policy.${region}`, policy)
    }
  }
]

/**
 * Make an ECR Repository ARN
 *
 * @param repository the ECR Repository object
 * @param region the AWS region
 * @param account the AWS account ID
 * @param partition the AWS partition (e.g., 'aws', 'aws-cn', 'aws-us-gov')
 * @returns the ARN of the ECR Repository
 */
function repositoryArn(
  repository: Repository,
  region: string,
  account: string,
  partition: string
): string {
  return `arn:${partition}:ecr:${region}:${account}:repository/${repository.repositoryName}`
}
