import { describe, expect, it } from 'vitest'
import { formatDate, formatMoney, formatSigned } from './format'

describe('formatMoney', () => {
  it('formats whole numbers with thousands separators and the ر.س suffix', () => {
    expect(formatMoney(1234)).toBe('1,234 ر.س')
  })

  it('rounds to two decimal places', () => {
    expect(formatMoney(10.006)).toBe('10.01 ر.س')
  })

  it('drops trailing zeros like toLocaleString does', () => {
    expect(formatMoney(10)).toBe('10 ر.س')
  })

  it('handles negative amounts', () => {
    expect(formatMoney(-50)).toBe('-50 ر.س')
  })

  it('handles zero', () => {
    expect(formatMoney(0)).toBe('0 ر.س')
  })
})

describe('formatSigned', () => {
  it('prefixes positive amounts with +', () => {
    expect(formatSigned(100)).toBe('+100 ر.س')
  })

  it('prefixes negative amounts with − (Unicode minus, not a hyphen)', () => {
    expect(formatSigned(-100)).toBe('−100 ر.س')
  })

  it('adds no sign for zero', () => {
    expect(formatSigned(0)).toBe('0 ر.س')
  })
})

describe('formatDate', () => {
  it('formats an ISO date as YYYY/MM/DD', () => {
    expect(formatDate('2026-08-19')).toBe('2026/08/19')
  })

  it('pads single-digit months and days', () => {
    expect(formatDate('2026-01-05')).toBe('2026/01/05')
  })
})
