import {
  type Account,
  DescribeOrganizationCommand,
  DescribePolicyCommand,
  DescribeResourcePolicyCommand,
  ListAccountsForParentCommand,
  ListDelegatedAdministratorsCommand,
  ListDelegatedServicesForAccountCommand,
  ListOrganizationalUnitsForParentCommand,
  ListPoliciesCommand,
  ListPoliciesForTargetCommand,
  ListRootsCommand,
  ListTagsForResourceCommand,
  type Organization,
  type OrganizationalUnit,
  OrganizationsClient,
  PolicyType,
  PolicyTypeStatus,
  type Root
} from '@aws-sdk/client-organizations'
import { type AwsCredentialProviderWithMetaData } from '../../aws/coreAuth.js'
import { type AwsIamStore, type OrganizationPolicyType } from '../../persistence/AwsIamStore.js'
import {
  runAndCatch404,
  runAndCatchAccessDenied,
  runAndCatchAccessDeniedWithLog
} from '../../utils/client-tools.js'
import { convertTagsToRecord } from '../../utils/tags.js'
import { type Sync, type SyncOptions } from '../sync.js'
import { paginateResource } from '../typedSync.js'

interface AccountDetails {
  ou: string
  scps: string[]
  rcps: string[]
  tags: Record<string, string> | undefined
}

interface AccountDetailsMap {
  [key: string]: AccountDetails
}

interface OrgStructure {
  [key: string]: {
    children: OrgStructure | undefined
    accounts: string[] | undefined
  }
}

type Features = Record<PolicyType, boolean>

interface OuDetails {
  metadata: {
    arn: string
    name: string
  }
  tags: Record<string, string> | undefined
}

