import { afterEach, describe, expect, it, vi } from 'vitest'
import { clearAppStorage, loadJSON, saveJSON } from './storage'
import { subscribeNotice, type Notice } from './notify'

describe('saveJSON / loadJSON', () => {
  it('round-trips a value through localStorage', () => {
    saveJSON('k', { a: 1, b: [1, 2, 3] })
    expect(loadJSON('k', null)).toEqual({ a: 1, b: [1, 2, 3] })
  })

  it('returns the fallback when the key is missing', () => {
    expect(loadJSON('missing-key', 'fallback')).toBe('fallback')
  })

  it('returns the fallback when the stored value is corrupted JSON', () => {
    localStorage.setItem('bad-key', '{not valid json')
    expect(loadJSON('bad-key', 42)).toBe(42)
  })
})

describe('saveJSON failure', () => {
  afterEach(() => vi.restoreAllMocks())

  it('returns false and shows an error notice instead of throwing when storage is full', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('quota', 'QuotaExceededError')
    })
    let seen: Notice | null = null
    const unsub = subscribeNotice((n) => {
      seen = n
    })
    expect(saveJSON('k', [1])).toBe(false)
    expect((seen as Notice | null)?.kind).toBe('error')
    unsub()
  })
})

describe('clearAppStorage', () => {
  it('removes every app key from localStorage and sessionStorage, and leaves other keys alone', () => {
    localStorage.setItem('qbnomia.transactions', '[]')
    localStorage.setItem('qbnomia.auth', '{}')
    localStorage.setItem('qbnomia.sync.secretToken', 'x')
    localStorage.setItem('other-app', 'keep')
    sessionStorage.setItem('qbnomia.update.unlock', '1')
    clearAppStorage()
    expect(Object.keys(localStorage)).toEqual(['other-app'])
    expect(sessionStorage.getItem('qbnomia.update.unlock')).toBeNull()
    sessionStorage.clear()
  })
})
