import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { BiometricToggleRow } from '../components/BiometricToggleRow'
import { ToggleRow } from '../components/ToggleRow'
import { getHideBalancesDefault, setHideBalancesDefault } from '../lib/privacy'
import { Badge, HeroCard } from '../components/ui'
import { isBiometricEnabled } from '../lib/biometric'

function KeyIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="8" cy="15" r="4" />
      <path d="M11 12 20 3M17 6l3 3M14 9l2.5 2.5" />
    </svg>
  )
}
function EyeOffIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3l18 18" />
      <path d="M10.6 5.2A10.4 10.4 0 0 1 12 5c5 0 9 4 10 7-0.4 1.2-1.2 2.6-2.4 3.9M6.5 6.6C4.4 8 2.9 10 2 12c1 3 5 7 10 7 1.4 0 2.7-.3 3.9-.8" />
      <path d="M9.5 10a3 3 0 0 0 4.2 4.2" />
    </svg>
  )
}
function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15,6 9,12 15,18" />
    </svg>
  )
}

export function SecurityScreen() {
  const navigate = useNavigate()
  const [hideDefault, setHideDefault] = useState(getHideBalancesDefault)

  function toggleHideDefault() {
    const next = !hideDefault
    setHideDefault(next)
    setHideBalancesDefault(next)
  }

  return (
    <ScreenScroll header={<ScreenHeader title="الأمان والخصوصية" onBack={() => navigate(-1)} className="pt-8 pb-6" />}>
      <HeroCard className="mb-6">
        <div className="flex flex-col items-center py-2 text-center">
          <div className="relative mb-4 flex items-center justify-center">
            <span className="absolute h-20 w-20 rounded-full border border-[var(--color-accent-line)]" style={{ animation: 'qb-ring 2.4s var(--ease-out-expo) infinite' }} />
            <div className="flex h-20 w-20 items-center justify-center rounded-full" style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)', boxShadow: '0 0 50px -8px rgba(255,255,255,0.3)' }}>
              <svg viewBox="0 0 24 24" width="34" height="34" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3 19 6v6c0 4.5-3 7.5-7 9-4-1.5-7-4.5-7-9V6l7-3Z" />
                <path d="M9.3 12 11 13.7 15 9.5" />
              </svg>
            </div>
          </div>
          <div className="text-[18px] font-semibold">بياناتك محمية</div>
          <div className="mt-1 text-[12px] text-[var(--color-text-3)]">مخزّنة على جهازك ومشفّرة قبل أي مزامنة</div>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Badge color="var(--color-accent)">رقم سري</Badge>
            {isBiometricEnabled() && <Badge color="var(--color-accent)">بصمة</Badge>}
            {hideDefault && <Badge color="var(--color-accent)">أرصدة مخفية</Badge>}
          </div>
        </div>
      </HeroCard>

      <div className="qb-section-title mb-3 px-1">الدخول للتطبيق</div>
      <button onClick={() => navigate('/security/change-pin')} className="qb-card qb-press mb-3.5 flex w-full items-center gap-3 p-4 text-right">
        <div
          className="flex h-9.5 w-9.5 flex-shrink-0 items-center justify-center rounded-full"
          style={{ width: 38, height: 38, background: 'var(--color-accent-soft)', color: 'var(--color-accent)' }}
        >
          <KeyIcon />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[14px] font-medium">تغيير الرقم السري</div>
          <div className="text-[11px] text-[var(--color-text-3)]">يتطلّب إدخال رقمك السري الحالي أولًا</div>
        </div>
        <div className="flex-shrink-0 text-[var(--color-text-3)]">
          <ChevronIcon />
        </div>
      </button>

      <BiometricToggleRow />

      <div className="qb-section-title mb-3 mt-4 px-1">الخصوصية</div>
      <ToggleRow
        icon={<EyeOffIcon />}
        label="إخفاء الأرصدة افتراضيًا"
        desc="أرصدة الحسابات وأرقامها تظهر بعلامات (*) عند فتح التطبيق، وتكشفها مؤقتًا بزر العين بالرئيسية والحسابات"
        enabled={hideDefault}
        onToggle={toggleHideDefault}
      />
    </ScreenScroll>
  )
}
