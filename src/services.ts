/**
 * All Valid AWS Services
 */
export const allServices = [
  'dynamodb',
  'ec2',
  'iam',
  'kms',
  'lambda',
  'organizations',
  's3',
  'secretsmanager',
  'sns',
  'sqs',
  'sso'
] as const

/**
 * Type representing a valid AWS service. A union of all strings in `allServices`.
 */
export type AwsService = (typeof allServices)[number]
