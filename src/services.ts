export type AwsService =
  | 'dynamodb'
  | 'iam'
  | 'kms'
  | 'lambda'
  | 'organizations'
  | 's3'
  | 'secretsmanager'
  | 'sso'

export const allServices: AwsService[] = [
  'dynamodb',
  'iam',
  'kms',
  'lambda',
  'organizations',
  's3',
  'secretsmanager',
  'sso'
]
