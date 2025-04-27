import { beforeEach, describe, expect, it, vi } from 'vitest'
import { sleep } from '../utils/promise.js'
import { getCredentials } from './auth.js'
import { getNewCredentials, now } from './coreAuth.js'

vi.mock('./coreAuth.js')

beforeEach(() => {
  vi.resetAllMocks()
})

describe('getCredentials', () => {
  it('should return new credentials if no cached credentials exist', async () => {
    //Given an account and config that is not cached
    const accountId = 'not-cached'
    const authConfig = {}

    //And the coreAuth.getNewCredentials function is mocked to return a specific value
    vi.mocked(getNewCredentials).mockResolvedValueOnce({ accessKeyId: 'newAccess' } as any)

    //When we call getCredentials with the account and config
    const credentials = await getCredentials(accountId, authConfig)

    //Then it should return the new credentials
    expect(credentials.accessKeyId).toBe('newAccess')
  })

  it('should return new credentials if cached credentials are expired', async () => {
    // Given an account and config
    const accountId = 'expired-cache'
    const authConfig = {}

    // And the current time is set to a point where the cached credentials are expired
    vi.mocked(now).mockReturnValueOnce(Date.now() - 600 * 1000) // 10 minutes ago
    vi.mocked(getNewCredentials).mockResolvedValueOnce({ accessKeyId: 'cached' } as any)
    // And cached credentials are created
    const cachedCredentials = await getCredentials(accountId, authConfig)
    expect(cachedCredentials.accessKeyId).toBe('cached')

    // When we call getCredentials again
    vi.mocked(now).mockReturnValueOnce(Date.now() + 1000) // 1 second in the future
    vi.mocked(getNewCredentials).mockResolvedValueOnce({ accessKeyId: 'notCached' } as any)
    const newCredentials = await getCredentials(accountId, authConfig)

    // Then it should return new credentials
    expect(newCredentials.accessKeyId).toBe('notCached')
  })

  it('should return cached credentials if they exist and are not expired', async () => {
    // Given an account and config
    const accountId = 'cached'
    const authConfig = {}

    // And the current time is set to a point where the cached credentials are expired
    vi.mocked(now).mockReturnValueOnce(Date.now())
    vi.mocked(getNewCredentials).mockResolvedValueOnce({ accessKeyId: 'cached' } as any)
    // And cached credentials are created
    const cachedCredentials = await getCredentials(accountId, authConfig)
    expect(cachedCredentials.accessKeyId).toBe('cached')

    // When we call getCredentials again
    vi.mocked(now).mockReturnValueOnce(Date.now())
    vi.mocked(getNewCredentials).mockResolvedValueOnce({ accessKeyId: 'notCached' } as any)
    const newCredentials = await getCredentials(accountId, authConfig)

    // Then it should return cached credentials
    expect(newCredentials.accessKeyId).toBe('cached')
  })

  it('should return an existing promise if one is already in progress', async () => {
    // Given an account and config
    const accountId = 'in-progress'
    const authConfig = {}

    //And it takes a little while to get new credentials
    const mockNewCredentials = vi.mocked(getNewCredentials).mockImplementation(async () => {
      await sleep(250)
      return { accessKeyId: 'slowAccess' } as any
    })

    // When we call getCredentials twice
    const promise1 = getCredentials(accountId, authConfig)
    const promise2 = getCredentials(accountId, authConfig)
    const [result1, result2] = await Promise.all([promise1, promise2])

    // Then both promises should resolve to the same credentials
    expect(result1.accessKeyId).toBe('slowAccess')
    expect(result2.accessKeyId).toBe('slowAccess')

    // And the getNewCredentials function should have been called only once
    expect(mockNewCredentials).toHaveBeenCalledOnce()
  })
})
