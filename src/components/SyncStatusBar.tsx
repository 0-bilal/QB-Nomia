import { useEffect, useState } from 'react'
import { subscribeSyncStatus, type SyncStatus } from '../lib/autoSync'

function WifiOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 8.5c2.6-2.2 6-3.5 10-3.5s7.4 1.3 10 3.5" opacity="0.35" />
      <path d="M5.5 12.5a11 11 0 0 1 13 0" opacity="0.55" />
      <path d="M9 16.3a5.5 5.5 0 0 1 6 0" />
      <circle cx="12" cy="19.3" r="1.1" fill="currentColor" stroke="none" />
      <line x1="3" y1="3" x2="21" y2="21" />
    </svg>
  )
}

function CloudCheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.4-1.8A4 4 0 0 0 6.5 19" />
      <polyline points="9,13.5 11.2,16 15.5,11" />
    </svg>
  )
}

function CloudWarnIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17.5 19a4.5 4.5 0 0 0 0-9 6 6 0 0 0-11.4-1.8A4 4 0 0 0 6.5 19" />
      <line x1="12" y1="10.5" x2="12" y2="14" />
      <circle cx="12" cy="16.7" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}

/**
 * شريط حالة عائم أعلى الشاشة — يخبر المستخدم بحالة المزامنة الخلفية
 * (رفع/نجاح/فشل) وحالة الاتصال بالإنترنت، بدون ما يعطّل أي شاشة أو
 * يحجب أي زر. يظهر فوق كل الشاشات لأنه مُركَّب مرة واحدة بأعلى الشجرة.
 */
export function SyncStatusBar() {
  const [status, setStatus] = useState<SyncStatus>('idle')
  const [online, setOnline] = useState(() => navigator.onLine)

  useEffect(() => subscribeSyncStatus(setStatus), [])

  useEffect(() => {
    function goOnline() {
      setOnline(true)
    }
    function goOffline() {
      setOnline(false)
    }
    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
    }
  }, [])

  if (!online) {
    return (
      <div dir="rtl" className="safe-top fixed inset-x-0 top-0 z-[80] flex justify-center px-3 pt-2">
        <div
          className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-[0_6px_18px_-6px_rgba(0,0,0,0.6)]"
          style={{ background: 'var(--color-surface-elevated)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}
        >
          <WifiOffIcon />
          غير متصل — التطبيق يعمل بدون إنترنت وبياناتك محفوظة على جهازك
        </div>
      </div>
    )
  }

  if (status === 'idle') return null

  return (
    <div dir="rtl" className="pointer-events-none fixed inset-x-0 top-0 z-[80]">
      {status === 'syncing' && (
        <div className="h-[2.5px] w-full overflow-hidden bg-transparent">
          <div
            className="h-full w-1/3 rounded-full"
            style={{ background: 'linear-gradient(90deg, transparent, var(--color-accent), transparent)', animation: 'indeterminate 1.1s ease-in-out infinite' }}
          />
        </div>
      )}

      <div className="safe-top flex justify-center px-3 pt-2">
        {status === 'syncing' && (
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-[0_6px_18px_-6px_rgba(0,0,0,0.6)]"
            style={{ background: 'var(--color-surface-elevated)', color: 'var(--color-text-2)', border: '1px solid var(--color-border)' }}
          >
            <div
              className="h-3 w-3 flex-shrink-0 rounded-full border-2"
              style={{ borderColor: 'var(--color-border)', borderTopColor: 'var(--color-accent)', animation: 'spin 700ms linear infinite' }}
            />
            جارٍ حفظ نسخة احتياطية...
          </div>
        )}

        {status === 'success' && (
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-[0_6px_18px_-6px_rgba(0,0,0,0.6)]"
            style={{ animation: 'fade-in 150ms ease-out both', background: 'rgba(255,255,255,0.14)', color: 'var(--color-accent)', border: '1px solid rgba(255,255,255,0.3)' }}
          >
            <CloudCheckIcon />
            تم الحفظ الاحتياطي
          </div>
        )}

        {status === 'error' && (
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11px] font-semibold shadow-[0_6px_18px_-6px_rgba(0,0,0,0.6)]"
            style={{ animation: 'fade-in 150ms ease-out both', background: 'rgba(245,185,66,0.14)', color: 'var(--color-subscription)', border: '1px solid rgba(245,185,66,0.3)' }}
          >
            <CloudWarnIcon />
            تعذّر الحفظ الاحتياطي — هيُعاد لاحقًا
          </div>
        )}
      </div>
    </div>
  )
}
