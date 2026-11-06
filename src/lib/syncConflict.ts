/**
 * تعارض المزامنة بين جهازين: كل نسخة ترتفع لـ Google Sheets تحمل `syncMeta` (رقم نسخة + أي جهاز
 * ومتى) داخل البيانات المشفّرة. كل جهاز يتذكر آخر نسخة تزامن معها (baseRev). قبل أي رفع، لو
 * نسخة الجدول تغيّرت من جهاز ثاني، نوقف المزامنة ونسأل المستخدم بدل ما نكتب فوقها.
 */
import type { DataSnapshot } from '../state/DataContext'
import type { Transaction } from '../types'

export interface SyncMeta {
  rev: string
  parentRev: string | null
  deviceId: string
  deviceLabel: string
  savedAt: string
}

export interface SyncConflict {
  detectedAt: string
  /** معلومات نسخة الجدول وقت اكتشاف التعارض — null لو كانت من إصدار قديم بدون syncMeta. */
  remote: { savedAt: string; deviceLabel: string } | null
}

const BASE_REV_KEY = 'qbnomia.sync.baseRev'
const DEVICE_ID_KEY = 'qbnomia.sync.deviceId'
const CONFLICT_KEY = 'qbnomia.sync.conflict'
const LOCAL_EDITED_KEY = 'qbnomia.sync.localEditedAt'

/** رقم نسخة الجدول اللي ما فيها syncMeta (رفعها إصدار قديم من التطبيق). */
export const LEGACY_REV = 'legacy'

export class SyncConflictError extends Error {
  constructor() {
    super('نسخة Google Sheets تغيّرت من جهاز ثاني — المزامنة متوقفة لين تختار النسخة اللي تعتمدها')
    this.name = 'SyncConflictError'
  }
}

// ── آخر نسخة تزامن معها هذا الجهاز ──
export function getBaseRev(): string | null {
  return localStorage.getItem(BASE_REV_KEY)
}
export function setBaseRev(rev: string | null): void {
  if (rev) localStorage.setItem(BASE_REV_KEY, rev)
  else localStorage.removeItem(BASE_REV_KEY)
}

/**
 * هل الرفع الآن يكتب فوق تعديلات جهاز ثاني؟
 * - remoteRev = null: الجدول فاضي — آمن.
 * - LEGACY_REV: نسخة من إصدار قديم — آمن فقط لو هذا الجهاز ما تزامن قبل بالنظام الجديد.
 * - غير ذلك: آمن فقط لو هي نفس آخر نسخة تزامنّا معها.
 */
export function isConflict(remoteRev: string | null, baseRev: string | null): boolean {
  if (remoteRev === null) return false
  if (remoteRev === LEGACY_REV) return baseRev !== null
  return remoteRev !== baseRev
}

// ── الجهاز ──
export function getDeviceId(): string {
  let id = localStorage.getItem(DEVICE_ID_KEY)
  if (!id) {
    id = crypto.randomUUID()
    localStorage.setItem(DEVICE_ID_KEY, id)
  }
  return id
}

/** اسم مختصر للجهاز يظهر للمستخدم («آخر حفظ من أندرويد»). */
export function deviceLabel(ua: string = navigator.userAgent): string {
  if (/iPad/i.test(ua)) return 'آيباد'
  if (/iPhone|iPod/i.test(ua)) return 'آيفون'
  if (/Android/i.test(ua)) return 'أندرويد'
  if (/Macintosh|Mac OS X/i.test(ua)) return 'ماك'
  if (/Windows/i.test(ua)) return 'ويندوز'
  return 'متصفح'
}

export function newSyncMeta(parentRev: string | null, now = new Date()): SyncMeta {
  return { rev: crypto.randomUUID(), parentRev, deviceId: getDeviceId(), deviceLabel: deviceLabel(), savedAt: now.toISOString() }
}

