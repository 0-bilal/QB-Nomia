import { describe, expect, it } from 'vitest'
import type { BusinessClient, Transaction } from '../types'
import {
  addMonths,
  businessMonth,
  clientSchedule,
  clientStatus,
  clientViews,
  daysWord,
  lastMonths,
  monthlyCollected,
  monthlyValue,
  whatsappLink,
} from './business'

const BASE_AT = '2026-10-01T00:00:00.000Z'

function client(over: Partial<BusinessClient> = {}): BusinessClient {
  return {
    id: 'c1',
    name: 'مطعم الريف',
    kind: 'restaurant',
    service: 'نظام كاشير',
    amount: 250,
    cycleMonths: 1,
    baseDueDate: '2026-10-25',
    baseAt: BASE_AT,
    status: 'active',
    since: '2025-03-25',
    createdAt: BASE_AT,
    ...over,
  }
}

let n = 0
function pay(amount: number, date = '2026-10-27', over: Partial<Transaction> = {}): Transaction {
  n++
  return { id: `t${n}`, type: 'income', amount, date, accountId: 'a1', clientId: 'c1', createdAt: `2026-10-27T10:00:${String(n).padStart(2, '0')}.000Z`, ...over }
}

describe('addMonths', () => {
  it('يثبّت اليوم على آخر الشهر', () => {
    expect(addMonths('2026-01-31', 1)).toBe('2026-02-28')
    expect(addMonths('2028-01-31', 1)).toBe('2028-02-29')
    expect(addMonths('2026-11-15', 3)).toBe('2027-02-15')
    expect(addMonths('2026-10-25', -1)).toBe('2026-09-25')
  })
})

describe('clientSchedule', () => {
  it('بدون تحصيل: الموعد هو الأساس', () => {
    const s = clientSchedule(client(), [])
    expect(s.nextDueDate).toBe('2026-10-25')
    expect(s.remaining).toBe(250)
    expect(s.periodStart).toBe('2026-09-25')
  })

  it('تحصيل دورة كاملة يقدّم الموعد', () => {
    expect(clientSchedule(client(), [pay(250)]).nextDueDate).toBe('2026-11-25')
  })

  it('دورتين مرة وحدة', () => {
    expect(clientSchedule(client(), [pay(500)]).nextDueDate).toBe('2026-12-25')
  })

  it('الجزئي يبقى رصيدًا ويكمّله التحصيل الجاي', () => {
    const p1 = pay(100)
    const s1 = clientSchedule(client(), [p1])
    expect(s1.nextDueDate).toBe('2026-10-25')
    expect(s1.credit).toBe(100)
    expect(s1.remaining).toBe(150)
    const s2 = clientSchedule(client(), [p1, pay(150)])
    expect(s2.nextDueDate).toBe('2026-11-25')
    expect(s2.credit).toBe(0)
  })

  it('حذف حركة التحصيل يرجّع الموعد', () => {
    const p = pay(250)
    expect(clientSchedule(client(), [p]).nextDueDate).toBe('2026-11-25')
    expect(clientSchedule(client(), []).nextDueDate).toBe('2026-10-25')
  })

  it('التحصيل قبل إعادة ضبط الأساس ما يقدّم الموعد الجديد', () => {
    const old = pay(250, '2026-09-25', { createdAt: '2026-09-25T00:00:00.000Z' })
    const s = clientSchedule(client(), [old])
    expect(s.nextDueDate).toBe('2026-10-25')
    expect(s.totalPaid).toBe(250)
  })

  it('يتجاهل حركات عملاء آخرين والمصروفات', () => {
    const s = clientSchedule(client(), [pay(250, undefined, { clientId: 'c2' }), pay(250, undefined, { type: 'expense' })])
    expect(s.nextDueDate).toBe('2026-10-25')
  })

  it('الكسور بدون أخطاء تقريب', () => {
    const c = client({ amount: 0.3 })
    expect(clientSchedule(c, [pay(0.1), pay(0.2)]).nextDueDate).toBe('2026-11-25')
  })
})

describe('clientStatus', () => {
  it('الحالات', () => {
    const c = client()
    expect(clientStatus(c, '2026-10-25', '2026-10-27')).toMatchObject({ key: 'late', label: 'متأخر يومين' })
    expect(clientStatus(c, '2026-10-27', '2026-10-27')).toMatchObject({ key: 'soon', label: 'اليوم' })
    expect(clientStatus(c, '2026-10-30', '2026-10-27')).toMatchObject({ key: 'soon', label: 'بعد 3 أيام' })
    expect(clientStatus(c, '2026-11-20', '2026-10-27')).toMatchObject({ key: 'active' })
    expect(clientStatus(client({ status: 'paused' }), '2026-09-01', '2026-10-27').key).toBe('paused')
  })

  it('daysWord', () => {
    expect([1, 2, 3, 10, 11].map(daysWord)).toEqual(['يوم', 'يومين', '3 أيام', '10 أيام', '11 يوم'])
  })
})

describe('الأرقام', () => {
  it('القيمة الشهرية', () => {
    expect(monthlyValue(client({ amount: 1200, cycleMonths: 12 }))).toBe(100)
    expect(monthlyValue(client({ status: 'paused' }))).toBe(0)
  })

  it('الشهر: محصّل، متأخر، قادم', () => {
    const clients = [
      client(),
      client({ id: 'c2', amount: 180, baseDueDate: '2026-10-30' }),
      client({ id: 'c3', amount: 450, baseDueDate: '2026-11-15' }),
      client({ id: 'c4', amount: 150, baseDueDate: '2026-09-10', status: 'paused' }),
    ]
    const txns = [pay(100), pay(200, '2026-10-05', { clientId: 'c9' })]
    const views = clientViews(clients, txns, '2026-10-27')
    expect(views.map((v) => v.client.id)).toEqual(['c1', 'c2', 'c3', 'c4'])
    expect(businessMonth(views, txns, '2026-10', '2026-10-27')).toEqual({ collected: 300, late: 150, upcoming: 180 })
  })

  it('المحصّل لكل شهر', () => {
    const months = lastMonths('2026-10-27', 3)
    expect(months).toEqual(['2026-08', '2026-09', '2026-10'])
    expect(monthlyCollected([pay(250, '2026-09-02'), pay(100), pay(50, '2026-01-01')], months)).toEqual([0, 250, 100])
  })
})

describe('whatsappLink', () => {
  it('يحوّل الرقم السعودي', () => {
    expect(whatsappLink('055 123 4567', 'مرحبا')).toBe('https://wa.me/966551234567?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7')
    expect(whatsappLink('+966551234567', 'x')).toBe('https://wa.me/966551234567?text=x')
    expect(whatsappLink('551234567', 'x')).toBe('https://wa.me/966551234567?text=x')
  })

  it('null للرقم الناقص', () => {
    expect(whatsappLink('', 'x')).toBeNull()
    expect(whatsappLink('12345', 'x')).toBeNull()
  })
})
