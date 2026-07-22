import {
  DescribeAccessEntryCommand,
  DescribeClusterCommand,
  EKSClient,
  ListAccessEntriesCommand,
  ListAssociatedAccessPoliciesCommand,
  ListClustersCommand
} from '@aws-sdk/client-eks'
import { runAndCatch404, runAndCatchAccessDeniedWithLog } from '../../utils/client-tools.js'
import { type DataRecord, type Sync, syncData } from '../sync.js'
import { paginateResource } from '../typedSync.js'

const paginationConfig = {
  inputKey: 'nextToken',
  outputKey: 'nextToken'
} as const

/**
 * Syncs EKS clusters and their access entries. Access entries map IAM principals to
 * Kubernetes permissions and only exist on clusters with the API or API_AND_CONFIG_MAP
 * authentication mode.
 */
export const EksAccessEntriesSync: Sync = {
  awsService: 'eks',
  name: 'accessEntries',
  execute: async (accountId, region, credentials, storage, endpoint, syncOptions) => {
    const eksClient = syncOptions.clientPool.client(EKSClient, credentials, region, endpoint)
    const clusterNames = await paginateResource(
      eksClient,
      ListClustersCommand,
      'clusters',
      paginationConfig
    )

    const clusterRecords: DataRecord[] = []
    const accessEntryRecords: DataRecord[] = []

    for (const clusterName of clusterNames) {
      const describeResult = await runAndCatch404(async () => {
        return eksClient.send(new DescribeClusterCommand({ name: clusterName }))
      })
      const cluster = describeResult?.cluster
      if (!cluster?.arn) {
        continue
      }

      const authenticationMode = cluster.accessConfig?.authenticationMode
      clusterRecords.push({
        arn: cluster.arn,
        metadata: {
          name: cluster.name,
          arn: cluster.arn,
          authenticationMode
        },
        tags: cluster.tags
      })

      // Access entries can only be listed when API authentication is enabled.
      if (authenticationMode !== 'API' && authenticationMode !== 'API_AND_CONFIG_MAP') {
        continue
      }

      const principalArns = await paginateResource(
        eksClient,
        ListAccessEntriesCommand,
        'accessEntries',
        paginationConfig,
        { clusterName }
      )

      for (const principalArn of principalArns) {
        const describeEntryResult = await runAndCatch404(async () => {
          return eksClient.send(new DescribeAccessEntryCommand({ clusterName, principalArn }))
        })
        const accessEntry = describeEntryResult?.accessEntry
        if (!accessEntry?.accessEntryArn) {
          continue
        }

        const associatedAccessPolicies = await runAndCatchAccessDeniedWithLog(
          accessEntry.accessEntryArn,
          'eks',
          'accessEntry',
          'accessPolicies',
          async () => {
            return paginateResource(
              eksClient,
              ListAssociatedAccessPoliciesCommand,
              'associatedAccessPolicies',
              paginationConfig,
              { clusterName, principalArn }
            )
          }
        )

        accessEntryRecords.push({
          arn: accessEntry.accessEntryArn,
          metadata: {
            arn: accessEntry.accessEntryArn,
            clusterName: accessEntry.clusterName,
            principalArn: accessEntry.principalArn,
            username: accessEntry.username,
            type: accessEntry.type,
            kubernetesGroups: accessEntry.kubernetesGroups
          },
          accessPolicies: associatedAccessPolicies?.map((policy) => ({
            policyArn: policy.policyArn,
            accessScope: policy.accessScope
          })),
          tags: accessEntry.tags
        })
      }
    }

    await syncData(
      clusterRecords,
      storage,
      accountId,
      {
        service: 'eks',
        resourceType: 'cluster',
        account: accountId,
        region: region
      },
      syncOptions.writeOnly
    )

    await syncData(
      accessEntryRecords,
      storage,
      accountId,
      {
        service: 'eks',
        resourceType: 'access-entry',
        account: accountId,
        region: region
      },
      syncOptions.writeOnly
    )
  }
}