// ── وقت آخر تعديل محلي (لبطاقة «هذا الجهاز») ──
export function markLocalEdited(now = new Date()): void {
  localStorage.setItem(LOCAL_EDITED_KEY, now.toISOString())
}
export function getLocalEditedAt(): string | null {
  return localStorage.getItem(LOCAL_EDITED_KEY)
}

// ── حالة التعارض (محفوظة + مشتركين) ──
type Listener = (conflict: SyncConflict | null) => void
const listeners = new Set<Listener>()

/** النص المحفوظ كما هو — لـ useSyncExternalStore (النصوص تتقارن بالقيمة، فما يعيد الرسم بلا داعي). */
export function getConflictRaw(): string | null {
  return localStorage.getItem(CONFLICT_KEY)
}

export function parseConflict(raw: string | null): SyncConflict | null {
  if (!raw) return null
  try {
    return JSON.parse(raw) as SyncConflict
  } catch {
    return null
  }
}

export function getConflict(): SyncConflict | null {
  return parseConflict(getConflictRaw())
}

export function setConflict(remoteMeta: SyncMeta | null, now = new Date()): void {
  const conflict: SyncConflict = {
    detectedAt: now.toISOString(),
    remote: remoteMeta ? { savedAt: remoteMeta.savedAt, deviceLabel: remoteMeta.deviceLabel } : null,
  }
  localStorage.setItem(CONFLICT_KEY, JSON.stringify(conflict))
  listeners.forEach((fn) => fn(conflict))
}

export function clearConflict(): void {
  if (localStorage.getItem(CONFLICT_KEY) === null) return
  localStorage.removeItem(CONFLICT_KEY)
  listeners.forEach((fn) => fn(null))
}

export function subscribeConflict(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

// ── مقارنة النسختين (لصفحة «وش راح ينمسح») ──
export interface DiffItem {
  id: string
  label: string
  date: string
  /** موجب للدخل، سالب للمصروف، والتحويل بدون إشارة (null). */
  amount: number
  sign: 1 | -1 | null
}

export interface ConflictDiff {
  /** حركات في هذا الجهاز ومو موجودة في الجدول — تنمسح لو اعتمدنا نسخة الجدول. */
  localOnly: DiffItem[]
  /** حركات في الجدول ومو موجودة في هذا الجهاز — تنمسح لو اعتمدنا نسخة هذا الجهاز. */
  remoteOnly: DiffItem[]
}

const TYPE_LABEL: Record<Transaction['type'], string> = { expense: 'مصروف', income: 'دخل', transfer: 'تحويل' }

function describe(t: Transaction, snap: Pick<DataSnapshot, 'categories' | 'incomeSources'>): DiffItem {
  const label =
    t.note?.trim() ||
    snap.categories.find((c) => c.id === t.categoryId)?.name ||
    snap.incomeSources.find((s) => s.id === t.incomeSourceId)?.name ||
    TYPE_LABEL[t.type]
  const sign = t.type === 'income' ? 1 : t.type === 'expense' ? -1 : null
  return { id: t.id, label, date: t.date, amount: t.amount, sign }
}

function onlyIn(a: DataSnapshot, b: DataSnapshot): DiffItem[] {
  const ids = new Set(b.transactions.map((t) => t.id))
  return a.transactions
    .filter((t) => !ids.has(t.id))
    .map((t) => describe(t, a))
    .sort((x, y) => (x.date < y.date ? 1 : x.date > y.date ? -1 : 0))
}

export function conflictDiff(local: DataSnapshot, remote: DataSnapshot): ConflictDiff {
  return { localOnly: onlyIn(local, remote), remoteOnly: onlyIn(remote, local) }
}

/** أي نسخة أحدث؟ null لو وقت أحدهما غير معروف. */
export function newerSide(localEditedAt: string | null, remoteSavedAt: string | null): 'local' | 'remote' | null {
  if (!localEditedAt || !remoteSavedAt) return null
  return localEditedAt > remoteSavedAt ? 'local' : 'remote'
}
