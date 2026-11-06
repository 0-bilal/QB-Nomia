import type { DataSnapshot } from '../state/DataContext'
import { getSheetsSecretToken, getSheetsWebAppUrl, getSyncScheme, isSheetsSyncConfigured, setSheetsSyncCredentials, setSyncScheme } from '../config/sheetsSync'
import { decryptJSON, deriveAuthKey, encryptJSON, type SyncScheme } from './cryptoUtil'
import { AUTH_REJECTED, SyncAuthError, clearTokenChanged, isTokenChanged, setTokenChanged } from './syncAuth'
import {
  LEGACY_REV,
  SyncConflictError,
  clearConflict,
  getBaseRev,
  getConflict,
  isConflict,
  markLocalEdited,
  newSyncMeta,
  setBaseRev,
  setConflict,
  type SyncMeta,
} from './syncConflict'

const LAST_SYNC_KEY = 'qbnomia.sync.lastSyncedAt'
const PENDING_PUSH_KEY = 'qbnomia.sync.pendingPush'

/**
 * فيه تعديلات محلية ما انرفعت بعد (الرفع الخلفي فشل أو الجهاز كان بدون إنترنت).
 * السحب التلقائي بعد الدخول يتخطى السحب ويرفع أولًا وقتها، حتى ما تنمسح هذي التعديلات بنسخة أقدم.
 */
export function hasPendingPush(): boolean {
  return localStorage.getItem(PENDING_PUSH_KEY) === '1'
}

export function markPendingPush(): void {
  localStorage.setItem(PENDING_PUSH_KEY, '1')
  markLocalEdited()
}

export function getLastSyncedAt(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY)
}

/** بعد رفع ناجح أو سحب ناجح، الجهاز والجدول متطابقين — فما فيه شيء معلّق. */
function markSynced(): void {
  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
  localStorage.removeItem(PENDING_PUSH_KEY)
}

interface ApiResult<T> {
  ok: boolean
  data?: T
  error?: string
}

/** فشل الوصول للسكربت نفسه (شبكة، HTTP، رد مو JSON) — بعكس رفض السكربت للطلب. */
class ScriptUnreachableError extends Error {
  readonly kind: 'network' | 'http' | 'parse'
  constructor(kind: 'network' | 'http' | 'parse', message: string) {
    super(message)
    this.kind = kind
  }
}

export { isSheetsSyncConfigured }
export { SyncAuthError }

/** بيانات الاتصال: الرابط والرمز (اللي يحفظه المستخدم) والصيغة. */
export interface SyncCreds {
  url: string
  token: string
  scheme: SyncScheme
}

/**
 * طلب واحد للسكربت. v1: السحب بـ GET والرمز نفسه في الرابط (السكربت القديم).
 * v2: كل شيء بـ POST، والمُرسَل مفتاح الدخول المشتق — الرمز ومفتاح التشفير ما يطلعون من الجهاز.
 * Content-Type: text/plain يتجنّب preflight CORS اللي Apps Script ما يدعمه.
 */
async function callScript<T>(creds: SyncCreds, action: 'pull' | 'push', data?: string): Promise<ApiResult<T>> {
  const auth = creds.scheme === 'v2' ? await deriveAuthKey(creds.token) : creds.token
  const url = creds.url.trim()
  let res: Response
  try {
    res =
      creds.scheme === 'v1' && action === 'pull'
        ? await fetch(`${url}?action=pull&token=${encodeURIComponent(auth)}`, { method: 'GET' })
        : await fetch(url, { method: 'POST', headers: { 'Content-Type': 'text/plain;charset=utf-8' }, body: JSON.stringify({ action, token: auth, data }) })
  } catch {
    throw new ScriptUnreachableError('network', 'تعذّر الوصول للرابط — تأكد إن رابط Web App صحيح وإن السكربت منشور بصلاحية "Anyone"')
  }
  if (!res.ok) throw new ScriptUnreachableError('http', `فشل الاتصال (HTTP ${res.status})`)
  let json: ApiResult<T>
  try {
    json = (await res.json()) as ApiResult<T>
  } catch {
    throw new ScriptUnreachableError('parse', 'الرابط ما يرجّع رد السكربت — تأكد إن «Who has access» على Anyone')
  }
  if (!json.ok && json.error?.includes(AUTH_REJECTED)) throw new SyncAuthError()
  return json
}

