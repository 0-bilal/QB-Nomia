import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { AppNotification } from '../state/DataContext'
import { isNotificationSupported, notificationPermission, requestNotificationPermission } from '../lib/deviceNotify'

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}
function BellIcon({ size = 20 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9a6 6 0 0 1 12 0c0 4 1.5 5.5 2 6.5H4c.5-1 2-2.5 2-6.5Z" />
      <path d="M10 19a2 2 0 0 0 4 0" />
    </svg>
  )
}
function SubscriptionIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="8,6 18,12 8,18" />
    </svg>
  )
}
function CommitmentIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="3" width="16" height="18" rx="2.5" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </svg>
  )
}
function BudgetIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3 2 20h20L12 3Z" />
      <line x1="12" y1="10" x2="12" y2="14.5" />
      <circle cx="12" cy="17" r="0.9" fill="currentColor" stroke="none" />
    </svg>
  )
}
function LoanIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="9" cy="8" r="3" />
      <path d="M3 19c0-3.3 2.7-5 6-5s6 1.7 6 5" />
      <circle cx="17" cy="9" r="2.3" />
      <path d="M15.3 14.2c2.5.4 4.2 1.9 4.2 4.8" />
    </svg>
  )
}
function RecurringIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 11A8 8 0 0 0 6.3 6.3L4 8.6" />
      <path d="M4 4v4.6h4.6" />
      <path d="M4 13a8 8 0 0 0 13.7 4.7L20 15.4" />
      <path d="M20 20v-4.6h-4.6" />
    </svg>
  )
}
function ZakatIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M8 7.5c0-1.4 1.8-2.5 4-2.5s4 1.1 4 2.5-1.8 2.5-4 2.5-4 1.1-4 2.5 1.8 2.5 4 2.5 4-1.1 4-2.5" />
    </svg>
  )
}
function BackupIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <ellipse cx="12" cy="6" rx="8" ry="3" />
      <path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6" />
      <path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" />
    </svg>
  )
}
function VehicleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 13.5 5 8a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 8l2 5.5" />
      <path d="M2.5 13.5h19v4a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1h-11v1a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-4Z" />
      <circle cx="7" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
      <circle cx="17" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
    </svg>
  )
}
function SalaryAdvanceIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="2.5" y="6" width="14" height="10" rx="2" />
      <circle cx="9.5" cy="11" r="2" />
      <path d="M19 8.5 22 11.5 19 14.5" />
      <path d="M22 11.5h-5" />
    </svg>
  )
}
function StoreDebtIcon() {
  return (
    <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3.5 9.5 4.5 4h15l1 5.5" />
      <path d="M3.5 9.5a2.3 2.3 0 0 0 4.6 0 2.3 2.3 0 0 0 4.6 0 2.3 2.3 0 0 0 4.6 0 2.3 2.3 0 0 0 4.6 0" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M10 20v-5.5h4V20" />
    </svg>
  )
}
function DeviceIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="7" y="2.5" width="10" height="19" rx="2.2" />
      <line x1="10.5" y1="18.2" x2="13.5" y2="18.2" />
    </svg>
  )
}
function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="5,13 10,18 19,6" />
    </svg>
  )
}

const KIND_ICON: Record<AppNotification['kind'], () => React.ReactElement> = {
  subscription: SubscriptionIcon,
  commitment: CommitmentIcon,
  budget: BudgetIcon,
  loan: LoanIcon,
  recurring: RecurringIcon,
  zakat: ZakatIcon,
  backup: BackupIcon,
  vehicle: VehicleIcon,
  'salary-advance': SalaryAdvanceIcon,
  'store-debt': StoreDebtIcon,
}

