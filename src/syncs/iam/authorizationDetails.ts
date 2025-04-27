import {
  AccessKeyLastUsed,
  AccessKeyMetadata,
  GetAccessKeyLastUsedCommand,
  GetAccountAuthorizationDetailsCommand,
  GetAccountAuthorizationDetailsResponse,
  GetLoginProfileCommand,
  GetRolePolicyCommand,
  GetUserPolicyCommand,
  GroupDetail,
  IAMClient,
  ListAccessKeysCommand,
  ListAttachedRolePoliciesCommand,
  ListAttachedUserPoliciesCommand,
  ListGroupsForUserCommand,
  ListMFADevicesCommand,
  ListPolicyTagsCommand,
  ListRolePoliciesCommand,
  ListUserPoliciesCommand,
  ListUsersCommand,
  LoginProfile,
  ManagedPolicyDetail,
  MFADevice,
  RoleDetail,
  Tag,
  User,
  UserDetail
} from '@aws-sdk/client-iam'

import { AwsClientPool } from '../../aws/ClientPool.js'
import { AwsCredentialIdentityWithMetaData } from '../../aws/coreAuth.js'
import { AwsIamStore } from '../../persistence/AwsIamStore.js'
import { runAndCatch404 } from '../../utils/client-tools.js'
import { convertTagsToRecord } from '../../utils/tags.js'
import { Sync, syncData, SyncOptions } from '../sync.js'

interface AccessKeyWithLastUsed extends AccessKeyMetadata {
  lastUsed?: AccessKeyLastUsed
}

export const AuthorizationDetailsSync: Sync = {
  awsService: 'iam',
  name: 'authorizationDetails',
  global: true,
  execute: async (
    accountId: string,
    region: string,
    credentials: AwsCredentialIdentityWithMetaData,
    storage: AwsIamStore,
    endpoint: string | undefined,
    syncOptions: SyncOptions
  ): Promise<void> => {
    const client = AwsClientPool.defaultInstance.client(IAMClient, credentials, region, endpoint)
    const authDetails = await getAuthorizationDetails(client)
    const roles = authDetails.roles || []
    const roleData = roles.map((role) => {
      return {
        arn: role.Arn!,
        'managed-policies': role.AttachedManagedPolicies?.map((p) => p.PolicyArn),
        'trust-policy': role.AssumeRolePolicyDocument,
        'instance-profiles': role.InstanceProfileList?.map((i) => i.Arn),
        'inline-policies': role.RolePolicyList,
        tags: convertTagsToRecord(role.Tags),
        metadata: {
          arn: role.Arn,
          name: role.RoleName,
          id: role.RoleId,
          path: role.Path,
          created: role.CreateDate,
          permissionBoundary: role.PermissionsBoundary?.PermissionsBoundaryArn
        }
      }
    })

    await syncData(roleData, storage, accountId, {
      service: 'iam',
      resourceType: 'role',
      account: accountId
    })

    const groupArns: Record<string, string> = {}

    const groupData = authDetails.groups.map((group) => {
      groupArns[group.GroupName!] = group.Arn!
      return {
        arn: group.Arn!,
        'inline-policies': group.GroupPolicyList,
        'managed-policies': group.AttachedManagedPolicies?.map((p) => p.PolicyArn),

        metadata: {
          arn: group.Arn,
          path: group.Path,
          name: group.GroupName,
          id: group.GroupId,
          created: group.CreateDate
        }
      }
    })

    await syncData(groupData, storage, accountId, {
      service: 'iam',
      resourceType: 'group',
      account: accountId
    })

    const customerPolicyData = authDetails.policies.map((policy) => {
      return {
        arn: policy.Arn!,
        metadata: {
          arn: policy.Arn,
          name: policy.PolicyName,
          id: policy.PolicyId,
          description: policy.Description,
          defaultVersionId: policy.DefaultVersionId,
          path: policy.Path,
          permissionsBoundaryUsageCount: policy.PermissionsBoundaryUsageCount,
          isAttachable: policy.IsAttachable,
          createDate: policy.CreateDate,
          updateDate: policy.UpdateDate
        },
        policy: policy.PolicyVersionList?.filter((version) => version.IsDefaultVersion).at(0)
          ?.Document,
        tags: convertTagsToRecord(policy.Tags)
      }
    })

    await syncData(customerPolicyData, storage, accountId, {
      service: 'iam',
      resourceType: 'policy',
      account: accountId
    })

    const awsManagedPolicyData = authDetails.awsManagedPolicies.map((policy) => {
      return {
        arn: policy.Arn!,
        metadata: {
          arn: policy.Arn,
          name: policy.PolicyName,
          id: policy.PolicyId,
          description: policy.Description,
          defaultVersionId: policy.DefaultVersionId,
          path: policy.Path,
          permissionsBoundaryUsageCount: policy.PermissionsBoundaryUsageCount,
          isAttachable: policy.IsAttachable,
          createDate: policy.CreateDate,
          updateDate: policy.UpdateDate
        },
        policy: policy.PolicyVersionList?.filter((version) => version.IsDefaultVersion).at(0)
          ?.Document
      }
    })

    await syncData(awsManagedPolicyData, storage, accountId, {
      service: 'iam',
      resourceType: 'policy',
      account: 'aws'
    })

    const userData = authDetails.users.map((user) => {
      return {
        arn: user.Arn!,
        'managed-policies': user.AttachedManagedPolicies?.map((p) => p.PolicyArn),
        'inline-policies': user.UserPolicyList,
        groups: user.GroupList?.map((g) => groupArns[g]),
        tags: convertTagsToRecord(user.Tags),
        metadata: {
          arn: user.Arn,
          path: user.Path,
          permissionBoundary: user.PermissionsBoundary?.PermissionsBoundaryArn,
          id: user.UserId,
          name: user.UserName,
          created: user.CreateDate
        }
      }
    })

    syncData(userData, storage, accountId, {
      service: 'iam',
      resourceType: 'user',
      account: accountId
    })
  }
}

