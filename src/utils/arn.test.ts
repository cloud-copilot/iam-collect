import { describe, expect, it } from 'vitest'
import { ArnParts, splitArnParts } from './arn.js'

const splitArnPartsTests: {
  name: string
  arn: string
  expected: ArnParts
  only?: boolean
}[] = [
  {
    name: 'should split a full ARN',
    arn: 'arn:aws:iam::123456789012:user/Development/user1',
    expected: {
      partition: 'aws',
      service: 'iam',
      region: '',
      accountId: '123456789012',
      resource: 'user/Development/user1',
      resourceType: 'user',
      resourcePath: 'Development/user1'
    }
  },
  {
    name: 'should split an S3 bucket ARN',
    arn: 'arn:aws:s3:::my_corporate_bucket',
    expected: {
      partition: 'aws',
      service: 's3',
      region: '',
      accountId: '',
      resource: 'my_corporate_bucket',
      resourceType: '',
      resourcePath: 'my_corporate_bucket'
    }
  },
  {
    name: 'should split an S3 object ARN',
    arn: 'arn:aws:s3:::my_corporate_bucket/my_corporate_object.txt',
    expected: {
      partition: 'aws',
      service: 's3',
      region: '',
      accountId: '',
      resource: 'my_corporate_bucket/my_corporate_object.txt',
      resourceType: '',
      resourcePath: 'my_corporate_bucket/my_corporate_object.txt'
    }
  },
  {
    name: 'should split an SNS topic ARN',
    arn: 'arn:aws:sns:us-east-1:123456789012:MyTopic',
    expected: {
      partition: 'aws',
      service: 'sns',
      region: 'us-east-1',
      accountId: '123456789012',
      resource: 'MyTopic',
      resourceType: '',
      resourcePath: 'MyTopic'
    }
  },
  {
    name: 'should split an SQS queue ARN',
    arn: 'arn:aws:sqs:us-east-1:123456789012:MyQueue',
    expected: {
      partition: 'aws',
      service: 'sqs',
      region: 'us-east-1',
      accountId: '123456789012',
      resource: 'MyQueue',
      resourceType: '',
      resourcePath: 'MyQueue'
    }
  },
  {
    name: 'should split a Lambda function ARN',
    arn: 'arn:aws:lambda:us-west-2:123456789012:function:my-function',
    expected: {
      partition: 'aws',
      service: 'lambda',
      region: 'us-west-2',
      accountId: '123456789012',
      resource: 'function:my-function',
      resourceType: 'function',
      resourcePath: 'my-function'
    }
  },
  {
    name: 'rest api ARN',
    arn: 'arn:aws:apigateway:us-east-1::/restapis/1234567890',
    expected: {
      partition: 'aws',
      service: 'apigateway',
      region: 'us-east-1',
      accountId: '',
      resource: '/restapis/1234567890',
      resourceType: 'restapis',
      resourcePath: '1234567890'
    }
  },
  {
    name: 'should split a glue root catalog ARN',
    arn: 'arn:aws:glue:us-east-1:111111111111:catalog',
    expected: {
      partition: 'aws',
      service: 'glue',
      region: 'us-east-1',
      accountId: '111111111111',
      resource: 'catalog',
      resourceType: 'catalog',
      resourcePath: ''
    }
  }
]

describe('splitArnParts', () => {
  for (const test of splitArnPartsTests) {
    const { name, arn, expected, only } = test
    const testFn = only ? it.only : it

    testFn(name, () => {
      const result = splitArnParts(arn)
      expect(result).toEqual(expected)
    })
  }
})