export const OrganizationSync: Sync = {
  awsService: 'organizations',
  name: 'organization',
  global: true,
  execute: async function (
    accountId: string,
    region: string,
    credentials: AwsCredentialProviderWithMetaData,
    storage: AwsIamStore,
    endpoint: string | undefined,
    syncOptions: SyncOptions
  ): Promise<void> {
    const organizationClient = syncOptions.clientPool.client(
      OrganizationsClient,
      credentials,
      region,
      endpoint
    )

    const organization = await getOrganizationDetails(organizationClient)
    if (!organization) {
      await saveOrgForAccount(storage, accountId, undefined)
      return
    }
    const organizationId = organization.Id!

    const root = await getOrganizationRoot(organizationClient)
    if (!root) {
      await saveOrgForAccount(storage, accountId, undefined)
      return
    }

    const features: Features =
      root.PolicyTypes?.reduce((acc, type) => {
        acc[type.Type!] = type.Status === PolicyTypeStatus.ENABLED
        return acc
      }, {} as Features) || ({} as Features)

    const scpsEnabled = !!features[PolicyType.SERVICE_CONTROL_POLICY]
    const rcpsEnabled = !!features[PolicyType.RESOURCE_CONTROL_POLICY]

    const allAccounts: AccountDetailsMap = {}
    const allOus: Record<
      string,
      {
        parent: string | undefined
        scps: string[]
        rcps: string[]
      }
    > = {}

    const ouDetails: Record<string, OuDetails> = {}

    allOus[root.Id!] = {
      parent: undefined,
      scps: await getPoliciesForTarget(
        organizationClient,
        root.Id!,
        PolicyType.SERVICE_CONTROL_POLICY,
        scpsEnabled
      ),
      rcps: await getPoliciesForTarget(
        organizationClient,
        root.Id!,
        PolicyType.RESOURCE_CONTROL_POLICY,
        rcpsEnabled
      )
    }
    ouDetails[root.Id!] = await getOuDetails(organizationClient, root)

    const structure: OrgStructure = {
      [root.Id!]: {
        children: {},
        accounts: []
      }
    }

    // const children = await getChildOrgUnits(organizationClient, root.Id!)
    const parents: OrgStructure[] = [structure]

    let parent = parents.pop()
    while (parent) {
      for (const key in parent) {
        // Get structure information
        const children = await getChildOrgUnits(organizationClient, key)
        for (const child of children) {
          ouDetails[child.Id!] = await getOuDetails(organizationClient, child)

          const childId = child.Id!
          allOus[childId] = {
            parent: key,
            scps: await getPoliciesForTarget(
              organizationClient,
              root.Id!,
              PolicyType.SERVICE_CONTROL_POLICY,
              scpsEnabled
            ),
            rcps: await getPoliciesForTarget(
              organizationClient,
              root.Id!,
              PolicyType.RESOURCE_CONTROL_POLICY,
              rcpsEnabled
            )
          }
          parent[key].children ||= {}
          parent[key].children[childId] = {
            children: undefined,
            accounts: undefined
          }
        }
        const accounts = await getAccountsForParent(organizationClient, key)
        if (accounts.length > 0) {
          parent[key].accounts = []
        }
        for (const account of accounts) {
          const accountTags: Record<string, string> | undefined = await getTagsForAccount(
            organizationClient,
            account.Id!
          )
          allAccounts[account.Id!] = {
            ou: key,
            scps: await getPoliciesForTarget(
              organizationClient,
              account.Id!,
              PolicyType.SERVICE_CONTROL_POLICY,
              scpsEnabled
            ),
            rcps: await getPoliciesForTarget(
              organizationClient,
              account.Id!,
              PolicyType.RESOURCE_CONTROL_POLICY,
              rcpsEnabled
            ),
            tags: accountTags
          }
          parent[key].accounts!.push(account.Arn!)
        }

        // parent[key].accounts = accounts.map((a) => a.Arn!)
        if (parent[key].children) {
          parents.push(parent[key].children)
        }
      }

      parent = parents.pop()
    }

    // Get delegated administrators
    const delegatedAdministrators = await getDelegatedAdministrators(
      organizationClient,
      organization.Arn!
    )

    storage.saveOrganizationMetadata(organizationId, 'structure', structure)
    storage.saveOrganizationMetadata(organizationId, 'metadata', {
      id: organizationId,
      arn: organization.Arn,
      rootOu: root.Id,
      rootAccountArn: organization.MasterAccountArn,
      rootAccountId: organization.MasterAccountId,
      features
    })
    storage.saveOrganizationMetadata(organizationId, 'accounts', allAccounts)
    storage.saveOrganizationMetadata(organizationId, 'ous', allOus)
    storage.saveOrganizationMetadata(organizationId, 'delegated-admins', delegatedAdministrators)

    // Sync OUs
    if (!syncOptions.writeOnly) {
      const persistedOus = await storage.listOrganizationalUnits(organizationId)
      const newOus = new Set(Object.keys(ouDetails))
      const deletedOus = persistedOus.filter((ou) => !newOus.has(ou))
      for (const ouToDelete of deletedOus) {
        await storage.deleteOrganizationalUnit(organizationId, ouToDelete)
      }
    }

    for (const ouId of Object.keys(ouDetails)) {
      const ou = ouDetails[ouId]
      await storage.saveOrganizationalUnitMetadata(organizationId, ouId, 'metadata', ou.metadata)
      await storage.saveOrganizationalUnitMetadata(organizationId, ouId, 'tags', ou.tags)
    }

    // Sync policies
    await syncPolicies(
      organizationId,
      organizationClient,
      storage,
      PolicyType.SERVICE_CONTROL_POLICY,
      'scps',
      scpsEnabled,
      syncOptions.writeOnly
    )

    await syncPolicies(
      organizationId,
      organizationClient,
      storage,
      PolicyType.RESOURCE_CONTROL_POLICY,
      'rcps',
      rcpsEnabled,
      syncOptions.writeOnly
    )

    // Sync organization resource policy
    await syncOrganizationResourcePolicy(organizationClient, storage, organizationId)
    await saveOrgForAccount(storage, accountId, organizationId)
  }
}

