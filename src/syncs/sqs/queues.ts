import {
  GetQueueAttributesCommand,
  ListQueuesCommand,
  ListQueueTagsCommand,
  SQSClient
} from '@aws-sdk/client-sqs'
import { runAndCatchAccessDeniedWithLog } from '../../utils/client-tools.js'
import { parseIfPresent } from '../../utils/json.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

export const SqsQueueSync = createTypedSyncOperation(
  'sqs',
  'queue',
  createResourceSyncType({
    client: SQSClient,
    command: ListQueuesCommand,
    key: 'QueueUrls',
    paginationConfig: {
      inputKey: 'NextToken',
      outputKey: 'NextToken'
    },
    arguments: (accountId, region) => ({
      MaxResults: 1000
    }),
    arn: (queue, region, account, partition) => {
      return queueArn(queue, region, account, partition)
    },
    resourceTypeParts: (account, region) => ({
      account,
      region,
      service: 'sqs'
    }),
    tags: (queue) => queue.extraFields.tags,
    extraFields: {
      tags: async (client, queue, account, region, partition) => {
        const arn = queueArn(queue, region, account, partition)
        return runAndCatchAccessDeniedWithLog(arn, 'queue', 'tags', async () => {
          const tagResult = await client.send(
            new ListQueueTagsCommand({
              QueueUrl: queue.name
            })
          )
          return tagResult.Tags
        })
      },
      attributes: async (client, queue, account, region, partition) => {
        const arn = queueArn(queue, region, account, partition)
        return runAndCatchAccessDeniedWithLog(arn, 'queue', 'attributes', async () => {
          const attributes = await client.send(
            new GetQueueAttributesCommand({
              QueueUrl: queue.name,
              AttributeNames: ['KmsMasterKeyId', 'Policy']
            })
          )
          return attributes.Attributes
        })
      }
    },
    results: (queue) => ({
      metadata: {
        name: queue.name.split('/').pop() || '',
        kmsKey: queue.extraFields.attributes?.KmsMasterKeyId
      },
      policy: parseIfPresent(queue.extraFields.attributes?.Policy)
    })
  })
)

function queueArn(queue: { name: string }, region: string, account: string, partition: string) {
  const queueName = queue.name.split('/').pop()
  return `arn:${partition}:sqs:${region}:${account}:${queueName}`
}
