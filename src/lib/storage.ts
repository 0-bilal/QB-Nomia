import { notify } from './notify'

export function loadJSON<T>(key: string, fallback: T): T {
  const raw = localStorage.getItem(key)
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

/** يحفظ القيمة — ولو فشل الحفظ (مساحة التخزين ممتلئة مثلًا) ينبّه المستخدم بدل ما يضيع التعديل بصمت. */
export function saveJSON<T>(key: string, value: T): boolean {
  try {
    localStorage.setItem(key, JSON.stringify(value))
    return true
  } catch {
    notify('error', 'تعذّر حفظ التعديل على الجهاز. مساحة التخزين ممتلئة')
    return false
  }
}

const APP_KEY_PREFIX = 'qbnomia.'

/**
 * يمسح كل بيانات التطبيق المحفوظة على هذا الجهاز (الحسابات، الحركات، الرقم السري، ربط المزامنة،
 * التفضيلات) — يُستخدم عند «نسيت الرقم السري» حتى ما يقدر أحد يتجاوز القفل ويشوف البيانات.
 */
export function clearAppStorage(): void {
  for (const store of [localStorage, sessionStorage]) {
    const keys: string[] = []
    for (let i = 0; i < store.length; i++) {
      const key = store.key(i)
      if (key?.startsWith(APP_KEY_PREFIX)) keys.push(key)
    }
    keys.forEach((key) => store.removeItem(key))
  }
}
