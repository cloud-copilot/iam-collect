import {
  ACMPCAClient,
  DescribeCertificateAuthorityCommand,
  GetPolicyCommand,
  ListCertificateAuthoritiesCommand,
  ListTagsCommand
} from '@aws-sdk/client-acm-pca'
import { runAndCatch404 } from '../../utils/client-tools.js'
import { parseIfPresent } from '../../utils/json.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

export const AcmPcaCertificateAuthoritiesSync = createTypedSyncOperation(
  'acm-pca',
  'certificateAuthorities',
  createResourceSyncType({
    client: ACMPCAClient,
    command: ListCertificateAuthoritiesCommand,
    key: 'CertificateAuthorities',
    paginationConfig: {
      inputKey: 'NextToken',
      outputKey: 'NextToken'
    },
    arn: (ca) => ca.Arn!,
    resourceTypeParts: (accountId, region) => ({
      service: 'acm-pca',
      resourceType: 'certificate-authority',
      account: accountId,
      region: region
    }),
    extraFields: {
      details: async (client, ca) => {
        const result = await client.send(
          new DescribeCertificateAuthorityCommand({
            CertificateAuthorityArn: ca.Arn!
          })
        )
        return result.CertificateAuthority
      },
      policy: async (client, ca) => {
        return runAndCatch404(async () => {
          const result = await client.send(
            new GetPolicyCommand({
              ResourceArn: ca.Arn!
            })
          )
          return parseIfPresent(result.Policy)
        })
      },
      tags: async (client, ca) => {
        return runAndCatch404(async () => {
          const result = await client.send(
            new ListTagsCommand({
              CertificateAuthorityArn: ca.Arn!
            })
          )
          return result.Tags
        })
      }
    },
    tags: (ca) => ca.extraFields.tags,
    results: (ca) => ({
      metadata: {
        arn: ca.Arn!,
        type: ca.Type,
        status: ca.Status,
        subject: ca.extraFields.details?.CertificateAuthorityConfiguration?.Subject
      },
      policy: ca.extraFields.policy
    })
  })
)
