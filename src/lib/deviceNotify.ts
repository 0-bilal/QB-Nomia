/**
 * إشعارات حقيقية على الجهاز (Web Notifications API) للتنبيهات الحرجة —
 * بدون خادم Push خلفي (التطبيق بلا Backend أصلًا)، فهي تُطلَق محليًا من
 * المتصفح/التطبيق نفسه وقت التشغيل (وقت فتح التطبيق تحديدًا)، مو
 * إشعارات تصل والتطبيق مقفول تمامًا — هذا أقصى ما يقدر عليه تطبيق
 * بلا خادم. تحتاج إذن المستخدم أولًا (requestPermission لازم يُستدعى
 * من نقرة مستخدم فعلية).
 */

const NOTIFIED_IDS_KEY = 'qbnomia.notifications.notifiedIds'

export function isNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window
}

export function notificationPermission(): NotificationPermission | 'unsupported' {
  if (!isNotificationSupported()) return 'unsupported'
  return Notification.permission
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!isNotificationSupported()) return 'denied'
  return Notification.requestPermission()
}

async function showDeviceNotification(title: string, body: string, tag: string): Promise<void> {
  if (!isNotificationSupported() || Notification.permission !== 'granted') return
  const icon = `${import.meta.env.BASE_URL}icon.svg`

  // navigator.serviceWorker.ready ما يُحلّ أبدًا لو ما فيه service worker مسجَّل
  // أصلًا (مثل وضع التطوير) — سباق مع مهلة زمنية يمنع التعليق الأبدي هنا.
  const shownViaServiceWorker = await Promise.race([
    (async () => {
      if (!('serviceWorker' in navigator)) return false
      try {
        const reg = await navigator.serviceWorker.ready
        await reg.showNotification(title, { body, tag, icon, badge: icon, dir: 'rtl', lang: 'ar' })
        return true
      } catch {
        return false
      }
    })(),
    new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1000)),
  ])
  if (shownViaServiceWorker) return

  try {
    // eslint-disable-next-line no-new
    new Notification(title, { body, tag, icon, dir: 'rtl', lang: 'ar' })
  } catch {
    // بعض المتصفحات (مثل الـ PWA المثبّت على iOS) تمنع new Notification() من
    // صفحة عادية وتتطلب service worker فعلًا — نتجاهل بصمت بدل ما نكسر التطبيق
  }
}

function getNotifiedIds(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(NOTIFIED_IDS_KEY) ?? '[]'))
  } catch {
    return new Set()
  }
}

function saveNotifiedIds(ids: Set<string>): void {
  try {
    localStorage.setItem(NOTIFIED_IDS_KEY, JSON.stringify([...ids]))
  } catch {
    // localStorage ممتلئ أو غير متاح — نتجاهل، مجرد سجل تكرار غير حرج
  }
}

/**
 * يرسل إشعار جهاز حقيقي لكل عنصر حرج جديد فقط — نفس العنصر بنفس تاريخ
 * الاستحقاق ما يتكرر إشعاره مرتين. لما تاريخ الاستحقاق يتغيّر (بعد
 * تجديد مثلًا) يصير العنصر مؤهّل لإشعار جديد تلقائيًا لأن معرّفه يتضمن
 * التاريخ.
 */
export async function notifyNewCriticalItems(items: { id: string; title: string; message: string }[]): Promise<void> {
  if (notificationPermission() !== 'granted' || items.length === 0) return
  const notified = getNotifiedIds()
  const fresh = items.filter((i) => !notified.has(i.id)).slice(0, 5)
  if (fresh.length === 0) return

  // نسجّل الأغراض كـ"تم إشعارها" فورًا وقبل أي await — لو الدالة اتنادت
  // مرتين متزامنتين (React StrictMode بوضع التطوير مثلًا يستدعي الـ effect
  // مرتين)، النداء الثاني يشوف نفس العناصر مُسجَّلة أصلًا بدل ما يرسل
  // إشعار جهاز مكرر لنفس التنبيه.
  fresh.forEach((item) => notified.add(item.id))
  saveNotifiedIds(notified)

  for (const item of fresh) {
    // eslint-disable-next-line no-await-in-loop
    await showDeviceNotification('QB-Nomia', `${item.title} — ${item.message}`, item.id)
  }
}
