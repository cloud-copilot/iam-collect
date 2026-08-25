import {
  GetPolicyCommand,
  LambdaClient,
  ListAliasesCommand,
  ListFunctionsCommand,
  ListTagsCommand
} from '@aws-sdk/client-lambda'
import { mockClient } from 'aws-sdk-client-mock'
import { afterEach, describe, expect, it } from 'vitest'
import { AwsClientPool } from '../../aws/ClientPool.js'
import { type AwsCredentialProviderWithMetaData } from '../../aws/coreAuth.js'
import { createInMemoryStorageClient } from '../../persistence/util.js'
import { LambdaSync } from './lambda.js'

const lambdaMock = mockClient(LambdaClient)
const accountId = '111111111111'
const region = 'us-east-1'
const functionArn = `arn:aws:lambda:${region}:${accountId}:function:test-function`
const credentials: AwsCredentialProviderWithMetaData = {
  accountId,
  partition: 'aws',
  cacheKey: 'test-credentials',
  provider: async () => ({
    accessKeyId: 'test-access-key-id',
    secretAccessKey: 'test-secret-access-key'
  })
}

const workerPool = {
  enqueueAll: (jobs: any[]) =>
    jobs.map(async (job) => {
      try {
        return {
          status: 'fulfilled',
          value: await job.execute({ workerId: 1, properties: job.properties }),
          properties: job.properties
        }
      } catch (reason) {
        return { status: 'rejected', reason, properties: job.properties }
      }
    })
} as any

describe('LambdaSync', () => {
  afterEach(() => {
    lambdaMock.reset()
  })

  it('collects function alias policies under their qualified ARNs', async () => {
    //Given a Lambda function with aliases returned across multiple pages
    const store = createInMemoryStorageClient()
    const staleAliasArn = `${functionArn}:stale`
    await store.saveResourceMetadata(accountId, staleAliasArn, 'metadata', {
      arn: staleAliasArn,
      name: 'test-function',
      alias: 'stale'
    })

    lambdaMock.on(ListFunctionsCommand).resolves({
      Functions: [{ FunctionName: 'test-function', FunctionArn: functionArn, Role: 'test-role' }]
    })
    lambdaMock.on(ListTagsCommand).resolves({ Tags: { environment: 'test' } })
    lambdaMock
      .on(GetPolicyCommand, { FunctionName: 'test-function' })
      .resolves({ Policy: JSON.stringify({ Statement: [{ Sid: 'function-policy' }] }) })
    lambdaMock.on(ListAliasesCommand).callsFake((input) => {
      if (input.Marker === 'next-page') {
        return {
          Aliases: [
            {
              AliasArn: `${functionArn}:beta`,
              Name: 'beta',
              FunctionVersion: '3'
            }
          ]
        }
      }
      return {
        Aliases: [
          {
            AliasArn: `${functionArn}:prod`,
            Name: 'prod',
            FunctionVersion: '2'
          }
        ],
        NextMarker: 'next-page'
      }
    })
    lambdaMock
      .on(GetPolicyCommand, { FunctionName: 'test-function', Qualifier: 'prod' })
      .resolves({ Policy: JSON.stringify({ Statement: [{ Sid: 'prod-policy' }] }) })
    lambdaMock
      .on(GetPolicyCommand, { FunctionName: 'test-function', Qualifier: 'beta' })
      .resolves({ Policy: JSON.stringify({ Statement: [{ Sid: 'beta-policy' }] }) })

    const clientPool = new AwsClientPool()

    //When the Lambda sync runs
    await LambdaSync.execute(accountId, region, credentials, store, undefined, {
      clientPool,
      workerPool,
      writeOnly: false
    })
    clientPool.clear()

    //Then each alias policy and identifying metadata are stored under the qualified alias ARN
    await expect(
      store.getResourceMetadata(accountId, `${functionArn}:prod`, 'policy')
    ).resolves.toEqual({ Statement: [{ Sid: 'prod-policy' }] })
    await expect(
      store.getResourceMetadata(accountId, `${functionArn}:beta`, 'metadata')
    ).resolves.toEqual({
      arn: `${functionArn}:beta`,
      role: 'test-role',
      name: 'test-function',
      alias: 'beta',
      version: '3'
    })

    //And the base function remains collected while aliases that no longer exist are removed
    await expect(store.getResourceMetadata(accountId, functionArn, 'policy')).resolves.toEqual({
      Statement: [{ Sid: 'function-policy' }]
    })
    await expect(store.listResourceMetadata(accountId, staleAliasArn)).resolves.toEqual([])

    //And aliases are listed by function name with pagination
    expect(lambdaMock.commandCalls(ListAliasesCommand).map((call) => call.args[0].input)).toEqual([
      { FunctionName: 'test-function', Marker: undefined },
      { FunctionName: 'test-function', Marker: 'next-page' }
    ])
  })
})