/** يكشف صيغة السكربت المنشور: نجرّب v2 (POST بمفتاح الدخول)، ولو رفض نجرّب v1 (السكربت القديم). */
async function detectScheme(url: string, token: string): Promise<{ scheme: SyncScheme; json: ApiResult<string> }> {
  try {
    const json = await callScript<string>({ url, token, scheme: 'v2' }, 'pull')
    if (json.ok) return { scheme: 'v2', json }
    if (!json.error?.includes('إجراء غير معروف')) return { scheme: 'v2', json }
  } catch (err) {
    if (!(err instanceof SyncAuthError)) throw err
  }
  return { scheme: 'v1', json: await callScript<string>({ url, token, scheme: 'v1' }, 'pull') }
}

/** بيانات الاتصال المحفوظة على الجهاز — الصيغة تنكشف وتنحفظ أول مرة لو كانت غير معروفة (مستخدم قديم). */
async function storedCreds(): Promise<SyncCreds> {
  if (!isSheetsSyncConfigured()) throw new Error('لم يتم ربط حساب Google Sheets بعد')
  const url = getSheetsWebAppUrl()
  const token = getSheetsSecretToken()
  let scheme = getSyncScheme()
  if (!scheme) {
    scheme = (await detectScheme(url, token)).scheme
    setSyncScheme(scheme)
  }
  return { url, token, scheme }
}

/** يشغّل عملية بالبيانات المحفوظة: الرفض يعلّم «الرمز تغيّر»، والنجاح يمسحه. */
async function withStoredCreds<T>(fn: (creds: SyncCreds) => Promise<T>): Promise<T> {
  if (isTokenChanged()) throw new SyncAuthError()
  try {
    const result = await fn(await storedCreds())
    clearTokenChanged()
    return result
  } catch (err) {
    if (err instanceof SyncAuthError) setTokenChanged()
    throw err
  }
}

type RemotePayload = DataSnapshot & { syncMeta?: SyncMeta }

export interface RemoteCopy {
  snapshot: DataSnapshot
  /** null لو النسخة رفعها إصدار قديم بدون syncMeta. */
  meta: SyncMeta | null
}

async function readRemote(creds: SyncCreds): Promise<RemoteCopy | null> {
  const json = await callScript<string>(creds, 'pull')
  if (!json.ok) throw new Error(json.error ?? 'استجابة غير متوقعة من الخادم')
  if (!json.data) return null
  const { syncMeta, ...snapshot } = await decryptJSON<RemotePayload>(creds.token, json.data)
  return { snapshot: snapshot as DataSnapshot, meta: syncMeta ?? null }
}

/** يقرأ نسخة الجدول ويفك تشفيرها بدون أي أثر على حالة المزامنة المحلية. null لو الجدول فاضي. */
export async function fetchRemoteCopy(): Promise<RemoteCopy | null> {
  return withStoredCreds(readRemote)
}

/** يسحب البيانات من الجدول ويفكّ تشفيرها — الجدول نفسه لا يخزّن سوى نص مشفّر. السحب يعني اعتماد نسخة الجدول، فتصير هي نقطة المزامنة. */
export async function pullFromSheets(): Promise<DataSnapshot> {
  const remote = await fetchRemoteCopy()
  if (!remote) throw new Error('استجابة غير متوقعة من الخادم')
  setBaseRev(remote.meta?.rev ?? null)
  clearConflict()
  markSynced()
  return remote.snapshot
}

async function writeRemote(creds: SyncCreds, snapshot: DataSnapshot, force: boolean): Promise<string> {
  if (!force) {
    if (getConflict()) throw new SyncConflictError()
    const remote = await readRemote(creds)
    const remoteRev = remote ? (remote.meta?.rev ?? LEGACY_REV) : null
    if (isConflict(remoteRev, getBaseRev())) {
      setConflict(remote?.meta ?? null)
      throw new SyncConflictError()
    }
  }
  const meta = newSyncMeta(getBaseRev())
  const payload: RemotePayload = { ...snapshot, syncMeta: meta }
  const json = await callScript<null>(creds, 'push', await encryptJSON(creds.token, payload, creds.scheme))
  if (!json.ok) {
    // سكربت قديم يخزّن كل شيء بخلية واحدة، وجوجل شيت يرفض الخلية فوق 50,000 حرف
    if (json.error?.includes('50000')) {
      throw new Error('حجم بياناتك تجاوز حد الخلية الواحدة في Google Sheets — حدّث كود Apps Script لآخر نسخة (google-apps-script/Code.gs) وانشره كنسخة جديدة')
    }
    throw new Error(json.error ?? 'استجابة غير متوقعة من الخادم')
  }
  return meta.rev
}

