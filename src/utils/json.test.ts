import { expect, it } from 'vitest'
import { consistentStringify } from './json.js'

const consistentStringifyTests: {
  name: string
  only?: true
  input: any
  expected: any
}[] = [
  // Primitive values at root
  {
    name: 'handles null at root',
    input: null,
    expected: null
  },
  {
    name: 'handles undefined at root',
    input: undefined,
    expected: undefined
  },
  {
    name: 'handles string at root',
    input: 'hello',
    expected: 'hello'
  },
  {
    name: 'handles number at root',
    input: 42,
    expected: 42
  },
  {
    name: 'handles boolean at root',
    input: true,
    expected: true
  },

  // Empty structures
  {
    name: 'handles empty object',
    input: {},
    expected: {}
  },
  {
    name: 'handles empty array',
    input: [],
    expected: []
  },

  // Simple objects
  {
    name: 'consistentStringify handles simple object',
    input: { b: 2, a: 1 },
    expected: { a: 1, b: 2 }
  },
  {
    name: 'consistentStringify handles nested object',
    input: { b: { y: 2, x: 1 }, a: 3 },
    expected: { a: 3, b: { x: 1, y: 2 } }
  },
  {
    name: 'consistentStringify handles arrays',
    input: { b: [3, 1, 2], a: 4 },
    expected: { a: 4, b: [1, 2, 3] }
  },
  {
    name: 'trust policy',
    input: {
      Statement: [
        {
          Principal: {
            Service: ['ec2.amazonaws.com', 'ssm.amazonaws.com', 'logs.amazonaws.com']
          },
          Effect: 'Allow',
          Action: 'sts:AssumeRole'
        }
      ],
      Version: '2012-10-17'
    },
    expected: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: 'sts:AssumeRole',
          Principal: {
            Service: ['ec2.amazonaws.com', 'logs.amazonaws.com', 'ssm.amazonaws.com']
          }
        }
      ]
    }
  },
  {
    name: 'sorts arrays of objects',
    input: [
      { name: 'banana', color: 'yellow' },
      { name: 'apple', color: 'red' },
      { name: 'grape', color: 'purple' }
    ],
    expected: [
      { color: 'purple', name: 'grape' },
      { color: 'red', name: 'apple' },
      { color: 'yellow', name: 'banana' }
    ]
  },

  // Root-level arrays
  {
    name: 'handles array of numbers at root',
    input: [3, 1, 2],
    expected: [1, 2, 3]
  },
  {
    name: 'handles array of strings at root',
    input: ['banana', 'apple', 'cherry'],
    expected: ['apple', 'banana', 'cherry']
  },
  {
    name: 'handles array of booleans at root',
    input: [true, false, true],
    expected: [false, true, true]
  },

  // Null and undefined in objects
  {
    name: 'handles null value in object',
    input: { b: null, a: 1 },
    expected: { a: 1, b: null }
  },
  {
    name: 'handles undefined value in object (omitted like JSON.stringify)',
    input: { b: undefined, a: 1 },
    expected: { a: 1 }
  },

  // Null and undefined in arrays
  {
    name: 'handles null values in array',
    input: [null, 1, null, 2],
    expected: [1, 2, null, null]
  },
  {
    name: 'handles undefined values in array (converted to null like JSON.stringify)',
    input: [undefined, 1, undefined, 2],
    expected: [1, 2, null, null]
  },

  // Mixed type arrays
  {
    name: 'handles mixed primitive types in array',
    input: ['z', 1, 'a', 2],
    expected: ['a', 'z', 1, 2]
  },

  // Nested arrays
  {
    name: 'handles nested arrays',
    input: {
      b: [
        [3, 1],
        [2, 4]
      ],
      a: 1
    },
    expected: {
      a: 1,
      b: [
        [1, 3],
        [2, 4]
      ]
    }
  },

  // Deeply nested structures
  {
    name: 'handles deeply nested objects',
    input: { c: { b: { a: 1, z: 2 }, y: 3 }, x: 4 },
    expected: { c: { b: { a: 1, z: 2 }, y: 3 }, x: 4 }
  },

  // Special string values
  {
    name: 'handles special characters in strings',
    input: { key: 'hello\nworld\ttab' },
    expected: { key: 'hello\nworld\ttab' }
  },

  // IAM policy key ordering tests
  {
    name: 'IAM: Version comes before Statement',
    input: { Statement: [], Version: '2012-10-17' },
    expected: { Version: '2012-10-17', Statement: [] }
  },
  {
    name: 'IAM: Effect comes before Action',
    input: { Action: 's3:GetObject', Effect: 'Allow' },
    expected: { Effect: 'Allow', Action: 's3:GetObject' }
  },
  {
    name: 'IAM: Effect comes before Principal',
    input: { Principal: '*', Effect: 'Allow' },
    expected: { Effect: 'Allow', Principal: '*' }
  },
  {
    name: 'IAM: Effect comes before Resource',
    input: { Resource: '*', Effect: 'Allow' },
    expected: { Effect: 'Allow', Resource: '*' }
  },
  {
    name: 'IAM: Action comes before Principal',
    input: { Principal: '*', Action: 's3:GetObject' },
    expected: { Action: 's3:GetObject', Principal: '*' }
  },
  {
    name: 'IAM: Principal comes before Resource',
    input: { Resource: '*', Principal: '*' },
    expected: { Principal: '*', Resource: '*' }
  },
  {
    name: 'IAM: Resource comes after Action',
    input: { Action: 's3:GetObject', Resource: '*' },
    expected: { Action: 's3:GetObject', Resource: '*' }
  },
  {
    name: 'IAM: full statement ordering (Effect > Action > Principal > Resource > Condition)',
    input: {
      Condition: {
        Bool: { 'aws:SecureTransport': 'true' }
      },
      Action: 's3:GetObject',
      Resource: 'arn:aws:s3:::my-bucket/*',
      Principal: { AWS: 'arn:aws:iam::123456789012:root' },
      Effect: 'Allow'
    },
    expected: {
      Effect: 'Allow',
      Action: 's3:GetObject',
      Principal: { AWS: 'arn:aws:iam::123456789012:root' },
      Resource: 'arn:aws:s3:::my-bucket/*',
      Condition: {
        Bool: { 'aws:SecureTransport': 'true' }
      }
    }
  },
  {
    name: 'IAM: full policy with multiple statements',
    input: {
      Statement: [
        {
          Action: ['s3:GetObject', 's3:PutObject'],
          Resource: '*',
          Effect: 'Allow'
        },
        {
          Action: 's3:DeleteObject',
          Principal: '*',
          Resource: '*',
          Effect: 'Deny'
        }
      ],
      Version: '2012-10-17'
    },
    expected: {
      Version: '2012-10-17',
      Statement: [
        {
          Effect: 'Allow',
          Action: ['s3:GetObject', 's3:PutObject'],
          Resource: '*'
        },
        {
          Effect: 'Deny',
          Action: 's3:DeleteObject',
          Principal: '*',
          Resource: '*'
        }
      ]
    }
  },
  {
    name: 'IAM: non-IAM keys are sorted alphabetically',
    input: { Zebra: 1, Apple: 2, Mango: 3 },
    expected: { Apple: 2, Mango: 3, Zebra: 1 }
  },
  {
    name: 'IAM: mixed IAM and non-IAM keys',
    input: { Sid: 'MyStatement', Action: 's3:*', Effect: 'Allow', Condition: {} },
    expected: { Sid: 'MyStatement', Effect: 'Allow', Action: 's3:*', Condition: {} }
  },

  // Edge cases: undefined first key bug (comma placement)
  {
    name: 'handles undefined value on first key alphabetically',
    input: { a: undefined, b: 1, c: 2 },
    expected: { b: 1, c: 2 }
  },
  {
    name: 'handles multiple undefined values scattered',
    input: { a: undefined, b: 1, c: undefined, d: 2 },
    expected: { b: 1, d: 2 }
  },

  // Edge cases: special numbers
  {
    name: 'handles NaN (should become null)',
    input: { value: NaN },
    expected: { value: null }
  },
  {
    name: 'handles Infinity (should become null)',
    input: { value: Infinity },
    expected: { value: null }
  },
  {
    name: 'handles -Infinity (should become null)',
    input: { value: -Infinity },
    expected: { value: null }
  },
  {
    name: 'handles NaN in array',
    input: [NaN, 1, 2],
    expected: [1, 2, null]
  },
  {
    name: 'handles Infinity in array',
    input: [Infinity, 1, -Infinity],
    expected: [1, null, null]
  },

  // Edge cases: Date objects
  {
    name: 'handles Date object (should convert to ISO string)',
    input: { date: new Date('2024-01-15T12:00:00.000Z') },
    expected: { date: '2024-01-15T12:00:00.000Z' }
  },
  {
    name: 'handles Date in array',
    input: [new Date('2024-01-15T12:00:00.000Z'), new Date('2023-06-01T00:00:00.000Z')],
    expected: ['2023-06-01T00:00:00.000Z', '2024-01-15T12:00:00.000Z']
  },

  // Edge cases: sparse arrays
  {
    name: 'removes holes in sparse arrays',
    input: [1, , 3],
    expected: [1, 3]
  },

  // Edge cases: empty string as key
  {
    name: 'handles empty string as object key',
    input: { '': 'empty key', a: 1 },
    expected: { '': 'empty key', a: 1 }
  },

  // Edge cases: objects with toJSON method
  {
    name: 'handles object with toJSON method',
    input: {
      value: {
        data: 'internal',
        toJSON: () => 'serialized'
      }
    },
    expected: { value: 'serialized' }
  }
]

for (const test of consistentStringifyTests) {
  const testFn = test.only ? it.only : it
  testFn(test.name, () => {
    // Given input
    const input = test.input

    // When we consistent stringify it
    const result = consistentStringify(input)

    // Then we get the expected result
    const expected = JSON.stringify(test.expected, null, 2)
    // JSON.stringify returns undefined for undefined input
    if (expected === undefined) {
      expect(result).toBeUndefined()
    } else {
      expect(result).toEqual(expected)
    }
  })
}
