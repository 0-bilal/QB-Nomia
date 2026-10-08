import { beforeEach, describe, expect, it } from 'vitest'
import { DEFAULT_PREFS, ageLabel, ageOf, currentOccasion, g, getProfile, greetingText, isBirthday, recordOpenAndGetPrevious, resetProfileCache, saveProfile, type UserProfile } from './profile'

const P: UserProfile = { name: 'بلال', gender: 'm', birthDate: '1996-10-08', color: 0, prefs: DEFAULT_PREFS }

describe('profile', () => {
  beforeEach(() => {
    localStorage.clear()
    sessionStorage.clear()
    resetProfileCache()
  })

  it('saves and loads', () => {
    expect(getProfile()).toBeNull()
    saveProfile(P)
    resetProfileCache()
    expect(getProfile()).toEqual(P)
  })

  it('computes age and birthday', () => {
    expect(ageOf('1996-10-08', new Date(2026, 9, 8))).toBe(30)
    expect(ageOf('1996-10-09', new Date(2026, 9, 8))).toBe(29)
    expect(ageOf(undefined, new Date())).toBeNull()
    expect(isBirthday('1996-10-08', new Date(2026, 9, 8))).toBe(true)
    expect(ageLabel(30)).toBe('30 سنة')
    expect(ageLabel(5)).toBe('5 سنوات')
  })

  it('greets by name and respects prefs', () => {
    expect(greetingText(9, P)).toBe('صباح الخير، بلال')
    expect(greetingText(19, null)).toBe('مساء الخير')
    expect(greetingText(3, { ...P, prefs: { ...DEFAULT_PREFS, greetByName: false } })).toBe('ليلة سعيدة')
    expect(g({ gender: 'f' }, 'صرفت', 'صرفتِ')).toBe('صرفتِ')
  })

  it('picks the most important occasion', () => {
    const fri = new Date(2026, 9, 9) // جمعة
    expect(currentOccasion(P, new Date(2026, 9, 8), { salaryToday: true, prevOpenAt: null })).toEqual({ kind: 'birthday', age: 30 })
    expect(currentOccasion(P, fri, { salaryToday: true, prevOpenAt: null })).toEqual({ kind: 'salary' })
    expect(currentOccasion(P, fri, { salaryToday: false, prevOpenAt: new Date(2026, 9, 3).toISOString() })).toEqual({ kind: 'away', days: 6 })
    expect(currentOccasion(P, fri, { salaryToday: false, prevOpenAt: null })).toEqual({ kind: 'friday' })
    expect(currentOccasion({ ...P, prefs: { ...DEFAULT_PREFS, occasions: false } }, fri, { salaryToday: true, prevOpenAt: null })).toBeNull()
  })

  it('records opens per session', () => {
    expect(recordOpenAndGetPrevious(new Date('2026-10-01T10:00:00Z'))).toBeNull()
    sessionStorage.clear()
    expect(recordOpenAndGetPrevious(new Date('2026-10-05T10:00:00Z'))).toBe('2026-10-01T10:00:00.000Z')
    expect(recordOpenAndGetPrevious(new Date('2026-10-05T11:00:00Z'))).toBe('2026-10-01T10:00:00.000Z')
  })
})
