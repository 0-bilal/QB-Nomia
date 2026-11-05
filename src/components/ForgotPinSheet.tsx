import { useState, type ReactNode } from 'react'
import { SheetHandle } from './SheetHandle'
import { HoldToConfirm } from './HoldToConfirm'
import { agoLabel, backupStatus, type BackupStatus } from '../lib/forgotPin'

function Icon({ d, size = 16, width = 1.9 }: { d: ReactNode; size?: number; width?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth={width} strokeLinecap="round" strokeLinejoin="round">
      {d}
    </svg>
  )
}

const WIPED_ITEMS: { label: string; icon: ReactNode }[] = [
  {
    label: 'حساباتك وحركاتك وكل بياناتك المالية',
    icon: <path d="M3 7a2 2 0 0 1 2-2h13v4M3 7v11a2 2 0 0 0 2 2h15V9H5a2 2 0 0 1-2-2zM16 14h.01" />,
  },
  { label: 'الرقم السري والبصمة', icon: <path d="M6.5 10h11a2.5 2.5 0 0 1 2.5 2.5v6a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 18.5v-6A2.5 2.5 0 0 1 6.5 10zM8 10V7a4 4 0 0 1 8 0v3" /> },
  { label: 'ربط المزامنة على هذا الجهاز', icon: <path d="M7 18a4.5 4.5 0 0 1-.6-8.96A6 6 0 0 1 18 8.5a4 4 0 0 1 0 9.5z" /> },
  {
    label: 'تفضيلاتك وإعداداتك',
    icon: <path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12M14 6a2 2 0 1 0 4 0 2 2 0 1 0-4 0M8 12a2 2 0 1 0 4 0 2 2 0 1 0-4 0M16 18a2 2 0 1 0 4 0 2 2 0 1 0-4 0" />,
  },
]

function BackupCard({ status }: { status: BackupStatus }) {
  const ok = status.kind === 'sheets'
  const color = ok ? 'var(--color-income)' : 'var(--color-subscription)'
  return (
    <div
      className="mt-2.5 flex items-start gap-2.5 rounded-[18px] px-3.5 py-3 text-[12.5px] leading-[1.7]"
      style={{ background: `color-mix(in srgb, ${color} 10%, transparent)`, border: `1px solid color-mix(in srgb, ${color} 30%, transparent)` }}
    >
      <span className="mt-0.5 flex-none" style={{ color }}>
        {ok ? (
          <Icon d={<path d="M5 13l4 4L19 7" />} size={18} width={2.2} />
        ) : (
          <Icon d={<><path d="M12 9v4M12 17h.01" /><path d="M10.3 3.9 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></>} size={18} width={2} />
        )}
      </span>
      <div>
        <div className="text-[13px] font-semibold">{ok ? 'نسختك محفوظة في Google Sheets' : 'ما فيه نسخة احتياطية على هذا الجهاز'}</div>
        <div className="text-[var(--color-text-2)]">
          {ok
            ? `${status.lastSyncedAt ? `آخر مزامنة ${agoLabel(status.lastSyncedAt)}. ` : ''}تقدر تستعيدها بعد المسح برابط السكربت والرمز السري.`
            : 'لو مسحت الحين، بياناتك تروح نهائيًا. لو عندك ملف نسخة احتياطية تقدر تستعيده بعدين.'}
        </div>
      </div>
    </div>
  )
}

function WipedScreen({ hadSheets }: { hadSheets: boolean }) {
  const base = import.meta.env.BASE_URL
  // إعادة تحميل كاملة حتى ما يبقى شيء من البيانات في ذاكرة التطبيق.
  const go = (path: string) => window.location.replace(base + path)
  return (
    <div dir="rtl" className="fixed inset-0 z-[70] flex flex-col items-center justify-center bg-[var(--color-bg)] px-7 text-center" style={{ animation: 'fade-in 300ms ease-out both' }}>
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-accent)] text-[var(--color-on-accent)]" style={{ animation: 'qb-pop 520ms var(--ease-spring) both' }}>
        <Icon d={<path d="M5 13l4 4L19 7" />} size={34} width={2.6} />
      </div>
      <div className="mt-5 text-[20px] font-semibold">انمسحت البيانات من الجهاز</div>
      <div className="mt-1.5 text-[13px] leading-[1.8] text-[var(--color-text-2)]">التطبيق الحين مثل أول مرة. ابدأ من الصفر، أو رجّع بياناتك من نسختك الاحتياطية.</div>
      <div className="mt-8 flex w-full flex-col gap-2.5">
        {hadSheets ? (
          <>
            <button type="button" onClick={() => go('restore')} className="qb-press h-[50px] rounded-[17px] bg-[var(--color-accent)] text-[14px] font-semibold text-[var(--color-on-accent)]">
              استعادة من Google Sheets
            </button>
            <button type="button" onClick={() => go('')} className="qb-press h-[50px] rounded-[17px] bg-white/[0.06] text-[14px] font-semibold">
              ابدأ من جديد
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => go('')} className="qb-press h-[50px] rounded-[17px] bg-[var(--color-accent)] text-[14px] font-semibold text-[var(--color-on-accent)]">
              ابدأ من جديد
            </button>
            <div className="mt-1 text-[12px] leading-[1.8] text-[var(--color-text-3)]">عندك ملف نسخة احتياطية؟ بعد ما تسوي رقم سري جديد، استورده من «المزيد ← المزامنة والنسخ الاحتياطي».</div>
          </>
        )}
      </div>
    </div>
  )
}

