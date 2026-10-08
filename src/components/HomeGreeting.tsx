import type { ReactNode } from 'react'
import { AppLogoMark } from './AppLogo'
import { ProfileAvatar } from './ProfileAvatar'
import { formatAmount } from '../lib/format'
import { ageLabel, dayPart, g, greetingText, type Occasion, type UserProfile } from '../lib/profile'

const svg = { viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }
const SunIcon = () => (
  <svg {...svg} width={13} height={13}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
)
const MoonIcon = () => (
  <svg {...svg} width={13} height={13}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5Z" />
  </svg>
)
const SunsetIcon = () => (
  <svg {...svg} width={13} height={13}>
    <path d="M3 18h18M7 18a5 5 0 0 1 10 0M12 4v4M5.6 8.6l1.4 1.4M18.4 8.6 17 10" />
  </svg>
)
const GiftIcon = () => (
  <svg {...svg} width={17} height={17}>
    <rect x="3" y="9" width="18" height="12" rx="2" />
    <path d="M3 13h18M12 9v12M12 9c-2-4-6-4-6-1.5S9 9 12 9c3 0 6 0 6-1.5S14 5 12 9Z" />
  </svg>
)
const MosqueIcon = () => (
  <svg {...svg} width={17} height={17}>
    <path d="M12 3c2 2 4 3 4 6H8c0-3 2-4 4-6ZM5 21V12h14v9M9 21v-4a3 3 0 0 1 6 0v4M3 21h18" />
  </svg>
)
const CoinsIcon = () => (
  <svg {...svg} width={17} height={17}>
    <ellipse cx="9" cy="7" rx="6" ry="3" />
    <path d="M3 7v5c0 1.7 2.7 3 6 3s6-1.3 6-3V7" />
    <path d="M15 11.5c3.3 0 6 1.3 6 3v4c0 1.7-2.7 3-6 3-2 0-3.8-.5-4.9-1.3" />
  </svg>
)
const WaveIcon = () => (
  <svg {...svg} width={17} height={17}>
    <path d="M7 11V6.5a1.5 1.5 0 0 1 3 0V11M10 10V4.5a1.5 1.5 0 0 1 3 0V10M13 10V5.5a1.5 1.5 0 0 1 3 0V12M7 11a1.5 1.5 0 0 0-3 0v2a8 8 0 0 0 8 8h1a7 7 0 0 0 7-7v-4a1.5 1.5 0 0 0-3 0" />
  </svg>
)

function TimeIcon({ hour }: { hour: number }) {
  const part = dayPart(hour)
  if (part === 'night') return <MoonIcon />
  if (part === 'evening') return <SunsetIcon />
  return <SunIcon />
}

/** ترحيب الرئيسية: الصورة + "مساء الخير، بلال" + سطر اليوم. */
export function HomeGreeting({ profile, hour, subline, onAvatar }: { profile: UserProfile | null; hour: number; subline: string; onAvatar: () => void }) {
  return (
    <div className="flex items-center gap-2.5">
      <button onClick={onAvatar} className="qb-press flex-shrink-0 rounded-full" aria-label={profile ? 'الملف الشخصي' : 'أضف معلوماتك'}>
        {profile ? <ProfileAvatar profile={profile} size={40} /> : <AppLogoMark size={38} round />}
      </button>
      <div className="min-w-0 leading-tight">
        <div className="truncate text-[17px] font-bold">{greetingText(hour, profile)}</div>
        <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-[var(--color-text-2)]">
          <span className="flex flex-shrink-0 text-[var(--color-subscription)]">
            <TimeIcon hour={hour} />
          </span>
          <span className="truncate">{subline}</span>
        </div>
      </div>
    </div>
  )
}

function OccasionBox({ color, icon, title, desc, onClick }: { color: string; icon: ReactNode; title: string; desc: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="qb-press flex w-full items-center gap-2.5 rounded-[18px] border px-3.5 py-3 text-right"
      style={{
        background: `linear-gradient(135deg, color-mix(in srgb, ${color} 16%, transparent), color-mix(in srgb, ${color} 4%, transparent))`,
        borderColor: `color-mix(in srgb, ${color} 30%, transparent)`,
      }}
    >
      <span className="flex h-[34px] w-[34px] flex-shrink-0 items-center justify-center rounded-xl" style={{ background: `color-mix(in srgb, ${color} 20%, transparent)`, color }}>
        {icon}
      </span>
      <span className="min-w-0">
        <span className="block text-[12.5px] font-semibold">{title}</span>
        <span className="mt-0.5 block text-[11px] text-[var(--color-text-2)]">{desc}</span>
      </span>
    </button>
  )
}

/** بطاقة المناسبة تحت الترحيب: عيد الميلاد، يوم الراتب، الرجوع بعد غياب، الجمعة. */
export function OccasionCard({
  occasion,
  profile,
  monthBudgetLeft,
  mask,
  onOpen,
}: {
  occasion: Occasion
  profile: UserProfile | null
  monthBudgetLeft: number | null
  mask: (v: string) => string
  onOpen: (to: string) => void
}) {
  const name = profile?.name.trim() ?? ''
  const you = name ? ` يا ${name}` : ''
  switch (occasion.kind) {
    case 'birthday':
      return (
        <OccasionBox
          color="var(--color-subscription)"
          icon={<GiftIcon />}
          title={`كل عام و${g(profile, 'أنت', 'أنتِ')} بخير${you}`}
          desc={occasion.age !== null ? `${g(profile, 'تمّيت', 'تمّيتِ')} ${ageLabel(occasion.age)} اليوم — نتمنى لك سنة مليانة توفير` : 'سنة سعيدة مليانة توفير'}
          onClick={() => onOpen('/profile')}
        />
      )
    case 'salary':
      return (
        <OccasionBox
          color="var(--color-commitment)"
          icon={<CoinsIcon />}
          title={`نزل راتبك${you}`}
          desc={`${g(profile, 'وزّعه', 'وزّعيه')} على أهدافك قبل المصاريف`}
          onClick={() => onOpen('/goals')}
        />
      )
    case 'away':
      return (
        <OccasionBox
          color="var(--color-transfer)"
          icon={<WaveIcon />}
          title={`${g(profile, 'وحشتنا', 'وحشتينا')}${you}`}
          desc={`آخر زيارة قبل ${occasion.days} أيام — ${g(profile, 'سجّل', 'سجّلي')} ما فاتك من مصاريف`}
          onClick={() => onOpen('/add/transaction?type=expense')}
        />
      )
    default:
      return (
        <OccasionBox
          color="var(--color-income)"
          icon={<MosqueIcon />}
          title="جمعة مباركة"
          desc={
            monthBudgetLeft !== null && monthBudgetLeft > 0
              ? `${g(profile, 'خطط', 'خططي')} لمصاريف نهاية الأسبوع — متبقي من ميزانيتك ${mask(`${formatAmount(monthBudgetLeft)} ر.س`)}`
              : `${g(profile, 'خطط', 'خططي')} لمصاريف نهاية الأسبوع`
          }
          onClick={() => onOpen('/reports')}
        />
      )
  }
}
