import { beforeEach, describe, expect, it } from 'vitest'
import { getBiometricFirst, getLockBackground, getLockClock, getLockGraceMin, setBiometricFirst, setLockBackground, setLockClock, setLockGraceMin, shouldLockAfter } from './lockPrefs'

describe('lockPrefs', () => {
  beforeEach(() => localStorage.clear())

  it('القيم الافتراضية', () => {
    expect(getLockGraceMin()).toBe(5)
    expect(getBiometricFirst()).toBe(true)
    expect(getLockBackground()).toBe('aurora')
    expect(getLockClock()).toBe(false)
  })

  it('يحفظ ويقرأ، ويرفض القيم غير المعروفة', () => {
    setLockGraceMin(15)
    setBiometricFirst(false)
    setLockBackground('dots')
    setLockClock(true)
    expect(getLockGraceMin()).toBe(15)
    expect(getBiometricFirst()).toBe(false)
    expect(getLockBackground()).toBe('dots')
    expect(getLockClock()).toBe(true)
    localStorage.setItem('qbnomia.lock.graceMin', '7')
    localStorage.setItem('qbnomia.lock.background', 'x')
    expect(getLockGraceMin()).toBe(5)
    expect(getLockBackground()).toBe('aurora')
  })

  it('المهلة 0 تعني القفل الفوري', () => {
    setLockGraceMin(0)
    expect(getLockGraceMin()).toBe(0)
    expect(shouldLockAfter(1)).toBe(true)
    expect(shouldLockAfter(4 * 60 * 1000, 5)).toBe(false)
    expect(shouldLockAfter(5 * 60 * 1000, 5)).toBe(true)
  })
})