/**
 * Get the details of an organization or an account.
 *
 * @param client The OrganizationsClient to use
 * @returns the details of the organization the account belongs to or undefined if the account is not part of an organization or does not have permission.
 */
export async function getOrganizationDetails(
  client: OrganizationsClient
): Promise<Organization | undefined> {
  const command = new DescribeOrganizationCommand()
  try {
    const response = await runAndCatch404(() => client.send(command))
    if (!response) {
      return undefined
    }

    return response.Organization
  } catch (e: any) {
    if (e.name === 'AWSOrganizationsNotInUseException') {
      return undefined
    }
  }
  return undefined
}

/**
 * Get the root Organizational Unit for an organization
 *
 * @param client The OrganizationsClient to use
 * @returns the root Organizational Unit for the organization if it exists
 */
export async function getOrganizationRoot(client: OrganizationsClient): Promise<Root | undefined> {
  return runAndCatchAccessDenied(async () => {
    const roots = await paginateResource(
      client,
      ListRootsCommand,
      'Roots',
      {
        inputKey: 'NextToken',
        outputKey: 'NextToken'
      },
      {}
    )
    return roots.at(0)
  })
}

/**
 * Get the delegated administrators for an organization
 *
 * @param client The OrganizationsClient to use
 * @param organizationArn The ARN of the organization
 * @returns a map of service principals to account IDs that are delegated administrators for those services
 */
export async function getDelegatedAdministrators(
  client: OrganizationsClient,
  organizationArn: string
): Promise<Record<string, string[]>> {
  const result = await runAndCatchAccessDeniedWithLog(
    organizationArn,
    'organizations',
    'organization',
    'delegatedAdministrators',
    async () => {
      const delegatedAdmins = await paginateResource(
        client,
        ListDelegatedAdministratorsCommand,
        'DelegatedAdministrators',
        {
          inputKey: 'NextToken',
          outputKey: 'NextToken'
        }
      )

      // Create a map of service principals to account IDs
      const servicePrincipalMap: Record<string, string[]> = {}

      // For each delegated administrator, get the services they manage sequentially
      for (const admin of delegatedAdmins) {
        const delegatedServices = await runAndCatchAccessDeniedWithLog(
          admin.Arn!,
          'organizations',
          'delegatedAdministrator',
          'delegatedServices',
          async () => {
            const services = await paginateResource(
              client,
              ListDelegatedServicesForAccountCommand,
              'DelegatedServices',
              {
                inputKey: 'NextToken',
                outputKey: 'NextToken'
              },
              { AccountId: admin.Id! }
            )
            return services
          }
        )

        // Add this account to each service principal it manages
        if (delegatedServices) {
          for (const service of delegatedServices) {
            const servicePrincipal = service.ServicePrincipal!
            if (!servicePrincipalMap[servicePrincipal]) {
              servicePrincipalMap[servicePrincipal] = []
            }
            servicePrincipalMap[servicePrincipal].push(admin.Id!)
          }
        }
      }

      return servicePrincipalMap
    }
  )

  return result || {}
}

/**
 * Get the tags for an Organizational Unit
 *
 * @param client The OrganizationsClient to use
 * @param ouId The AWS id of the Organizational Unit to get the tags for
 * @returns The tags for the Organizational Unit
 */
export async function getTagsForOu(
  client: OrganizationsClient,
  ouId: string
): Promise<Record<string, string> | undefined> {
  return getTags(client, ouId)
}

/**
 * Get the tags for an account
 * @param client The OrganizationsClient to use
 * @param accountId The AWS id of the account to get the tags for
 * @returns The tags for the account
 */
export async function getTagsForAccount(
  client: OrganizationsClient,
  accountId: string
): Promise<Record<string, string> | undefined> {
  return getTags(client, accountId)
}

/**
 * Get the tags for a resource in AWS Organizations
 *
 * @param client The OrganizationsClient to use
 * @param resourceId The AWS id of the resource to get the tags for
 * @returns The tags for the resource
 */
