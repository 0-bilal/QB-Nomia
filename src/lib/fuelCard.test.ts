import { describe, expect, it } from 'vitest'
import { fuelLevel, lastFuelTopUp } from './fuelCard'
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
