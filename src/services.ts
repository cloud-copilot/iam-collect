export type AwsService =
  | 'iam'
  | 'kms'
  | 'lambda'
  | 'organizations'
  | 's3'
  | 'secretsmanager'
  | 'sso'

export const allServices: AwsService[] = [
  'iam',
  'kms',
  'lambda',
  'organizations',
  's3',
  'secretsmanager',
  'sso'
]
