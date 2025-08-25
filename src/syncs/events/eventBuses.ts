import {
  DescribeEventBusCommand,
  EventBridgeClient,
  ListEventBusesCommand,
  ListTagsForResourceCommand
} from '@aws-sdk/client-eventbridge'
import { runAndCatch404 } from '../../utils/client-tools.js'
import { parseIfPresent } from '../../utils/json.js'
import { createResourceSyncType, createTypedSyncOperation } from '../typedSync.js'

export const EventBridgeEventBusesSync = createTypedSyncOperation(
  'events',
  'eventBuses',
  createResourceSyncType({
    client: EventBridgeClient,
    command: ListEventBusesCommand,
    key: 'EventBuses',
    paginationConfig: {
      inputKey: 'NextToken',
      outputKey: 'NextToken'
    },
    arn: (eventBus) => eventBus.Arn!,
    resourceTypeParts: (accountId, region) => ({
      service: 'events',
      resourceType: 'event-bus',
      account: accountId,
      region: region
    }),
    extraFields: {
      details: async (client, eventBus) => {
        return runAndCatch404(async () => {
          const result = await client.send(
            new DescribeEventBusCommand({
              Name: eventBus.Name
            })
          )
          return result
        })
      },
      tags: async (client, eventBus, accountId, region, partition) => {
        return runAndCatch404(async () => {
          const result = await client.send(
            new ListTagsForResourceCommand({
              ResourceARN: eventBus.Arn!
            })
          )
          return result.Tags
        })
      }
    },
    tags: (eventBus) => eventBus.extraFields.tags,
    results: (eventBus) => ({
      metadata: {
        name: eventBus.Name,
        kmsKey: eventBus.extraFields.details?.KmsKeyIdentifier
      },
      policy: parseIfPresent(eventBus.extraFields.details?.Policy)
    })
  })
)
