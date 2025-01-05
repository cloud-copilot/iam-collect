# iam-download

Download IAM data from AWS. This is built to run out of the box in simple use cases, and also work in terribly oppresive environments with a little more configuration. If you want to analyze IAM data at scale this is what you've been looking for.

# BETA

This is still in beta, commands and configuration options are likely to change.

## Installation

```bash
npm install -g @cloud-copilot/iam-download
```

## Intialization

First you need to initialize the configuration file. This will create a commented iam-download.jsonc file with comments for the different elements.

```bash
iam-download init
```

This will create a file called `iam-download.jsonc` in the current directory with a simple default configuration and many comments on how to customize the configuration.
