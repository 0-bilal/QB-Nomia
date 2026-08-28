import { describe, expect, it } from 'vitest'
import { loadJSON, saveJSON } from './storage'

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
