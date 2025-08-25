import {
  DescribeStreamCommand,
  GetResourcePolicyCommand,
  KinesisClient,
  ListStreamsCommand,
  ListTagsForStreamCommand
} from '@aws-sdk/client-kinesis'
import { runAndCatch404 } from '../../utils/client-tools.js'
import { parseIfPresent } from '../../utils/json.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

export const KinesisDataStreamsSync = createTypedSyncOperation(
  'kinesis',
  'dataStreams',
  createResourceSyncType({
    client: KinesisClient,
    command: ListStreamsCommand,
    key: 'StreamNames',
    paginationConfig: {
      inputKey: 'NextToken',
      outputKey: 'NextToken'
    },
    arn: (streamName, region, accountId, partition) =>
      streamArn(streamName.name, region, accountId, partition),
    resourceTypeParts: (accountId, region) => ({
      service: 'kinesis',
      resourceType: 'stream',
      account: accountId,
      region: region
    }),
    extraFields: {
      details: async (client, streamName) => {
        const result = await client.send(
          new DescribeStreamCommand({
            StreamName: streamName.name
          })
        )
        return result.StreamDescription
      },
      policy: async (client, streamName, accountId, region, partition) => {
        const streamArnValue = streamArn(streamName.name, region, accountId, partition)
        return runAndCatch404(async () => {
          const result = await client.send(
            new GetResourcePolicyCommand({
              ResourceARN: streamArnValue
            })
          )
          return parseIfPresent(result.Policy)
        })
      },
      tags: async (client, streamName) => {
        return runAndCatch404(async () => {
          const result = await client.send(
            new ListTagsForStreamCommand({
              StreamName: streamName.name
            })
          )
          return result.Tags
        })
      }
    },
    tags: (stream) => stream.extraFields.tags,
    results: (stream) => ({
      metadata: {
        name: stream.name,
        encryptionType: stream.extraFields.details?.EncryptionType,
        keyId: stream.extraFields.details?.KeyId
      },
      policy: stream.extraFields.policy
    })
  })
)

/**
 * Generate the ARN for a Kinesis data stream.
 *
 * @param streamName - The name of the Kinesis data stream.
 * @param region - The AWS region where the stream is located.
 * @param accountId - The AWS account ID that owns the stream.
 * @param partition - The AWS partition (e.g., "aws", "aws-cn", "aws-us-gov").
 * @returns The ARN of the Kinesis data stream.
 */
const streamArn = (
  streamName: string,
  region: string,
  accountId: string,
  partition: string
): string => `arn:${partition}:kinesis:${region}:${accountId}:stream/${streamName}`
