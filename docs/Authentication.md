# Authentication

## Default Authentication

By default all auth is done using the credentials currently in the environment, using the [default credential chain](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-credential-providers/#fromnodeproviderchain) this includes retrieving data from services and (if configured) uploading data to S3.

It's possible to have distinct auth configs for downloading data vs storing it. It's also possible to have separate auth configs for each service or each region within a service.

Authentication is configured in the `iam-collect.jsonc` file. Anytime `auth` is an option in the configuration it has the same options:

```jsonc
{
  // Optional, if you have a specific profile configured that you would like to use. Otherwise the [default credential chain](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-credential-providers/#fromnodeproviderchain) is used.

  "profile": "my-profile",

  /*
  `initialRole` is used to bootstrap the process of assuming roles in different accounts.
  So you can use your default credentials to assume an initial scanning role.  Then that role
  will be used to assume the `role` specified in the `role` section for each account that is scanned.

  Set to `null` on an individual account to skip assuming the initial role for that account.
  */
  "initialRole": {
    // **Specify either `arn` or `pathAndName`, NOT both.**
    // Use ARN to jump to a role in any account
    "arn": "arn:aws:iam::123456789012:role/iam-collect-role",
    // Use pathAndName if to go to assume a role in the same account as your profile or default credentials.
    "pathAndName": "IAMCollect",

    // Optional, the session name to use when assuming the role.
    "sessionName": "session-name",

    // Optional, external id to use if the role requires it.
    "externalId": "external-id"
  },

  /*
  `role` if present is used to assume a role in every account before it is scanned.
    1. First the default credentials/profile are used.
    2. The credentials from step 1 are used to assume the `initialRole` role, if present
    3  The credentials from step 2 are used to assume the role in the target account using the information in the `role` section.
  */

  "role": {
    // Required if using a role, the path and name of the role to assume.
    "pathAndName": "role-name",

    // Optional, the session name to use when assuming the role.
    "sessionName": "session-name",
    // Optional, external id to use if the role requires it.
    "externalId": "external-id"
  }
}
```

## Overriding Auth By Account

To override authentication for a specific AWS account, use the `accountConfigs` map at the top level. For example:

```jsonc
{
  "auth": {
    /* root-level auth */
  },
  "accountConfigs": {
    "<account-id>": {
      "auth": {
        "profile": "custom-profile",
        "role": {
          "pathAndName": "AccountSpecificRole"
        }
      }
    }
  }
}
```

Replace `<account-id>` with the 12-digit AWS account ID.

### Example: Separate External IDs for Each Account

```jsonc
{
  "auth": {
    "profile": "collect-profile",
    "role": {
      "pathAndName": "infra/iam-collect"
    }
  },
  "accountConfigs": {
    "<account-id-1>": {
      "auth": {
        "role": {
          "externalId": "external-id-1"
        }
      }
    },
    "<account-id-2>": {
      "auth": {
        "role": {
          "externalId": "external-id-2"
        }
      }
    }
  }
}
```

In this example the process will start by authenticating with the `collect-profile` profile. Then for each account, it will assume the `infra/iam-collect` role using the external ID specified in the `accountConfigs` section. So for `account-id-1` it will use `external-id-1` and for `account-id-2` it will use `external-id-2`.

## Skip initial Role for a Specific Account

To skip assuming the initial role for a specific account, set the `initialRole` to `null` in the `accountConfigs` section:

```jsonc
{
  "auth": {
    /* root-level auth */
    "initialRole": {
      "pathAndName": "MyInitialOrgrole"
    }
  },
  "accountConfigs": {
    "<special-account-id>": {
      "auth": {
        // Skip the initial role for this account only
        "initialRole": null
      }
    }
  }
}
```

## Overriding Auth By Account/Service

To override auth for a specific service in a given account, add a `serviceConfigs` entry under that account in `accountConfigs`. For example:

```jsonc
{
  "accountConfigs": {
    "<account-id>": {
      "serviceConfigs": {
        "<service-name>": {
          "auth": {
            "profile": "service-profile",
            "role": { "pathAndName": "ServiceRole" }
          }
        }
      }
    }
  }
}
```

Supported `<service-name>` are AWS SDK client identifiers (e.g., `iam`, `s3`, `ec2`).

## Overriding Auth By Account/Service/Region

To override auth for a specific region within a service and account, use the `regionConfigs` map:

```jsonc
{
  "accountConfigs": {
    "<account-id>": {
      "serviceConfigs": {
        "<service-name>": {
          "regionConfigs": {
            "<region>": {
              "auth": {
                "profile": "region-profile",
                "role": { "pathAndName": "RegionRole" }
              }
            }
          }
        }
      }
    }
  }
}
```

Replace `<region>` with the AWS region code (e.g., `us-east-1`).

## Overriding Auth By Service

To apply a service-wide auth override across all accounts and regions, use the top-level `serviceConfigs` map. For example:

```jsonc
{
  "serviceConfigs": {
    "<service-name>": {
      "auth": {
        "profile": "global-service-profile",
        "role": { "pathAndName": "GlobalServiceRole" }
      }
    }
  }
}
```

This applies unless overridden by account or region-specific configs.

## Overriding Auth By Service/Region

To target a specific region under a top-level service override, nest a `regionConfigs` map:

```jsonc
{
  "serviceConfigs": {
    "<service-name>": {
      "regionConfigs": {
        "<region>": {
          "auth": {
            "profile": "global-region-profile",
            "role": { "pathAndName": "GlobalRegionRole" }
          }
        }
      }
    }
  }
}
```

Replace `<service-name>` with the AWS SDK identifier (e.g., `s3`) and `<region>` with the region code.
