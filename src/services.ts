/**
 * All Valid AWS Services
 */
export const allServices = [
  'apigateway',
  'dynamodb',
  'ec2',
  'ecr',
  'glacier',
  'iam',
  'kms',
  'lambda',
  'organizations',
  's3',
  's3tables',
  'secretsmanager',
  'sns',
  'sqs',
  'sso'
] as const

/**
 * Type representing a valid AWS service. A union of all strings in `allServices`.
 */
export type AwsService = (typeof allServices)[number]
