import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSnapshot } from '../state/DataContext'
import { setSheetsSyncCredentials } from '../config/sheetsSync'
import { deriveAuthKey, encryptJSON, payloadScheme } from './cryptoUtil'
import { SheetsProbeError, SyncAuthError, fetchRemoteCopy, hasPendingPush, markPendingPush, probeSheets, pullFromSheets, pushToSheets, storedCredsStillWork } from './sheetsSync'
import { getSyncScheme } from '../config/sheetsSync'
import { isTokenChanged } from './syncAuth'
import { SyncConflictError, getBaseRev, getConflict, setBaseRev, type SyncMeta } from './syncConflict'

const SCRIPT_URL = 'https://script.google.com/macros/s/fake/exec'
const TOKEN = 'secret-token'

/**
 * Apps Script وهمي بنفس سلوك Code.gs: الإصدار 1 (يعرف الرمز نفسه، السحب بـ GET) والإصدار 2
 * (يعرف مفتاح الدخول المشتق فقط، كل شيء بـ POST، وGET ما يرجّع بيانات).
 */
let stored = ''
let pushes = 0
let script: { version: 1 | 2; key: string } = { version: 1, key: TOKEN }
const requests: { method: string; url: string; body: string }[] = []

function fakeScript(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const reply = (obj: unknown) => Promise.resolve(new Response(JSON.stringify(obj), { status: 200 }))
  const method = init?.method ?? 'GET'
  requests.push({ method, url: String(input), body: String(init?.body ?? '') })
  if (method === 'GET') {
    const token = new URL(String(input)).searchParams.get('token')
    if (token !== script.key) return reply({ ok: false, error: 'Error: رمز الدخول غير صحيح' })
    return script.version === 1 ? reply({ ok: true, data: stored }) : reply({ ok: false, error: 'هذا السكربت (الإصدار 2) يستقبل الطلبات بـ POST' })
  }
  const body = JSON.parse(String(init!.body)) as { action: string; token: string; data: string }
  if (body.token !== script.key) return reply({ ok: false, error: 'Error: رمز الدخول غير صحيح' })
  if (body.action === 'pull' && script.version === 2) return reply({ ok: true, data: stored })
  if (body.action === 'push') {
    stored = body.data
    pushes++
    return reply({ ok: true })
  }
  return reply({ ok: false, error: 'إجراء غير معروف: ' + body.action })
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
  requests.length = 0
  script = { version: 1, key: TOKEN }
  setSheetsSyncCredentials(SCRIPT_URL, TOKEN)
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

describe('الصيغة v2: السكربت يعرف مفتاح دخول فقط', () => {
  beforeEach(async () => {
    script = { version: 2, key: await deriveAuthKey(TOKEN) }
  })

  it('يكشف الصيغة تلقائيًا ويحفظها، والرمز ما يطلع أبدًا (لا في رابط ولا في طلب)', async () => {
    await pushToSheets(snap('أ'))
    expect(getSyncScheme()).toBe('v2')
    expect(payloadScheme(stored)).toBe('v2')
    expect((await fetchRemoteCopy())?.snapshot.accounts[0].name).toBe('أ')
    for (const r of requests) {
      expect(r.url).not.toContain(TOKEN)
      expect(r.body).not.toContain(TOKEN)
      expect(r.url).not.toContain('token=')
    }
  })

  it('السكربت (بمفتاح الدخول وحده) ما يقدر يفك البيانات المخزّنة', async () => {
    await pushToSheets(snap('سري'))
    const { decryptJSON } = await import('./cryptoUtil')
    await expect(decryptJSON(script.key, stored)).rejects.toThrow()
  })

  it('probeSheets يكشف v2 للسكربت الجديد وv1 للقديم', async () => {
    expect((await probeSheets(SCRIPT_URL, TOKEN)).scheme).toBe('v2')
    script = { version: 1, key: TOKEN }
    expect((await probeSheets(SCRIPT_URL, TOKEN)).scheme).toBe('v1')
  })

  it('رمز غلط: probeSheets يرفض بمرحلة الرمز', async () => {
    await expect(probeSheets(SCRIPT_URL, 'wrong')).rejects.toMatchObject({ stage: 'token' })
  })
})

describe('تحديث الحماية (v1 ← v2) والأجهزة الثانية', () => {
  it('الترقية: الرفع بالبيانات الجديدة يحفظها فقط بعد النجاح، والبيانات صارت v2', async () => {
    await pushToSheets(snap('قبل'))
    expect(getSyncScheme()).toBe('v1')
    const NEW = 'NewToken-ABCDEFGH-12345678'
    script = { version: 2, key: await deriveAuthKey(NEW) } // المستخدم نشر الكود الجديد

    await pushToSheets(snap('بعد'), { force: true, creds: { url: SCRIPT_URL, token: NEW, scheme: 'v2' } })
    expect(getSyncScheme()).toBe('v2')
    expect(payloadScheme(stored)).toBe('v2')
    expect((await fetchRemoteCopy())?.snapshot.accounts[0].name).toBe('بعد')
  })

  it('لو فشل رفع الترقية، البيانات القديمة تبقى محفوظة كما هي', async () => {
    await pushToSheets(snap('قبل'))
    script = { version: 2, key: 'مفتاح-ما-يطابق' }
    await expect(pushToSheets(snap('x'), { force: true, creds: { url: SCRIPT_URL, token: 'NEW', scheme: 'v2' } })).rejects.toBeInstanceOf(SyncAuthError)
    expect(getSyncScheme()).toBe('v1')
  })

  it('جهاز ثاني بالرمز القديم: يرفض بـ SyncAuthError، يعلّم «الرمز تغيّر»، ويوقف بدون شبكة', async () => {
    await pushToSheets(snap('أ'))
    script = { version: 2, key: await deriveAuthKey('رمز-جديد-من-جهاز-ثاني') }
    markPendingPush()
    await expect(pushToSheets(snap('ب'))).rejects.toBeInstanceOf(SyncAuthError)
    expect(isTokenChanged()).toBe(true)
    vi.mocked(fetch).mockClear()
    await expect(pushToSheets(snap('ج'))).rejects.toBeInstanceOf(SyncAuthError)
    expect(fetch).not.toHaveBeenCalled()
  })
})

describe('تشخيص فشل تحديث الحماية', () => {
  const NEW = 'NewToken-ABCDEFGH-12345678'
  const probeReason = async () => {
    try {
      await probeSheets(SCRIPT_URL, NEW)
      return 'ok'
    } catch (err) {
      return err instanceof SheetsProbeError ? err.reason : 'other'
    }
  }

  it('النشر الجديد ما وصل الرابط: المفتاح الجديد مرفوض، والرمز القديم لسا مقبول', async () => {
    await pushToSheets(snap('أ')) // الجهاز على v1 بالرمز القديم، والسكربت لسا قديم
    expect(await probeReason()).toBe('auth')
    expect(await storedCredsStillWork()).toBe(true)
  })

  it('الكود المنشور من رمز ثاني: لا الجديد ولا القديم مقبول', async () => {
    await pushToSheets(snap('أ'))
    script = { version: 2, key: await deriveAuthKey('رمز-ثالث-ما-له-علاقة') }
    expect(await probeReason()).toBe('auth')
    expect(await storedCredsStillWork()).toBe(false)
  })

  it('الكود المنشور بدون مفتاح (القيمة الافتراضية): سبب placeholder', async () => {
    vi.mocked(fetch).mockImplementation(() =>
      Promise.resolve(new Response(JSON.stringify({ ok: false, error: 'Error: لازم تنسخ الكود من التطبيق (فيه AUTH_KEY) قبل الاستخدام' }))),
    )
    expect(await probeReason()).toBe('placeholder')
  })

  it('النشر صحيح: الاختبار ينجح بالصيغة الجديدة', async () => {
    await pushToSheets(snap('أ'))
    script = { version: 2, key: await deriveAuthKey(NEW) }
    expect((await probeSheets(SCRIPT_URL, NEW)).scheme).toBe('v2')
  })
})

