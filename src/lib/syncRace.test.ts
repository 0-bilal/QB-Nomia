/**
 * سباقات المزامنة على نفس الجهاز: Apps Script بطيء (ثانية أو ثانيتين لكل طلب)، فطلبين ممكن يتداخلون
 * — مثل السحب التلقائي بعد الدخول مع رفع حركة سجّلها المستخدم مباشرة بعده.
 *
 * السكربت الوهمي هنا يقرأ/يكتب لحظة وصول الطلب (مثل الحقيقي)، لكن ما يرد إلا لما الاختبار يفتح
 * «بوابته» — فنتحكم بترتيب الردود ونختار أسوأ ترتيب ممكن، بدل الاعتماد على توقيت.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSnapshot } from '../state/DataContext'
import { setSheetsSyncCredentials } from '../config/sheetsSync'
import { decryptJSON, deriveAuthKey, encryptJSON } from './cryptoUtil'
import { markPendingPush, pushToSheets } from './sheetsSync'
import { runBackgroundPull } from './autoSync'
import { getConflict, setBaseRev } from './syncConflict'

const SCRIPT_URL = 'https://script.google.com/macros/s/fake/exec'
const TOKEN = 'Race-Token-ABCDEFGH-12345678'
let key = ''
let stored = ''

type Gate = { kind: 'pull' | 'push'; seq: number; open: () => void }
let gates: Gate[] = []
let seq = 0

function gatedScript(_input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const body = JSON.parse(String(init!.body)) as { action: string; token: string; data: string }
  const respond = (obj: unknown) => new Response(JSON.stringify(obj), { status: 200 })
  if (body.token !== key) return Promise.resolve(respond({ ok: false, error: 'Error: رمز الدخول غير صحيح' }))
  let result: unknown
  if (body.action === 'pull') result = { ok: true, data: stored }
  else {
    stored = body.data // السكربت يكتب لحظة وصول الطلب، والرد يتأخر
    result = { ok: true }
  }
  const kind = body.action === 'pull' ? 'pull' : 'push'
  return new Promise((resolve) => gates.push({ kind, seq: seq++, open: () => resolve(respond(result)) }))
}

const settle = () => new Promise((r) => setTimeout(r, 15))

/** يفتح البوابات وحدة وحدة بأسوأ ترتيب: `pick` يختار أي طلب معلّق يرد أول. */
async function drive(until: () => boolean, pick: (pending: Gate[]) => Gate) {
  for (let i = 0; i < 60; i++) {
    await settle()
    if (gates.length === 0) {
      if (until()) return
      continue
    }
    const g = pick(gates)
    gates = gates.filter((x) => x !== g)
    g.open()
  }
  throw new Error('ما خلصت الطلبات')
}
const pullLast = (p: Gate[]) => p.find((g) => g.kind !== 'pull') ?? p[0]
const newestFirst = (p: Gate[]) => p.reduce((a, b) => (b.seq > a.seq ? b : a))

const snap = (txIds: string[]): DataSnapshot =>
  ({
    accounts: [{ id: 'a1', name: 'كاش', type: 'cash', balance: 0 }],
    people: [],
    loanTransactions: [],
    categories: [],
    incomeSources: [],
    subscriptions: [],
    transactions: txIds.map((id) => ({ id, type: 'expense', amount: 1, date: '2026-11-09', accountId: 'a1' })),
  }) as unknown as DataSnapshot

const remoteIds = async () => (await decryptJSON<DataSnapshot>(TOKEN, stored)).transactions.map((t) => t.id)

/** الجهاز «الآن»: بياناته المحلية كما يشوفها DataContext. */
let local: DataSnapshot

beforeEach(async () => {
  key = await deriveAuthKey(TOKEN)
  gates = []
  seq = 0
  setSheetsSyncCredentials(SCRIPT_URL, TOKEN, 'v2')
  // الجدول والجهاز متزامنين على النسخة R0
  stored = await encryptJSON(TOKEN, { ...snap(['t0']), syncMeta: { rev: 'R0', parentRev: null, deviceId: 'd', deviceLabel: 'أندرويد', savedAt: '2026-11-09T08:00:00Z' } }, 'v2')
  setBaseRev('R0')
  local = snap(['t0'])
  vi.stubGlobal('fetch', vi.fn(gatedScript))
})
afterEach(() => vi.unstubAllGlobals())

