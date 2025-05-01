import { APIGatewayClient, GetRestApisCommand } from '@aws-sdk/client-api-gateway'
import { Sync } from '../sync.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

export const RestApisSync: Sync = createTypedSyncOperation(
  'apigateway',
  'gateways',
  createResourceSyncType({
    client: APIGatewayClient,
    command: GetRestApisCommand,
    key: 'items',
    paginationConfig: {
      inputKey: 'position',
      outputKey: 'position'
    },
    arn: (api, region, account, partition) => restApiArn(api.id!, region, account, partition),
    tags: (api) => api.tags,
    resourceTypeParts: (account, region) => ({
      account,
      service: 'apigateway',
      region,
      resourceType: 'restapis'
    }),
    results: (api) => ({
      metadata: {
        id: api.id,
        name: api.name
      },
      policy: JSON.parse(api.policy || '{}')
    })
  })
)

function restApiArn(apiId: string, region: string, account: string, partition: string): string {
  return `arn:${partition}:apigateway:${region}::/restapis/${apiId}`
}
