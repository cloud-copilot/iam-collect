import {
  GetQueueAttributesCommand,
  ListQueuesCommand,
  ListQueueTagsCommand,
  SQSClient
} from '@aws-sdk/client-sqs'
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
    arn: (queue, region, account, partition) => {
      const queueName = queue.name.split('/').pop()
      return `arn:${partition}:sqs:${region}:${account}:${queueName}`
    },
    resourceTypeParts: (account, region) => ({
      account,
      region,
      service: 'sqs'
    }),
    tags: (queue) => queue.extraFields.tags,
    extraFields: {
      tags: async (client, topic) => {
        const tagResult = await client.send(
          new ListQueueTagsCommand({
            QueueUrl: topic.name
          })
        )
        return tagResult.Tags
      },
      attributes: async (client, queue) => {
        const attributes = await client.send(
          new GetQueueAttributesCommand({
            QueueUrl: queue.name,
            AttributeNames: ['KmsMasterKeyId', 'Policy']
          })
        )
        return attributes.Attributes
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
