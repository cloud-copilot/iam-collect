# Indexing

Some resources are hard to find in AWS. A couple examples are:

- What account does a bucket belong to?
- What organization is an account in?

For this we index some resource data in the `indexes` folder for each partition. This automatically at the end of any download process. The indexes are updated incrementally and only update the data that has changed. You should never need to manually run indexes.

## Optimistic Locking

We use optimistic locking to prevent concurrent index updates from clobbering each other:

- **Filesystem backend**: Before writing an updated index file, iam-collect computes a hash of the existing file on disk and compares it against the new content’s hash.

- **S3 backend**: When storing indexes in S3, we leverage Amazon S3’s [conditional writes feature](https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-s3-functionality-conditional-writes/).

If optimistic locking fails, the index update will try a total of three times before returning an error to the user.

## Deferring Indexing

Indexing can be deferred, for example if you want to download from a large number of accounts and index all at once. Use the `--no-index` (or `-n`) argument of the download command:

```bash
iam-collect download --no-index
```

This will skip index updates during that run.

## Manual Indexing

To rebuild or update indexes manually, use the `index` command:

```bash
iam-collect index [--accounts <list>] [--services <list>] [--regions <list>]
```

Running `iam-collect index` without flags will rebuild all indexes from scratch. You can also pass the same `--accounts`, `--services`, and `--regions` flags used by `download` to incrementally update only specific slices of your data.
