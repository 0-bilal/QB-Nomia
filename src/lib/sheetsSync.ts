import type { DataSnapshot } from '../state/DataContext'
import { getSheetsSecretToken, getSheetsWebAppUrl, isSheetsSyncConfigured } from '../config/sheetsSync'
import { decryptJSON, encryptJSON } from './cryptoUtil'

const LAST_SYNC_KEY = 'qbnomia.sync.lastSyncedAt'

export function getLastSyncedAt(): string | null {
  return localStorage.getItem(LAST_SYNC_KEY)
}

function markSynced(): void {
  localStorage.setItem(LAST_SYNC_KEY, new Date().toISOString())
}

interface ApiResult<T> {
  ok: boolean
  data?: T
  error?: string
}

async function fetchSafe(input: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(input, init)
  } catch {
    throw new Error('تعذّر الوصول للرابط — تأكد إن رابط Web App صحيح وإن السكربت منشور بصلاحية "Anyone"')
  }
}

export { isSheetsSyncConfigured }

/** يسحب البيانات من الجدول ويفكّ تشفيرها — الجدول نفسه لا يخزّن سوى نص مشفّر. */
export async function pullFromSheets(): Promise<DataSnapshot> {
  if (!isSheetsSyncConfigured()) throw new Error('لم يتم ربط حساب Google Sheets بعد')
  const webAppUrl = getSheetsWebAppUrl()
  const secretToken = getSheetsSecretToken()

  const endpoint = `${webAppUrl}?action=pull&token=${encodeURIComponent(secretToken)}`
  const res = await fetchSafe(endpoint, { method: 'GET' })
  if (!res.ok) throw new Error(`فشل الاتصال (HTTP ${res.status})`)

  const json = (await res.json()) as ApiResult<string>
  if (!json.ok || !json.data) throw new Error(json.error ?? 'استجابة غير متوقعة من الخادم')

  const snapshot = await decryptJSON<DataSnapshot>(secretToken, json.data)
  markSynced()
  return snapshot
}

/** يشفّر البيانات محليًا قبل إرسالها — جوجل شيت يخزّن النص المشفّر فقط. */
export async function pushToSheets(snapshot: DataSnapshot): Promise<void> {
  if (!isSheetsSyncConfigured()) throw new Error('لم يتم ربط حساب Google Sheets بعد')
  const webAppUrl = getSheetsWebAppUrl()
  const secretToken = getSheetsSecretToken()

  const ciphertext = await encryptJSON(secretToken, snapshot)

  // Content-Type: text/plain يتجنّب preflight CORS اللي Apps Script ما يدعمه
  const res = await fetchSafe(webAppUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'push', token: secretToken, data: ciphertext }),
  })
  if (!res.ok) throw new Error(`فشل الاتصال (HTTP ${res.status})`)

  const json = (await res.json()) as ApiResult<null>
  if (!json.ok) {
    // سكربت قديم يخزّن كل شيء بخلية واحدة، وجوجل شيت يرفض الخلية فوق 50,000 حرف
    if (json.error?.includes('50000')) {
      throw new Error('حجم بياناتك تجاوز حد الخلية الواحدة في Google Sheets — حدّث كود Apps Script لآخر نسخة (google-apps-script/Code.gs) وانشره كنسخة جديدة')
    }
    throw new Error(json.error ?? 'استجابة غير متوقعة من الخادم')
  }
  markSynced()
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
 * يجرّب رابطًا ورمزًا قبل حفظهما (معالج الإعداد): يصل للسكربت ثم يتأكد إنه
 * يقبل الرمز. يرجّع هل فيه نسخة محفوظة مسبقًا. الخطأ يحدد أي مرحلة فشلت.
 */
export async function probeSheets(webAppUrl: string, secretToken: string): Promise<{ hasData: boolean }> {
  let res: Response
  try {
    res = await fetch(`${webAppUrl.trim()}?action=pull&token=${encodeURIComponent(secretToken)}`, { method: 'GET' })
  } catch {
    throw new SheetsProbeError('reach', 'ما قدرنا نوصل للسكربت. تأكد إنك نشرته بـ «Who has access: Anyone» ونسخت رابط /exec')
  }
  if (!res.ok) throw new SheetsProbeError('reach', `السكربت ما رد (HTTP ${res.status}). تأكد من النشر كـ Web app`)
  let json: ApiResult<string>
  try {
    json = (await res.json()) as ApiResult<string>
  } catch {
    throw new SheetsProbeError('reach', 'الرابط ما يرجّع رد السكربت. غالبًا السكربت يطلب تسجيل دخول: خلّ «Who has access» على Anyone')
  }
  if (!json.ok) {
    const err = json.error ?? ''
    if (err.includes('SECRET_TOKEN')) throw new SheetsProbeError('token', 'الكود المنشور ما فيه رمزك. انسخ الكود من الخطوة 3 مرة ثانية وانشر نسخة جديدة')
    if (err.includes('رمز')) throw new SheetsProbeError('token', 'الرمز ما يطابق الكود المنشور. انسخ الكود من الخطوة 3 مرة ثانية وانشر نسخة جديدة')
    throw new SheetsProbeError('token', err || 'رد غير متوقع من السكربت')
  }
  return { hasData: Boolean(json.data) }
}
