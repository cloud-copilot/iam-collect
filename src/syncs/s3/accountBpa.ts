import { GetPublicAccessBlockCommand, S3ControlClient } from '@aws-sdk/client-s3-control'
import { AwsClientPool } from '../../aws/ClientPool.js'
import { runAndCatch404 } from '../../utils/client-tools.js'
import { Sync } from '../sync.js'

export const AccountS3BpaSync: Sync = {
  awsService: 's3',
  name: 'accountBpa',
  global: true,
  execute: async (accountId, region, credentials, storage, endpoint, options) => {
    const client = AwsClientPool.defaultInstance.client(
      S3ControlClient,
      credentials,
      region,
      endpoint
    )

    const bpa = await runAndCatch404(async () => {
      const result = client.send(new GetPublicAccessBlockCommand({ AccountId: accountId }))
      return (await result).PublicAccessBlockConfiguration
    })

    await storage.saveAccountMetadata(accountId, 's3-bpa', bpa)
  }
}
