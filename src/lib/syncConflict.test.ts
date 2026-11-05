import { describe, expect, it, vi } from 'vitest'
import type { DataSnapshot } from '../state/DataContext'
import { LEGACY_REV, clearConflict, conflictDiff, deviceLabel, getConflict, isConflict, newerSide, setConflict, subscribeConflict } from './syncConflict'

describe('isConflict', () => {
  it('الجدول الفاضي ما فيه تعارض', () => {
    expect(isConflict(null, null)).toBe(false)
    expect(isConflict(null, 'r1')).toBe(false)
  })
  it('نفس آخر نسخة تزامنّا معها = آمن، وغيرها = تعارض', () => {
    expect(isConflict('r1', 'r1')).toBe(false)
    expect(isConflict('r2', 'r1')).toBe(true)
    expect(isConflict('r2', null)).toBe(true)
  })
  it('نسخة إصدار قديم: آمنة فقط لجهاز ما تزامن بالنظام الجديد', () => {
    expect(isConflict(LEGACY_REV, null)).toBe(false)
    expect(isConflict(LEGACY_REV, 'r1')).toBe(true)
  })
})

describe('deviceLabel', () => {
  it('يتعرّف على الأجهزة الشائعة', () => {
    expect(deviceLabel('Mozilla/5.0 (Linux; Android 15; Pixel 9)')).toBe('أندرويد')
    expect(deviceLabel('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)')).toBe('آيفون')
    expect(deviceLabel('Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)')).toBe('آيباد')
    expect(deviceLabel('Mozilla/5.0 (Macintosh; Intel Mac OS X 15_0)')).toBe('ماك')
    expect(deviceLabel('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')).toBe('ويندوز')
    expect(deviceLabel('curl/8')).toBe('متصفح')
  })
})

describe('conflictDiff', () => {
  const base = {
    accounts: [],
    people: [],
    loanTransactions: [],
    subscriptions: [],
    categories: [{ id: 'c-food', name: 'أكل', kind: 'expense' }],
    incomeSources: [{ id: 's-sal', name: 'راتب' }],
  }
  const local = {
    ...base,
    transactions: [
      { id: 'shared', type: 'expense', amount: 10, date: '2026-11-01', accountId: 'a' },
      { id: 'l1', type: 'expense', amount: 18, date: '2026-11-02', accountId: 'a', note: 'قهوة' },
      { id: 'l2', type: 'expense', amount: 40, date: '2026-11-04', accountId: 'a', categoryId: 'c-food' },
    ],
  } as unknown as DataSnapshot
  const remote = {
    ...base,
    transactions: [
      { id: 'shared', type: 'expense', amount: 10, date: '2026-11-01', accountId: 'a' },
      { id: 'r1', type: 'income', amount: 500, date: '2026-11-03', accountId: 'a', incomeSourceId: 's-sal' },
      { id: 'r2', type: 'transfer', amount: 1000, date: '2026-11-03', accountId: 'a', transferToAccountId: 'b' },
    ],
  } as unknown as DataSnapshot

  it('يحسب حركات كل طرف اللي مو موجودة بالثاني، الأحدث أولًا، بأسماء مفهومة', () => {
    const d = conflictDiff(local, remote)
    expect(d.localOnly.map((x) => [x.id, x.label, x.sign])).toEqual([
      ['l2', 'أكل', -1],
      ['l1', 'قهوة', -1],
    ])
    expect(d.remoteOnly.map((x) => [x.id, x.label, x.sign])).toEqual([
      ['r1', 'راتب', 1],
      ['r2', 'تحويل', null],
    ])
  })

  it('نسختين بنفس الحركات = ما فيه فرق', () => {
    expect(conflictDiff(local, local)).toEqual({ localOnly: [], remoteOnly: [] })
  })
})

describe('newerSide', () => {
  it('يقارن وقت آخر تعديل محلي بوقت حفظ الجدول', () => {
    expect(newerSide('2026-11-05T12:00:00Z', '2026-11-05T11:00:00Z')).toBe('local')
    expect(newerSide('2026-11-05T10:00:00Z', '2026-11-05T11:00:00Z')).toBe('remote')
    expect(newerSide(null, '2026-11-05T11:00:00Z')).toBeNull()
  })
})

describe('حالة التعارض', () => {
  it('تنحفظ وتبلّغ المشتركين، والمسح يبلّغهم مرة وحدة', () => {
    const fn = vi.fn()
    const unsub = subscribeConflict(fn)
    setConflict({ rev: 'r', parentRev: null, deviceId: 'd', deviceLabel: 'أندرويد', savedAt: '2026-11-05T11:00:00Z' })
    expect(getConflict()?.remote?.deviceLabel).toBe('أندرويد')
    clearConflict()
    clearConflict()
    expect(getConflict()).toBeNull()
    expect(fn).toHaveBeenCalledTimes(2)
    unsub()
  })
})
