/**
 * «رمز المزامنة تغيّر»: السكربت رفض الرمز المحفوظ على هذا الجهاز — غالبًا لأن جهاز ثاني حدّث
 * حماية المزامنة برمز جديد. المزامنة تتوقف بصمت لين يدخّل المستخدم الرمز الجديد (SyncSettings).
 */
const TOKEN_CHANGED_KEY = 'qbnomia.sync.tokenChanged'

export class SyncAuthError extends Error {
  constructor() {
    super('رمز المزامنة ما عاد يطابق السكربت — غالبًا تغيّر من جهاز ثاني. أدخل الرمز الجديد من «المزامنة»')
    this.name = 'SyncAuthError'
  }
}

/** نص خطأ السكربت لما الرمز/مفتاح الدخول غلط (Code.gs → checkToken). */
export const AUTH_REJECTED = 'رمز الدخول غير صحيح'

type Listener = () => void
const listeners = new Set<Listener>()

export function getTokenChangedRaw(): string | null {
  return localStorage.getItem(TOKEN_CHANGED_KEY)
}
export function isTokenChanged(): boolean {
  return getTokenChangedRaw() === '1'
}
export function setTokenChanged(): void {
  if (isTokenChanged()) return
  localStorage.setItem(TOKEN_CHANGED_KEY, '1')
  listeners.forEach((fn) => fn())
}
export function clearTokenChanged(): void {
  if (!isTokenChanged()) return
  localStorage.removeItem(TOKEN_CHANGED_KEY)
  listeners.forEach((fn) => fn())
}
export function subscribeTokenChanged(fn: Listener): () => void {
  listeners.add(fn)
  return () => {
    listeners.delete(fn)
  }
}
