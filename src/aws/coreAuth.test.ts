import {
  fromIni,
  fromNodeProviderChain,
  fromTemporaryCredentials
} from '@aws-sdk/credential-providers'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { buildRoleArn, getNewCredentials } from './coreAuth.js'
import { getTokenInfo } from './tokens.js'

vi.mock('@aws-sdk/credential-providers')
vi.mock('./tokens.js')

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getNewCredentials', () => {
  it('should return default credentials if no auth config is provided', async () => {
    // Given an account ID and no auth config
    const accountId = '123456789012'
    const authConfig = undefined

    // And the default credentials are valid
    vi.mocked(fromNodeProviderChain).mockReturnValueOnce(
      vi.fn().mockResolvedValue({
        accessKeyId: 'noconfig'
      })
    )
    // And the credentials are for the same account Id
    vi.mocked(getTokenInfo).mockResolvedValueOnce({ partition: 'aws', accountId })

    // When getNewCredentials is called
    const credentials = await getNewCredentials(accountId, authConfig)

    // Then it should return the default credentials
    expect(credentials.accessKeyId).toEqual('noconfig')
  })

  it('should throw error if default credentials do not match the account ID', async () => {
    // Given an account ID and no auth config
    const accountId = '123456789012'
    const authConfig = undefined

    // And the default credentials are valid but for a different account
    vi.mocked(fromNodeProviderChain).mockReturnValueOnce(
      vi.fn().mockResolvedValue({
        accessKeyId: 'noconfig'
      })
    )
    // And the credentials are for a different account Id
    vi.mocked(getTokenInfo).mockResolvedValueOnce({ partition: 'aws', accountId: '098765432109' })

    // When getNewCredentials is called
    await expect(getNewCredentials(accountId, authConfig)).rejects.toThrow(
      `The credentials provided do not match the expected account ID 123456789012. Found 098765432109. Please check your auth configuration.`
    )
  })

  it('should return the profile name from the auth config if provided', async () => {
    // Given an account ID and an auth config with a profile
    const accountId = '123456789012'
    const authConfig = { profile: 'test-profile' }

    // And the credentials are valid for the profile
    const iniMock = vi.mocked(fromIni).mockReturnValueOnce(
      vi.fn().mockResolvedValue({
        accessKeyId: 'profileAccess'
      })
    )
    // And the credentials are for the same account Id
    vi.mocked(getTokenInfo).mockResolvedValueOnce({ partition: 'aws', accountId })

    // When getNewCredentials is called
    const credentials = await getNewCredentials(accountId, authConfig)

    // Then it should return the credentials for the profile
    expect(credentials.accessKeyId).toEqual('profileAccess')

    // And it should have called fromIni with the correct profile
    expect(iniMock).toHaveBeenCalledWith(authConfig)
  })

  it('should throw an error if the profile does not match the account ID and no role is provided', async () => {
    // Given an account ID and an auth config with a profile
    const accountId = '123456789012'
    const authConfig = { profile: 'test-profile' }

    // And the credentials are valid but for a different account
    vi.mocked(fromIni).mockReturnValueOnce(
      vi.fn().mockResolvedValue({
        accessKeyId: 'profileAccess'
      })
    )
    // And the credentials are for a different account Id
    vi.mocked(getTokenInfo).mockResolvedValueOnce({ partition: 'aws', accountId: '098765432109' })

    // When getNewCredentials is called
    await expect(getNewCredentials(accountId, authConfig)).rejects.toThrow(
      `The credentials provided do not match the expected account ID 123456789012.`
    )
  })

  it('should assume a role if the role is provided in the auth config', async () => {
    // Given an account ID and an auth config with a role
    const accountId = '123456789012'
    const authConfig = {
      role: {
        pathAndName: 'test-role',
        externalId: 'test-external-id',
        sessionName: 'test-session'
      }
    }

    // And the base credentials are valid
    vi.mocked(fromNodeProviderChain).mockReturnValueOnce(
      vi.fn().mockResolvedValue({
        accessKeyId: 'baseAccess'
      })
    )
    // And the base credentials are for a different account Id
    vi.mocked(getTokenInfo).mockResolvedValueOnce({ partition: 'aws', accountId: '555555555555' })

    // And the role can be assumed
    vi.mocked(fromTemporaryCredentials).mockReturnValueOnce(
      vi.fn().mockResolvedValue({
        accessKeyId: 'roleAccess'
      })
    )
    // When getNewCredentials is called
    const credentials = await getNewCredentials(accountId, authConfig)

    // Then it should return the assumed role credentials
    expect(credentials.accessKeyId).toEqual('roleAccess')
    // And it should have called fromTemporaryCredentials with the correct parameters
    expect(fromTemporaryCredentials).toHaveBeenCalledWith({
      masterCredentials: {
        accessKeyId: 'baseAccess',
        accountId: '555555555555',
        partition: 'aws'
      },
      params: {
        ExternalId: 'test-external-id',
        RoleArn: 'arn:aws:iam::123456789012:role/test-role',
        RoleSessionName: 'test-session'
      }
    })
  })

  it('should assume the initial role first if the role is provided in the auth config', async () => {
    //Given a config with an initial role and a role to assume
    const accountId = '999999999999'
    const authConfig = {
      initialRole: {
        pathAndName: 'collect/collectRole',
        externalId: 'test-initial-external-id',
        sessionName: 'test-initial-session'
      },
      role: {
        pathAndName: 'test-role',
        externalId: 'test-external-id',
        sessionName: 'test-session'
      }
    }

    // And the base credentials are valid
    vi.mocked(fromNodeProviderChain).mockReturnValueOnce(
      vi.fn().mockResolvedValue({
        accessKeyId: 'baseAccess'
      })
    )
    // And the base credentials are for a different account Id
    vi.mocked(getTokenInfo).mockResolvedValueOnce({ partition: 'aws', accountId: '555555555555' })

    // And the role can be assumed
    vi.mocked(fromTemporaryCredentials).mockReturnValueOnce(
      vi.fn().mockResolvedValue({
        accessKeyId: 'initialRoleAccess'
      })
    )

    vi.mocked(fromTemporaryCredentials).mockReturnValueOnce(
      vi.fn().mockResolvedValue({
        accessKeyId: 'accountRoleAccess'
      })
    )

    vi.mocked(getTokenInfo).mockResolvedValueOnce({ partition: 'aws', accountId: '999999999999' })

    // When getNewCredentials is called
    const credentials = await getNewCredentials(accountId, authConfig)

    // Then it should assume the account credentials in the account
    expect(credentials.accessKeyId).toEqual('accountRoleAccess')

    // And it should have called fromTemporaryCredentials with the correct parameters
    expect(fromTemporaryCredentials).toHaveBeenNthCalledWith(1, {
      masterCredentials: {
        accessKeyId: 'baseAccess'
      },
      params: {
        ExternalId: 'test-initial-external-id',
        RoleArn: 'arn:aws:iam::555555555555:role/collect/collectRole',
        RoleSessionName: 'test-initial-session'
      }
    })

    expect(fromTemporaryCredentials).toHaveBeenNthCalledWith(2, {
      masterCredentials: expect.objectContaining({
        accessKeyId: 'initialRoleAccess'
      }),
      params: {
        ExternalId: 'test-external-id',
        RoleArn: 'arn:aws:iam::999999999999:role/test-role',
        RoleSessionName: 'test-session'
      }
    })
  })

  it('should assume the initial role first if the role is provided in the auth config using an arn', async () => {
    //Given a config with an initial role and a role to assume
    const accountId = '999999999999'
    const authConfig = {
      initialRole: {
        arn: 'arn:aws:iam::555555555555:role/hard/codedRole',
        externalId: 'test-initial-external-id',
        sessionName: 'test-initial-session'
      },
      role: {
        pathAndName: 'test-role',
        externalId: 'test-external-id',
        sessionName: 'test-session'
      }
    }

    // And the base credentials are valid
    vi.mocked(fromNodeProviderChain).mockReturnValueOnce(
      vi.fn().mockResolvedValue({
        accessKeyId: 'baseAccess'
      })
    )
    // And the base credentials are for a different account Id
    vi.mocked(getTokenInfo).mockResolvedValueOnce({ partition: 'aws', accountId: '555555555555' })

    // And the role can be assumed
    vi.mocked(fromTemporaryCredentials).mockReturnValueOnce(
      vi.fn().mockResolvedValue({
        accessKeyId: 'initialRoleAccess'
      })
    )

    vi.mocked(fromTemporaryCredentials).mockReturnValueOnce(
      vi.fn().mockResolvedValue({
        accessKeyId: 'accountRoleAccess'
      })
    )

    vi.mocked(getTokenInfo).mockResolvedValueOnce({ partition: 'aws', accountId: '999999999999' })

    // When getNewCredentials is called
    const credentials = await getNewCredentials(accountId, authConfig)

    // Then it should assume the account credentials in the account
    expect(credentials.accessKeyId).toEqual('accountRoleAccess')

    // And it should have called fromTemporaryCredentials with the correct parameters
    expect(fromTemporaryCredentials).toHaveBeenNthCalledWith(1, {
      masterCredentials: {
        accessKeyId: 'baseAccess'
      },
      params: {
        ExternalId: 'test-initial-external-id',
        RoleArn: 'arn:aws:iam::555555555555:role/hard/codedRole',
        RoleSessionName: 'test-initial-session'
      }
    })

    expect(fromTemporaryCredentials).toHaveBeenNthCalledWith(2, {
      masterCredentials: expect.objectContaining({
        accessKeyId: 'initialRoleAccess'
      }),
      params: {
        ExternalId: 'test-external-id',
        RoleArn: 'arn:aws:iam::999999999999:role/test-role',
        RoleSessionName: 'test-session'
      }
    })
  })
})

