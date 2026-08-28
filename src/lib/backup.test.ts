import { describe, expect, it, vi } from 'vitest'
import { getLastBackupExportedAt, getOrInitFirstSeenAt, markBackupExported } from './backup'

describe('getLastBackupExportedAt / markBackupExported', () => {
  it('returns null before any export was ever marked', () => {
    expect(getLastBackupExportedAt()).toBeNull()
  })

  it('records the current time when an export is marked', () => {
    vi.setSystemTime(new Date('2026-08-28T12:00:00Z'))
    markBackupExported()
    expect(getLastBackupExportedAt()).toBe('2026-08-28T12:00:00.000Z')
    vi.useRealTimers()
  })
})

describe('getOrInitFirstSeenAt', () => {
  it('stamps and returns "now" the first time it is called', () => {
    vi.setSystemTime(new Date('2026-08-01T00:00:00Z'))
    const v = getOrInitFirstSeenAt()
    expect(v).toBe('2026-08-01T00:00:00.000Z')
    vi.useRealTimers()
  })

  it('returns the same stamp on every later call, even after time passes', () => {
    vi.setSystemTime(new Date('2026-08-01T00:00:00Z'))
    const first = getOrInitFirstSeenAt()
    vi.setSystemTime(new Date('2026-09-15T00:00:00Z'))
    const second = getOrInitFirstSeenAt()
    expect(second).toBe(first)
    vi.useRealTimers()
  })
})
