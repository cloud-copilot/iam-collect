# iam-collect

[![NPM Version](https://img.shields.io/npm/v/@cloud-copilot/iam-collect.svg?logo=nodedotjs)](https://www.npmjs.com/package/@cloud-copilot/iam-collect) [![License: AGPL v3](https://img.shields.io/github/license/cloud-copilot/iam-collect)](LICENSE.txt) [![GuardDog](https://github.com/cloud-copilot/iam-collect/actions/workflows/guarddog.yml/badge.svg)](https://github.com/cloud-copilot/iam-collect/actions/workflows/guarddog.yml) [![Known Vulnerabilities](https://snyk.io/test/github/cloud-copilot/iam-collect/badge.svg?targetFile=package.json&style=flat-square)](https://snyk.io/test/github/cloud-copilot/iam-collect?targetFile=package.json)

Get every possible policy in any set of AWS accounts. This is built to run out of the box in simple use cases, and also work in terribly oppressive environments with a little more configuration. If you want to analyze IAM data at scale this is what you've been looking for.

# BETA

This is still in beta, commands and configuration options are likely to change.

## Quick Start

By default, iam-collect will use the credentials configured in your environment. If you have the permissions in the SID `CollectIAMData` in the [example Policy](aws/collect-policy.json) everything will work for the current account you have credentials for.

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