describe('buildRoleArn', () => {
  it('should return the correct ARN for a role', () => {
    // Given partition, accountId and rolePathAndName
    const partition = 'aws'
    const accountId = '123456789012'
    const rolePathAndName = 'my-role'

    // When roleArn is called
    const arn = buildRoleArn(partition, accountId, rolePathAndName)

    // Then it should return the correct ARN
    expect(arn).toEqual('arn:aws:iam::123456789012:role/my-role')
  })

  it('should not duplicate the leading slash in the rolePathAndName', () => {
    // Given partition, accountId and rolePathAndName
    const partition = 'aws'
    const accountId = '123456789012'
    const rolePathAndName = '/my-role'

    // When roleArn is called
    const arn = buildRoleArn(partition, accountId, rolePathAndName)

    // Then it should return the correct ARN
    expect(arn).toEqual('arn:aws:iam::123456789012:role/my-role')
  })

  it('should add a leading slash to the rolePathAndName if not present', () => {
    // Given partition, accountId and rolePathAndName without leading slash
    const partition = 'aws'
    const accountId = '123456789012'
    const rolePathAndName = 'path/to/my-role'

    // When roleArn is called
    const arn = buildRoleArn(partition, accountId, rolePathAndName)

    // Then it should return the correct ARN with leading slash
    expect(arn).toEqual('arn:aws:iam::123456789012:role/path/to/my-role')
  })
})
