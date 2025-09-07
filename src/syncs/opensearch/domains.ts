import {
  DescribeDomainCommand,
  ListDomainNamesCommand,
  ListTagsCommand,
  OpenSearchClient
} from '@aws-sdk/client-opensearch'
import { runAndCatch404 } from '../../utils/client-tools.js'
import { parseIfPresent } from '../../utils/json.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

function domainArn(
  domainName: string,
  region: string,
  accountId: string,
  partition: string
): string {
  return `arn:${partition}:es:${region}:${accountId}:domain/${domainName}`
}

export const OpenSearchDomainsSync = createTypedSyncOperation(
  'es',
  'domains',
  createResourceSyncType({
    client: OpenSearchClient,
    command: ListDomainNamesCommand,
    key: 'DomainNames',
    paginationConfig: '::no-pagination::',
    resourceTypeParts: (accountId: string, region: string) => ({
      service: 'es', // OpenSearch domains use 'es' service in ARNs
      resourceType: 'domain',
      account: accountId,
      region: region
    }),
    extraFields: {
      domainDetails: async (client, domain, accountId, region, partition) => {
        return runAndCatch404(async () => {
          const result = await client.send(
            new DescribeDomainCommand({ DomainName: domain.DomainName })
          )
          return result.DomainStatus
        })
      },
      tags: async (client, domain, accountId, region, partition) => {
        return runAndCatch404(async () => {
          const tagResult = await client.send(
            new ListTagsCommand({
              ARN: domainArn(domain.DomainName!, region, accountId, partition)
            })
          )
          return tagResult.TagList
        })
      }
    },
    tags: (domain) => domain.extraFields.tags,
    arn: (domain, region, accountId, partition) =>
      domainArn(domain.DomainName!, region, accountId, partition),
    results: (domain) => ({
      metadata: {
        name: domain.DomainName,
        keyId: domain.extraFields.domainDetails?.EncryptionAtRestOptions?.KmsKeyId
      },

      policy: parseIfPresent(domain.extraFields.domainDetails?.AccessPolicies)
    })
  })
)