/**
 * Get the access keys for an IAM user.
 *
 * @param region The region to use for the API call
 * @param credentials The credentials to use for the API call
 * @param userName The name of the user to lookup the access keys for
 * @returns Returns a list of access keys for the user. Will return an empty array if there are no access keys
 */
export async function getAccessKeysForUser(
  client: IAMClient,
  userName: string
): Promise<AccessKeyWithLastUsed[]> {
  const listAccessKeysCommand = new ListAccessKeysCommand({ UserName: userName })

  const result = await runAndCatch404(() => {
    return client.send(listAccessKeysCommand)
  })
  const accessKeys = result?.AccessKeyMetadata || []

  const lastUsed = await Promise.all(
    accessKeys.map(async (key) => {
      const command = new GetAccessKeyLastUsedCommand({ AccessKeyId: key.AccessKeyId })
      const result = await client.send(command)
      return { keyId: key.AccessKeyId, results: result.AccessKeyLastUsed }
    })
  )

  return accessKeys.map((key) => {
    return {
      ...key,
      lastUsed: lastUsed.find((lu) => lu.keyId == key.AccessKeyId)?.results || undefined
    }
  })
}

/**
 * Get the login profile for an IAM user if it exists.
 *
 * @param region The region to use for the API call
 * @param credentials The credentials to use for the API call
 * @param userName The name of the user to lookup the login profile for
 * @returns Returns the login profile for the user if it exists. Otherwise returns undefined
 */
export async function getLoginProfileForUser(
  client: IAMClient,
  userName: string
): Promise<LoginProfile | undefined> {
  const loginProfileCommand = new GetLoginProfileCommand({ UserName: userName })

  return runAndCatch404<LoginProfile>(async () => {
    const loginProfile = await client.send(loginProfileCommand)
    return loginProfile.LoginProfile
  })
}

/**
 * Get the MFA devices for an IAM user.
 *
 * @param region The region to use for the API call
 * @param credentials The credentials to use for the API call
 * @param userName The name of the user to lookup the MFA devices for
 * @returns Returns a list of MFA devices for the user. Will return an empty array if there are no MFA devices.
 */
