import { describe, expect, it } from 'vitest'
import { fuelLevel, lastFuelTopUp, monthSpending } from './fuelCard'
import type { Transaction } from '../types'

const tx = (p: Partial<Transaction>): Transaction => ({ id: Math.random().toString(), type: 'expense', amount: 0, date: '2026-01-01', accountId: 'x', ...p })

describe('lastFuelTopUp', () => {
  it('picks the most recent transfer or income into the card, ignoring spending and other accounts', () => {
    const txs = [
      tx({ type: 'transfer', accountId: 'bank', transferToAccountId: 'fuel', amount: 300, date: '2026-01-05' }),
      tx({ type: 'income', accountId: 'fuel', amount: 500, date: '2026-02-01' }),
      tx({ type: 'expense', accountId: 'fuel', amount: 80, date: '2026-02-03' }),
      tx({ type: 'transfer', accountId: 'bank', transferToAccountId: 'other', amount: 999, date: '2026-03-01' }),
    ]
    expect(lastFuelTopUp('fuel', txs)).toBe(500)
    expect(lastFuelTopUp('none', txs)).toBeUndefined()
  })
})

describe('fuelLevel', () => {
  it('is balance relative to the last top-up, clamped to 0..1', () => {
    expect(fuelLevel(250, 500)).toBe(0.5)
    expect(fuelLevel(700, 500)).toBe(1)
    expect(fuelLevel(0, 500)).toBe(0)
    expect(fuelLevel(-5, 500)).toBe(0)
    expect(fuelLevel(100, undefined)).toBe(1)
  })
})

describe('monthSpending', () => {
  it('sums only this account\'s expenses within the given month', () => {
    const txs = [
      tx({ type: 'expense', accountId: 'steam', amount: 74.99, date: '2026-10-03' }),
      tx({ type: 'expense', accountId: 'steam', amount: 25, date: '2026-10-07' }),
      tx({ type: 'expense', accountId: 'steam', amount: 60, date: '2026-09-30' }),
      tx({ type: 'expense', accountId: 'bank', amount: 999, date: '2026-10-05' }),
      tx({ type: 'transfer', accountId: 'bank', transferToAccountId: 'steam', amount: 100, date: '2026-10-01' }),
    ]
    expect(monthSpending('steam', txs, '2026-10')).toBeCloseTo(99.99)
    expect(monthSpending('steam', txs, '2026-08')).toBe(0)
  })
})
