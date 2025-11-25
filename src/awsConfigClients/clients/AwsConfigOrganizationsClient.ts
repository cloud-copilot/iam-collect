import {
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
  OrganizationsClient
} from '@aws-sdk/client-organizations'
import { AwsCredentialProviderWithMetaData } from '../../aws/coreAuth.js'
import { AbstractClient } from '../../customClients/AbstractClient.js'
import { AwsConfigClientContext, awsConfigCommand } from '../AwsConfigClientContext.js'

/**
 * AWS Config-based Organizations client implementation
 * Returns empty responses since organization data is not tracked in AWS Config
 *
 * Since policies are not available in AWS Config, this client provides limited functionality
 * and returns empty results for all operations.
 */
export class AwsConfigOrganizationsClient extends AbstractClient<AwsConfigClientContext> {
  static readonly clientName = OrganizationsClient.name

  constructor(
    options: {
      credentials: AwsCredentialProviderWithMetaData
      region: string | undefined
    },
    customContext: AwsConfigClientContext
  ) {
    super(options, customContext)
  }

  /**
   * Register all Organizations command implementations
   */
  protected registerCommands(): void {
    this.registerCommand(AwsConfigDescribeOrganizationCommand)
    this.registerCommand(AwsConfigDescribePolicyCommand)
    this.registerCommand(AwsConfigDescribeResourcePolicyCommand)
    this.registerCommand(AwsConfigListAccountsForParentCommand)
    this.registerCommand(AwsConfigListDelegatedAdministratorsCommand)
    this.registerCommand(AwsConfigListDelegatedServicesForAccountCommand)
    this.registerCommand(AwsConfigListOrganizationalUnitsForParentCommand)
    this.registerCommand(AwsConfigListPoliciesCommand)
    this.registerCommand(AwsConfigListPoliciesForTargetCommand)
    this.registerCommand(AwsConfigListRootsCommand)
    this.registerCommand(AwsConfigListTagsForResourceCommand)
  }
}

/**
 * Config-based implementation of Organizations DescribeOrganizationCommand
 * Returns empty result since organization data is not available in Config
 */
const AwsConfigDescribeOrganizationCommand = awsConfigCommand({
  command: DescribeOrganizationCommand,
  execute: async (input, context) => {
    // Organization data is not available in AWS Config
    return {}
  }
})

/**
 * Config-based implementation of Organizations DescribePolicyCommand
 * Returns empty result since organization policies are not available in Config
 */
const AwsConfigDescribePolicyCommand = awsConfigCommand({
  command: DescribePolicyCommand,
  execute: async (input, context) => {
    // Organization policies are not available in AWS Config
    return {}
  }
})

/**
 * Config-based implementation of Organizations DescribeResourcePolicyCommand
 * Returns empty result since organization resource policies are not available in Config
 */
const AwsConfigDescribeResourcePolicyCommand = awsConfigCommand({
  command: DescribeResourcePolicyCommand,
  execute: async (input, context) => {
    // Organization resource policies are not available in AWS Config
    return {}
  }
})

/**
 * Config-based implementation of Organizations ListAccountsForParentCommand
 * Returns empty list since organization structure is not available in Config
 */
const AwsConfigListAccountsForParentCommand = awsConfigCommand({
  command: ListAccountsForParentCommand,
  execute: async (input, context) => {
    // Organization structure is not available in AWS Config
    return {
      Accounts: []
    }
  }
})

/**
 * Config-based implementation of Organizations ListDelegatedAdministratorsCommand
 * Returns empty list since delegated administrators are not available in Config
 */
const AwsConfigListDelegatedAdministratorsCommand = awsConfigCommand({
  command: ListDelegatedAdministratorsCommand,
  execute: async (input, context) => {
    // Delegated administrators are not available in AWS Config
    return {
      DelegatedAdministrators: []
    }
  }
})

/**
 * Config-based implementation of Organizations ListDelegatedServicesForAccountCommand
 * Returns empty list since delegated services are not available in Config
 */
const AwsConfigListDelegatedServicesForAccountCommand = awsConfigCommand({
  command: ListDelegatedServicesForAccountCommand,
  execute: async (input, context) => {
    // Delegated services are not available in AWS Config
    return {
      DelegatedServices: []
    }
  }
})

/**
 * Config-based implementation of Organizations ListOrganizationalUnitsForParentCommand
 * Returns empty list since organizational units are not available in Config
 */
const AwsConfigListOrganizationalUnitsForParentCommand = awsConfigCommand({
  command: ListOrganizationalUnitsForParentCommand,
  execute: async (input, context) => {
    // Organizational units are not available in AWS Config
    return {
      OrganizationalUnits: []
    }
  }
})

/**
 * Config-based implementation of Organizations ListPoliciesCommand
 * Returns empty list since organization policies are not available in Config
 */
const AwsConfigListPoliciesCommand = awsConfigCommand({
  command: ListPoliciesCommand,
  execute: async (input, context) => {
    // Organization policies are not available in AWS Config
    return {
      Policies: []
    }
  }
})

/**
 * Config-based implementation of Organizations ListPoliciesForTargetCommand
 * Returns empty list since organization policies are not available in Config
 */
const AwsConfigListPoliciesForTargetCommand = awsConfigCommand({
  command: ListPoliciesForTargetCommand,
  execute: async (input, context) => {
    // Organization policies are not available in AWS Config
    return {
      Policies: []
    }
  }
})

/**
 * Config-based implementation of Organizations ListRootsCommand
 * Returns empty list since organization structure is not available in Config
 */
const AwsConfigListRootsCommand = awsConfigCommand({
  command: ListRootsCommand,
  execute: async (input, context) => {
    // Organization structure is not available in AWS Config
    return {
      Roots: []
    }
  }
})

/**
 * Config-based implementation of Organizations ListTagsForResourceCommand
 * Returns empty list since organization resource tags are not available in Config
 */
const AwsConfigListTagsForResourceCommand = awsConfigCommand({
  command: ListTagsForResourceCommand,
  execute: async (input, context) => {
    // Organization resource tags are not available in AWS Config
    return {
      Tags: []
    }
  }
})
