import type { CSSProperties, ReactNode } from 'react'
import { formatMoney } from '../lib/format'
import { fuelLevel, fuelLevelColor, lastFuelTopUp, monthSpending } from '../lib/fuelCard'
import { useData } from '../state/DataContext'
import { AppLogoWatermark } from './AppLogo'
import { BigAmount } from './BigAmount'
import {
  ACCOUNT_CARD_ACCENT,
  ACCOUNT_CARD_ACCENT_BG,
  ACCOUNT_CARD_BG,
  ACCOUNT_CARD_TEXT,
  ACCOUNT_CARD_TEXT_FAINT,
  ACCOUNT_CARD_TEXT_MUTED,
  ACCOUNT_TYPE_LABELS,
  AccountTypeIcon,
  FuelPumpIcon,
  GamepadIcon,
} from './AccountVisuals'
import type { Account } from '../types'

function pseudoCardNumber(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  const digits = String(hash % 10000).padStart(4, '0')
  return `•••• •••• •••• ${digits}`
}

/** أيقونة الدفع اللاتلامسي — رمز موحّد فوق شارة كل بطاقة، بغض النظر عن نوع الحساب (النوع نفسه يظهر بالنص جنبها وبأيقونة AccountTypeIcon بالزاوية المقابلة). */
function ContactlessIcon({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M6 17c2-3.5 2-7.5 0-11" />
      <path d="M10.5 19c2.8-5 2.8-10.8 0-15.8" />
      <path d="M15 21c3.6-6.5 3.6-14.2 0-20.7" />
    </svg>
  )
}

/** علامة مائية مستوحاة من الشعار الوطني (نخلة وسيفان متقاطعان) — بأسلوب خطوط مجرّد يشبه AppLogoWatermark، خاصة ببطاقة حساب "عملات معدنية" بدل شعار التطبيق. */
function SaudiEmblemWatermark({ size = 148, style }: { size?: number; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" style={style}>
      <path d="M50 8c0 10-8 15-8 24 0-6-9-9-16-6 5 4 6 11 13 12-9 2-14 9-16 17 7-5 14-6 19-3-3 9-1 18 8 24 9-6 11-15 8-24 5-3 12-2 19 3-2-8-7-15-16-17 7-1 8-8 13-12-7-3-16 0-16 6 0-9-8-14-8-24Z" />
      <path d="M50 44v40" />
      <path d="M28 60 L72 92M72 60 L28 92" />
    </svg>
  )
}

/** قطرة وقود — شارة بطاقة الوقود بدل أيقونة الدفع اللاتلامسي، وأيقونة زر "شحن البطاقة". */
export function FuelDropIcon({ size = 15 }: { size?: number }) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z" />
    </svg>
  )
}

/** مؤشر تعبئة بطاقة الوقود (E → F) — نسبة الرصيد من آخر شحنة. النسخة المختصرة شريط رفيع لبطاقة رزمة الرئيسية (ارتفاعها ثابت). */
function FuelGauge({ level, lastTopUp, hidden, compact, textFaint }: { level: number; lastTopUp?: number; hidden: boolean; compact: boolean; textFaint: string }) {
  const pct = Math.round(level * 100)
  const bar = (
    <div className="overflow-hidden rounded-full" style={{ height: compact ? 6 : 8, background: 'rgba(0,0,0,0.35)' }}>
      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: fuelLevelColor(level), transition: 'width 300ms ease' }} />
    </div>
  )
  if (compact) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span className="text-[10px] font-bold" style={{ color: textFaint }}>E</span>
        <div className="min-w-0 flex-1">{bar}</div>
        <span className="text-[10px] font-bold" style={{ color: textFaint }}>F</span>
        <span className="num text-[11px] font-bold">{hidden ? '•••' : `${pct}%`}</span>
      </div>
    )
  }
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[10.5px] font-bold">
        <span style={{ color: textFaint }}>مستوى التعبئة</span>
        <span className="num">{hidden ? '•••' : `${pct}%`}</span>
      </div>
      {bar}
      <div className="mt-1.5 flex items-center justify-between text-[10px] font-bold" style={{ color: textFaint }}>
        <span>E</span>
        <span className="font-semibold">{lastTopUp && !hidden ? `آخر شحن: ${formatMoney(lastTopUp)}` : ''}</span>
        <span>F</span>
      </div>
    </div>
  )
}

/** شريحة معلومة صغيرة فوق بطاقة Steam (آخر شحن، مشتريات الشهر). */
function SteamChip({ label, value }: { label: string; value: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.25 py-0.75 text-[10.5px] font-bold"
      style={{ background: 'rgba(0,0,0,0.28)', border: '1px solid rgba(102,192,244,0.25)', color: '#cfe7f6' }}
    >
      {label}: <span className="num">{value}</span>
    </span>
  )
}

interface BankCardFaceProps {
  account: Account
  hidden?: boolean
  /** يستبدل شعار "QB-Nomia" النصي بأعلى يمين البطاقة — مفيد لحقن زر (تعديل مثلًا) بمكانه. */
  topRight?: ReactNode
  /** محتوى إضافي يُعرض داخل نفس بطاقة الحساب أسفل رقمها الوهمي (شريط هدف، زر شحن محفظة، حركات...). */
  children?: ReactNode
  className?: string
  style?: CSSProperties
  onClick?: () => void
  /** بطاقة بارتفاع ثابت (رزمة الرئيسية) — بطاقة الوقود تعرض مؤشر تعبئة مختصر مكان الرقم المموّه. */
  compact?: boolean
}

