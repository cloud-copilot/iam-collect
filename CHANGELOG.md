## [0.1.31](https://github.com/cloud-copilot/iam-collect/compare/v0.1.30...v0.1.31) (2025-04-28)


### Features

* Add download of SNS Topic policies ([12d0d20](https://github.com/cloud-copilot/iam-collect/commit/12d0d2039962764611de0aeb344b496f804a10e9))

## [0.1.30](https://github.com/cloud-copilot/iam-collect/compare/v0.1.29...v0.1.30) (2025-04-27)


### Features

* Add parallel downloading of information across accounts, regions, and services ([367a349](https://github.com/cloud-copilot/iam-collect/commit/367a3499d1782a174f6c99d34cc8f22835a2dd13))

## [0.1.29](https://github.com/cloud-copilot/iam-collect/compare/v0.1.28...v0.1.29) (2025-04-26)


### Bug Fixes

* Add missing permissions to example policy ([ef93649](https://github.com/cloud-copilot/iam-collect/commit/ef93649704177978691acf37dd3c8ead36323e8e))
* Properly set global flag for typed syncs ([e03eec0](https://github.com/cloud-copilot/iam-collect/commit/e03eec0833e10bd8630ca5b57839a023d8d1167c))


### Features

* Add credential caching ([820a131](https://github.com/cloud-copilot/iam-collect/commit/820a131287a65e7377326d53a2e71aa6c4b69621))

## [0.1.28](https://github.com/cloud-copilot/iam-collect/compare/v0.1.27...v0.1.28) (2025-04-26)

## [0.1.27](https://github.com/cloud-copilot/iam-collect/compare/v0.1.26...v0.1.27) (2025-04-23)


### Features

* Sync account S3 Block Public Access settings ([733a03e](https://github.com/cloud-copilot/iam-collect/commit/733a03ed22a694d39b5bb6b5ebf43f50009a3245))

## [0.1.26](https://github.com/cloud-copilot/iam-collect/compare/v0.1.25...v0.1.26) (2025-04-23)


### Bug Fixes

* correct sync name for SAML providers ([cc09ec8](https://github.com/cloud-copilot/iam-collect/commit/cc09ec8a2fe603e62f142dccd8db21c051217a43))


### Features

* Add support to sync OIDC providers ([3103d40](https://github.com/cloud-copilot/iam-collect/commit/3103d40b86950984d658607353fe5b37b3022b3a))
* Add support to sync SAML providers ([b9867c2](https://github.com/cloud-copilot/iam-collect/commit/b9867c293751da57e8d9999bcb4bcbfa45a2d28d))

## [0.1.25](https://github.com/cloud-copilot/iam-collect/compare/v0.1.24...v0.1.25) (2025-04-22)


### Bug Fixes

* Only sync sso instances owned by the account being synced ([02469ba](https://github.com/cloud-copilot/iam-collect/commit/02469badbbb49e8fe6f2fc56a996315c2ae6ce25))

## [0.1.24](https://github.com/cloud-copilot/iam-collect/compare/v0.1.23...v0.1.24) (2025-04-22)


### Features

* Add configurable log levels ([dd6688b](https://github.com/cloud-copilot/iam-collect/commit/dd6688bf122534ddc269251ba28bbd4643c918be))

## [0.1.23](https://github.com/cloud-copilot/iam-collect/compare/v0.1.22...v0.1.23) (2025-04-22)


### Features

* Add support for DynamoDB Table Policies ([d347424](https://github.com/cloud-copilot/iam-collect/commit/d3474245f607bc2010c8a9289d0b35466bcd0139))

## [0.1.22](https://github.com/cloud-copilot/iam-collect/compare/v0.1.21...v0.1.22) (2025-04-19)

## [0.1.21](https://github.com/cloud-copilot/iam-collect/compare/v0.1.20...v0.1.21) (2025-04-18)


### Bug Fixes

* Add ARN to sso instance metadata ([b54cb0a](https://github.com/cloud-copilot/iam-collect/commit/b54cb0addbd088fce8e60e8eefbae519a287ae4d))

## [0.1.20](https://github.com/cloud-copilot/iam-collect/compare/v0.1.19...v0.1.20) (2025-04-18)


### Features

* Add sync for SSO Instances and Permission Sets ([4b757b0](https://github.com/cloud-copilot/iam-collect/commit/4b757b0586842048ef21b4f49d23624386276b0a))

## [0.1.19](https://github.com/cloud-copilot/iam-collect/compare/v0.1.18...v0.1.19) (2025-04-17)

## [0.1.18](https://github.com/cloud-copilot/iam-collect/compare/v0.1.17...v0.1.18) (2025-04-16)


### Features

* Add syncing of secrets manager secrets and their resource policies ([fd07a6f](https://github.com/cloud-copilot/iam-collect/commit/fd07a6fbb99ef7b50a3b631145e53e9c2e89be04))

## [0.1.17](https://github.com/cloud-copilot/iam-collect/compare/v0.1.16...v0.1.17) (2025-04-16)


### Features

* Remove redundant partition and account id information from resource paths ([2900c58](https://github.com/cloud-copilot/iam-collect/commit/2900c58286828728549c5759825a68f7c820df22))

## [0.1.16](https://github.com/cloud-copilot/iam-collect/compare/v0.1.15...v0.1.16) (2025-04-15)


### Features

* Add syncing of organizations information ([7f947e5](https://github.com/cloud-copilot/iam-collect/commit/7f947e5f2891e58bd14eaf8752ffffee50769861))

## [0.1.15](https://github.com/cloud-copilot/iam-collect/compare/v0.1.14...v0.1.15) (2025-04-12)

## [0.1.14](https://github.com/cloud-copilot/iam-collect/compare/v0.1.13...v0.1.14) (2025-04-05)


### Bug Fixes

* Fix policy link in readme ([be39bee](https://github.com/cloud-copilot/iam-collect/commit/be39bee7796e3c58b9dea6aaf2550a33255a83be))


### Features

* Download permission boundary for roles ([45ac5e7](https://github.com/cloud-copilot/iam-collect/commit/45ac5e79ab621f2f17828a00957d7a8cfcbc0d76))

## [0.1.13](https://github.com/cloud-copilot/iam-collect/compare/v0.1.12...v0.1.13) (2025-04-05)


### Bug Fixes

* Ignore access denied errors when getting kms keys tags ([ce6ae7a](https://github.com/cloud-copilot/iam-collect/commit/ce6ae7a7d582a245a1e904b24387ae2b92cd4488))

## [0.1.12](https://github.com/cloud-copilot/iam-collect/compare/v0.1.11...v0.1.12) (2025-04-05)

## [0.1.11](https://github.com/cloud-copilot/iam-collect/compare/v0.1.10...v0.1.11) (2025-04-05)


### Features

* Added support for KMS keys ([1d971ff](https://github.com/cloud-copilot/iam-collect/commit/1d971ff97d2d02213e98c2a36dc467e858a6541a))

## [0.1.10](https://github.com/cloud-copilot/iam-collect/compare/v0.1.9...v0.1.10) (2025-04-05)


### Features

* Added typed sync configuration ([4ef1aa0](https://github.com/cloud-copilot/iam-collect/commit/4ef1aa036ef2d7f0703191e729539a94f16be864))

## [0.1.9](https://github.com/cloud-copilot/iam-collect/compare/v0.1.8...v0.1.9) (2025-04-04)


### Features

* Added typesafe pagination of resources ([dd414ba](https://github.com/cloud-copilot/iam-collect/commit/dd414ba0e1765c2767a9b3876670e67d9b5d8a92))

## [0.1.8](https://github.com/cloud-copilot/iam-collect/compare/v0.1.7...v0.1.8) (2025-04-04)


### Features

* Added download of s3 general purpose bucket information ([2cff09f](https://github.com/cloud-copilot/iam-collect/commit/2cff09fdf3ec308f0d094f98b621dde4aeb02d04))

## [0.1.7](https://github.com/cloud-copilot/iam-collect/compare/v0.1.6...v0.1.7) (2025-04-04)


### Features

* Load package version dynamically from the embedded package.json ([dc1d2af](https://github.com/cloud-copilot/iam-collect/commit/dc1d2af702d4b41748b201696e6e987e83c415dd))

## [0.1.6](https://github.com/cloud-copilot/iam-collect/compare/v0.1.5...v0.1.6) (2025-04-04)

## [0.1.5](https://github.com/cloud-copilot/iam-collect/compare/v0.1.4...v0.1.5) (2025-04-04)


### Bug Fixes

* hard code the package version for now ([9a7da0f](https://github.com/cloud-copilot/iam-collect/commit/9a7da0f318e7101cbe8ba1ce4f37f425d370c740))

## [0.1.4](https://github.com/cloud-copilot/iam-collect/compare/v0.1.3...v0.1.4) (2025-04-03)


### Bug Fixes

* bad imports ([#7](https://github.com/cloud-copilot/iam-collect/issues/7)) ([a3e182c](https://github.com/cloud-copilot/iam-collect/commit/a3e182c56d45f267359461b00f23abb566d26c9a))

## [0.1.3](https://github.com/cloud-copilot/iam-collect/compare/v0.1.2...v0.1.3) (2025-04-03)


### Features

* Adding support to download authorization details and lambda details ([#5](https://github.com/cloud-copilot/iam-collect/issues/5)) ([72fd00a](https://github.com/cloud-copilot/iam-collect/commit/72fd00af73a5fb66090af2c4da3dac755c785f2a))

## [0.1.2](https://github.com/cloud-copilot/iam-collect/compare/v0.1.1...v0.1.2) (2025-03-01)