async function getTags(
  client: OrganizationsClient,
  resourceId: string
): Promise<Record<string, string> | undefined> {
  const command = new ListTagsForResourceCommand({ ResourceId: resourceId })
  const response = await runAndCatch404(() => client.send(command))
  if (!response) {
    return {}
  }
  return convertTagsToRecord(response.Tags)
}

/**
 * Get the organizational units for a parent organizational unit
 *
 * @param client The OrganizationsClient to use
 * @param parentId The AWS id of the parent organizational unit
 * @returns The organizational units directly under the parent
 */
export async function getChildOrgUnits(
  client: OrganizationsClient,
  parentId: string
): Promise<OrganizationalUnit[]> {
  return await paginateResource(
    client,
    ListOrganizationalUnitsForParentCommand,
    'OrganizationalUnits',
    { inputKey: 'NextToken', outputKey: 'NextToken' },
    { ParentId: parentId }
  )
}

/**
 * Get the accounts for a parent organizational unit
 *
 * @param client The OrganizationsClient to use
 * @param parentId The AWS id of the parent organizational unit
 * @returns The accounts directly under the parent
 */
export async function getAccountsForParent(
  client: OrganizationsClient,
  parentId: string
): Promise<Account[]> {
  const accounts = await paginateResource(
    client,
    ListAccountsForParentCommand,
    'Accounts',
    {
      inputKey: 'NextToken',
      outputKey: 'NextToken'
    },
    { ParentId: parentId }
  )
  return accounts
}

/**
 * Get the details of an Organizational Unit (OU).
 *
 * @param organizationClient the OrganizationsClient to use
 * @param ou the Organizational Unit to get the details for
 * @returns an object containing the OU's tags and metadata
 */
async function getOuDetails(
  organizationClient: OrganizationsClient,
  ou: OrganizationalUnit
): Promise<OuDetails> {
  return {
    tags: await getTagsForOu(organizationClient, ou.Id!),
    metadata: {
      arn: ou.Arn!,
      name: ou.Name!
    }
  }
}

/**
 * Get the policies for a target
 *
 * @param client the OrganizationsClient to use
 * @param targetId the id of the target to get the policies for
 * @param policyType the type of policy to get
 * @param enabled whether the policy type is enabled
 * @returns the Arns of the policies for the target
 */
async function getPoliciesForTarget(
  client: OrganizationsClient,
  targetId: string,
  policyType: PolicyType,
  enabled: boolean
): Promise<string[]> {
  if (!enabled) {
    return []
  }

  const policies = await paginateResource(
    client,
    ListPoliciesForTargetCommand,
    'Policies',
    { inputKey: 'NextToken', outputKey: 'NextToken' },
    {
      TargetId: targetId,
      Filter: policyType
    }
  )

  return policies.map((policy) => policy.Arn!)
}

/**
 * Sync the policies for an organization and a specific policy type.
 *
 * @param organizationId the id of the organization to sync policies for
 * @param organizationClient the OrganizationsClient to use
 * @param storage the AwsIamStore to use for persistence
 * @param policyType the type of policy to sync (e.g., SERVICE_CONTROL_POLICY, RESOURCE_CONTROL_POLICY)
 * @param fileType the type of policy file to sync to storage (e.g., 'scps', 'rcps')
 * @param enabled whether the policy type is enabled in the organization
 */
