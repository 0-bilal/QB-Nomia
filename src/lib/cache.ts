/** يلغي تسجيل كل Service Worker ويمسح كل الكاش (Cache Storage) — يجبر المتصفح يجيب أحدث نسخة من الأكواد عند إعادة التحميل التالية. */
export async function forceAppUpdate(): Promise<void> {
  if ('serviceWorker' in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations()
    await Promise.all(registrations.map((r) => r.unregister()))
  }
  if ('caches' in window) {
    const keys = await caches.keys()
    await Promise.all(keys.map((key) => caches.delete(key)))
  }
}
