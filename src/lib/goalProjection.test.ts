import { describe, expect, it } from 'vitest'
import { projectGoalCompletion } from './goalProjection'
import type { Transaction } from '../types'

function txn(overrides: Partial<Transaction> & { id: string; date: string }): Transaction {
  return { type: 'expense', amount: 0, accountId: 'other', ...overrides }
}

describe('projectGoalCompletion', () => {
  const today = '2026-04-15'

  it('returns a null projected date when there is no recent contribution', () => {
    const result = projectGoalCompletion('acc-goal', 5000, [], today)
    expect(result.avgMonthlyContribution).toBe(0)
    expect(result.projectedDate).toBeNull()
  })

  it('returns a null projected date when the recent net movement is negative (withdrawals)', () => {
    const transactions: Transaction[] = [
      txn({ id: 't1', date: '2026-03-01', type: 'expense', amount: 500, accountId: 'acc-goal' }),
    ]
    const result = projectGoalCompletion('acc-goal', 5000, transactions, today)
    expect(result.avgMonthlyContribution).toBeLessThan(0)
    expect(result.projectedDate).toBeNull()
  })

  it('averages income and incoming transfers into the account over the 3-month window', () => {
    const transactions: Transaction[] = [
      txn({ id: 't1', date: '2026-02-01', type: 'income', amount: 300, accountId: 'acc-goal' }),
      txn({ id: 't2', date: '2026-03-01', type: 'transfer', amount: 300, accountId: 'acc-main', transferToAccountId: 'acc-goal' }),
      // outside the 3-month lookback window (before 2026-01-15) — must be excluded
      txn({ id: 't3', date: '2025-11-01', type: 'income', amount: 10000, accountId: 'acc-goal' }),
    ]
    const result = projectGoalCompletion('acc-goal', 1800, transactions, today)
    // (300 + 300) / 3 = 200 صافي شهريًا
    expect(result.avgMonthlyContribution).toBeCloseTo(200, 5)
    // 1800 / 200 = 9 أشهر متبقية من اليوم
    expect(result.projectedDate).not.toBeNull()
  })

  it('subtracts expenses and outgoing transfers from the same account', () => {
    const transactions: Transaction[] = [
      txn({ id: 't1', date: '2026-02-01', type: 'income', amount: 1000, accountId: 'acc-goal' }),
      txn({ id: 't2', date: '2026-03-01', type: 'transfer', amount: 400, accountId: 'acc-goal', transferToAccountId: 'acc-main' }),
    ]
    const result = projectGoalCompletion('acc-goal', 900, transactions, today)
    // (1000 - 400) / 3 = 200 صافي شهريًا
    expect(result.avgMonthlyContribution).toBeCloseTo(200, 5)
  })

  it('returns a null projected date once the goal is already reached (remaining <= 0)', () => {
    const transactions: Transaction[] = [txn({ id: 't1', date: '2026-03-01', type: 'income', amount: 500, accountId: 'acc-goal' })]
    const result = projectGoalCompletion('acc-goal', 0, transactions, today)
    expect(result.projectedDate).toBeNull()
  })
})
