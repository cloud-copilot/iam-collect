# Authentication

By default all auth is done using the credentials currently in the environment, this includes retrieving data from services and (if configured) uploading data to S3.

It's possible to have distinct auth configs for downloading data vs storing it. It's also possible to have separate auth configs for each service or each region within a service.

Authentication is configured in the `iam-collect.jsonc` file. Anytime `auth` is an option in the configuration it has the same options:

```jsonc
{
  // Optional, if you have a specific profile configured that you would like to use.
  "profile": "my-profile",

  /*
  `initialRole` is used to bootstrap the process of assuming roles in different accounts.
  So you can use your default credentials to assume an initial scanning role.  Then that role
  will be used to assume the `role` specified in the `role` section for each account that is scanned.
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
