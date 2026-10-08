import { describe, expect, it } from 'vitest'
import type { ActivityItem } from '../state/DataContext'
import { EMPTY_TX_FILTERS, filterActivity, netOf, periodLabel, periodRange, sheetFilterCount, shiftMonth, sortActivity, totalsOf, typeTotals } from './txFilters'

const mk = (id: string, date: string, kind: ActivityItem['kind'], amount: number, extra: Partial<ActivityItem> = {}): ActivityItem => ({
  id,
  date,
  kind,
  amount,
  title: kind === 'expense' ? 'مطاعم' : 'دخل',
  subtitle: 'الراجحي',
  color: '#fff',
  accountIds: ['a1'],
  ...extra,
})

const ITEMS: ActivityItem[] = [
  mk('1', '2026-10-08', 'expense', -42, { note: 'البيك' }),
  mk('2', '2026-10-07', 'income', 9500),
  mk('3', '2026-10-06', 'transfer', -500, { title: 'تحويل', accountIds: ['a1', 'a2'] }),
  mk('4', '2026-09-20', 'expense', -310, { title: 'بقالة', accountIds: ['a2'] }),
  mk('5', '2026-09-02', 'loan-given', -300, { title: 'سلفة' }),
]
const TODAY = '2026-10-08'

describe('txFilters', () => {
  it('filters by type, grouping loans', () => {
    expect(filterActivity(ITEMS, { ...EMPTY_TX_FILTERS, type: 'loan' }, '', TODAY).map((i) => i.id)).toEqual(['5'])
    expect(filterActivity(ITEMS, { ...EMPTY_TX_FILTERS, type: 'loan' }, '', TODAY, { ignoreType: true })).toHaveLength(5)
  })

  it('filters by period presets and month keys', () => {
    expect(filterActivity(ITEMS, { ...EMPTY_TX_FILTERS, period: 'month' }, '', TODAY).map((i) => i.id)).toEqual(['1', '2', '3'])
    expect(filterActivity(ITEMS, { ...EMPTY_TX_FILTERS, period: 'last' }, '', TODAY).map((i) => i.id)).toEqual(['4', '5'])
    expect(filterActivity(ITEMS, { ...EMPTY_TX_FILTERS, period: 'm:2026-09' }, '', TODAY)).toHaveLength(2)
    expect(periodRange({ period: '30', from: '', to: '' }, TODAY)).toEqual(['2026-09-09', TODAY])
    expect(periodLabel({ period: 'm:2026-09', from: '', to: '' })).toBe('سبتمبر 2026')
  })

  it('filters by account, amount and query (incl. amount text)', () => {
    expect(filterActivity(ITEMS, { ...EMPTY_TX_FILTERS, accountIds: ['a2'] }, '', TODAY).map((i) => i.id)).toEqual(['3', '4'])
    expect(filterActivity(ITEMS, { ...EMPTY_TX_FILTERS, minAmount: '100', maxAmount: '400' }, '', TODAY).map((i) => i.id)).toEqual(['4', '5'])
    expect(filterActivity(ITEMS, EMPTY_TX_FILTERS, 'البيك', TODAY).map((i) => i.id)).toEqual(['1'])
    expect(filterActivity(ITEMS, EMPTY_TX_FILTERS, '9,500', TODAY).map((i) => i.id)).toEqual(['2'])
  })

  it('filters by category unless ignored', () => {
    const f = { ...EMPTY_TX_FILTERS, categories: ['بقالة'] }
    expect(filterActivity(ITEMS, f, '', TODAY).map((i) => i.id)).toEqual(['4'])
    expect(filterActivity(ITEMS, f, '', TODAY, { ignoreCategory: true })).toHaveLength(5)
  })

  it('sorts', () => {
    expect(sortActivity(ITEMS, 'high')[0].id).toBe('2')
    expect(sortActivity(ITEMS, 'low')[0].id).toBe('1')
    expect(sortActivity(ITEMS, 'old')[0].id).toBe('5')
  })

  it('computes totals without transfers', () => {
    expect(totalsOf(ITEMS)).toEqual({ income: 9500, expense: 652, net: 8848 })
    expect(typeTotals(ITEMS)).toEqual({ expense: 352, income: 9500, transfer: 500, loan: 300 })
    expect(netOf(ITEMS)).toBe(8848)
  })

  it('counts sheet filters and shifts months', () => {
    expect(sheetFilterCount({ ...EMPTY_TX_FILTERS, period: 'month', sort: 'high', type: 'income' })).toBe(2)
    expect(shiftMonth('2026-01', -1)).toBe('2025-12')
    expect(shiftMonth('2026-12', 1)).toBe('2027-01')
  })
})
