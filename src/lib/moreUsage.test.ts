import { beforeEach, describe, expect, it, vi } from 'vitest'
import { recentMoreRoutes, recordMoreVisit } from './moreUsage'

describe('recentMoreRoutes', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.useRealTimers()
  })

  it('returns unique routes by most recent visit', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-10-01T10:00:00Z'))
    recordMoreVisit('/reports')
    vi.setSystemTime(new Date('2026-10-02T10:00:00Z'))
    recordMoreVisit('/transactions')
    vi.setSystemTime(new Date('2026-10-03T10:00:00Z'))
    recordMoreVisit('/reports')
    vi.setSystemTime(new Date('2026-10-04T10:00:00Z'))
    recordMoreVisit('/goals')
    expect(recentMoreRoutes(3)).toEqual(['/goals', '/reports', '/transactions'])
    expect(recentMoreRoutes(2)).toEqual(['/goals', '/reports'])
  })

  it('is empty without visits', () => {
    expect(recentMoreRoutes(3)).toEqual([])
  })
})
