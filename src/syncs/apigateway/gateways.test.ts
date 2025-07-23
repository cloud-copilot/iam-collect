import { describe, expect, it } from 'vitest'
import { parseApiGatewayPolicy } from './gateways.js'

describe('parseApiGatewayPolicy', () => {
  it('should parse a valid API Gateway policy', () => {
    // Given a valid API Gateway policy string
    const policy = JSON.stringify({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: 'execute-api:Invoke',
          Resource: 'arn:aws:execute-api:us-west-2:111111111111:aaaaaaaaaa/*/*',
          Condition: {
            StringEquals: {
              'aws:SourceVpce': 'vpce-00000000000'
            }
          }
        }
      ]
    })

    // When parsing the policy
    const parsedPolicy = parseApiGatewayPolicy('api-id', policy)

    // Then the parsed policy should match the original structure
    expect(parsedPolicy).toEqual({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: 'execute-api:Invoke',
          Resource: 'arn:aws:execute-api:us-west-2:111111111111:aaaaaaaaaa/*/*',
          Condition: {
            StringEquals: {
              'aws:SourceVpce': 'vpce-00000000000'
            }
          }
        }
      ]
    })
  })

  it('should return undefined for an empty policy', () => {
    // Given an empty policy string
    const policy = ''

    // When parsing the policy
    const parsedPolicy = parseApiGatewayPolicy('api-id', policy)

    // Then the parsed policy should be undefined
    expect(parsedPolicy).toBeUndefined()
  })

  it('should handle escaped characters in the policy', () => {
    //Given a policy with escaped characters
    const policy = `{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":\"*\",\"Action\":\"execute-api:Invoke\",\"Resource\":\"arn:aws:execute-api:us-west-2:111111111111:aaaaaaaaaa\/*\/*\",\"Condition\":{\"StringEquals\":{\"aws:SourceVpce\":\"vpce-00000000000\"}}}]}`

    // When parsing the policy
    const parsedPolicy = parseApiGatewayPolicy('api-id', policy)

    // Then the parsed policy should be correctly parsed
    expect(parsedPolicy).toEqual({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: 'execute-api:Invoke',
          Resource: 'arn:aws:execute-api:us-west-2:111111111111:aaaaaaaaaa/*/*',
          Condition: {
            StringEquals: {
              'aws:SourceVpce': 'vpce-00000000000'
            }
          }
        }
      ]
    })
  })

  it('should unescape escaped forward slashes', () => {
    //Given a policy with escaped characters
    const policy = `{\"Version\":\"2012-10-17\",\"Statement\":[{\"Effect\":\"Allow\",\"Principal\":\"*\",\"Action\":\"execute-api:Invoke\",\"Resource\":\"arn:aws:execute-api:us-west-2:111111111111:aaaaaaaaaa\/*\/*\",\"Condition\":{\"StringEquals\":{\"aws:SourceVpce\":\"vpce-00000000000\"}}}]}`

    // When parsing the policy
    const parsedPolicy = parseApiGatewayPolicy('api-id', policy)

    // Then the parsed policy should be correctly parsed
    expect(parsedPolicy).toEqual({
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Principal: '*',
          Action: 'execute-api:Invoke',
          Resource: 'arn:aws:execute-api:us-west-2:111111111111:aaaaaaaaaa/*/*',
          Condition: {
            StringEquals: {
              'aws:SourceVpce': 'vpce-00000000000'
            }
          }
        }
      ]
    })
  })
})
