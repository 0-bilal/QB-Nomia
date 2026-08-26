/**
 * إعدادات مزامنة Google Sheets — تُحفظ في متصفح المستخدم فقط (localStorage)،
 * وليس بالكود المصدري: المستودع عام، وأي رمز يُكتب مباشرة بالكود يصير
 * مرئيًا لأي أحد يتصفح المستودع أو تاريخ الـ commits. الرابط والرمز
 * يُدخَلان مرة واحدة من "المزيد ← مزامنة Google Sheets" على كل جهاز.
 */

const URL_KEY = 'qbnomia.sync.webAppUrl'
const TOKEN_KEY = 'qbnomia.sync.secretToken'

export function getSheetsWebAppUrl(): string {
  return localStorage.getItem(URL_KEY) ?? ''
}

export function getSheetsSecretToken(): string {
  return localStorage.getItem(TOKEN_KEY) ?? ''
}

export function setSheetsSyncCredentials(url: string, token: string): void {
  localStorage.setItem(URL_KEY, url.trim())
  localStorage.setItem(TOKEN_KEY, token.trim())
}

export function clearSheetsSyncCredentials(): void {
  localStorage.removeItem(URL_KEY)
  localStorage.removeItem(TOKEN_KEY)
}

export function isSheetsSyncConfigured(): boolean {
  return getSheetsWebAppUrl().length > 0 && getSheetsSecretToken().length > 0
}
