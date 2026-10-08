import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { isSheetsSyncConfigured } from '../config/sheetsSync'
import { subscribeSyncStatus, syncNow, type SyncStatus } from '../lib/autoSync'
import { haptic } from '../lib/haptics'

/**
 * زر مزامنة سريعة برأس الرئيسية: يرفع البيانات فورًا لـ Google Sheets، وأيقونته تعكس الحالة
 * (تدور أثناء الرفع، علامة صح عند النجاح، تنبيه أحمر عند الفشل). لو المزامنة غير مربوطة يفتح شاشة الإعداد.
 */
export function QuickSyncButton() {
  const navigate = useNavigate()
  const { exportSnapshot } = useData()
  const [status, setStatus] = useState<SyncStatus>('idle')

  useEffect(() => subscribeSyncStatus((s, direction) => direction === 'push' && setStatus(s)), [])

  async function onClick() {
    if (!isSheetsSyncConfigured()) {
      navigate('/sync-settings')
      return
    }
    if (status === 'syncing') return
    haptic('tick')
    const ok = await syncNow(exportSnapshot())
    haptic(ok ? 'success' : 'tick')
  }

  const color = status === 'success' ? 'var(--color-income)' : status === 'error' || status === 'offline' ? 'var(--color-expense)' : 'var(--color-text)'
  const label = status === 'syncing' ? 'جارٍ المزامنة' : status === 'success' ? 'تمت المزامنة' : status === 'error' ? 'فشلت المزامنة' : status === 'offline' ? 'لا يوجد اتصال' : 'مزامنة الآن'

  return (
    <button onClick={onClick} aria-label={label} title={label} className="qb-glass-circle qb-press flex items-center justify-center rounded-full border" style={{ width: 40, height: 40, color }}>
      {status === 'success' ? (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 12.5 10 17l9-10" />
        </svg>
      ) : status === 'error' || status === 'offline' ? (
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.4-1.8A4 4 0 0 0 6.5 16" />
          <path d="M12 12v3.5M12 18h.01" />
        </svg>
      ) : (
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={status === 'syncing' ? { animation: 'spin 900ms linear infinite' } : undefined}
        >
          <path d="M20 11a8 8 0 0 0-14.9-3M4 4v4h4" />
          <path d="M4 13a8 8 0 0 0 14.9 3M20 20v-4h-4" />
        </svg>
      )}
    </button>
  )
}
