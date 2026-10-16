import { beforeEach, describe, expect, it } from 'vitest'
import {
  clearWizardDraft,
  getWizardDraft,
  isChecklistHidden,
  isIntroSeen,
  isTourPending,
  markIntroSeen,
  saveWizardDraft,
  setChecklistHidden,
  setTourPending,
  setupProgress,
  setupSteps,
  type SetupInput,
} from './onboarding'

const base: SetupInput = { accountsCount: 0, hasIncome: false, hasBudget: false, backupConfigured: false, biometricEnabled: false }

beforeEach(() => localStorage.clear())

describe('setupSteps', () => {
  it('الخمس بالترتيب وكلها غير مكتملة لمستخدم جديد', () => {
    const steps = setupSteps(base)
    expect(steps.map((s) => s.id)).toEqual(['accounts', 'income', 'budget', 'backup', 'biometric'])
    expect(steps.every((s) => !s.done)).toBe(true)
  })

  it('تتعلّم من البيانات', () => {
    const steps = setupSteps({ ...base, accountsCount: 2, backupConfigured: true })
    expect(steps.filter((s) => s.done).map((s) => s.id)).toEqual(['accounts', 'backup'])
  })

  it('البصمة تسقط لو الجهاز ما يدعمها', () => {
    expect(setupSteps({ ...base, biometricEnabled: null }).map((s) => s.id)).not.toContain('biometric')
  })
})

describe('setupProgress', () => {
  it('يحسب العدد والخطوة الجاية', () => {
    const p = setupProgress(setupSteps({ ...base, accountsCount: 1, hasIncome: true }))
    expect(p.doneCount).toBe(2)
    expect(p.total).toBe(5)
    expect(p.complete).toBe(false)
    expect(p.next?.id).toBe('budget')
  })

  it('مكتمل لما تخلص كل الخطوات المتاحة', () => {
    const p = setupProgress(setupSteps({ accountsCount: 1, hasIncome: true, hasBudget: true, backupConfigured: true, biometricEnabled: null }))
    expect(p.complete).toBe(true)
    expect(p.next).toBeNull()
  })
})

describe('العلامات', () => {
  it('تُحفظ وتُقرأ', () => {
    expect(isIntroSeen()).toBe(false)
    markIntroSeen()
    expect(isIntroSeen()).toBe(true)

    setTourPending(true)
    expect(isTourPending()).toBe(true)
    setTourPending(false)
    expect(isTourPending()).toBe(false)

    setChecklistHidden(true)
    expect(isChecklistHidden()).toBe(true)
  })
})

describe('مسودة المعالج', () => {
  it('تحفظ الرمز والخطوة وتنمسح', () => {
    saveWizardDraft({ step: 3, token: 'abc', savedToken: true, url: '' })
    expect(getWizardDraft()).toEqual({ step: 3, token: 'abc', savedToken: true, url: '' })
    clearWizardDraft()
    expect(getWizardDraft()).toBeNull()
  })

  it('تتجاهل مسودة تالفة أو بدون رمز', () => {
    localStorage.setItem('qbnomia.onboarding.backupDraft', '{bad')
    expect(getWizardDraft()).toBeNull()
    localStorage.setItem('qbnomia.onboarding.backupDraft', '{"step":2}')
    expect(getWizardDraft()).toBeNull()
  })
})
