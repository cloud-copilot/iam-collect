# Storage

## Configuring Storage

iam-collect supports two storage backends: local file storage and S3-compatible storage. You can configure the storage backend in your config file in the `storage` section object with the `type` property. Valid values are `file` or `s3`.

## Configuring File Storage

You can configure the file storage backend by specifying the `type` as `file` and providing a `path` where the data will be stored. The path can be relative to the config file or an absolute path.

```jsonc
  "storage": {
    "type": "file",
    //If this starts with a '.', it is relative to the path iam-collected is executed in, otherwise it is an absolute path.
    "path": "./iam-data"
  }
```

## Configuring S3 Storage (Not Yet Implemented)

Configure S3 storage by specifying the `type` as `s3` and providing the bucket name. You can also specify the region, an s3 endpoint, and a prefix.

By default the S3 storage will use the default configured credentials (or your default credential chain if none is configured). If you want to customize this you can specify an `auth` block, this will have the standard fields of an auth block as described in the [Authentication](./Authentication.md) documentation. You can also specify an `account` if the role to assume is in a different account.

### Example S3 Storage Configuration with Default Credentials

```jsonc
  "storage": {
    "type": "s3",
    "bucket": "my-bucket",

    //An optional prefix
    "prefix": "iam-data/",

    //If necessary, specify the region
    "region": "us-west-2",

    // Optional endpoint if using a specific VPC endpoint
    "endpoint": "https://s3.us-west-2.amazonaws.com",
  },
```

### Example S3 Storage Configuration with Custom Credentials

```jsonc
"storage": {
    "type": "s3",
    "bucket": "my-bucket",

    //An optional prefix
    "prefix": "iam-data/",

    //If necessary, specify the region
    "region": "us-west-2",

    // Optional endpoint if using a specific VPC endpoint
    "endpoint": "https://s3.us-west-2.amazonaws.com",

    //Auth configuration, see https://github.com/cloud-copilot/iam-collect/docs/Authentication.md
    "auth": {
      // Optional, if you have a specific profile configured that you would like to use.
      "profile": "my-profile",

      // Optional if you want to assume a role, if profile and role are both present, the profile will be used to assume the role.
      "role": {
        // Required if using a role, the path and name of the role to assume.
        "pathAndName": "role-name",
        // Which account to assume the role in for connecting to S3 for storage.
        "account": "123456789012",

        // Optional, the session name to use when assuming the role.
        "sessionName": "session-name",

        // Optional, external id to use if the role requires it.
        "externalId": "external-id"
      }
    }
  },
```
