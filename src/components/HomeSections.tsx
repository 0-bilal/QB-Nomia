import type { ReactNode } from 'react'
import { ActivityIcon } from './ActivityIcon'
import { CategoryIconBox } from './CategoryVisual'
import { SwipeableRow, type SwipeAction } from './SwipeableRow'
import { formatAmount, formatDate, formatSigned } from '../lib/format'
import { dayLabel, daysLeftLabel, groupByDay, type UpcomingItem, type UpcomingKind } from '../lib/homeFeed'
import type { ActivityItem } from '../state/DataContext'
import type { Category } from '../types'

function soft(color: string, pct = 15): string {
  return `color-mix(in srgb, ${color} ${pct}%, transparent)`
}

export interface Insight {
  id: string
  color: string
  icon: ReactNode
  title: ReactNode
  desc: ReactNode
  /** شريط تقدّم اختياري (نسبة مئوية) تحت الوصف. */
  barPct?: number
  onClick: () => void
}

/** "يحتاج انتباهك": بطاقات أفقية قابلة للسحب — تحل محل شريط التنبيه الأحمر الثابت. */
export function InsightsStrip({ insights }: { insights: Insight[] }) {
  return (
    <div data-own-gesture className="-mx-5 flex snap-x snap-mandatory gap-2.5 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {insights.map((x) => (
        <button
          key={x.id}
          onClick={x.onClick}
          className="qb-press flex flex-shrink-0 snap-start items-start gap-3 rounded-[22px] border p-3.5 text-right"
          style={{
            width: insights.length === 1 ? '100%' : '78%',
            background: `linear-gradient(135deg, ${soft(x.color, 13)}, ${soft(x.color, 3)})`,
            borderColor: soft(x.color, 28),
          }}
        >
          <span className="flex flex-shrink-0 items-center justify-center" style={{ width: 38, height: 38, borderRadius: 13, background: soft(x.color, 18), color: x.color }}>
            {x.icon}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[13px] font-bold">{x.title}</span>
            <span className="mt-0.5 block text-[11.5px] leading-relaxed text-[var(--color-text-2)]">{x.desc}</span>
            {x.barPct !== undefined && (
              <span className="mt-2 block overflow-hidden rounded-full bg-white/[0.08]" style={{ height: 5 }}>
                <span className="block h-full rounded-full" style={{ width: `${Math.min(100, x.barPct)}%`, background: x.color }} />
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  )
}

const UPCOMING_META: Record<UpcomingKind, { label: string; color: string }> = {
  subscription: { label: 'اشتراك', color: 'var(--color-subscription)' },
  commitment: { label: 'التزام', color: 'var(--color-commitment)' },
  recurring: { label: 'متكررة', color: 'var(--color-income)' },
}

const MONTHS_AR = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

/** "القادم": المدفوعات والدخل المتوقع خلال الأيام القادمة بتاريخ واضح وكم يوم باقي. */
export function UpcomingList({ items, hidden, onOpen }: { items: UpcomingItem[]; hidden: boolean; onOpen: (kind: UpcomingKind) => void }) {
  return (
    <div className="qb-card px-3.5 py-1">
      {items.map((it) => {
        const meta = UPCOMING_META[it.kind]
        const late = it.daysLeft < 0
        const label = it.kind === 'recurring' && (it.amount ?? 0) > 0 ? 'دخل متكرر' : meta.label
        const tagColor = it.kind === 'recurring' && (it.amount ?? 0) < 0 ? 'var(--color-expense)' : meta.color
        return (
          <button
            key={it.id}
            onClick={() => onOpen(it.kind)}
            className="flex w-full items-center gap-3 border-t border-[var(--color-border)] py-2.5 text-right first:border-t-0"
          >
            <span
              className="flex flex-shrink-0 flex-col items-center justify-center rounded-[14px] border"
              style={{
                width: 44,
                height: 48,
                background: late ? 'rgba(255,95,109,0.1)' : 'var(--color-surface-elevated)',
                borderColor: late ? 'rgba(255,95,109,0.3)' : 'var(--color-border)',
              }}
            >
              <b className="num text-[16px] font-bold leading-none">{Number(it.date.slice(8, 10))}</b>
              <small className="mt-0.5 text-[9.5px] text-[var(--color-text-3)]">{MONTHS_AR[Number(it.date.slice(5, 7)) - 1]}</small>
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[13px] font-semibold">{it.name}</div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px]" style={{ color: late ? 'var(--color-expense)' : 'var(--color-text-3)' }}>
                <span className="rounded-full px-1.5 py-px text-[10px] font-bold" style={{ background: soft(tagColor), color: tagColor }}>
                  {label}
                </span>
                {daysLeftLabel(it.daysLeft)}
              </div>
            </div>
            {it.amount !== undefined && (
              <span dir="ltr" className="num flex-shrink-0 text-[13.5px] font-bold" style={{ color: it.amount > 0 ? 'var(--color-income)' : 'var(--color-text)' }}>
                {hidden ? '•••' : `${it.amount > 0 ? '+' : '−'}${formatAmount(Math.abs(it.amount))}`}
              </span>
            )}
          </button>
        )
      })}
    </div>
  )
}

/** آخر الحركات مقسومة حسب اليوم مع صافي كل يوم — كل حركة بأيقونة فئتها (للمصاريف) ونوعها لغيرها. */
export function GroupedActivity({
  items,
  categories,
  today,
  hidden,
  swipeFor,
  onOpen,
}: {
  items: ActivityItem[]
  categories: Category[]
  today: string
  hidden: boolean
  swipeFor: (item: ActivityItem) => { leftSwipe?: SwipeAction; rightSwipe?: SwipeAction }
  onOpen: (item: ActivityItem) => void
}) {
  return (
    <>
      {groupByDay(items).map((group) => {
        // صافي اليوم بدون التحويلات (لا تغيّر إجمالي ما تملكه).
        const net = group.items.filter((i) => i.kind !== 'transfer').reduce((s, i) => s + i.amount, 0)
        return (
          <div key={group.date}>
            <div className="mx-1.5 mb-2 mt-3.5 flex justify-between text-[11.5px] font-semibold text-[var(--color-text-3)]">
              <span>{dayLabel(group.date, today) || formatDate(group.date)}</span>
              {net !== 0 && (
                <span dir="ltr" className="num" style={{ color: net > 0 ? 'var(--color-income)' : undefined }}>
                  {hidden ? '•••' : formatSigned(net)}
                </span>
              )}
            </div>
            <div className="qb-card overflow-hidden">
              {group.items.map((item, i) => {
                const category = item.categoryId ? categories.find((c) => c.id === item.categoryId) : undefined
                return (
                  <SwipeableRow key={item.id} {...swipeFor(item)} className={i > 0 ? 'border-t qb-divider' : ''}>
                    <button onClick={() => onOpen(item)} className="flex w-full items-center gap-3 px-3.5 py-3 text-right active:bg-white/[0.03]">
                      {category ? (
                        <CategoryIconBox category={category} size={42} radius={14} iconSize={19} />
                      ) : (
                        <span
                          className="flex flex-shrink-0 items-center justify-center"
                          style={{ width: 42, height: 42, borderRadius: 14, background: soft(item.color, 14), color: item.color }}
                        >
                          <ActivityIcon kind={item.kind} />
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13.5px] font-semibold">{item.title}</div>
                        <div className="truncate text-[11px] text-[var(--color-text-3)]">
                          {item.note?.trim() ? `${item.note.trim()} · ` : ''}
                          {item.subtitle}
                        </div>
                      </div>
                      <div dir="ltr" className="num flex-shrink-0 text-[14px] font-bold" style={{ color: item.amount > 0 ? 'var(--color-income)' : 'var(--color-text)' }}>
                        {hidden ? '•••' : formatSigned(item.amount)}
                      </div>
                    </button>
                  </SwipeableRow>
                )
              })}
            </div>
          </div>
        )
      })}
    </>
  )
}

/**
 * كبسولة الرصيد (أسلوب الكبسولة الذكية): تظهر لاصقة تحت صف الأزرار بعد تمرير الرصيد الإجمالي —
 * الرصيد + صافي الشهر، والضغط عليها يرجع لأعلى الشاشة. تحترم زر الإخفاء.
 */
export function BalanceCapsule({ visible, balance, net, hidden, onTap }: { visible: boolean; balance: number; net: number; hidden: boolean; onTap: () => void }) {
  return (
    <div className="pointer-events-none sticky z-20 -mx-5 h-0" style={{ top: 'calc(env(safe-area-inset-top, 0px) + 60px)' }}>
      <div
        className="absolute inset-x-0 top-0 flex justify-center"
        aria-hidden={!visible}
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'none' : 'translateY(-8px) scale(0.6)',
          transition: 'opacity 220ms ease, transform 420ms cubic-bezier(0.34,1.56,0.64,1)',
        }}
      >
        <button
          onClick={onTap}
          tabIndex={visible ? 0 : -1}
          aria-label="الرجوع لأعلى الشاشة"
          className="qb-press relative flex h-10 items-center gap-2 whitespace-nowrap rounded-full border pe-1.5 ps-3.5"
          style={{
            pointerEvents: visible ? 'auto' : 'none',
            background: 'rgba(28,28,33,0.9)',
            borderColor: 'var(--color-border-strong)',
            backdropFilter: 'blur(20px) saturate(1.6)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.6)',
            boxShadow: '0 12px 30px -12px rgba(0,0,0,0.8)',
          }}
        >
          <span
            className="pointer-events-none absolute rounded-full"
            style={{
              inset: '-12px -16px',
              zIndex: -1,
              background: 'rgba(5,5,6,0.35)',
              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)',
              maskImage: 'radial-gradient(closest-side, #000 60%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(closest-side, #000 60%, transparent 100%)',
            }}
          />
          <span dir="ltr" className="num text-[13.5px] font-bold">
            {hidden ? '••••••' : formatAmount(balance)} <small className="text-[11px] font-semibold text-[var(--color-text-3)]">ر.س</small>
          </span>
          {net !== 0 && (
            <span
              dir="ltr"
              className="num rounded-full px-2 py-0.5 text-[11px] font-bold"
              style={{ background: soft(net > 0 ? 'var(--color-income)' : 'var(--color-expense)', 14), color: net > 0 ? 'var(--color-income)' : 'var(--color-expense)' }}
            >
              {hidden ? '•••' : `${net > 0 ? '+' : '−'}${formatAmount(Math.abs(net))}`}
            </span>
          )}
          <span className="flex h-[30px] w-[30px] items-center justify-center text-[var(--color-text-3)]">
            <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="m6 15 6-6 6 6" />
            </svg>
          </span>
        </button>
      </div>
    </div>
  )
}
