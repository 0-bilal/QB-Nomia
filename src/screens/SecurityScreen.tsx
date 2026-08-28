import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { BiometricToggleRow } from '../components/BiometricToggleRow'
import { ToggleRow } from '../components/ToggleRow'
import { getHideBalancesDefault, setHideBalancesDefault } from '../lib/privacy'

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
      <div className="qb-section-label mb-2 px-1">الدخول للتطبيق</div>
      <button onClick={() => navigate('/security/change-pin')} className="qb-card qb-press mb-3.5 flex w-full items-center gap-3 p-4 text-right">
        <div
          className="flex h-9.5 w-9.5 flex-shrink-0 items-center justify-center rounded-[12px]"
          style={{ width: 38, height: 38, background: 'rgba(255,255,255,0.1)', color: 'var(--color-accent)' }}
        >
          <KeyIcon />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[13.5px] font-bold">تغيير الرقم السري</div>
          <div className="text-[11px] text-[var(--color-text-3)]">يتطلّب إدخال رقمك السري الحالي أولًا</div>
        </div>
        <div className="flex-shrink-0 text-[var(--color-text-3)]">
          <ChevronIcon />
        </div>
      </button>

      <BiometricToggleRow />

      <div className="qb-section-label mb-2 mt-2 px-1">الخصوصية</div>
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