export async function getMfaDevicesForUser(
  client: IAMClient,
  userName: string
): Promise<MFADevice[]> {
  const listMfaDevicesCommand = new ListMFADevicesCommand({ UserName: userName })
  const result = await runAndCatch404<MFADevice[]>(async () => {
    const result = await client.send(listMfaDevicesCommand)
    return result.MFADevices || []
  })

  return result || []
}

/**
 * Parses a username out of an ARN. Does not validate the ARN is a valid IAM user ARN.
 *
 * @param arn The arn to parse the username out of
 * @returns Returns the username from the ARN
 */
export function parseUsernameFromArn(arn: string): string {
  return arn.split('/').at(-1)!
}

/**
 * Get all IAM users in an account.
 *
 * @param region The region to use for the API call
 * @param credentials The credentials to use for the API call
 * @returns Returns a list of all IAM users in the account
 */
export async function getAllUsers(client: IAMClient): Promise<User[]> {
  const userList: User[] = []
  let isTruncated = true
  let marker: string | undefined = undefined

  let listUsersCommand: ListUsersCommand
  while (isTruncated) {
    listUsersCommand = new ListUsersCommand({ Marker: marker, MaxItems: 1000 })
    const usersResult = await client.send(listUsersCommand)
    userList.push(...(usersResult.Users || []))
    isTruncated = usersResult.IsTruncated || false
    marker = usersResult.Marker
  }

  return userList
}

export interface UserWithMetadata extends User {
  metadata: {
    hasConsoleAccess: boolean
    createdAt: Date
    passwordChanged?: Date
    passwordLastUsed?: Date
    mfaEnabled: boolean
    numberAccessKeys: number
    oldestAccessKey?: Date
    accessKeyLastUsed?: Date
    accessKeys?: AccessKeyWithLastUsed[]
    managedPolicies: string[]
    inlinePolicies: any[]
    groups: string[]
  }
}

/**
 * Get all IAM users in an account with metadata about each user.
 *
 * @param region The region to use for the API call
 * @param credentials The credentials to use for the API call
 * @returns Returns all users for the account with metadata about each user
 */
export async function getAllUsersWithMetadata(client: IAMClient): Promise<UserWithMetadata[]> {
  const users = await getAllUsers(client)
  await Promise.all(users.map(async (user) => addMetaDataToUser(client, user as any)))
  return users as UserWithMetadata[]
}

async function addMetaDataToUser(client: IAMClient, user: UserWithMetadata) {
  user.metadata = {
    hasConsoleAccess: false,
    createdAt: user.CreateDate!,
    passwordChanged: undefined,
    passwordLastUsed: user.PasswordLastUsed,
    mfaEnabled: false,
    numberAccessKeys: 0,
    accessKeys: [],
    managedPolicies: [],
    inlinePolicies: [],
    groups: []
  }

  const [
    loginProfile,
    accessKeys,
    mfaDevices,
    userManagedPolicies,
    userInlinePolicies,
    userGroups
  ] = await Promise.all([
    getLoginProfileForUser(client, user.UserName!),
    getAccessKeysForUser(client, user.UserName!),
    getMfaDevicesForUser(client, user.UserName!),
    getManagedPoliciesAttachedToUser(client, user.UserName!),
    getInlinePolicesAttachedToUser(client, user.UserName!),
    getGroupsForUser(client, user.UserName!)
  ])

  if (loginProfile) {
    user.metadata.hasConsoleAccess = true
    user.metadata.passwordChanged = loginProfile.CreateDate!
  }

  const activeKeys = accessKeys.filter((k) => k.Status == 'Active')
  user.metadata.numberAccessKeys = activeKeys.length
  user.metadata.oldestAccessKey = activeKeys
    .map((k) => k.CreateDate!)
    .sort()
    .at(0)
  user.metadata.accessKeyLastUsed = activeKeys
    .map((k) => k.lastUsed?.LastUsedDate)
    .sort()
    .at(0)
  user.metadata.accessKeys = activeKeys

  user.metadata.mfaEnabled = mfaDevices.length > 0
  user.metadata.managedPolicies = userManagedPolicies
  user.metadata.inlinePolicies = userInlinePolicies
  user.metadata.groups = userGroups
}