export function NotificationBellButton({ notifications, onClick }: { notifications: AppNotification[]; onClick: () => void }) {
  const hasCritical = notifications.some((n) => n.severity === 'critical')
  const hasAny = notifications.length > 0
  return (
    <button
      onClick={onClick}
      className="qb-glass-circle qb-press relative flex h-9.5 w-9.5 items-center justify-center rounded-full border text-[var(--color-text-2)]"
      style={{ width: 38, height: 38 }}
      aria-label="التنبيهات"
    >
      <BellIcon />
      {hasAny && (
        <span
          className="absolute flex h-2.5 w-2.5 items-center justify-center rounded-full"
          style={{ top: 7, left: 7, background: hasCritical ? 'var(--color-expense)' : 'var(--color-subscription)', boxShadow: '0 0 0 2px var(--color-surface)' }}
        />
      )}
    </button>
  )
}

export function NotificationsSheet({ open, notifications, onClose }: { open: boolean; notifications: AppNotification[]; onClose: () => void }) {
  const navigate = useNavigate()
  const [permission, setPermission] = useState(notificationPermission)

  if (!open) return null

  async function enableDeviceNotifications() {
    const result = await requestNotificationPermission()
    setPermission(result)
  }

  return (
    <div dir="rtl" className="fixed inset-0 z-[65] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" style={{ animation: 'fade-in 180ms ease-out both' }} onClick={onClose} aria-hidden="true" />
      <div
        className="relative flex max-h-[80vh] w-full max-w-[480px] flex-col rounded-t-[28px] border-x border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.85)]"
        style={{ animation: 'sheet-in 260ms cubic-bezier(0.16,1,0.3,1) both' }}
      >
        <div className="mx-auto mb-1 mt-2.5 h-1 w-9 flex-shrink-0 rounded-full bg-white/15" />

        <div className="flex flex-shrink-0 items-center justify-between px-5 py-3">
          <div className="text-[15px] font-bold">التنبيهات</div>
          <button
            onClick={onClose}
            aria-label="إغلاق"
            className="qb-press flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-2)]"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <CloseIcon />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-4 pb-2">
          {isNotificationSupported() && permission !== 'granted' && (
            <div className="qb-card mb-3 flex items-center gap-3 p-3.5">
              <div
                className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full"
                style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--color-accent)' }}
              >
                <DeviceIcon />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[12.5px] font-bold">تنبيهات الجهاز</div>
                <div className="text-[11px] text-[var(--color-text-3)]">
                  {permission === 'denied' ? 'موقوفة من إعدادات المتصفح — فعّلها يدويًا من هناك' : 'فعّلها عشان توصلك إشعارات حقيقية بالجهاز'}
                </div>
              </div>
              {permission !== 'denied' && (
                <button
                  onClick={enableDeviceNotifications}
                  className="qb-press flex-shrink-0 rounded-full px-3.5 py-1.75 text-[11.5px] font-bold"
                  style={{ background: 'var(--color-accent)', color: '#0A0A0C' }}
                >
                  تفعيل
                </button>
              )}
            </div>
          )}
          {isNotificationSupported() && permission === 'granted' && (
            <div className="mb-3 flex items-center gap-2 px-1 text-[11.5px] font-semibold" style={{ color: 'var(--color-income)' }}>
              <CheckIcon />
              تنبيهات الجهاز مفعّلة
            </div>
          )}

          {notifications.length === 0 ? (
            <div className="py-8 text-center text-[13px] text-[var(--color-text-3)]">لا توجد تنبيهات حاليًا — كل شيء تحت السيطرة</div>
          ) : (
            <div className="flex flex-col gap-2 pb-2">
              {notifications.map((n) => {
                const Icon = KIND_ICON[n.kind]
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      onClose()
                      navigate(n.to)
                    }}
                    className="qb-press flex w-full items-center gap-3 rounded-2xl border px-3.5 py-3 text-right"
                    style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                  >
                    <div
                      className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[12px]"
                      style={{ width: 40, height: 40, background: `${n.color}1f`, color: n.color }}
                    >
                      <Icon />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-bold">{n.title}</div>
                      <div className="truncate text-[11.5px]" style={{ color: n.color }}>
                        {n.message}
                      </div>
                    </div>
                    {n.severity === 'critical' && (
                      <div className="h-2 w-2 flex-shrink-0 rounded-full" style={{ background: 'var(--color-expense)' }} />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>
        <div className="safe-bottom flex-shrink-0" />
      </div>
    </div>
  )
}
