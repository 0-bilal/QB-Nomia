import { describe, expect, it } from 'vitest'
import { placeCard, sameRect, spotRect } from './tourLayout'

const VH = 844

describe('spotRect', () => {
  it('يضيف الهامش حول العنصر', () => {
    expect(spotRect({ top: 100, left: 20, width: 350, height: 200 }, 8, 390, VH)).toEqual({ top: 92, left: 12, width: 366, height: 216 })
  })

  it('يقص العنصر الطويل داخل الشاشة', () => {
    const r = spotRect({ top: -200, left: 0, width: 390, height: 1400 }, 8, 390, VH)
    expect(r.top).toBe(8)
    expect(r.top + r.height).toBe(VH - 8)
    expect(r.left + r.width).toBe(390 - 8)
  })
})

describe('placeCard', () => {
  it('تحت العنصر لو فيه مساحة', () => {
    expect(placeCard({ top: 100, left: 0, width: 300, height: 200 }, 180, VH)).toBe(314)
  })

  it('فوق العنصر لو هو تحت', () => {
    expect(placeCard({ top: 760, left: 0, width: 300, height: 66 }, 180, VH)).toBe(760 - 14 - 180)
  })

  it('العنصر الطويل: الجهة الأوسع وداخل الشاشة', () => {
    const top = placeCard({ top: 300, left: 0, width: 300, height: 450 }, 180, VH)
    expect(top).toBeGreaterThanOrEqual(16)
    expect(top + 180).toBeLessThanOrEqual(VH - 16)
  })
})

describe('sameRect', () => {
  it('يتجاهل فروق أقل من نصف بكسل', () => {
    expect(sameRect({ top: 1, left: 1, width: 1, height: 1 }, { top: 1.3, left: 1, width: 1, height: 1 })).toBe(true)
    expect(sameRect({ top: 1, left: 1, width: 1, height: 1 }, { top: 2, left: 1, width: 1, height: 1 })).toBe(false)
  })
})