interface ManagedPolicyDetailWithExtraData extends ManagedPolicyDetail {
  Tags?: Tag[]
}

/**
 * Return the results of the Authorization Details call for this account.
 * Excludes users and AWS managed policies.
 *
 * @param credentials The credentials to use for the API call
 * @returns Returns the results of the Authorization Details call for this account
 */
export async function getAuthorizationDetails(client: IAMClient): Promise<{
  groups: GroupDetail[]
  roles: RoleDetail[]
  policies: ManagedPolicyDetailWithExtraData[]
  awsManagedPolicies: ManagedPolicyDetail[]
  users: UserDetail[]
}> {
  let isTruncated = false
  let getDetailsCommand: GetAccountAuthorizationDetailsCommand
  let response: GetAccountAuthorizationDetailsResponse
  let marker

  const groupDetails: GroupDetail[] = []
  const roleDetails: RoleDetail[] = []
  const policyDetails: ManagedPolicyDetail[] = []
  const awsManagedPolicies: ManagedPolicyDetail[] = []
  const userDetails: UserDetail[] = []

  do {
    getDetailsCommand = new GetAccountAuthorizationDetailsCommand({
      Marker: marker,
      Filter: ['Role', 'Group', 'LocalManagedPolicy', 'AWSManagedPolicy', 'User']
    })

    response = await client.send(getDetailsCommand)
    groupDetails.push(...(response.GroupDetailList?.map(parseGroupDocs) || []))
    roleDetails.push(...(response.RoleDetailList?.map(parseRoleDocs) || []))
    userDetails.push(...(response.UserDetailList?.map(parseUserDocs) || []))

    for (const policy of response.Policies || []) {
      const policyDetail = parsePolicyDocs(policy)
      if (policyDetail.Arn?.startsWith('arn:aws:iam::aws:policy/')) {
        awsManagedPolicies.push(policyDetail)
      } else {
        policyDetails.push(policyDetail)
      }
      // policyDetails.push(...(response.Policies?.map(parsePolicyDocs) || []))
    }

    isTruncated = !!response.IsTruncated
    marker = response.Marker
  } while (isTruncated)

  const policiesWithTags = await getTagsForMangedPolicies(client, policyDetails)

  return {
    groups: groupDetails,
    roles: roleDetails,
    policies: policiesWithTags,
    awsManagedPolicies,
    users: userDetails
  }
}

async function getTagsForMangedPolicies(
  client: IAMClient,
  policies: ManagedPolicyDetail[]
): Promise<ManagedPolicyDetailWithExtraData[]> {
  const promises = policies.map(async (policy) => {
    const command = new ListPolicyTagsCommand({ PolicyArn: policy.Arn! })
    const tags = await runAndCatch404(async () => {
      const result = await client.send(command)
      return result.Tags
    })
    return {
      ...policy,
      Tags: tags
    }
  })

  return Promise.all(promises)
}

interface AttachedPolicy {
  name: string
  document: any
}

/**
 * Gets the policies that are attached directly to a role. Does not include managed policies.
 *
 * @param credentials The credentials to use for the API call
 * @param roleName The name of the role to get the policies for
 * @returns Returns the policies that are attached directly to the role
 */
export async function getPoliciesAttachedDirectlyToRole(
  client: IAMClient,
  roleName: string
): Promise<AttachedPolicy[]> {
  const command = new ListRolePoliciesCommand({ RoleName: roleName })
  const results = await client.send(command)
  const roleNames = results.PolicyNames

  const policyDetails = await Promise.all(
    roleNames!.map(async (policyName) => {
      const policyCommand = new GetRolePolicyCommand({ RoleName: roleName, PolicyName: policyName })
      const policyResult = await client.send(policyCommand)
      return policyResult
    })
  )

  return policyDetails.map((policyDetail) => ({
    name: policyDetail.PolicyName!,
    document: JSON.parse(decodeURIComponent(policyDetail.PolicyDocument!))
  }))
}

export async function getManagedPoliciesAttachedToRole(client: IAMClient, roleName: string) {
  const command = new ListAttachedRolePoliciesCommand({ RoleName: roleName })
  const results = await client.send(command)

  const policies = results.AttachedPolicies!
  return policies
}

