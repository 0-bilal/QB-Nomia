import type { CSSProperties, ReactNode } from 'react'
import { formatMoney } from '../lib/format'
import { AppLogoMark } from './AppLogo'
import { ACCOUNT_CARD_BG, ACCOUNT_ICON_BG, ACCOUNT_ICON_COLOR, ACCOUNT_TYPE_LABELS, AccountTypeIcon } from './AccountVisuals'
import type { Account } from '../types'

function pseudoCardNumber(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  const digits = String(hash % 10000).padStart(4, '0')
  return `•••• •••• •••• ${digits}`
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
}

/** واجهة "الكرت البنكي" المشتركة لهوية الحسابات بالتطبيق — نفس التصميم يُستخدم برزمة كروت الرئيسية وبقائمة شاشة الحسابات. */
export function BankCardFace({ account, hidden = false, topRight, children, className = '', style, onClick }: BankCardFaceProps) {
  const mask = (s: string) => (hidden ? '•••••' : s)
  return (
    <div
      className={`qb-card-elevated select-none p-5 ${className}`}
      style={{ background: ACCOUNT_CARD_BG[account.type], ...style }}
      onClick={onClick}
    >
      <div className="relative flex h-full flex-col">
        <div className="flex h-full flex-col justify-between gap-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div
                className="flex h-7.5 w-7.5 items-center justify-center rounded-[10px]"
                style={{ width: 30, height: 30, background: ACCOUNT_ICON_BG[account.type], color: ACCOUNT_ICON_COLOR[account.type] }}
              >
                <AccountTypeIcon type={account.type} size={15} />
              </div>
              <div>
                <div className="text-[11.5px] font-bold">{account.name}</div>
                <div className="text-[10px] text-[var(--color-text-3)]">{account.goalLabel ? `هدف: ${account.goalLabel}` : ACCOUNT_TYPE_LABELS[account.type]}</div>
              </div>
            </div>
            {topRight ?? (
              <div className="text-[11px] font-bold text-[var(--color-text-2)]" style={{ letterSpacing: 1 }}>
                QB-Nomia
              </div>
            )}
          </div>

          <div>
            <div className="mb-1 text-[11.5px] text-[var(--color-text-2)]">الرصيد</div>
            <div className="num text-[30px] font-bold tracking-tight">{mask(formatMoney(account.balance))}</div>
          </div>

          <div className="flex items-end justify-between">
            <div dir="ltr" className="num text-[12px] text-[var(--color-text-3)]" style={{ letterSpacing: 1.5 }}>
              {mask(pseudoCardNumber(account.id))}
            </div>
            <AppLogoMark size={22} />
          </div>
        </div>

        {children}
      </div>
    </div>
  )
}
