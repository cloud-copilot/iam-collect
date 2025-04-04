# Authentication

By default all auth is done using the credentials currently in the environment, this includes retrieving data from services and (if configured) uploading data to S3.

It's possible to have distinct auth configs for downloading data vs storing it. It's also possible to have separate auth configs for each service or each region within a service.

Authentication is configured in the `iam-collect.jsonc` file. Anytime `auth` is an option in the configuration it has the same options:

```jsonc
{
  // Optional, if you have a specific profile configured that you would like to use.
  "profile": "my-profile",

  // Optional if you want to assume a role, if profile and role are both present, the profile will be used to assume the role.
  "role": {
    // Required if using a role, the path and name of the role to assume.
    "pathAndName": "role-name",
    // Optional, and only applicable to S3 storage, which account to assume the role in.
    "account": "123456789012",
    // Optional, the session name to use when assuming the role.
    "sessionName": "session-name",
    // Optional, external id to use if the role requires it.
    "externalId": "external-id"
  }
}
```
