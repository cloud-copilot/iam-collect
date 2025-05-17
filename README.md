# iam-collect

[![NPM Version](https://img.shields.io/npm/v/@cloud-copilot/iam-collect.svg?logo=nodedotjs)](https://www.npmjs.com/package/@cloud-copilot/iam-collect) [![License: AGPL v3](https://img.shields.io/github/license/cloud-copilot/iam-collect)](LICENSE.txt) [![GuardDog](https://github.com/cloud-copilot/iam-collect/actions/workflows/guarddog.yml/badge.svg)](https://github.com/cloud-copilot/iam-collect/actions/workflows/guarddog.yml) [![Known Vulnerabilities](https://snyk.io/test/github/cloud-copilot/iam-collect/badge.svg?targetFile=package.json&style=flat-square)](https://snyk.io/test/github/cloud-copilot/iam-collect?targetFile=package.json)

Get every possible policy in any set of AWS accounts. This is built to run out of the box in simple use cases, and also work in terribly oppressive environments with a little more configuration. If you want to analyze IAM data at scale this is what you've been looking for.

## Table of Contents

1. [Tenets](#iam-collect-tenets)
2. [Introduction](#introduction)
3. [Getting Started](#getting-started)
4. [Configuration](docs/Configuration.md)
5. [Authentication](docs/Authentication.md)
6. [Storage](docs/Storage.md)
7. [Filtering](docs/Filtering.md)
8. [Indexing](docs/Indexing.md)
9. [CLI](docs/CLI.md)
10. [History](docs/History.md)
11. [Supported Services and Data](#supported-services-and-data)

## iam-collect Tenets

1. _Centralized_ Store [all your data](#supported-services-and-data-downloaded) across all partitions, organizations, accounts, and regions in one place. This is a single source of truth for all your IAM data.
2. _Easy_ A few commands and you can get started and everything should just work. If resources no longer exist, data is cleaned up automatically.
3. _Configurable_ Store your data on [disk or in S3](docs/Storage.md). You can configure exactly what [accounts, regions, and services](docs/Filtering.md) you want to collect data for; and [customize auth](docs/Authentication.md) for each.

## Introduction

### What is iam-collect?

iam-collect is a command-line tool that aggregates every IAM-related resource and policy across any number of AWS accounts, regions, and partitions into a single, consistent dataset. It requires minimal setup for simple use cases and allows flexible configuration to operate in even the most restrictive (compliance oriented) environments to give you a single source of truth for your IAM data.

### Why use it?

- **Centralized store:** Consolidate IAM data from multiple partitions, organizations, and accounts into one structured store.
- **Get everything:** Collect all the polices from all the resources in all your accounts. Terraform will show you what was intended, iam-collect will show you what is actually there.
- **Audit and compliance:** Generate comprehensive snapshots of your IAM landscape to support security reviews, audits, and forensics. The structured approach to storage makes it easy to build automation and tooling around the data.

### How it works at a glance

Every time you run `iam-collect download` it will:

1. **Scan:** Connect to AWS account(s) using your configured credentials or roles and retrieve IAM resources (users, roles, policies, etc.) from each target account.
2. **Store:** Persist the data to your chosen storage (local filesystem or S3), organizing it by partition, account, service, and resource.
3. **Index:** Build search-friendly JSON indexes that map resources to accounts and other relationships for fast lookups.

Then you use the data to analyze your IAM landscape, build reports, or integrate with other tools.

## Getting Started

By default, iam-collect will use the credentials configured in your environment using the [default credential chain](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-credential-providers/#fromnodeproviderchain). If you have the permissions in the SID `CollectIAMData` in the [example policy](src/aws/collect-policy.json) everything will work for the current account you have credentials for.

You don't need the AWS CLI, but a good way to make sure your credentials are configured is to ensure you can run `aws sts get-caller-identity` and a command that requires a region be set such as `aws ec2 describe-instances`.

```bash
npm install -g @cloud-copilot/iam-collect
# Create a default configuration file
iam-collect init
# Download iam data from the current account to `./iam-data`
iam-collect download
```

### Install

You need Node.js >= 20.

```bash
npm install -g @cloud-copilot/iam-collect
```

### Initialize

```bash
iam-collect init
```

This will create a file called `iam-collect.jsonc` in the current directory with a simple default configuration and many comments on how to customize the configuration.

### Download

```bash
iam-collect download
```

This will download the IAM data from the current account to the `./iam-data` directory. You can change the output directory by modifying the `storage.path` property in the configuration. See the [storage docs](docs/Storage.md) for more details.

### Enjoy

```bash
ls -R ./iam-data
```

This will show you your data that was downloaded. See the [storage docs](docs/Storage.md#storage-layout-explained) for more details on the layout of the data.

## Additional Docs

- [Configuration](docs/Configuration.md) - Set the configuration files to use.
- [Authentication](docs/Authentication.md) - Configure authentication for different accounts, services, and regions.
- [Storage](docs/Storage.md) - Configure where your data is stored.
- [Filtering](docs/Filtering.md) - Configure what accounts, services, and regions are downloaded.
- [Indexing](docs/Indexing.md) - Disable or manually run indexing.
- [CLI](docs/CLI.md) - Details on the CLI commands and options.
- [History](docs/History.md) - How to track history of changes.

## Supported Services and Data

| Service           | Resource Type                     | Data Downloaded                                                                                                        |
| ----------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| iam               | Users                             | name, path, id, groups, tags, inline policies, managed policies, permission boundary                                   |
| iam               | Groups                            | name, path, id, inline policies, managed policies                                                                      |
| iam               | Roles                             | name, path, id, trust policy, inline policies, managed policies, instance profiles, tags, permission boundary          |
| iam               | Customer and AWS Managed Policies | name, path, id, default version, default version doc, tags                                                             |
| iam               | OIDC Providers                    | arn, audiences, thumbprints, url, tags                                                                                 |
| iam               | SAML Providers                    | arn, metadata document, uuid, private keys, valid until, tags                                                          |
| iam               | Instance Profiles                 | arn, name, roles, id, path, tags                                                                                       |
| apigateway        | Rest APIs                         | id, name, policy, tags                                                                                                 |
| dynamodb          | Tables                            | name, arn, region, tags, resource policy                                                                               |
| ecr               | Repositories                      | name, arn, region, tags, resource policy, key id                                                                       |
| ecr               | Registries                        | policy                                                                                                                 |
| ec2               | VPC Endpoints                     | id, name, type, vpc, policy                                                                                            |
| elasticfilesystem | File Systems                      | name, id, key, encryption, tags, policy                                                                                |
| glacier           | Vaults                            | name, arn, region, tags, policy                                                                                        |
| glue              | Root Catalogs                     | policy                                                                                                                 |
| kms               | Keys                              | id, policy, tags                                                                                                       |
| lambda            | Functions                         | name, role, tags, policy                                                                                               |
| ram               | Shared Resources                  | arn, resource shares, resource policy                                                                                  |
| s3                | Access Points                     | name, bucket, bucket account, policy, block public access configuration, network origin, vpc, alias, endpoints         |
| s3                | Buckets                           | name, region, tags, policy, block public access configuration, default encryption                                      |
| s3                | Multi Region Access Points        | name, alias, regions, policy, block public access configuration                                                        |
| s3express         | Directory Buckets                 | name, encryption settings, policy                                                                                      |
| s3tables          | Table Buckets                     | name, region, bucket policy, encryption                                                                                |
| organizations     | Organizations                     | id, arn, root account id, enabled policy types, org structure                                                          |
| organizations     | Organizational Units              | id, arn, parent ou, enabled SCPs, enabled RCPs, tags                                                                   |
| organizations     | Accounts                          | id, arn, parent ou, enabled SCPs, enabled RCPs, tags                                                                   |
| organizations     | SCPs, RCPs                        | id, arn, name, description, tags, policy                                                                               |
| sns               | Topics                            | name, arn, tags, kms key id, policy                                                                                    |
| sqs               | Queues                            | name, arn, tags, kms key id, policy                                                                                    |
| sso               | Instances                         | id, arn, name, owner account id, status, tags                                                                          |
| sso               | Permission Sets                   | name, description, AWS managed policies, customer managed policies, inline policy, permission boundary, accounts, tags |

If you don't see the data you are looking for, please check the [open resource issues](https://github.com/cloud-copilot/iam-collect/issues?q=is%3Aissue%20state%3Aopen%20label%3Aresource) and comment on the issue or create a new one.
