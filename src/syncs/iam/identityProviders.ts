import {
  GetOpenIDConnectProviderCommand,
  GetSAMLProviderCommand,
  IAMClient,
  ListOpenIDConnectProvidersCommand,
  ListSAMLProvidersCommand
} from '@aws-sdk/client-iam'
import { Sync } from '../sync.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

export const IdentityProviderSyncs: Sync[] = [
  createTypedSyncOperation(
    'iam',
    'oidcProviders',

    createResourceSyncType({
      globalResourceType: true,
      client: IAMClient,
      command: ListOpenIDConnectProvidersCommand,
      key: 'OpenIDConnectProviderList',
      paginationConfig: '::no-pagination::',
      arn: (provider) => provider.Arn!,
      resourceTypeParts: (account, region) => ({
        service: 'iam',
        account,
        resourceType: 'oidc-provider'
      }),

      extraFields: {
        details: async (client, provider) => {
          const command = new GetOpenIDConnectProviderCommand({
            OpenIDConnectProviderArn: provider.Arn!
          })
          const result = await client.send(command)
          return result
        }
      },
      tags: (provider) => provider.extraFields.details.Tags,
      results: (provider) => ({
        metadata: {
          audiences: provider.extraFields.details.ClientIDList,
          thumbprints: provider.extraFields.details.ThumbprintList,
          url: provider.extraFields.details.Url
        }
      })
    })
  ),
  createTypedSyncOperation(
    'iam',
    'samlProviders',

    createResourceSyncType({
      globalResourceType: true,
      client: IAMClient,
      command: ListSAMLProvidersCommand,
      key: 'SAMLProviderList',
      paginationConfig: '::no-pagination::',
      arn: (provider) => provider.Arn!,
      resourceTypeParts: (account, region) => ({
        service: 'iam',
        account,
        resourceType: 'saml-provider'
      }),

      extraFields: {
        details: async (client, provider) => {
          const command = new GetSAMLProviderCommand({
            SAMLProviderArn: provider.Arn!
          })
          const result = await client.send(command)
          return result
        }
      },
      tags: (provider) => provider.extraFields.details.Tags,
      results: (provider) => ({
        metadata: {
          assertEncryption: provider.extraFields.details.AssertionEncryptionMode,
          'metadata-document': provider.extraFields.details.SAMLMetadataDocument,
          privateKeys: provider.extraFields.details.PrivateKeyList,
          uuid: provider.extraFields.details.SAMLProviderUUID,
          validUntil: provider.extraFields.details.ValidUntil
        }
      })
    })
  )
]
