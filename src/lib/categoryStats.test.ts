import { describe, expect, it } from 'vitest'
import { budgetLeftLabel, budgetState, monthProgress, mostUsedCategories } from './categoryStats'
import type { Category, Transaction } from '../types'

const fmt = (n: number) => String(n)

describe('budgetState / budgetLeftLabel', () => {
  it('distinguishes ok, near, reached and over', () => {
    expect(budgetState(100, undefined)).toBe('none')
    expect(budgetState(50, 100)).toBe('ok')
    expect(budgetState(80, 100)).toBe('near')
    expect(budgetState(100, 100)).toBe('reached')
    expect(budgetState(120, 100)).toBe('over')
  })
  it('labels remaining or overrun amount', () => {
    expect(budgetLeftLabel(30, 100, fmt)).toBe('متبقي 70')
    expect(budgetLeftLabel(100, 100, fmt)).toBe('وصلت للحد')
    expect(budgetLeftLabel(130, 100, fmt)).toBe('تجاوز 30')
    expect(budgetLeftLabel(30, undefined, fmt)).toBe('بدون ميزانية')
  })
})

describe('mostUsedCategories', () => {
  it('orders by expense usage, keeping user order on ties', () => {
    const cats: Category[] = ['a', 'b', 'c'].map((id) => ({ id, name: id, kind: 'expense' }))
    const tx = (categoryId: string, type: Transaction['type'] = 'expense'): Transaction => ({ id: Math.random().toString(), type, amount: 1, date: '2026-10-01', accountId: 'x', categoryId })
    const res = mostUsedCategories(cats, [tx('c'), tx('c'), tx('b'), tx('a', 'income'), tx('a', 'income')])
    expect(res.map((c) => c.id)).toEqual(['c', 'b', 'a'])
  })
})

describe('monthProgress', () => {
  it('counts today as a remaining day', () => {
    expect(monthProgress(new Date(2026, 9, 8))).toEqual({ day: 8, days: 31, daysLeft: 24 })
  })
})
