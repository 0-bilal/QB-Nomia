import type { DataSnapshot } from '../state/DataContext'
import { isSheetsSyncConfigured } from '../config/sheetsSync'
import { hasPendingPush, markPendingPush, pullFromSheets, pushToSheets } from './sheetsSync'
import { SyncConflictError, getConflict } from './syncConflict'

/** conflict = نسخة الجدول تغيّرت من جهاز ثاني — المزامنة متوقفة لين يختار المستخدم (SyncConflictSheet). */
export type SyncStatus = 'idle' | 'syncing' | 'success' | 'error' | 'offline' | 'conflict'
export type SyncDirection = 'push' | 'pull'

/** `manual` = بدأها المستخدم بنفسه (زر المزامنة) — الرفع الخلفي الناجح يبقى صامتًا، أما اليدوي فيُؤكَّد له. */
type Listener = (status: SyncStatus, direction: SyncDirection, manual: boolean) => void

const listeners = new Set<Listener>()
let debounceTimer: number | undefined
let idleTimer: number | undefined
let pullIdleTimer: number | undefined

function emit(status: SyncStatus, direction: SyncDirection, manual = false): void {
  listeners.forEach((fn) => fn(status, direction, manual))
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
  // يُعلَّم فورًا (قبل التأخير) — لو انقفل التطبيق قبل الرفع، التعديل يبقى محسوب كمعلّق.
  markPendingPush()

  if (debounceTimer) window.clearTimeout(debounceTimer)
  if (idleTimer) window.clearTimeout(idleTimer)

  debounceTimer = window.setTimeout(async () => {
    // تعارض معروف: المزامنة متوقفة بصمت (البطاقة بالرئيسية تذكّر) — التعديل يبقى معلّق لين الحل.
    if (getConflict()) return
    if (!navigator.onLine) {
      emit('offline', 'push')
      return
    }
    emit('syncing', 'push')
    try {
      await pushToSheets(getSnapshot())
      emit('success', 'push')
      idleTimer = window.setTimeout(() => emit('idle', 'push'), 1800)
    } catch (err) {
      emit(err instanceof SyncConflictError ? 'conflict' : 'error', 'push')
      idleTimer = window.setTimeout(() => emit('idle', 'push'), 3000)
    }
  }, 1200)
}

/**
 * يسحب أحدث نسخة من جوجل شيت بالخلفية بعد فتح القفل (تسجيل الدخول أو
 * إعداد أول رقم سري) بدل ما يحجب الدخول للتطبيق بشاشة تحميل منفصلة —
 * الدخول يصير فورًا، وحالة السحب تظهر كشريط عائم أعلى الشاشة (نفس شريط
 * حالة الرفع) بدون ما تعطّل أي شيء. onSnapshot يُستدعى فقط لو نجح السحب.
 *
 * لو فيه تعديلات محلية ما انرفعت بعد، نرفعها بدل السحب — السحب كان راح يستبدلها بنسخة الجدول الأقدم.
 */
export function runBackgroundPull(onSnapshot: (snapshot: DataSnapshot) => void, getSnapshot: () => DataSnapshot): void {
  if (!isSheetsSyncConfigured()) return
  if (pullIdleTimer) window.clearTimeout(pullIdleTimer)

  // تعارض لسا ما انحل: نذكّر عند الدخول بدون رفع ولا سحب.
  if (getConflict()) {
    emit('conflict', 'push')
    return
  }
  if (!navigator.onLine) {
    emit('offline', hasPendingPush() ? 'push' : 'pull')
    return
  }
  if (hasPendingPush()) {
    // pushToSheets يتأكد قبل الرفع إن الجدول ما تغيّر من جهاز ثاني — لو تغيّر يصير تعارض.
    emit('syncing', 'push')
    pushToSheets(getSnapshot())
      .then(() => {
        emit('success', 'push')
        pullIdleTimer = window.setTimeout(() => emit('idle', 'push'), 1800)
      })
      .catch((err) => {
        emit(err instanceof SyncConflictError ? 'conflict' : 'error', 'push')
        pullIdleTimer = window.setTimeout(() => emit('idle', 'push'), 3000)
      })
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

/**
 * مزامنة فورية يدوية (زر المزامنة بالرئيسية): ترفع البيانات الحالية الآن بدل انتظار الرفع الخلفي،
 * وتُظهر نتيجتها بالكبسولة الذكية (IslandHost). الرفع فقط — السحب يستبدل البيانات المحلية فيبقى من شاشة المزامنة.
 */
export async function syncNow(snapshot: DataSnapshot): Promise<boolean> {
  if (!isSheetsSyncConfigured()) return false
  if (debounceTimer) window.clearTimeout(debounceTimer)
  if (idleTimer) window.clearTimeout(idleTimer)
  if (getConflict()) {
    emit('conflict', 'push', true)
    return false
  }
  if (!navigator.onLine) {
    emit('offline', 'push', true)
    idleTimer = window.setTimeout(() => emit('idle', 'push', true), 3000)
    return false
  }
  emit('syncing', 'push', true)
  try {
    await pushToSheets(snapshot)
    emit('success', 'push', true)
    idleTimer = window.setTimeout(() => emit('idle', 'push', true), 1800)
    return true
  } catch (err) {
    emit(err instanceof SyncConflictError ? 'conflict' : 'error', 'push', true)
    idleTimer = window.setTimeout(() => emit('idle', 'push', true), 3000)
    return false
  }
}
