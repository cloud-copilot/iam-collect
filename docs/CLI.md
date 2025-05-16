# CLI

CLI Help can be accessed with `iam-collect --help` or `iam-collect <subcommand> --help`.

All subcommands and `--` arguments support partial matching as long as the input matches one and only one subcommand/argument. For example:

- `iam-collect d` is equivalent to `iam-collect download`
- `iam-collect d --acc 123456789012` is equivalent to `iam-collect download --accounts 123456789012`

All arguments that accept a list of values (e.g., `--accounts`, `--regions`, `--services`) are space separated.

## Commands

### `init` - Create a new iam-collect configuration

```bash
iam-collect init
```

Create a new configuration file called `iam-collect.jsonc` in the current directory.

### `download` - Download IAM data

```bash
iam-collect download [arguments]
```

Downloads IAM data from one or more AWS accounts and updates indexes.

If any resources in your storage no longer exist, they will be deleted from your storage. For example if you delete a bucket in S3, the corresponding folder in your storage will be deleted.

**Arguments:**

| Argument                 | Description                            | Default                        |
| ------------------------ | -------------------------------------- | ------------------------------ |
| `--configFiles <files>`  | One or more configuration files        | `iam-collect.jsonc`            |
| `--accounts <ids>`       | AWS account IDs to download from       | all included in config         |
| `--regions <regions>`    | AWS regions to scan                    | all included in config         |
| `--services <services>`  | AWS services to scan                   | all included in config         |
| `-n, --no-index`         | Skip refreshing indexes after download | false                          |
| `--concurrency <number>` | See [Concurrency](#concurrency)        | calculated from number of CPUs |
| `--log <level>`          | See [Logging](#logging)                | `warn`                         |

**Examples:**

```bash
iam-collect download --accounts 123456789012 --regions us-east-1,eu-west-1
iam-collect download -n
```

### `index` - Refresh indexes

```bash
iam-collect index [options]
```

**Description:** Rebuilds or incrementally updates indexes based on existing IAM data files.

**Arguments:**

| Flag                      | Description                     | Default                        |
| ------------------------- | ------------------------------- | ------------------------------ |
| `--configFiles <files>`   | One or more configuration files | `iam-collect.jsonc`            |
| `--partition <partition>` | AWS partition to refresh        | `aws`                          |
| `--accounts <ids>`        | AWS account IDs to refresh      | all accounts                   |
| `--regions <regions>`     | AWS regions to refresh          | all regions                    |
| `--services <services>`   | AWS services to refresh         | all services                   |
| `--concurrency <number>`  | See [Concurrency](#concurrency) | calculated from number of CPUs |
| `--log <level>`           | See [Logging](#logging)         | `warn`                         |

**Examples:**

```bash
iam-collect index --accounts 123456789012 --services s3 --regions us-west-2
iam-collect index
```

## Logging

All commands support a `--log <level>` flag to control verbosity. Available levels:

- `error`: Only errors
- `warn`: Warnings and errors (default)
- `info`: Informational messages, warnings, and errors (default)
- `debug`: Detailed debugging output
- `trace`: Extremely verbose output, including internal state changes

Example:

```bash
iam-collect download --log debug
```

## Concurrency

Both `download` and `index` default to a concurrency level based on the number of CPUs on your machine. It's possible to get rate limited by AWS running too many requests in parallel but unlikely. Syncs are separated by account, region, and service to avoid overwhelming AWS. Also automatic backoff and retry is automatically configured for all requests.

You can adjust concurrency up and down depending on your actual performance.

Use `--concurrency 1` to override this and disable concurrent downloads or indexing.

Example:

```bash
iam-collect download --concurrency 50
```
