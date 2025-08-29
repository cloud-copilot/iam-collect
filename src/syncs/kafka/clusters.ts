import {
  DescribeClusterCommand,
  GetClusterPolicyCommand,
  KafkaClient,
  ListClustersV2Command,
  ListTagsForResourceCommand
} from '@aws-sdk/client-kafka'
import { runAndCatch404 } from '../../utils/client-tools.js'
import { parseIfPresent } from '../../utils/json.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

export const KafkaClustersSync = createTypedSyncOperation(
  'kafka',
  'clusters',
  createResourceSyncType({
    client: KafkaClient,
    command: ListClustersV2Command,
    key: 'ClusterInfoList',
    paginationConfig: {
      inputKey: 'NextToken',
      outputKey: 'NextToken'
    },
    arn: (cluster) => cluster.ClusterArn!,
    resourceTypeParts: (accountId, region) => ({
      service: 'kafka',
      resourceType: 'cluster',
      account: accountId,
      region: region
    }),
    extraFields: {
      details: async (client, cluster) => {
        return runAndCatch404(async () => {
          if (cluster.ClusterType !== 'PROVISIONED') {
            return undefined
          }
          const result = await client.send(
            new DescribeClusterCommand({
              ClusterArn: cluster.ClusterArn
            })
          )
          return result.ClusterInfo
        })
      },
      policy: async (client, cluster) => {
        return runAndCatch404(async () => {
          const result = await client.send(
            new GetClusterPolicyCommand({
              ClusterArn: cluster.ClusterArn
            })
          )
          return parseIfPresent(result.Policy)
        })
      },
      tags: async (client, cluster) => {
        return runAndCatch404(async () => {
          const result = await client.send(
            new ListTagsForResourceCommand({
              ResourceArn: cluster.ClusterArn
            })
          )
          return result.Tags
        })
      }
    },
    tags: (cluster) => cluster.extraFields.tags,
    results: (cluster) => ({
      metadata: {
        name: cluster.ClusterName,
        arn: cluster.ClusterArn,
        keyId: cluster.extraFields.details?.EncryptionInfo?.EncryptionAtRest?.DataVolumeKMSKeyId
      },
      policy: cluster.extraFields.policy
    })
  })
)
