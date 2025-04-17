import { describe, expect, it } from 'vitest'
import { convertTagsToRecord } from './tags.js'

const tagTests: {
  name: string
  input: any
  expected: Record<string, string> | undefined
}[] = [
  {
    name: 'Should convert an UpperTagLike array to a Record',
    input: [
      { Key: 'Environment', Value: 'Production' },
      { Key: 'Project', Value: 'Alpha' }
    ],
    expected: {
      Environment: 'Production',
      Project: 'Alpha'
    }
  },
  {
    name: 'Should convert a LowerTagLike array to a Record',
    input: [
      { key: 'environment', value: 'staging' },
      { key: 'project', value: 'beta' }
    ],
    expected: {
      environment: 'staging',
      project: 'beta'
    }
  },
  {
    name: 'Should convert a TagKeyValue array to a Record',
    input: [
      { TagKey: 'Owner', TagValue: 'Alice' },
      { TagKey: 'CostCenter', TagValue: '12345' }
    ],
    expected: {
      Owner: 'Alice',
      CostCenter: '12345'
    }
  },
  {
    name: 'Should return undefined for undefined input',
    input: undefined,
    expected: undefined
  },
  {
    name: 'Should return undefined for an empty array',
    input: [],
    expected: undefined
  },
  {
    name: 'Should handle mixed tag formats correctly',
    input: [
      { Key: 'App', Value: 'MyApp' },
      { key: 'version', value: '1.0.0' },
      { TagKey: 'Region', TagValue: 'us-west-2' }
    ],
    expected: {
      App: 'MyApp',
      version: '1.0.0',
      Region: 'us-west-2'
    }
  },
  {
    name: 'Should handle tags with empty values',
    input: [
      { Key: 'Empty', Value: '' },
      { key: '', value: '' },
      { TagKey: '', TagValue: '' }
    ],
    expected: {
      Empty: '',
      '': ''
    }
  },
  {
    name: 'Should return a record if tags are already a Record',
    input: {
      Environment: 'Production',
      Project: 'Alpha'
    },
    expected: {
      Environment: 'Production',
      Project: 'Alpha'
    }
  }
]

describe('convertTagsToRecord', () => {
  for (const test of tagTests) {
    it(test.name, () => {
      const result = convertTagsToRecord(test.input)
      expect(result).toEqual(test.expected)
    })
  }
})
