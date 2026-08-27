import type { DataSnapshot } from '../state/DataContext'
import { isSheetsSyncConfigured } from '../config/sheetsSync'
import { pullFromSheets, pushToSheets } from './sheetsSync'

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline'
export type SyncDirection = 'push' | 'pull'

type Listener = (status: SyncStatus, direction: SyncDirection) => void

const listeners = new Set<Listener>()
let debounceTimer: number | undefined
let idleTimer: number | undefined
let pullIdleTimer: number | undefined

function emit(status: SyncStatus, direction: SyncDirection): void {
  listeners.forEach((fn) => fn(status, direction))
}

export function subscribeSyncStatus(fn: Listener): () => void {
  listeners.add(fn)
  return () => listeners.delete(fn)
}

/**
 * يجدول رفعًا خلفيًا للبيانات الحالية بدون التأثير على واجهة المستخدم —
 * يُستدعى بعد أي تعديل على البيانات (DataContext). لا يفعل شيء إذا
 * المزامنة غير مُعدّة، ويتجنّب المحاولة أصلًا لو الجهاز غير متصل بالإنترنت
 * (بدل ما يفشل بخطأ شبكة كل مرة). التأخير البسيط يجمع التعديلات المتتالية
 * برفعة واحدة بدل رفعة لكل تغيير صغير.
 */
export function scheduleBackgroundSync(getSnapshot: () => DataSnapshot): void {
  if (!isSheetsSyncConfigured()) return

  if (debounceTimer) window.clearTimeout(debounceTimer)
  if (idleTimer) window.clearTimeout(idleTimer)

  debounceTimer = window.setTimeout(async () => {
    if (!navigator.onLine) {
      emit('offline', 'push')
      return
    }
    emit('syncing', 'push')
    try {
      await pushToSheets(getSnapshot())
      emit('success', 'push')
      idleTimer = window.setTimeout(() => emit('idle', 'push'), 1800)
    } catch {
      emit('error', 'push')
      idleTimer = window.setTimeout(() => emit('idle', 'push'), 3000)
    }
  }, 1200)
}

/**
 * يسحب أحدث نسخة من جوجل شيت بالخلفية بعد فتح القفل (تسجيل الدخول أو
 * إعداد أول رقم سري) بدل ما يحجب الدخول للتطبيق بشاشة تحميل منفصلة —
 * الدخول يصير فورًا، وحالة السحب تظهر كشريط عائم أعلى الشاشة (نفس شريط
 * حالة الرفع) بدون ما تعطّل أي شيء. onSnapshot يُستدعى فقط لو نجح السحب.
 */
export function runBackgroundPull(onSnapshot: (snapshot: DataSnapshot) => void): void {
  if (!isSheetsSyncConfigured()) return
  if (pullIdleTimer) window.clearTimeout(pullIdleTimer)

  if (!navigator.onLine) {
    emit('offline', 'pull')
    return
  }
  emit('syncing', 'pull')
  pullFromSheets()
    .then((snapshot) => {
      onSnapshot(snapshot)
      emit('success', 'pull')
      pullIdleTimer = window.setTimeout(() => emit('idle', 'pull'), 1800)
    })
    .catch(() => {
      emit('error', 'pull')
      pullIdleTimer = window.setTimeout(() => emit('idle', 'pull'), 3000)
    })
}