/**
 * Decodes and parses the policy documents in the group.
 *
 * @param group The GroupDetail object to parse the policy documents for
 * @returns Returns the GroupDetail object with the policy documents decoded and parsed
 */
function parseGroupDocs(group: GroupDetail) {
  if (group.GroupPolicyList) {
    group.GroupPolicyList.forEach((policy) => {
      if (policy.PolicyDocument) {
        policy.PolicyDocument = JSON.parse(decodeURIComponent(policy.PolicyDocument))
      }
    })
  }

  return group
}

/**
 * Decodes and parses the policy documents in the role.
 *
 * @param role the RoleDetail object to parse the policy documents for
 * @returns Returns the RoleDetail object with the policy documents decoded and parsed
 */
function parseRoleDocs(role: RoleDetail) {
  if (role.AssumeRolePolicyDocument) {
    role.AssumeRolePolicyDocument = JSON.parse(decodeURIComponent(role.AssumeRolePolicyDocument))
  }

  if (role.RolePolicyList) {
    role.RolePolicyList.forEach((policy) => {
      if (policy.PolicyDocument) {
        policy.PolicyDocument = JSON.parse(decodeURIComponent(policy.PolicyDocument))
      }
    })
  }

  return role
}

/**
 * Decodes and parses the policy documents in the managed policy.
 *
 * @param policy The ManagedPolicyDetail object to parse the policy documents for
 * @returns Returns the ManagedPolicyDetail object with the policy documents decoded and parsed
 */
function parsePolicyDocs(policy: ManagedPolicyDetail) {
  if (policy.PolicyVersionList) {
    policy.PolicyVersionList.forEach((version) => {
      if (version.Document) {
        version.Document = JSON.parse(decodeURIComponent(version.Document))
      }
    })
  }

  return policy
}

/**
 * Decodes and parses the policy documents attached directly to a user.
 *
 * @param user The userDetail object to parse the policy documents for
 * @returns Returns the UserDetail object with the policy documents decoded and parsed
 */
function parseUserDocs(user: UserDetail) {
  if (user.UserPolicyList) {
    user.UserPolicyList.forEach((policy) => {
      if (policy.PolicyDocument) {
        policy.PolicyDocument = JSON.parse(decodeURIComponent(policy.PolicyDocument))
      }
    })
  }

  return user
}

/**
 * Get the managed policies attached to a user.
 *
 * @param client The IAM client to use
 * @param username The user's username
 * @returns Returns the ARNs of the managed policies attached to the user
 */
async function getManagedPoliciesAttachedToUser(
  client: IAMClient,
  username: string
): Promise<string[]> {
  const command = new ListAttachedUserPoliciesCommand({ UserName: username })
  const results = await client.send(command)
  const policyArns = results.AttachedPolicies!.map((policy) => policy.PolicyArn!)

  return policyArns
}

/**
 * Get the inline policies attached to a user.
 *
 * @param client The IAM client to use
 * @param username The username of the user
 * @returns Returns the inline policies attached to the user
 */
async function getInlinePolicesAttachedToUser(
  client: IAMClient,
  username: string
): Promise<{ name: string; document: any }[]> {
  const command = new ListUserPoliciesCommand({ UserName: username })
  const results = await client.send(command)
  const policyNames = results.PolicyNames

  const policyDetails = await Promise.all(
    policyNames!.map(async (policyName) => {
      const policyCommand = new GetUserPolicyCommand({ UserName: username, PolicyName: policyName })
      const policyResult = await client.send(policyCommand)
      return {
        name: policyName,
        document: JSON.parse(decodeURIComponent(policyResult.PolicyDocument!))
      }
    })
  )

  return policyDetails
}

/**
 * Get the groups a user is a member of.
 *
 * @param client The IAM client to use
 * @param username The username of the user
 * @returns Returns the ARNs of the groups the user is a member of
 */
async function getGroupsForUser(client: IAMClient, username: string): Promise<string[]> {
  const command = new ListGroupsForUserCommand({ UserName: username })
  const results = await client.send(command)
  const groupArns = results.Groups!.map((group) => group.Arn!)

  return groupArns
}
