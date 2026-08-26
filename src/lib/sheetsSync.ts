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
  if (!json.ok) throw new Error(json.error ?? 'استجابة غير متوقعة من الخادم')
  markSynced()
}