async function syncPolicies(
  organizationId: string,
  organizationClient: OrganizationsClient,
  storage: AwsIamStore,
  policyType: PolicyType,
  fileType: OrganizationPolicyType,
  enabled: boolean,
  writeOnly: boolean
): Promise<void> {
  if (!enabled && !writeOnly) {
    const existingPolicies = await storage.listOrganizationPolicies(organizationId, fileType)
    for (const policyId of existingPolicies) {
      await storage.deleteOrganizationPolicy(organizationId, fileType, policyId)
    }
    return
  }

  const policies = await paginateResource(
    organizationClient,
    ListPoliciesCommand,
    'Policies',
    { inputKey: 'NextToken', outputKey: 'NextToken' },
    {
      Filter: policyType
    }
  )

  if (!writeOnly) {
    // Delete policies that are no longer present in the organization
    const existingPolicies = await storage.listOrganizationPolicies(organizationId, fileType)
    const newPolicyIds = new Set(policies.map((p) => p.Id!.toLowerCase()))
    const policiesToDelete = existingPolicies.filter((id) => !newPolicyIds.has(id))
    for (const policyToDelete of policiesToDelete) {
      await storage.deleteOrganizationPolicy(organizationId, fileType, policyToDelete)
    }
  }

  for (const policy of policies) {
    const metadata = {
      arn: policy.Arn,
      name: policy.Name,
      description: policy.Description,
      awsManaged: policy.AwsManaged
    }
    await storage.saveOrganizationPolicyMetadata(
      organizationId,
      fileType,
      policy.Id!,
      'metadata',
      metadata
    )
    const content = await getPolicyContent(organizationClient, policy.Id!)
    await storage.saveOrganizationPolicyMetadata(
      organizationId,
      fileType,
      policy.Id!,
      'policy',
      content
    )

    const tags = await getTags(organizationClient, policy.Id!)
    await storage.saveOrganizationPolicyMetadata(organizationId, fileType, policy.Id!, 'tags', tags)
  }
}

/**
 * Get the content of a policy by its ID.
 *
 * @param organizationClient the OrganizationsClient to use
 * @param policyId the ID of the policy to get the content for
 * @returns the content of the policy as a parsed JSON object, or undefined if the policy does not exist or has no content
 */
async function getPolicyContent(
  organizationClient: OrganizationsClient,
  policyId: string
): Promise<any | undefined> {
  const command = new DescribePolicyCommand({ PolicyId: policyId })
  const response = await runAndCatch404(() => organizationClient.send(command))
  if (response?.Policy?.Content) {
    return JSON.parse(response.Policy.Content)
  }
  return undefined
}

/**
 * Sync the organization resource policy.
 *
 * @param organizationClient the OrganizationsClient to use
 * @param storage the AwsIamStore to use for persistence
 * @param organizationId the id of the organization to sync the resource policy for
 */
async function syncOrganizationResourcePolicy(
  organizationClient: OrganizationsClient,
  storage: AwsIamStore,
  organizationId: string
): Promise<void> {
  const policy = await getOrganizationResourcePolicy(organizationClient, organizationId)
  await storage.saveOrganizationMetadata(organizationId, 'policy', policy)
}

/**
 * Get the resource policy for an organization.
 *
 * @param organizationClient the OrganizationsClient to use
 * @param organizationId the id of the organization to get the resource policy for
 * @returns the resource policy as a parsed JSON object, or undefined if the policy does not exist or has no content
 */
async function getOrganizationResourcePolicy(
  organizationClient: OrganizationsClient,
  organizationId: string
): Promise<any | undefined> {
  const command = new DescribeResourcePolicyCommand({ PolicyId: organizationId })
  try {
    const response = await organizationClient.send(command)
    if (response?.ResourcePolicy?.Content) {
      return JSON.parse(response.ResourcePolicy.Content)
    }
    return undefined
  } catch (error: any) {
    if (error.name === 'ResourcePolicyNotFoundException') {
      return undefined
    }
    throw error
  }
}

/**
 * Save the organization ID for an account if it is not already saved.
 *
 * @param storage the AwsIamStore to use for persistence
 * @param accountId the ID of the account to save the organization ID for
 * @param organizationId the ID of the organization to save
 */
async function saveOrgForAccount(
  storage: AwsIamStore,
  accountId: string,
  organizationId: string | undefined
): Promise<void> {
  if (organizationId) {
    await storage.saveAccountMetadata(accountId, 'organization', { organizationId })
  } else {
    await storage.saveAccountMetadata(accountId, 'organization', undefined)
  }
}
