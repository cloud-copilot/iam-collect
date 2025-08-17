import { DynamoDBClient, GetResourcePolicyCommand } from '@aws-sdk/client-dynamodb'
import { DynamoDBStreamsClient, ListStreamsCommand } from '@aws-sdk/client-dynamodb-streams'
import { AwsClientPool } from '../../aws/ClientPool.js'
import { runAndCatchError } from '../../utils/client-tools.js'
import { parseIfPresent } from '../../utils/json.js'
import { DataRecord, Sync, syncData } from '../sync.js'
import { paginateResource } from '../typedSync.js'

export const DynamoDbStreamsSync: Sync = {
  awsService: 'dynamodb',
  name: 'dynamoDbStreams',
  execute: async (accountId, region, credentials, storage, endpoint, syncOptions) => {
    const streamsClient = AwsClientPool.defaultInstance.client(
      DynamoDBStreamsClient,
      credentials,
      region,
      endpoint
    )
    const dynamoClient = AwsClientPool.defaultInstance.client(
      DynamoDBClient,
      credentials,
      region,
      endpoint
    )

    const allStreams = await paginateResource(streamsClient, ListStreamsCommand, 'Streams', {
      inputKey: 'ExclusiveStartStreamArn',
      outputKey: 'LastEvaluatedStreamArn'
    })

    const streams: DataRecord[] = []
    for (const stream of allStreams) {
      const streamArn = stream.StreamArn!
      const tableName = streamArn.split('/')[1]
      const policy = await runAndCatchError('PolicyNotFoundException', async () => {
        const result = await dynamoClient.send(
          new GetResourcePolicyCommand({ ResourceArn: streamArn })
        )
        return parseIfPresent(result.Policy)
      })
      streams.push({
        arn: streamArn,
        metadata: {
          arn: streamArn,
          label: stream.StreamLabel,
          tableName,
          stream: 'true'
        },
        policy
      })
    }

    await syncData(
      streams,
      storage,
      accountId,
      {
        // Stream ARNS start with the table ARN, so we use table as the resource type
        // and then set the metadata to indicate that this is a stream resource
        service: 'dynamodb',
        resourceType: 'table',
        account: accountId,
        region: region,
        metadata: {
          stream: 'true'
        }
      },
      syncOptions.writeOnly
    )
  }
}
