# History

iam-collect does not have any mechanism to track history of changes. There are many existing tools that can do that for you.

You can use Git or S3 versioning to track object changes.

You can also use something as simple as separate folders for each run. For example, if you store the data on disk you can run this to automatically separate data by date:

```bash
iam-collect download && mv iam-data iam-data-`date '+%Y-%m-%d'`
```

Or you can configure separate S3 prefixes for each run by updating the `storage.prefix` in the `iam-collect.jsonc` file.
