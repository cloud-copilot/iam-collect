# AI Agent Instructions for iam-collect Data Analysis

This document provides comprehensive instructions for AI systems to understand, navigate, and analyze data collected by iam-collect. The data is structured in a hierarchical filesystem layout that mirrors AWS resource organization and enables powerful IAM policy analysis.

## Overview

iam-collect stores AWS IAM-related data in a structured filesystem format optimized for analysis and programmatic access. The data includes:

- AWS resource metadata and policies
- IAM roles, policies, and trust relationships
- AWS Organizations structure and policies
- Cross-account resource sharing (RAM)
- Search indexes for efficient lookups

## Filesystem Structure

### Root Structure

```
<storage-path>/
└── aws/                          # Always 'aws' (may support other clouds later)
    └── <partition>/              # AWS partition: 'aws', 'aws-cn', or 'aws-us-gov'
        ├── accounts/             # Account-specific resources
        ├── organizations/        # AWS Organizations data
        └── indexes/             # Pre-built search indexes
```

### Account Resources Structure

```
accounts/
└── <account-id>/                 # 12-digit AWS account ID (e.g., 193045323908)
    ├── <service>/               # AWS service name (iam, s3, ec2, etc.)
    │   └── [<region>/]          # Region (for regional services)
    │       └── [<resource-type>/] # Resource type (role, policy, bucket, etc.)
    │           └── <resource-id>/  # URL-encoded resource identifier
    │               ├── metadata.json    # Resource metadata
    │               ├── policy.json      # Resource-based policy (if exists)
    │               ├── trust-policy.json # Trust policy (for IAM roles)
    │               ├── inline-policies.json # Inline policies
    │               └── <other>.json     # Other resource-specific data
    ├── ram/                     # Resource Access Manager shares
    │   └── <region>/            # Region or 'global'
    │       └── <encoded-arn>.json # RAM resource data
    └── organization.json        # Organization membership info
```

### Organizations Structure

```
organizations/
└── <organization-id>/           # AWS Organization ID (e.g., o-uch56v3mmz)
    ├── metadata.json           # Organization metadata and features
    ├── accounts.json           # Account list and details
    ├── structure.json          # Organizational unit hierarchy
    ├── delegated-admins.json   # Service principal → account ID mappings
    ├── ous/                    # Organizational Units
    │   └── <ou-id>/
    │       ├── metadata.json   # OU metadata
    │       └── tags.json       # OU tags
    ├── scps/                   # Service Control Policies
    │   └── <policy-id>/
    │       ├── metadata.json   # Policy metadata
    │       ├── policy.json     # Policy document
    │       └── tags.json       # Policy tags
    └── rcps/                   # Resource Control Policies (similar to SCPs)
```

### Indexes Structure

```
indexes/
├── accounts-to-orgs.json           # Account ID → Organization ID mapping
├── buckets-to-accounts.json        # S3 bucket → Account mapping
├── principals-to-trust-policies.json # Principal → Roles that trust them
├── apigateways-to-accounts.json     # API Gateway → Account mapping
└── vpcs.json                       # VPC information across accounts
```

## File Naming Conventions

### ARN to Filesystem Path Conversion

AWS ARNs are converted to filesystem paths using these rules:

1. **ARN Format**: `arn:partition:service:region:account-id:resource-type/resource-id`
2. **Path Format**: `accounts/<account-id>/<service>/[<region>/][<resource-type>/]<encoded-resource-id>/`

### Encoding Rules

- **Resource IDs**: URL-encoded (e.g., `aws-service-role/sso.amazonaws.com/AWSServiceRoleForSSO` → `aws-service-role%2fsso.amazonaws.com%2fawsserviceroleforSSO`)
- **All paths**: Converted to lowercase
- **Special characters**: Colons (`:`) and slashes (`/`) in ARNs become hyphens (`-`) in RAM filenames

### Examples

| ARN                                                | Filesystem Path                                      |
| -------------------------------------------------- | ---------------------------------------------------- |
| `arn:aws:iam::123456789012:role/MyRole`            | `accounts/123456789012/iam/role/myrole/`             |
| `arn:aws:s3:::my-bucket`                           | `accounts/123456789012/s3/my-bucket/`                |
| `arn:aws:iam::aws:policy/AdminAccess`              | `accounts/123456789012/iam/aws/policy/adminaccess/`  |
| `arn:aws:ec2:us-east-1:123456789012:vpc/vpc-12345` | `accounts/123456789012/ec2/us-east-1/vpc/vpc-12345/` |

