/**
 * إعدادات مزامنة Google Sheets — تُحفظ في متصفح المستخدم فقط (localStorage)،
 * وليس بالكود المصدري: المستودع عام، وأي رمز يُكتب مباشرة بالكود يصير
 * مرئيًا لأي أحد يتصفح المستودع أو تاريخ الـ commits. الرابط والرمز
 * يُدخَلان مرة واحدة من "المزيد ← مزامنة Google Sheets" على كل جهاز.
 *
 * الصيغة (scheme): v1 = السكربت يعرف الرمز نفسه (قديم)، v2 = السكربت يعرف مفتاح دخول مشتق
 * فقط ومفتاح التشفير يبقى على الجهاز. غير محفوظة = تنكشف تلقائيًا أول مزامنة (lib/sheetsSync).
 */
import type { SyncScheme } from '../lib/cryptoUtil'

const URL_KEY = 'qbnomia.sync.webAppUrl'
const TOKEN_KEY = 'qbnomia.sync.secretToken'
const SCHEME_KEY = 'qbnomia.sync.scheme'

export function getSheetsWebAppUrl(): string {
  return localStorage.getItem(URL_KEY) ?? ''
}

export function getSheetsSecretToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ''
}

export function getSyncScheme(): SyncScheme | null {
  const v = localStorage.getItem(SCHEME_KEY)
  return v === 'v1' || v === 'v2' ? v : null
}

export function setSyncScheme(scheme: SyncScheme): void {
  localStorage.setItem(SCHEME_KEY, scheme)
}

/** `scheme` لو معروف (بعد اختبار الاتصال)؛ بدونه تنكشف الصيغة أول مزامنة. */
export function setSheetsSyncCredentials(url: string, token: string, scheme?: SyncScheme): void {
  localStorage.setItem(URL_KEY, url.trim())
  localStorage.setItem(TOKEN_KEY, token.trim())
  if (scheme) localStorage.setItem(SCHEME_KEY, scheme)
  else localStorage.removeItem(SCHEME_KEY)
}

export function clearSheetsSyncCredentials(): void {
  localStorage.removeItem(URL_KEY)
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(SCHEME_KEY)
}

export function isSheetsSyncConfigured(): boolean {
  return getSheetsWebAppUrl().length > 0 && getSheetsSecretToken().length > 0
}
