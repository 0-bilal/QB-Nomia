import type { DataSnapshot } from '../state/DataContext'
import { isSheetsSyncConfigured } from '../config/sheetsSync'
import { pushToSheets } from './sheetsSync'

export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline'

type Listener = (status: SyncStatus) => void

const listeners = new Set<Listener>()
let debounceTimer: number | undefined
let idleTimer: number | undefined

function emit(status: SyncStatus): void {
  listeners.forEach((fn) => fn(status))
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
      emit('offline')
      return
    }
    emit('syncing')
    try {
      await pushToSheets(getSnapshot())
      emit('success')
      idleTimer = window.setTimeout(() => emit('idle'), 1800)
    } catch {
      emit('error')
      idleTimer = window.setTimeout(() => emit('idle'), 3000)
    }
  }, 1200)
}