## Data File Types

### Resource Files

- **`metadata.json`**: Core resource metadata (ARN, name, creation date, etc.)
- **`policy.json`**: Resource-based policies (S3 bucket policies, resource policies)
- **`trust-policy.json`**: IAM role trust policies
- **`inline-policies.json`**: IAM entity inline policies
- **`tags.json`**: Resource tags
- **`encryption.json`**: Encryption configuration
- **`bpa.json`**: Block Public Access settings (S3)

### Organization Files

- **`metadata.json`**: Organization details, root OU, features enabled
- **`accounts.json`**: All accounts with OU mappings and policy assignments
- **`structure.json`**: Complete OU hierarchy
- **`delegated-admins.json`**: Service principal to account mappings

## Common Analysis Patterns

### 1. Finding Roles with Overly Permissive Trust Policies

**Goal**: Find roles that trust all principals (`"*"`)

**Approach**:

```python
# Pseudo-code for finding overly permissive trust policies
def find_overly_permissive_roles(base_path):
    overly_permissive = []

    for account_dir in glob(f"{base_path}/accounts/*/"):
        trust_policies = glob(f"{account_dir}/iam/role/*/trust-policy.json")

        for policy_file in trust_policies:
            policy = json.load(open(policy_file))
            role_path = os.path.dirname(policy_file)

            for statement in policy.get("Statement", []):
                principal = statement.get("Principal", {})

                # Check for wildcard principals
                if principal == "*" or \
                   (isinstance(principal, dict) and "*" in str(principal)):
                    metadata = json.load(open(f"{role_path}/metadata.json"))
                    overly_permissive.append({
                        "arn": metadata["arn"],
                        "account": extract_account_from_path(role_path),
                        "trust_policy": policy
                    })

    return overly_permissive
```

### 2. Finding Policies with Wildcard Resource Access

**Goal**: Find policies granting access to all resources (`"Resource": "*"`)

**Approach**:

```python
# Check both inline policies and managed policies
def find_wildcard_resource_policies(base_path):
    wildcard_policies = []

    # Check inline policies
    for policy_file in glob(f"{base_path}/accounts/*/iam/*/inline-policies.json"):
        policies = json.load(open(policy_file))
        check_policy_statements(policies, policy_file, wildcard_policies)

    # Check managed policies
    for policy_file in glob(f"{base_path}/accounts/*/iam/policy/*/policy.json"):
        policy = json.load(open(policy_file))
        check_policy_statements({"policies": [policy]}, policy_file, wildcard_policies)

    # Check resource-based policies
    for policy_file in glob(f"{base_path}/accounts/*/*/policy.json"):
        policy = json.load(open(policy_file))
        check_policy_statements({"policies": [policy]}, policy_file, wildcard_policies)

    return wildcard_policies

def check_policy_statements(policy_container, file_path, results):
    for policy in policy_container.get("policies", []):
        for statement in policy.get("Statement", []):
            resources = statement.get("Resource", [])
            if isinstance(resources, str):
                resources = [resources]

            if "*" in resources:
                results.append({
                    "file": file_path,
                    "policy": policy,
                    "wildcard_statement": statement
                })
```

### 3. Cross-Account Access Analysis

**Goal**: Find resources accessible from other accounts

**Method 1 - Use the trust policy index**:

```python
# Load the pre-built index
principals_index = json.load(open(f"{base_path}/indexes/principals-to-trust-policies.json"))

def find_cross_account_access(base_path, target_account):
    cross_account_access = []

    for account_id, principals in principals_index.items():
        if account_id == target_account:
            continue

        for principal_type, principal_data in principals.items():
            for principal, trusted_roles in principal_data.items():
                # Check if principal is from target account
                if target_account in principal:
                    cross_account_access.append({
                        "trusting_account": account_id,
                        "trusted_principal": principal,
                        "roles": trusted_roles
                    })

    return cross_account_access
```

