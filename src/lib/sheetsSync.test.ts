import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSnapshot } from '../state/DataContext'
import { setSheetsSyncCredentials } from '../config/sheetsSync'
import { encryptJSON } from './cryptoUtil'
import { fetchRemoteCopy, hasPendingPush, markPendingPush, pullFromSheets, pushToSheets } from './sheetsSync'
import { SyncConflictError, getBaseRev, getConflict, setBaseRev, type SyncMeta } from './syncConflict'

const URL = 'https://script.google.com/macros/s/fake/exec'
const TOKEN = 'secret-token'

/** Apps Script وهمي: يخزّن النص المشفّر كما هو ويرجّعه — نفس سلوك Code.gs. */
let stored = ''
let pushes = 0

function fakeScript(_input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const ok = (data: unknown) => Promise.resolve(new Response(JSON.stringify({ ok: true, data }), { status: 200 }))
  if (!init || init.method === 'GET') return ok(stored)
  const body = JSON.parse(String(init.body)) as { action: string; token: string; data: string }
  if (body.token !== TOKEN) return Promise.resolve(new Response(JSON.stringify({ ok: false, error: 'رمز الدخول غير صحيح' })))
  stored = body.data
  pushes++
  return ok(null)
}

const snap = (accountName: string): DataSnapshot =>
  ({
    accounts: [{ id: 'a1', name: accountName, type: 'cash', balance: 0 }],
    people: [],
    loanTransactions: [],
    categories: [],
    incomeSources: [],
    transactions: [],
    subscriptions: [],
  }) as unknown as DataSnapshot

/** جهاز ثاني يرفع مباشرة للجدول (بدون المرور على حالة هذا الجهاز). */
async function otherDeviceSaves(name: string, meta: Partial<SyncMeta> | null) {
  const payload = meta ? { ...snap(name), syncMeta: { rev: 'other-rev', parentRev: null, deviceId: 'dev-b', deviceLabel: 'أندرويد', savedAt: '2026-11-05T10:00:00.000Z', ...meta } } : snap(name)
  stored = await encryptJSON(TOKEN, payload)
}

beforeEach(() => {
  stored = ''
  pushes = 0
  setSheetsSyncCredentials(URL, TOKEN)
  vi.stubGlobal('fetch', vi.fn(fakeScript))
})
afterEach(() => vi.unstubAllGlobals())

describe('الرفع يحمل رقم نسخة، والسحب يعتمدها', () => {
  it('أول رفع لجدول فاضي ينجح ويحفظ رقم النسخة', async () => {
    await pushToSheets(snap('أ'))
    const remote = await fetchRemoteCopy()
    expect(remote?.snapshot.accounts[0].name).toBe('أ')
    expect(remote?.meta?.rev).toBe(getBaseRev())
    expect(remote?.snapshot).not.toHaveProperty('syncMeta')
  })

  it('رفعات متتالية من نفس الجهاز تنجح', async () => {
    await pushToSheets(snap('1'))
    markPendingPush()
    await pushToSheets(snap('2'))
    expect((await fetchRemoteCopy())?.snapshot.accounts[0].name).toBe('2')
    expect(hasPendingPush()).toBe(false)
  })

  it('السحب يعتمد رقم نسخة الجدول، وبعده الرفع ينجح', async () => {
    await otherDeviceSaves('من ب', {})
    const s = await pullFromSheets()
    expect(s.accounts[0].name).toBe('من ب')
    expect(getBaseRev()).toBe('other-rev')
    await pushToSheets(snap('بعد السحب'))
    expect(pushes).toBe(1)
  })
})

describe('تعارض: جهاز ثاني رفع بعد آخر مزامنة', () => {
  it('ما يكتب فوق نسخة الجهاز الثاني، ويعلّم التعارض مع معلوماتها', async () => {
    await pushToSheets(snap('أ'))
    await otherDeviceSaves('ب', { savedAt: '2026-11-05T11:00:00.000Z' })
    pushes = 0

    await expect(pushToSheets(snap('أ - تعديل'))).rejects.toBeInstanceOf(SyncConflictError)
    expect(pushes).toBe(0)
    expect((await fetchRemoteCopy())?.snapshot.accounts[0].name).toBe('ب')
    expect(getConflict()?.remote).toEqual({ savedAt: '2026-11-05T11:00:00.000Z', deviceLabel: 'أندرويد' })
  })

  it('أثناء التعارض، أي رفع عادي يُرفض بدون ما يلمس الشبكة', async () => {
    await pushToSheets(snap('أ'))
    await otherDeviceSaves('ب', {})
    await expect(pushToSheets(snap('x'))).rejects.toBeInstanceOf(SyncConflictError)
    vi.mocked(fetch).mockClear()
    await expect(pushToSheets(snap('y'))).rejects.toBeInstanceOf(SyncConflictError)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('«اعتمد نسخة هذا الجهاز» (force) يكتب فوقها وينهي التعارض', async () => {
    await pushToSheets(snap('أ'))
    await otherDeviceSaves('ب', {})
    await expect(pushToSheets(snap('أ2'))).rejects.toBeInstanceOf(SyncConflictError)

    await pushToSheets(snap('أ2'), { force: true })
    expect((await fetchRemoteCopy())?.snapshot.accounts[0].name).toBe('أ2')
    expect(getConflict()).toBeNull()
    await pushToSheets(snap('أ3')) // المزامنة رجعت
    expect((await fetchRemoteCopy())?.snapshot.accounts[0].name).toBe('أ3')
  })

  it('«اعتمد نسخة Sheets» (سحب) ينهي التعارض ويرجّع المزامنة', async () => {
    await pushToSheets(snap('أ'))
    await otherDeviceSaves('ب', {})
    await expect(pushToSheets(snap('أ2'))).rejects.toBeInstanceOf(SyncConflictError)

    expect((await pullFromSheets()).accounts[0].name).toBe('ب')
    expect(getConflict()).toBeNull()
    await pushToSheets(snap('ب2'))
    expect((await fetchRemoteCopy())?.snapshot.accounts[0].name).toBe('ب2')
  })
})

describe('نسخ من إصدار قديم (بدون syncMeta)', () => {
  it('جهاز ما تزامن بالنظام الجديد يرفع فوقها عادي (أول ترقية)', async () => {
    await otherDeviceSaves('قديم', null)
    expect(getBaseRev()).toBeNull()
    await pushToSheets(snap('جديد'))
    expect((await fetchRemoteCopy())?.snapshot.accounts[0].name).toBe('جديد')
  })

  it('لكن لو الجهاز تزامن بالنظام الجديد، ثم جهاز بإصدار قديم كتب فوقه = تعارض', async () => {
    await pushToSheets(snap('جديد'))
    await otherDeviceSaves('من إصدار قديم', null)
    await expect(pushToSheets(snap('x'))).rejects.toBeInstanceOf(SyncConflictError)
    expect(getConflict()?.remote).toBeNull()
  })

  it('الجدول الفاضي ما يسبب تعارض حتى لو الجهاز عنده رقم نسخة', async () => {
    setBaseRev('old')
    await pushToSheets(snap('أ'))
    expect(pushes).toBe(1)
  })
})
