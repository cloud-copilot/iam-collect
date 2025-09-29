import { AwsClientPool } from '../aws/ClientPool.js'
import { AwsConfigClientPool } from '../awsConfigClients/AwsConfigClientPool.js'
import { DataSourceConfig, DataSourceType } from '../config/config.js'

/**
 * Create the appropriate client pool based on data source configuration
 *
 * @param dataSourceConfig The data source configuration
 *
 * @returns An instance of the correct AwsClientPool implementation
 */
export async function createClientPool(
  dataSourceConfig: DataSourceConfig | undefined
): Promise<AwsClientPool> {
  if (!dataSourceConfig) {
    return AwsClientPool.defaultInstance
  }

  // Default to aws-sdk if no dataSource is specified
  const dataSourceType: DataSourceType = dataSourceConfig?.name ?? 'aws-sdk'

  if (dataSourceType === 'aws-config') {
    return new AwsConfigClientPool(dataSourceConfig.config || {})
  } else if (dataSourceType === 'aws-sdk') {
    return AwsClientPool.defaultInstance
  }

  throw new Error(`Unsupported data source type: ${dataSourceType}`)
}
