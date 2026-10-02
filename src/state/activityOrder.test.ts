import { describe, expect, it } from 'vitest'
import { compareActivityDesc } from './DataContext'

describe('compareActivityDesc', () => {
  it('orders by date first, then by creation time within the same day (newest first)', () => {
    const items = [
      { id: 'expense-morning', date: '2026-10-01', createdAt: '2026-10-01T08:00:00.000Z' },
      { id: 'older-day', date: '2026-09-30', createdAt: '2026-10-01T23:00:00.000Z' },
      { id: 'loan-evening', date: '2026-10-01', createdAt: '2026-10-01T20:00:00.000Z' },
    ]
    expect([...items].sort(compareActivityDesc).map((i) => i.id)).toEqual(['loan-evening', 'expense-morning', 'older-day'])
  })

  it('puts legacy items without a creation time below stamped ones of the same day, keeping their original order', () => {
    const items = [
      { id: 'legacy-a', date: '2026-10-01' },
      { id: 'legacy-b', date: '2026-10-01' },
      { id: 'new-loan', date: '2026-10-01', createdAt: '2026-10-01T10:00:00.000Z' },
    ]
    expect([...items].sort(compareActivityDesc).map((i) => i.id)).toEqual(['new-loan', 'legacy-a', 'legacy-b'])
  })
})
