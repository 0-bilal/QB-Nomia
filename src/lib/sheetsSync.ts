import type { DataSnapshot } from '../state/DataContext'

const URL_KEY = 'qbnomia.sync.url'
const TOKEN_KEY = 'qbnomia.sync.token'
const LAST_SYNC_KEY = 'qbnomia.sync.lastSyncedAt'

export function getSyncConfig(): { url: string; token: string } {
  return {
    url: localStorage.getItem(URL_KEY) ?? '',
    token: localStorage.getItem(TOKEN_KEY) ?? '',
  }
}

export function saveSyncConfig(url: string, token: string): void {
  localStorage.setItem(URL_KEY, url.trim())
  localStorage.setItem(TOKEN_KEY, token.trim())
}

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

export async function pullFromSheets(): Promise<DataSnapshot> {
  const { url, token } = getSyncConfig()
  if (!url || !token) throw new Error('لم يتم إعداد رابط المزامنة بعد')

  const endpoint = `${url}?action=pull&token=${encodeURIComponent(token)}`
  const res = await fetchSafe(endpoint, { method: 'GET' })
  if (!res.ok) throw new Error(`فشل الاتصال (HTTP ${res.status})`)

  const json = (await res.json()) as ApiResult<DataSnapshot>
  if (!json.ok || !json.data) throw new Error(json.error ?? 'استجابة غير متوقعة من الخادم')
  markSynced()
  return json.data
}

export async function pushToSheets(snapshot: DataSnapshot): Promise<void> {
  const { url, token } = getSyncConfig()
  if (!url || !token) throw new Error('لم يتم إعداد رابط المزامنة بعد')

  // Content-Type: text/plain يتجنّب preflight CORS اللي Apps Script ما يدعمه
  const res = await fetchSafe(url, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action: 'push', token, data: snapshot }),
  })
  if (!res.ok) throw new Error(`فشل الاتصال (HTTP ${res.status})`)

  const json = (await res.json()) as ApiResult<null>
  if (!json.ok) throw new Error(json.error ?? 'استجابة غير متوقعة من الخادم')
  markSynced()
}
