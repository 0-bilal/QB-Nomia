/**
 * تراجع سريع بعد الحذف — toast عائم بزر "تراجع" لمدة محدودة بعد أي حذف،
 * بدل تأكيد الحذف النهائي فقط. بلا Context عشان يشتغل من أي شاشة بدون
 * تعقيد تمرير props، بنفس نمط autoSync.ts (pub/sub بسيط).
 *
 * onUndo يستلم بيانات التطبيق الحالية (من UndoToastHost وقت الضغط) بدل ما يعتمد على
 * دوال مأخوذة وقت الحذف: دوال DataContext مغلقة على حالة لحظة رسمها، فاستدعاء نسخة
 * قديمة منها كان يعيد بناء القائمة من لقطة ما قبل الحذف (تكرار العنصر + رصيد خاطئ).
 */
import type { useData } from '../state/DataContext'

export type UndoData = ReturnType<typeof useData>

export interface UndoToastState {
  id: number
  message: string
  onUndo: (data: UndoData) => void
}

type Listener = (state: UndoToastState | null) => void

let current: UndoToastState | null = null
let timer: ReturnType<typeof setTimeout> | null = null
let nextId = 0
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((l) => l(current))
}

export function showUndoToast(message: string, onUndo: (data: UndoData) => void, durationMs = 6000): void {
  if (timer) clearTimeout(timer)
  const id = ++nextId
  current = { id, message, onUndo }
  notify()
  timer = setTimeout(() => {
    if (current?.id === id) dismissUndoToast()
  }, durationMs)
}

export function dismissUndoToast(): void {
  current = null
  if (timer) {
    clearTimeout(timer)
    timer = null
  }
  notify()
}

export function triggerUndo(data: UndoData): void {
  const state = current
  if (!state) return
  dismissUndoToast()
  state.onUndo(data)
}

export function subscribeUndoToast(listener: Listener): () => void {
  listeners.add(listener)
  listener(current)
  return () => listeners.delete(listener)
}