/** المستخدم سجّل حركة: نفس اللي يسويه DataContext (يعلّم معلّق ثم يرفع). */
function userAddsTransaction(id: string): { done: boolean; error: unknown } {
  local = snap([...local.transactions.map((t) => t.id), id])
  markPendingPush()
  const state = { done: false, error: null as unknown }
  pushToSheets(local).then(
    () => (state.done = true),
    (err) => ((state.error = err), (state.done = true)),
  )
  return state
}

describe('سحب الدخول + حركة جديدة بنفس الوقت', () => {
  it('ما يمسح الحركة اللي سجّلها المستخدم أثناء السحب، والجدول يوصله', async () => {
    runBackgroundPull((s) => (local = s), () => local) // سحب الدخول بدأ
    await settle()
    const add = userAddsTransaction('t1') // حركة قبل ما يرجع السحب
    await drive(() => add.done, pullLast) // أسوأ ترتيب: السحب يرد آخر شي
    await drive(() => true, pullLast)
    expect(add.error).toBeNull()
    expect(local.transactions.map((t) => t.id)).toEqual(['t0', 't1'])
    expect(await remoteIds()).toEqual(['t0', 't1'])
  })

  it('السحب المتأخر ما يرجّع رقم نسخة قديم: الحركة اللي بعدها ما تصير «نسختين مختلفتين»', async () => {
    runBackgroundPull((s) => (local = s), () => local)
    await settle()
    const first = userAddsTransaction('t1')
    await drive(() => first.done, pullLast)
    await drive(() => true, pullLast) // أي طلب باقي (السحب المتأخر)
    const second = userAddsTransaction('t2')
    await drive(() => second.done, pullLast)
    expect(second.error).toBeNull()
    expect(getConflict()).toBeNull()
    expect(await remoteIds()).toEqual(['t0', 't1', 't2'])
  })
})

describe('حركة أثناء السحب + جهاز ثاني غيّر الجدول', () => {
  it('تعارض حقيقي: ما ينمسح شي من الطرفين، والمستخدم يختار', async () => {
    // جهاز ثاني رفع قبل الدخول
    stored = await encryptJSON(TOKEN, { ...snap(['t0', 'x9']), syncMeta: { rev: 'OTHER', parentRev: 'R0', deviceId: 'b', deviceLabel: 'آيفون', savedAt: '2026-11-09T09:00:00Z' } }, 'v2')
    runBackgroundPull((s) => (local = s), () => local)
    await settle()
    const add = userAddsTransaction('t1')
    await drive(() => add.done, pullLast)
    expect(getConflict()?.remote?.deviceLabel).toBe('آيفون')
    expect(local.transactions.map((t) => t.id)).toEqual(['t0', 't1']) // حركة المستخدم باقية
    expect(await remoteIds()).toEqual(['t0', 'x9']) // ونسخة الجهاز الثاني ما انكتب فوقها
  })
})

describe('رفعين بنفس الوقت من نفس الجهاز', () => {
  it('الرفع الثاني ما يعتبر رفع الأول «جهاز ثاني»', async () => {
    const first = userAddsTransaction('t1')
    await settle()
    // الأول: قراءة الجدول ردّت، وبعدها كتب في الجدول، ورده لسا ما وصل
    gates.shift()!.open()
    await settle()
    const second = userAddsTransaction('t2')
    await drive(() => first.done && second.done, newestFirst) // أسوأ ترتيب: الأحدث يرد أول
    expect(first.error).toBeNull()
    expect(second.error).toBeNull()
    expect(getConflict()).toBeNull()
    expect(await remoteIds()).toEqual(['t0', 't1', 't2'])
  })
})
