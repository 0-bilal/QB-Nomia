import { describe, expect, it } from 'vitest'
import { compareVersions } from './appUpdate'

describe('compareVersions', () => {
  it('orders semantic versions numerically, not as strings', () => {
    expect(compareVersions('2.10.0', '2.9.9')).toBeGreaterThan(0)
    expect(compareVersions('2.4.0', '2.4.0')).toBe(0)
    expect(compareVersions('2.3.1', '2.4.0')).toBeLessThan(0)
  })

  it('treats missing parts as zero', () => {
    expect(compareVersions('2.4', '2.4.0')).toBe(0)
    expect(compareVersions('3', '2.99.99')).toBeGreaterThan(0)
  })
})