**Method 2 - Direct filesystem scan**:

```python
def find_cross_account_trusts(base_path, target_account):
    cross_account_trusts = []

    for trust_policy_file in glob(f"{base_path}/accounts/*/iam/role/*/trust-policy.json"):
        policy = json.load(open(trust_policy_file))
        role_path = os.path.dirname(trust_policy_file)

        for statement in policy.get("Statement", []):
            principal = statement.get("Principal", {})

            # Extract account from principal ARNs
            if isinstance(principal, dict):
                for principal_type, principal_values in principal.items():
                    if isinstance(principal_values, list):
                        for value in principal_values:
                            if target_account in str(value):
                                cross_account_trusts.append({
                                    "role_path": role_path,
                                    "trusted_principal": value,
                                    "statement": statement
                                })

    return cross_account_trusts
```

### 4. Organization Policy Analysis

**Goal**: Analyze Service Control Policies and delegation

**Approach**:

```python
def analyze_organization_policies(base_path, org_id):
    org_path = f"{base_path}/organizations/{org_id}"

    # Load organization structure
    metadata = json.load(open(f"{org_path}/metadata.json"))
    accounts = json.load(open(f"{org_path}/accounts.json"))
    structure = json.load(open(f"{org_path}/structure.json"))
    delegated_admins = json.load(open(f"{org_path}/delegated-admins.json"))

    # Analyze SCPs
    scps = []
    for scp_dir in glob(f"{org_path}/scps/*/"):
        scp_metadata = json.load(open(f"{scp_dir}/metadata.json"))
        scp_policy = json.load(open(f"{scp_dir}/policy.json"))
        scps.append({
            "metadata": scp_metadata,
            "policy": scp_policy
        })

    return {
        "organization": metadata,
        "accounts": accounts,
        "structure": structure,
        "delegated_administrators": delegated_admins,
        "service_control_policies": scps
    }
```

### 5. Resource Enumeration by Service

**Goal**: List all resources of a specific type

**Approach**:

```python
def list_resources_by_type(base_path, service, resource_type=None, region=None):
    resources = []

    # Build glob pattern
    pattern_parts = [base_path, "accounts", "*", service]
    if region:
        pattern_parts.append(region)
    if resource_type:
        pattern_parts.append(resource_type)
    pattern_parts.extend(["*", "metadata.json"])

    pattern = "/".join(pattern_parts)

    for metadata_file in glob(pattern):
        metadata = json.load(open(metadata_file))
        resource_dir = os.path.dirname(metadata_file)
        account_id = extract_account_from_path(metadata_file)

        # Check for associated policy files
        policy_files = glob(f"{resource_dir}/*.json")

        resources.append({
            "metadata": metadata,
            "account_id": account_id,
            "resource_directory": resource_dir,
            "available_data": [os.path.basename(f) for f in policy_files]
        })

    return resources

# Examples:
# list_resources_by_type(base_path, "s3")  # All S3 resources
# list_resources_by_type(base_path, "iam", "role")  # All IAM roles
# list_resources_by_type(base_path, "ec2", "vpc", "us-east-1")  # VPCs in us-east-1
```

## Index Files for Efficient Queries

### Pre-built Indexes

The `indexes/` directory contains pre-computed mappings for common queries:

1. **`principals-to-trust-policies.json`**: Maps each principal to roles that trust it

   ```json
   {
     "account-id": {
       "principal": {
         "arn:aws:iam::account:user/username": ["role-arn1", "role-arn2"],
         "service.amazonaws.com": ["role-arn3"]
       }
     }
   }
   ```

2. **`accounts-to-orgs.json`**: Maps account IDs to organization IDs

   ```json
   {
     "123456789012": "o-example123456"
   }
   ```

3. **`buckets-to-accounts.json`**: Maps S3 bucket names to account IDs
   ```json
   {
     "my-bucket-name": "123456789012"
   }
   ```

### Using Indexes

```python
# Load and use indexes for fast lookups
def get_organization_for_account(base_path, account_id):
    accounts_index = json.load(open(f"{base_path}/indexes/accounts-to-orgs.json"))
    return accounts_index.get(account_id)

def get_roles_trusting_principal(base_path, principal_arn):
    trust_index = json.load(open(f"{base_path}/indexes/principals-to-trust-policies.json"))

    for account_id, principals in trust_index.items():
        for principal_type, principal_data in principals.items():
            if principal_arn in principal_data:
                return principal_data[principal_arn]

    return []
```

