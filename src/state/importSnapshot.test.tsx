import { act, useLayoutEffect } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// المزامنة الحقيقية ممنوعة بالاختبار — نراقب هل حاول الاستيراد يرفع شي.
vi.mock('../lib/sheetsSync', async (importOriginal) => {
  const real = await importOriginal<typeof import('../lib/sheetsSync')>()
  return { ...real, pushToSheets: vi.fn().mockResolvedValue(undefined), pullFromSheets: vi.fn() }
})

import { DataProvider, useData, type DataSnapshot } from './DataContext'
import { isDataSnapshot } from '../lib/backup'
import { getProfile, saveProfile, type UserProfile } from '../lib/profile'
import { hasPendingPush, pushToSheets } from '../lib/sheetsSync'
import { setSheetsSyncCredentials } from '../config/sheetsSync'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type Data = ReturnType<typeof useData>

let root: Root | null = null
let container: HTMLDivElement | null = null
const probe: { data?: Data } = {}

/** يلتقط قيمة useData بعد كل رسم — الاختبارات تقراها عبر `data`. */
function Probe() {
  const value = useData()
  useLayoutEffect(() => {
    probe.data = value
  })
  return null
}

function mount() {
  container = document.createElement('div')
  document.body.appendChild(container)
  root = createRoot(container)
  act(() => root!.render(<DataProvider><Probe /></DataProvider>))
}

function importSnap(snapshot: DataSnapshot) {
  act(() => probe.data!.importSnapshot(snapshot))
}

const stored = (key: string) => JSON.parse(localStorage.getItem(key) ?? 'null')

const profile: UserProfile = { name: 'بلال', gender: 'm', color: 0, prefs: {} as UserProfile['prefs'] }

/** نسخة كاملة واقعية — بنفس شكل ما يصدّره التطبيق. */
function fullSnapshot(): DataSnapshot {
  return {
    accounts: [
      { id: 'acc-cash', name: 'كاش', type: 'cash', balance: 250 },
      { id: 'acc-bank', name: 'الراجحي', type: 'bank', balance: 4800, includeInTotal: true },
    ],
    people: [{ id: 'p1', name: 'سعد', createdAt: '2026-10-01T10:00:00.000Z' }],
    loanTransactions: [],
    categories: [{ id: 'cat-food', name: 'أكل', kind: 'expense', budgetLimit: 900 }],
    incomeSources: [{ id: 'src-salary', name: 'راتب' }],
    transactions: [
      { id: 't1', type: 'expense', amount: 45, date: '2026-11-01', accountId: 'acc-cash', categoryId: 'cat-food', note: 'غداء' },
      { id: 't2', type: 'income', amount: 9000, date: '2026-10-27', accountId: 'acc-bank', incomeSourceId: 'src-salary' },
    ],
    subscriptions: [{ id: 's1', name: 'Netflix', cost: 45, billingCycle: 'monthly', nextRenewalDate: '2026-11-20', accountId: 'acc-bank', status: 'active' }],
    commitments: [],
    recurringTransactions: [],
    monthlyBudgetLimit: 5000,
    zakatPayments: [],
    vehicleOdometerKm: 120000,
    vehicleOilIntervalKm: 7500,
    vehicleOilBaselineKm: 115000,
    oilChanges: [],
    fuelTankCapacityL: 60,
    fuelLogs: [],
    salaryAdvances: [],
    salaryViolations: [],
    storeDebts: [],
    storeDebtPayments: [],
    businessClients: [],
    contributions: [],
    reconciliations: [],
    profile,
  } as DataSnapshot
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-11-05T09:00:00Z'))
  mount()
})

afterEach(() => {
  act(() => root?.unmount())
  container?.remove()
  root = null
  container = null
  vi.useRealTimers()
  vi.clearAllMocks()
})

describe('isDataSnapshot (فحص ملف النسخة قبل الاستيراد)', () => {
  it('يقبل نسخة صادرة من التطبيق', () => {
    expect(isDataSnapshot(fullSnapshot())).toBe(true)
  })

  it('يرفض أي شي مو كائن، أو ناقص الحسابات أو الحركات أو الأشخاص', () => {
    expect(isDataSnapshot(null)).toBe(false)
    expect(isDataSnapshot('نص')).toBe(false)
    expect(isDataSnapshot([])).toBe(false)
    expect(isDataSnapshot({ accounts: [], transactions: [] })).toBe(false)
    expect(isDataSnapshot({ accounts: {}, transactions: [], people: [] })).toBe(false)
  })
})

