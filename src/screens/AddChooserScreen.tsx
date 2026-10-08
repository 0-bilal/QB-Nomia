import type { CSSProperties, ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'

interface ChooserOption {
  label: string
  sub: string
  color: string
  to: string
  icon: ReactNode
}

const OPTIONS: ChooserOption[] = [
  {
    label: 'مصروف',
    sub: 'دفعت لشيء',
    color: 'var(--color-expense)',
    to: '/add/transaction?type=expense',
    icon: <path d="M7 7l10 10M17 9v8H9" />,
  },
  {
    label: 'دخل',
    sub: 'استلمت مبلغًا',
    color: 'var(--color-income)',
    to: '/add/transaction?type=income',
    icon: <path d="M17 17 7 7M7 15V7h8" />,
  },
  {
    label: 'تحويل',
    sub: 'بين حساباتك',
    color: 'var(--color-transfer)',
    to: '/add/transaction?type=transfer',
    icon: <path d="M16 3l4 4-4 4M20 7H8M8 21l-4-4 4-4M4 17h12" />,
  },
  {
    label: 'سلفة',
    sub: 'أعطِ أو استلم من شخص',
    color: 'var(--color-owed-to)',
    to: '/loans',
    icon: (
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3 19c0-3.3 2.7-5 6-5s6 1.7 6 5" />
        <circle cx="17" cy="9" r="2.3" />
        <path d="M15.3 14.2c2.5.4 4.2 1.9 4.2 4.8" />
      </>
    ),
  },
]

/** شاشة اختيار نوع الحركة (اختصار تطبيق الشاشة الرئيسية "إضافة") — نفس أهداف إيماءة السحب من زر + بالشريط السفلي. */
export function AddChooserScreen() {
  const navigate = useNavigate()

  return (
    <ScreenScroll header={<ScreenHeader title="إضافة حركة" onBack={() => navigate(-1)} cancelLabel="إلغاء" className="pt-8 pb-6" />}>
      <div className="mb-5 px-1 text-[13px] text-[var(--color-text-2)]">وش نوع الحركة اللي تبي تسجّلها؟</div>
      <div className="grid grid-cols-2 gap-3">
        {OPTIONS.map((o, i) => (
          <button
            key={o.label}
            onClick={() => navigate(o.to)}
            className="qb-press qb-rise flex aspect-[1/1.05] flex-col justify-between rounded-[28px] border p-4 text-right"
            style={
              {
                '--i': i,
                borderColor: `color-mix(in srgb, ${o.color} 28%, transparent)`,
                background: `radial-gradient(120% 120% at 100% 0%, color-mix(in srgb, ${o.color} 24%, transparent), transparent 60%), var(--color-surface)`,
              } as CSSProperties
            }
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-full" style={{ background: o.color, color: '#0a0a0c' }}>
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                {o.icon}
              </svg>
            </span>
            <span>
              <span className="block text-[18px] font-semibold">{o.label}</span>
              <span className="block text-[12px] text-[var(--color-text-3)]">{o.sub}</span>
            </span>
          </button>
        ))}
      </div>
      <div className="mt-6 text-center text-[11.5px] text-[var(--color-text-3)]">تلميح: اسحب من زر + بالشريط السفلي مباشرة للاختصار</div>
    </ScreenScroll>
  )
}