## Best Practices for AI Analysis

### 1. Performance Optimization

- **Use indexes first**: Check `indexes/` directory before scanning filesystem
- **Filter early**: Use glob patterns to limit file scanning
- **Cache results**: Load frequently accessed data once
- **Parallel processing**: Process accounts or services in parallel when possible

### 2. Error Handling

- **Missing files**: Not all resources have all file types (e.g., not all roles have inline policies)
- **Empty policies**: Policy files may be empty or contain `null`
- **Encoding issues**: Resource names are URL-encoded in paths
- **Case sensitivity**: All paths are lowercase

### 3. Data Validation

- **JSON parsing**: Always handle JSON parsing errors gracefully
- **Schema validation**: Policy documents follow AWS IAM policy schema
- **Cross-references**: Verify ARNs match between metadata and policy files

### 4. Common Utilities

```python
import json
import os
import urllib.parse
from glob import glob

def extract_account_from_path(file_path):
    """Extract account ID from filesystem path."""
    parts = file_path.split('/')
    accounts_index = parts.index('accounts')
    return parts[accounts_index + 1]

def decode_resource_id(encoded_id):
    """Decode URL-encoded resource identifier."""
    return urllib.parse.unquote(encoded_id)

def load_json_safely(file_path):
    """Load JSON file with error handling."""
    try:
        with open(file_path, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError):
        return None

def find_all_accounts(base_path):
    """Get list of all account IDs."""
    account_dirs = glob(f"{base_path}/accounts/*/")
    return [os.path.basename(path.rstrip('/')) for path in account_dirs]
```

## Example Queries

### Query 1: Find all roles that can be assumed by any principal

```python
def find_publicly_assumable_roles(base_path):
    public_roles = []

    for trust_file in glob(f"{base_path}/accounts/*/iam/role/*/trust-policy.json"):
        trust_policy = load_json_safely(trust_file)
        if not trust_policy:
            continue

        for statement in trust_policy.get("Statement", []):
            if statement.get("Effect") == "Allow":
                principal = statement.get("Principal")
                if principal == "*":
                    role_dir = os.path.dirname(trust_file)
                    metadata = load_json_safely(f"{role_dir}/metadata.json")
                    if metadata:
                        public_roles.append(metadata)

    return public_roles
```

### Query 2: Find all S3 buckets with public read access

```python
def find_public_s3_buckets(base_path):
    public_buckets = []

    for policy_file in glob(f"{base_path}/accounts/*/s3/*/policy.json"):
        bucket_policy = load_json_safely(policy_file)
        if not bucket_policy:
            continue

        for statement in bucket_policy.get("Statement", []):
            if (statement.get("Effect") == "Allow" and
                statement.get("Principal") == "*" and
                any("s3:GetObject" in action for action in statement.get("Action", []))):

                bucket_dir = os.path.dirname(policy_file)
                metadata = load_json_safely(f"{bucket_dir}/metadata.json")
                if metadata:
                    public_buckets.append({
                        "bucket": metadata,
                        "policy_statement": statement
                    })

    return public_buckets
```

### Query 3: Find all cross-account RAM shares

```python
def find_cross_account_ram_shares(base_path):
    ram_shares = []

    for ram_file in glob(f"{base_path}/accounts/*/ram/*/*.json"):
        ram_data = load_json_safely(ram_file)
        if not ram_data:
            continue

        account_id = extract_account_from_path(ram_file)

        # Check if share is with external accounts
        for share in ram_data.get("resourceShares", []):
            for associated_entity in share.get("associatedEntities", []):
                if associated_entity != account_id:
                    ram_shares.append({
                        "sharing_account": account_id,
                        "receiving_entity": associated_entity,
                        "resource_arn": os.path.basename(ram_file).replace('.json', '').replace('-', ':'),
                        "share_details": share
                    })

    return ram_shares
```

This comprehensive guide provides AI systems with the knowledge needed to effectively analyze iam-collect data for security assessments, compliance auditing, and IAM policy optimization.
