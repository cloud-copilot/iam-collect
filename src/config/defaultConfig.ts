import { existsSync } from 'fs'
import { resolve } from 'path'
import { iamCollectVersion } from './packageVersion.js'

export const defaultConfigFileName = 'iam-collect.jsonc'

/**
 * Get the full path to the config file.
 *
 * @returns The full path to the config file.
 */
export function fullDefaultConfigPath(): string {
  return resolve(process.cwd(), defaultConfigFileName)
}

/**
 *
 * @returns Whether the default config file exists
 */
export function defaultConfigExists(): boolean {
  return existsSync(fullDefaultConfigPath())
}

const defaultConfig = `
{
  // The name of the configuration, used if you need to have multiple configurations.
  "name": "default config",
  "iamCollectVersion": "0.0.0",

  // Default storage is on the file system.
  "storage": {
    "type": "file",
    //If this starts with a '.', it is relative to the config file, otherwise it is an absolute path.
    "path": "./collect"
  }

  /*
  You can also use S3 storage instead of the default file storage.
  "storage": {
    "type": "s3",
    "bucket": "my-bucket",
    "prefix": "iam-data/",
    "region": "us-west-2",
    "endpoint": "https://s3.us-west-2.amazonaws.com", // Optional endpoint if using a specific VPC endpoint
    //Optional auth configuration, see https://github.com/cloud-copilot/iam-collect/docs/Authentication.md
    "auth": {
      //The type of authentication to use
      // Can include accountId
      "accountId": "123456789012"
    }
  },
  */

  /*
  Optionally specify separate configurations for accounts:
  "accounts": {
    "123456789012": {
      //Optional auth for the account:
      "auth": {
        //The type of authentication to use
      },
      "regions": {
        //Optional regions to include, if empty all regions are included
        // "included": ["us-east-1", "us-west-1"],
        //Optional regions to exclude, if empty no regions are excluded. You can use it with included, but that wouldn't make much sense.
        // "excluded": ["us-west-2"]
      },

      "serviceConfigs" : {
        "s3: {
          "endpoint": "https://s3.us-west-2.amazonaws.com", // Optional endpoint if using a specific VPC endpoint
          "auth": {
            //Override auth for a specific service
          }
          regionConfigs: {
            "us-west-1": {
              //Optional configuration for the region
              endpoint: "https://s3.us-west-1.amazonaws.com", // Optional endpoint if using a specific VPC endpoint
            }
          }
        }
      }


    }

  */

  // Optional block, by default all regions returned by ec2:DescribeRegions with 'opt-in-not-required' or 'opted-in' are included
  // If regions are specified in the CLI, this is ignored
  // "regions": {
  //Optional regions to include, if empty all regions are included
  // "included": ["us-east-1", "us-west-1"],
  //Optional regions to exclude, if empty no regions are excluded. You can use it with included, but that wouldn't make much sense.
  // "excluded": ["us-west-2"]
  // },

  // Optional block, by default all supported services are included
  // If services are specified in the CLI, this is ignored
  // "services": {
  //Optional services to include, if empty all supported services are included
  // "included": ["s3", "ec2"],
  //Optional services to exclude, if empty no services are excluded. You can use it with included, but that wouldn't make much sense.
  // "excluded": ["iam"]
  // },

  // Optional block for authentication, see , see https://github.com/cloud-copilot/iam-collect/docs/Authentication.md
  // "auth": {
  //  //The type of authentication to use
  // }


}
`

export function getDefaultConfig(): string {
  return defaultConfig.replace('0.0.0', iamCollectVersion())
}