/**
 * يشفّر البيانات محليًا قبل إرسالها — جوجل شيت يخزّن النص المشفّر فقط.
 * قبل الرفع يتأكد إن نسخة الجدول ما تغيّرت من جهاز ثاني منذ آخر مزامنة؛ لو تغيّرت يرمي
 * SyncConflictError ويعلّم التعارض بدل ما يكتب فوقها. `force` = المستخدم قرر يعتمد نسخة هذا الجهاز.
 * `creds` = بيانات اتصال جديدة (تحديث الحماية): تنحفظ على الجهاز فقط بعد نجاح الرفع.
 */
export async function pushToSheets(snapshot: DataSnapshot, { force = false, creds }: { force?: boolean; creds?: SyncCreds } = {}): Promise<void> {
  if (creds) {
    const rev = await writeRemote(creds, snapshot, force)
    setSheetsSyncCredentials(creds.url, creds.token, creds.scheme)
    clearTokenChanged()
    setBaseRev(rev)
  } else {
    setBaseRev(await withStoredCreds((c) => writeRemote(c, snapshot, force)))
  }
  clearConflict()
  markSynced()
}

/** يحفظ بيانات اتصال أدخلها المستخدم (إعداد، استعادة، رمز جديد) ويرجّع المزامنة لو كانت موقوفة بسبب الرمز. */
export function saveSyncCredentials(url: string, token: string, scheme?: SyncScheme): void {
  setSheetsSyncCredentials(url, token, scheme)
  clearTokenChanged()
}

/** صيغة المزامنة المحفوظة على هذا الجهاز (null = لسا ما انكشفت). */
export function currentSyncScheme(): SyncScheme | null {
  return getSyncScheme()
}

export type ProbeStage = 'reach' | 'token'

export class SheetsProbeError extends Error {
  readonly stage: ProbeStage
  constructor(stage: ProbeStage, message: string) {
    super(message)
    this.stage = stage
  }
}

/**
 * يجرّب رابطًا ورمزًا قبل حفظهما (معالج الإعداد، الاستعادة، تغيّر الرمز): يصل للسكربت ثم يتأكد
 * إنه يقبل الرمز، ويكشف صيغته. يرجّع هل فيه نسخة محفوظة مسبقًا. الخطأ يحدد أي مرحلة فشلت.
 */
export async function probeSheets(webAppUrl: string, secretToken: string): Promise<{ hasData: boolean; scheme: SyncScheme }> {
  let detected: { scheme: SyncScheme; json: ApiResult<string> }
  try {
    detected = await detectScheme(webAppUrl.trim(), secretToken)
  } catch (err) {
    if (err instanceof SyncAuthError) throw new SheetsProbeError('token', 'الرمز ما يطابق الكود المنشور. انسخ الكود من التطبيق مرة ثانية وانشر نسخة جديدة')
    if (err instanceof ScriptUnreachableError) {
      if (err.kind === 'network') throw new SheetsProbeError('reach', 'ما قدرنا نوصل للسكربت. تأكد إنك نشرته بـ «Who has access: Anyone» ونسخت رابط /exec')
      if (err.kind === 'parse') throw new SheetsProbeError('reach', 'الرابط ما يرجّع رد السكربت. غالبًا السكربت يطلب تسجيل دخول: خلّ «Who has access» على Anyone')
      throw new SheetsProbeError('reach', `السكربت ما رد (${err.message}). تأكد من النشر كـ Web app`)
    }
    throw err
  }
  const { json, scheme } = detected
  if (!json.ok) {
    const err = json.error ?? ''
    if (err.includes('AUTH_KEY') || err.includes('SECRET_TOKEN')) throw new SheetsProbeError('token', 'الكود المنشور ما فيه مفتاحك. انسخ الكود من التطبيق مرة ثانية وانشر نسخة جديدة')
    throw new SheetsProbeError('token', err || 'رد غير متوقع من السكربت')
  }
  return { hasData: Boolean(json.data), scheme }
}
