# iam-collect

Collect IAM data from AWS. This is built to run out of the box in simple use cases, and also work in terribly oppressive environments with a little more configuration. If you want to analyze IAM data at scale this is what you've been looking for.

# BETA

This is still in beta, commands and configuration options are likely to change.

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