/**
 * «نسيت الرقم السري؟»: ورقة توضّح وش راح ينمسح وحالة النسخة الاحتياطية، والمسح بضغط مطوّل.
 * `onWipe` يمسح بيانات التطبيق من الجهاز، وبعدها تظهر شاشة «انمسحت البيانات».
 * تُركَّب فقط وقت الفتح، فحالة النسخة تُقرأ لحظتها (بعد المسح ما يبقى ربط نقرأه).
 */
export function ForgotPinSheet({ onClose, onWipe }: { onClose: () => void; onWipe: () => void }) {
  const [status] = useState<BackupStatus>(backupStatus)
  const [wiped, setWiped] = useState(false)

  if (wiped) return <WipedScreen hadSheets={status.kind === 'sheets'} />

  return (
    <div dir="rtl" className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" style={{ animation: 'fade-in 200ms ease-out both' }} onClick={onClose} aria-hidden="true" />
      <div
        className="relative w-full max-w-[480px] rounded-t-[32px] border-x border-t border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] px-5"
        style={{ animation: 'sheet-in 420ms var(--ease-out-expo) both' }}
      >
        <SheetHandle onDismiss={onClose} />
        <div className="text-[17px] font-semibold">نسيت الرقم السري؟</div>
        <div className="mt-1 text-[12.5px] leading-[1.7] text-[var(--color-text-2)]">
          ما نقدر نسترجع الرقم، لأنه محفوظ مشفّر على جهازك فقط. حتى ما يقدر أحد يتجاوز القفل، راح نمسح من هذا الجهاز:
        </div>
        <div className="mt-3.5 overflow-hidden rounded-[20px] border border-[var(--color-border)] bg-[var(--color-void)]">
          {WIPED_ITEMS.map(({ icon, label }, i) => (
            <div key={label} className={`flex items-center gap-2.5 px-3.5 py-2.5 text-[13px] ${i ? 'border-t border-[var(--color-border)]' : ''}`}>
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[11px] bg-white/[0.06] text-[var(--color-text-2)]">
                <Icon d={icon} />
              </span>
              {label}
            </div>
          ))}
        </div>
        <BackupCard status={status} />
        <HoldToConfirm
          label="اضغط مطوّلًا للمسح"
          color="var(--color-expense)"
          onConfirm={() => {
            onWipe()
            setWiped(true)
          }}
        />
        <div className="safe-bottom pb-6">
          <button type="button" onClick={onClose} className="mt-3 block w-full py-1.5 text-center text-[13px] font-semibold text-[var(--color-text-2)]">
            تذكّرته، رجّعني
          </button>
        </div>
      </div>
    </div>
  )
}