describe('importSnapshot', () => {
  it('يستبدل البيانات في الذاكرة ويحفظها على الجهاز', () => {
    const snap = fullSnapshot()
    importSnap(snap)

    // الحركات بدون createdAt ياخذون وقت الاستيراد (stampNew في persistTransactions) — نقارن بدونه.
    const withoutCreatedAt = (list: { createdAt?: string }[]) => list.map(({ createdAt: _c, ...rest }) => (void _c, rest))
    expect(probe.data!.accounts).toEqual(snap.accounts)
    expect(withoutCreatedAt(probe.data!.transactions)).toEqual(snap.transactions)
    expect(probe.data!.subscriptions).toEqual(snap.subscriptions)
    expect(stored('qbnomia.accounts')).toEqual(snap.accounts)
    expect(withoutCreatedAt(stored('qbnomia.transactions'))).toEqual(snap.transactions)
    expect(stored('qbnomia.people')).toEqual(snap.people)
    expect(stored('qbnomia.monthlyBudgetLimit')).toBe(5000)
    expect(stored('qbnomia.vehicle.odometerKm')).toBe(120000)
    expect(getProfile()?.name).toBe('بلال')
  })

  it('تصدير ثم استيراد ثم تصدير يرجّع نفس البيانات بالضبط', () => {
    importSnap(fullSnapshot())
    const first = probe.data!.exportSnapshot()
    act(() => root!.unmount())
    mount() // تشغيل جديد يقرأ من التخزين
    importSnap(first)
    expect(probe.data!.exportSnapshot()).toEqual(first)
  })

  it('يستبدل البيانات السابقة كاملة — ما يدمجها', () => {
    importSnap(fullSnapshot())
    importSnap({ ...fullSnapshot(), accounts: [{ id: 'only', name: 'وحيد', type: 'cash', balance: 1 }], transactions: [] })
    expect(probe.data!.accounts.map((a) => a.id)).toEqual(['only'])
    expect(probe.data!.transactions).toEqual([])
  })

  it('نسخة قديمة بدون الحقول الجديدة تنستورد بقيم افتراضية بدون أعطال', () => {
    importSnap(fullSnapshot())
    const old = {
      accounts: [{ id: 'a', name: 'قديم', type: 'cash', balance: 10 }],
      people: [],
      loanTransactions: [],
      categories: [],
      incomeSources: [],
      transactions: [],
      subscriptions: [],
    } as unknown as DataSnapshot
    importSnap(old)

    const out = probe.data!.exportSnapshot()
    expect(out.accounts.map((a) => a.id)).toEqual(['a'])
    expect(out.commitments).toEqual([])
    expect(out.fuelLogs).toEqual([])
    expect(out.businessClients).toEqual([])
    expect(out.monthlyBudgetLimit).toBeNull()
    expect(out.vehicleOdometerKm).toBeNull()
    expect(typeof out.vehicleOilIntervalKm).toBe('number')
  })

  it('يضيف الفئات ومصادر الدخل الأساسية لو كانت ناقصة في النسخة', () => {
    importSnap({ ...fullSnapshot(), categories: [], incomeSources: [] })
    expect(probe.data!.exportSnapshot().categories.length).toBeGreaterThan(0)
    expect(probe.data!.exportSnapshot().incomeSources.length).toBeGreaterThan(0)
  })

  it('نسخة بدون ملف شخصي ما تمسح الملف الحالي', () => {
    saveProfile({ ...profile, name: 'الحالي' })
    const { profile: _drop, ...noProfile } = fullSnapshot()
    void _drop
    importSnap(noProfile as DataSnapshot)
    expect(getProfile()?.name).toBe('الحالي')
  })

  it('الاستيراد ما يرفع للجدول ولا يعلّم تعديلات معلّقة (البيانات جاية منه أصلًا)', () => {
    setSheetsSyncCredentials('https://script.google.com/macros/s/x/exec', 'tok')
    importSnap(fullSnapshot())
    act(() => vi.advanceTimersByTime(5000))
    expect(pushToSheets).not.toHaveBeenCalled()
    expect(hasPendingPush()).toBe(false)
  })

  it('أما التعديل العادي بعد الاستيراد فيترفع كالعادة', async () => {
    setSheetsSyncCredentials('https://script.google.com/macros/s/x/exec', 'tok')
    importSnap(fullSnapshot())
    act(() => probe.data!.setMonthlyBudgetLimit(6000))
    expect(hasPendingPush()).toBe(true)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000)
    })
    expect(pushToSheets).toHaveBeenCalledTimes(1)
    expect(vi.mocked(pushToSheets).mock.calls[0][0].monthlyBudgetLimit).toBe(6000)
  })
})
