# iam-collect

[![NPM Version](https://img.shields.io/npm/v/@cloud-copilot/iam-collect.svg?logo=nodedotjs)](https://www.npmjs.com/package/@cloud-copilot/iam-collect) [![License: AGPL v3](https://img.shields.io/github/license/cloud-copilot/iam-collect)](LICENSE.txt) [![GuardDog](https://github.com/cloud-copilot/iam-collect/actions/workflows/guarddog.yml/badge.svg)](https://github.com/cloud-copilot/iam-collect/actions/workflows/guarddog.yml) [![Known Vulnerabilities](https://snyk.io/test/github/cloud-copilot/iam-collect/badge.svg?targetFile=package.json&style=flat-square)](https://snyk.io/test/github/cloud-copilot/iam-collect?targetFile=package.json)

Get every possible policy in any set of AWS accounts. This is built to run out of the box in simple use cases, and also work in terribly oppressive environments with a little more configuration. If you want to analyze IAM data at scale this is what you've been looking for.

# BETA

This is still in beta, commands and configuration options are likely to change.

## Quick Start

By default, iam-collect will use the credentials configured in your environment. If you have the permissions in the SID `CollectIAMData` in the [example policy](src/aws/collect-policy.json) everything will work for the current account you have credentials for.

Make sure you can run `aws sts get-caller-identity` and a command that requires a region be set such as `aws ec2 describe-instances`.

```bash
npm install -g @cloud-copilot/iam-collect
# Create a default configuration file
iam-collect init
# Download iam data from the current account to `./iam-data`
iam-collect download
```

## Installation

```bash
npm install -g @cloud-copilot/iam-collect
```

## Initialization

First you need to initialize the configuration file. This will create a commented iam-collect.jsonc file with comments for the different elements.

```bash
iam-collect init
```

This will create a file called `iam-collect.jsonc` in the current directory with a simple default configuration and many comments on how to customize the configuration.

## Downloading IAM Data

```bash
iam-collect download
```

This will download the IAM data from the current account to the `./iam-data` directory. You can change the output directory by modifying the `path` property in the `storage` configuration.

# Supported Services and Data Downloaded

| Service       | Resource Type                     | Data Downloaded                                                                                                        |
| ------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| iam           | Users                             | name, path, id, groups, tags, inline policies, managed policies, permission boundary                                   |
| iam           | Groups                            | name, path, id, inline policies, managed policies                                                                      |
| iam           | Roles                             | name, path, id, trust policy, inline policies, managed policies, instance profiles, tags, permission boundary          |
| iam           | Customer and AWS Managed Policies | name, path, id, default version, default version doc, tags                                                             |
| iam           | OIDC Providers                    | arn, audiences, thumbprints, url, tags                                                                                 |
| iam           | SAML Providers                    | arn, metadata document, uuid, private keys, valid until, tags                                                          |
| dynamodb      | Tables                            | name, arn, region, tags, resource policy                                                                               |
| kms           | Keys                              | id, policy, tags                                                                                                       |
| lambda        | Functions                         | name, role, tags, policy                                                                                               |
| s3            | Buckets                           | name, region, tags, policy, block public access configuration, default encryption                                      |
| organizations | Organizations                     | id, arn, root account id, enabled policy types, org structure                                                          |
| organizations | Organizational Units              | id, arn, parent ou, enabled SCPs, enabled RCPs, tags                                                                   |
| organizations | Accounts                          | id, arn, parent ou, enabled SCPs, enabled RCPs, tags                                                                   |
| organizations | SCPs, RCPs                        | id, arn, name, description, tags, policy                                                                               |
| sso           | Instances                         | id, arn, name, owner account id, status, tags                                                                          |
| sso           | Permission Sets                   | name, description, AWS managed policies, customer managed policies, inline policy, permission boundary, accounts, tags |
