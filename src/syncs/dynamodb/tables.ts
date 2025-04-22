import {
  DynamoDBClient,
  GetResourcePolicyCommand,
  ListTablesCommand,
  ListTagsOfResourceCommand
} from '@aws-sdk/client-dynamodb'
import { runAndCatch404, runAndCatchError } from '../../utils/client-tools.js'
import { convertTagsToRecord } from '../../utils/tags.js'
import { createResourceSyncType, createTypedSyncOperation, paginateResource } from '../typedSync.js'

/**
 * Sync AWS tables Manager tables and their resource policies.
 */
export const DynamoDBTableSync = createTypedSyncOperation(
  'dynamodb',
  'tables',
  createResourceSyncType({
    client: DynamoDBClient,
    command: ListTablesCommand,
    key: 'TableNames',
    paginationConfig: {
      inputKey: 'ExclusiveStartTableName',
      outputKey: 'LastEvaluatedTableName'
    },
    resourceTypeParts: (accountId: string, region: string) => ({
      service: 'dynamodb',
      resourceType: 'table',
      account: accountId,
      region: region
    }),
    extraFields: {
      policy: async (client, table, accountId, region, partition) => {
        return runAndCatchError('PolicyNotFoundException', async () => {
          const response = await client.send(
            new GetResourcePolicyCommand({
              ResourceArn: tableArn(partition, region, accountId, table.name)
            })
          )
          if (response.Policy) {
            return JSON.parse(response.Policy)
          }
          return undefined
        })
      },
      tags: async (client, table, accountId, region, partition) => {
        return runAndCatch404(async () => {
          const response = await paginateResource(
            client,
            ListTagsOfResourceCommand,
            'Tags',
            {
              inputKey: 'NextToken',
              outputKey: 'NextToken'
            },
            {
              ResourceArn: tableArn(partition, region, accountId, table.name)
            }
          )

          return convertTagsToRecord(response)
        })
      }
    },
    tags: (table) => table.extraFields.tags,
    arn: (table, region, accountId, partition) =>
      tableArn(partition, region, accountId, table.name),
    results: (table) => ({
      metadata: {
        name: table.name!
      },
      policy: table.extraFields.policy
    })
  })
)

/**
 * Create a DynamoDB Table ARN from the given parameters.
 *
 * @param partition the AWS partition (e.g., 'aws', 'aws-cn', 'aws-us-gov')
 * @param region the AWS region (e.g., 'us-east-1')
 * @param accountId the AWS account ID
 * @param tableName the name of the DynamoDB table
 * @returns the ARN of the table
 */
function tableArn(partition: string, region: string, accountId: string, tableName: string) {
  return `arn:${partition}:dynamodb:${region}:${accountId}:table/${tableName}`
}
