import { describe, expect, it } from 'vitest'
import { countTotal, daysSinceReconciled, diffStatus, lastReconciledDate, parsePadAmount, reconcileDiff, reconciledLabel } from './reconcile'
import type { Reconciliation } from '../types'

const rec = (accountId: string, date: string): Reconciliation => ({
  id: `${accountId}-${date}`,
  accountId,
  date,
  appBalance: 0,
  actualBalance: 0,
  difference: 0,
  resolution: 'matched',
})

describe('countTotal', () => {
  it('يجمع الفئات', () => {
    expect(countTotal({ 500: 1, 100: 2, 5: 3, 1: 4 })).toBe(719)
  })
  it('يرجّع null لو ما عُدّ شيء', () => {
    expect(countTotal({})).toBeNull()
    expect(countTotal({ 100: 0 })).toBeNull()
  })
})

describe('parsePadAmount', () => {
  it('يقرأ المبلغ', () => {
    expect(parsePadAmount('120.5')).toBe(120.5)
    expect(parsePadAmount('0')).toBe(0)
  })
  it('الفاضي null', () => {
    expect(parsePadAmount('')).toBeNull()
    expect(parsePadAmount('.')).toBeNull()
  })
})

describe('reconcileDiff / diffStatus', () => {
  it('النقص سالب والزيادة موجبة، مقرّبة للهللة', () => {
    expect(reconcileDiff(620, 570)).toBe(-50)
    expect(reconcileDiff(100.1, 100.3)).toBe(0.2)
    expect(diffStatus(reconcileDiff(620, 570))).toBe('short')
    expect(diffStatus(15)).toBe('over')
    expect(diffStatus(reconcileDiff(0.1 + 0.2, 0.3))).toBe('matched')
  })
})

describe('آخر مطابقة', () => {
  it('أحدث تاريخ لنفس الحساب فقط', () => {
    const recs = [rec('a', '2026-09-01'), rec('a', '2026-10-05'), rec('b', '2026-10-09')]
    expect(lastReconciledDate(recs, 'a')).toBe('2026-10-05')
    expect(lastReconciledDate(recs, 'c')).toBeUndefined()
  })
  it('الأيام والوصف', () => {
    const today = new Date(2026, 9, 11)
    expect(daysSinceReconciled(undefined, today)).toBeNull()
    expect(daysSinceReconciled('2026-10-11', today)).toBe(0)
    expect(daysSinceReconciled('2026-09-29', today)).toBe(12)
    expect(reconciledLabel(null)).toBe('لم يُطابق بعد')
    expect(reconciledLabel(0)).toBe('طابقته اليوم')
    expect(reconciledLabel(1)).toBe('طابقته أمس')
    expect(reconciledLabel(2)).toBe('آخر مطابقة قبل يومين')
    expect(reconciledLabel(5)).toBe('آخر مطابقة قبل 5 أيام')
    expect(reconciledLabel(12)).toBe('آخر مطابقة قبل 12 يوم')
  })
})
