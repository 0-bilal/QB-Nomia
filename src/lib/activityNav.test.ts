import { describe, expect, it } from 'vitest'
import { activityEditPath } from './activityNav'
import type { ActivityItem } from '../state/DataContext'

function item(overrides: Partial<ActivityItem>): ActivityItem {
  return {
    id: 'x1',
    kind: 'expense',
    title: 'title',
    subtitle: 'subtitle',
    amount: -50,
    date: '2026-08-28',
    color: '#000',
    accountIds: ['acc-1'],
    ...overrides,
  }
}

describe('activityEditPath', () => {
  it('routes a loan-given item to the person loan editor', () => {
    expect(activityEditPath(item({ id: 'l1', kind: 'loan-given', personId: 'p1' }))).toBe('/loans/p1/edit/l1')
  })

  it('routes a loan-received item to the person loan editor', () => {
    expect(activityEditPath(item({ id: 'l2', kind: 'loan-received', personId: 'p2' }))).toBe('/loans/p2/edit/l2')
  })

  it('routes any other activity kind to the transaction editor', () => {
    expect(activityEditPath(item({ id: 't1', kind: 'expense' }))).toBe('/add/transaction/t1')
    expect(activityEditPath(item({ id: 't2', kind: 'income' }))).toBe('/add/transaction/t2')
    expect(activityEditPath(item({ id: 't3', kind: 'transfer' }))).toBe('/add/transaction/t3')
  })
})