/** واجهة "الكرت البنكي" المشتركة لهوية الحسابات بالتطبيق — نفس التصميم يُستخدم برزمة كروت الرئيسية وبقائمة شاشة الحسابات. */
export function BankCardFace({ account, hidden = false, topRight, children, className = '', style, onClick, compact = false }: BankCardFaceProps) {
  const { transactions } = useData()
  const mask = (s: string) => (hidden ? '•••••' : s)
  const isFuel = account.type === 'fuel'
  const isSteam = account.type === 'steam'
  const isPrepaid = isFuel || isSteam
  const lastTopUp = isPrepaid ? lastFuelTopUp(account.id, transactions) : undefined
  const now = new Date()
  const steamMonthSpent = isSteam
    ? monthSpending(account.id, transactions, `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`)
    : 0
  const level = isFuel ? fuelLevel(account.balance, lastTopUp) : 0
  const accent = ACCOUNT_CARD_ACCENT[account.type]
  const textMuted = ACCOUNT_CARD_TEXT_MUTED[account.type]
  const textFaint = ACCOUNT_CARD_TEXT_FAINT[account.type]
  const textColor = ACCOUNT_CARD_TEXT[account.type]
  const watermarkStyle = (extra: CSSProperties): CSSProperties => ({ position: 'absolute', color: textColor, opacity: 0.1, pointerEvents: 'none', ...extra })
  return (
    <div
      className={`qb-bank-card select-none p-5 ${className}`}
      style={{ background: ACCOUNT_CARD_BG[account.type], color: textColor, ...style }}
      onClick={onClick}
    >
      {account.type === 'cash' && <div className="qb-gloss-sweep" />}
      {isFuel && (
        <div
          style={{
            position: 'absolute', left: -40, top: 0, bottom: 0, width: 120, transform: 'skewX(-8deg)', pointerEvents: 'none',
            background: 'repeating-linear-gradient(135deg, rgba(255,255,255,0.08) 0 10px, transparent 10px 22px)',
          }}
        />
      )}
      {isFuel ? (
        <FuelPumpIcon size={150} strokeWidth={1.1} style={watermarkStyle({ left: -18, bottom: -22, transform: 'rotate(8deg)' })} />
      ) : isSteam ? (
        <GamepadIcon size={170} strokeWidth={1} style={watermarkStyle({ left: -22, bottom: -30, transform: 'rotate(10deg)' })} />
      ) : account.type === 'coins' ? (
        <SaudiEmblemWatermark size={150} style={watermarkStyle({ left: -30, bottom: -26, transform: 'rotate(-6deg)' })} />
      ) : (
        <AppLogoWatermark size={170} style={watermarkStyle({ left: -34, bottom: -46, transform: 'rotate(8deg)' })} />
      )}

      <div className="relative flex h-full flex-col" style={{ zIndex: 2 }}>
        <div className="flex h-full flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex min-w-0 items-center gap-2.5">
              <div
                className="flex flex-shrink-0 items-center justify-center rounded-full"
                style={{ width: 34, height: 34, background: ACCOUNT_CARD_ACCENT_BG[account.type], color: accent }}
              >
                {isFuel ? <FuelDropIcon size={16} /> : isSteam ? <GamepadIcon size={17} /> : <AccountTypeIcon type={account.type} size={17} />}
              </div>
              <div className="min-w-0">
                <div className="truncate text-[14px] font-semibold">{account.name}</div>
                <div className="truncate text-[11px] font-medium" style={{ color: textFaint }}>
                  {account.goalLabel ? `هدف: ${account.goalLabel}` : ACCOUNT_TYPE_LABELS[account.type]}
                </div>
              </div>
            </div>
            {topRight ?? (
              <div style={{ color: accent, opacity: 0.7 }}>
                <ContactlessIcon size={20} />
              </div>
            )}
          </div>

          <div>
            <div className="mb-1.5 text-[11.5px] font-medium" style={{ color: textMuted }}>
              {isPrepaid ? 'الرصيد المتبقي' : 'الرصيد المتاح'}
            </div>
            <BigAmount value={account.balance} hidden={hidden} size={32} animate={false} />
          </div>

          {isSteam && !compact && (
            <div className="flex flex-wrap gap-1.5">
              <SteamChip label="آخر شحن" value={lastTopUp && !hidden ? formatMoney(lastTopUp) : '—'} />
              <SteamChip label="مشتريات الشهر" value={hidden ? '•••' : formatMoney(steamMonthSpent)} />
            </div>
          )}

          {isFuel && !compact && <FuelGauge level={level} lastTopUp={lastTopUp} hidden={hidden} compact={false} textFaint={textFaint} />}

          <div className="flex items-end justify-between gap-3">
            {isFuel && compact ? (
              <FuelGauge level={level} hidden={hidden} compact textFaint={textFaint} />
            ) : (
              <div dir="ltr" className="num text-[12.5px] font-semibold" style={{ letterSpacing: 2, color: textFaint }}>
                {mask(pseudoCardNumber(account.id))}
              </div>
            )}
            <div dir="ltr" className="num flex-shrink-0 text-[12px] font-bold tracking-tight" style={{ color: textMuted }}>
              QB<span style={{ color: account.type === 'cash' ? 'var(--color-accent)' : 'inherit' }}>·</span>Nomia
            </div>
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}
