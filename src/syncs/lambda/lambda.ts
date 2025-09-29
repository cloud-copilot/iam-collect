import {
  GetLayerVersionPolicyCommand,
  GetPolicyCommand,
  LambdaClient,
  ListFunctionsCommand,
  ListLayersCommand,
  ListLayerVersionsCommand,
  ListTagsCommand
} from '@aws-sdk/client-lambda'
import { runAndCatch404, runAndCatchAccessDeniedWithLog } from '../../utils/client-tools.js'
import { parseIfPresent } from '../../utils/json.js'
import { DataRecord, Sync, syncData } from '../sync.js'
import { createResourceSyncType, createTypedSyncOperation, paginateResource } from '../typedSync.js'

export const LambdaSync = createTypedSyncOperation(
  'lambda',
  'lambdaFunctions',
  createResourceSyncType({
    client: LambdaClient,
    command: ListFunctionsCommand,
    key: 'Functions',
    paginationConfig: {
      inputKey: 'Marker',
      outputKey: 'NextMarker'
    },
    resourceTypeParts: (accountId: string, region: string) => ({
      service: 'lambda',
      resourceType: 'function',
      account: accountId,
      region: region
    }),
    extraFields: {
      tags: async (client, resource) => {
        return runAndCatch404(async () => {
          const tagResult = await client.send(
            new ListTagsCommand({ Resource: resource.FunctionArn })
          )
          return tagResult.Tags
        })
      },
      policy: async (client, resource) => {
        return runAndCatch404(async () => {
          const policyResult = await client.send(
            new GetPolicyCommand({ FunctionName: resource.FunctionName })
          )
          return parseIfPresent(policyResult.Policy)
        })
      }
    },
    tags: (func) => func.extraFields.tags,
    arn: (func) => func.FunctionArn!,
    results: (func) => ({
      metadata: {
        role: func.Role,
        name: func.FunctionName
      },
      policy: func.extraFields.policy
    })
  })
)

export const LambdaLayerVersionsSync: Sync = {
  awsService: 'lambda',
  name: 'lambdaLayerVersions',
  execute: async (accountId, region, credentials, storage, endpoint, syncOptions) => {
    const lambdaClient = syncOptions.clientPool.client(LambdaClient, credentials, region, endpoint)
    const allLayers = await paginateResource(lambdaClient, ListLayersCommand, 'Layers', {
      inputKey: 'Marker',
      outputKey: 'NextMarker'
    })

    const allLayerVersions: DataRecord[] = []
    for (const layer of allLayers) {
      const layerVersions = await paginateResource(
        lambdaClient,
        ListLayerVersionsCommand,
        'LayerVersions',
        {
          inputKey: 'Marker',
          outputKey: 'NextMarker'
        },
        {
          LayerName: layer.LayerName
        }
      )

      for (const version of layerVersions) {
        const policy = await runAndCatchAccessDeniedWithLog(
          layer.LayerArn!,
          'lambda',
          'lambdaLayerVersion',
          'policy',
          async () => {
            return runAndCatch404(async () => {
              const policyResult = await lambdaClient.send(
                new GetLayerVersionPolicyCommand({
                  LayerName: layer.LayerName!,
                  VersionNumber: version.Version
                })
              )
              return parseIfPresent(policyResult.Policy)
            })
          }
        )

        allLayerVersions.push({
          arn: version.LayerVersionArn!,
          metadata: {
            name: layer.LayerName,
            version: version.Version
          },
          policy: policy
        })
      }
    }

    await syncData(
      allLayerVersions,
      storage,
      accountId,
      {
        service: 'lambda',
        resourceType: 'layer',
        account: accountId,
        region: region
      },
      syncOptions.writeOnly
    )
  }
}
