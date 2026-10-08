import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney, formatSigned, formatDate } from '../lib/format'
import { ActivityIcon } from '../components/ActivityIcon'
import { activityEditPath } from '../lib/activityNav'
import { BankCardFace, FuelDropIcon } from '../components/BankCardFace'
import { ACCOUNT_CARD_TEXT_FAINT, GamepadIcon } from '../components/AccountVisuals'
import { EyeToggleButton } from '../components/EyeToggleButton'
import { TabHeader, HeaderIconButton, PlusGlyph } from '../components/TabHeader'
import { BigAmount } from '../components/BigAmount'
import { getHideBalancesDefault } from '../lib/privacy'

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M13.5 8 16 10.5" />
    </svg>
  )
}
/** أيقونة "الشاشة الرئيسية" — تُملأ لما الحساب مفعّل الظهور بها، وتبقى بخط فاتح لما يكون مخفيًا عنها. */
function HomeVisibilityIcon({ active }: { active: boolean }) {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill={active ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 11 12 4l8 7" />
      <path d="M6 9.5V19a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V9.5" />
    </svg>
  )
}
function ChevronIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transition: 'transform 200ms ease' }}>
      <polyline points="6,9 12,15 18,9" />
    </svg>
  )
}

export function AccountsScreen() {
  const { accounts, totalBalance, accountActivity, setAccountShowOnHome } = useData()
  const navigate = useNavigate()
  const [openId, setOpenId] = useState<string | null>(null)
  const [hidden, setHidden] = useState(getHideBalancesDefault)

  return (
    <div dir="rtl" className="px-5 pb-4">
      <TabHeader
        title="حساباتك"
        subtitle={`${accounts.length} حسابات نشطة · اضغط البطاقة لعرض آخر حركاتها`}
        actions={
          <>
            <EyeToggleButton hidden={hidden} onToggle={() => setHidden((h) => !h)} />
            <HeaderIconButton accent label="إضافة حساب" onClick={() => navigate('/accounts/new')}>
              <PlusGlyph />
            </HeaderIconButton>
          </>
        }
      />

      <div className="qb-card-elevated qb-rise mb-5 p-5">
        <div className="relative">
          <div className="mb-2 text-[12.5px] font-medium text-[var(--color-text-2)]">إجمالي الأرصدة</div>
          <BigAmount value={totalBalance} hidden={hidden} size={36} />
          <button
            onClick={() => navigate('/add/transaction?type=transfer')}
            className="qb-btn-primary mt-5 flex w-full items-center justify-center gap-2 py-3 text-[13.5px]"
          >
            <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 3l4 4-4 4M20 7H8M8 21l-4-4 4-4M4 17h12" />
            </svg>
            تحويل بين الحسابات
          </button>
        </div>
      </div>

      {accounts.map((a) => {
        const open = openId === a.id
        const activity = open ? accountActivity(a.id, 3) : []
        const textFaint = ACCOUNT_CARD_TEXT_FAINT[a.type]
        return (
          <BankCardFace
            key={a.id}
            account={a}
            hidden={hidden}
            className="mb-3.5"
            onClick={() => setOpenId(open ? null : a.id)}
            topRight={
              <div className="flex flex-shrink-0 items-center gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setAccountShowOnHome(a.id, a.showOnHome === false)
                  }}
                  aria-label={a.showOnHome === false ? 'إظهار الحساب في الشاشة الرئيسية' : 'إخفاء الحساب من الشاشة الرئيسية'}
                  title={a.showOnHome === false ? 'إظهار في الرئيسية' : 'إخفاء من الرئيسية'}
                  className="qb-press flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ width: 30, height: 30, background: 'rgba(0,0,0,0.22)', color: a.showOnHome === false ? textFaint : 'inherit' }}
                >
                  <HomeVisibilityIcon active={a.showOnHome !== false} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    navigate(`/accounts/${a.id}/edit`)
                  }}
                  aria-label="تعديل الحساب"
                  className="qb-press flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full"
                  style={{ width: 30, height: 30, background: 'rgba(0,0,0,0.22)' }}
                >
                  <EditIcon />
                </button>
              </div>
            }
          >
            <div className="mt-3.5 flex justify-center">
              <div className={open ? '-rotate-180' : ''} style={{ color: textFaint, transition: 'transform 200ms ease' }}>
                <ChevronIcon />
              </div>
            </div>

            {a.goalAmount ? (
              <>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/20">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.min(100, (a.balance / a.goalAmount) * 100)}%`,
                      background: 'currentColor',
                    }}
                  />
                </div>
                <div className="mt-1.5 text-[11px] font-semibold" style={{ color: textFaint }}>
                  وصلت لـ {Math.round((a.balance / a.goalAmount) * 100)}% من الهدف ({formatMoney(a.goalAmount)})
                </div>
              </>
            ) : null}

            {a.type === 'wallet' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/add/transaction?type=transfer&to=${a.id}`)
                }}
                className="qb-press mt-3.5 w-full rounded-full py-2.5 text-[12.5px] font-semibold"
                style={{ background: 'rgba(0,0,0,0.25)' }}
              >
                شحن المحفظة
              </button>
            )}

            {a.type === 'fuel' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/add/transaction?type=transfer&to=${a.id}`)
                }}
                className="qb-press mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-[12.5px] font-semibold"
                style={{ background: 'linear-gradient(90deg, #ffb347, #ff7a1a)', color: '#1a0a02', boxShadow: '0 6px 16px -6px rgba(255,122,26,0.7)' }}
              >
                <FuelDropIcon size={14} />
                شحن البطاقة
              </button>
            )}

            {a.type === 'steam' && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/add/transaction?type=transfer&to=${a.id}`)
                }}
                className="qb-press mt-3.5 flex w-full items-center justify-center gap-1.5 rounded-full py-2.5 text-[12.5px] font-semibold"
                style={{ background: 'linear-gradient(90deg, #66c0f4, #2a8fd0)', color: '#08131c', boxShadow: '0 6px 16px -6px rgba(102,192,244,0.7)' }}
              >
                <GamepadIcon size={15} />
                شحن الرصيد
              </button>
            )}

            {open && (
              <div className="mt-3.5 border-t border-current/15 pt-3">
                {activity.length === 0 ? (
                  <div className="py-2 text-center text-[12px] font-semibold" style={{ color: textFaint }}>
                    لا توجد حركات على هذا الحساب بعد
                  </div>
                ) : (
                  activity.map((item) => (
                    <button
                      key={item.id}
                      onClick={(e) => {
                        e.stopPropagation()
                        navigate(activityEditPath(item))
                      }}
                      className="flex w-full items-center gap-2.5 py-1.5 text-right"
                    >
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full"
                        style={{ width: 32, height: 32, background: 'rgba(0,0,0,0.22)' }}
                      >
                        <ActivityIcon kind={item.kind} />
                      </div>
                      <div className="min-w-0 flex-1 truncate text-[12px] font-semibold">{item.title}</div>
                      <div className="flex-shrink-0 text-[10.5px] font-semibold" style={{ color: textFaint }}>
                        {formatDate(item.date)}
                      </div>
                      <div className="num flex-shrink-0 text-[12px] font-bold">
                        {formatSigned(item.amount)}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </BankCardFace>
        )
      })}
    </div>
  )
}
