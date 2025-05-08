import { TopLevelConfig } from './config.js'

const partitionDefaults: Record<string, TopLevelConfig> = {
  aws: {
    iamCollectVersion: '0.0.0',
    serviceConfigs: {
      s3: {
        syncConfigs: {
          multiRegionAccessPoints: {
            regions: {
              included: ['us-west-2']
            }
          }
        }
      },
      s3express: {
        syncConfigs: {
          directoryBuckets: {
            regions: {
              included: [
                'us-east-1',
                'us-east-2',
                'us-west-2',
                'ap-south-1',
                'ap-northeast-1',
                'eu-west-1',
                'eu-north-1'
              ]
            }
          }
        }
      }
    }
  },
  'aws-us-gov': {
    iamCollectVersion: '0.0.0',
    services: {
      excluded: ['s3express']
    },
    serviceConfigs: {
      s3: {
        syncConfigs: {
          multiRegionAccessPoints: {
            regions: {
              included: ['us-gov-west-1']
            }
          }
        }
      }
    }
  },
  'aws-cn': {
    iamCollectVersion: '0.0.0',
    services: {
      excluded: ['s3express']
    },
    serviceConfigs: {
      s3: {
        syncConfigs: {
          multiRegionAccessPoints: {
            regions: {
              included: []
            }
          }
        }
      }
    }
  }
}

/**
 * Get the default configuration for a given partition.
 *
 * @param partition The partition to get defaults for. This is usually the partition name, such as 'aws', 'aws-us-gov', or 'aws-cn'.
 * @returns a TopLevelConfig object containing the default configuration for the specified partition.
 */
export function getPartitionDefaults(partition: string): TopLevelConfig {
  return partitionDefaults[partition] || { iamCollectVersion: '0.0.0' }
}
