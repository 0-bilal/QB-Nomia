import { useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { formatMoney } from '../lib/format'
import { AppLogoMark } from './AppLogo'
import { ACCOUNT_ICON_BG, ACCOUNT_ICON_COLOR, ACCOUNT_TYPE_LABELS, AccountTypeIcon } from './AccountVisuals'
import type { Account } from '../types'

const CARD_HEIGHT = 176
const PEEK = 13
const SWIPE_THRESHOLD = 56
const DRAG_TAP_SLOP = 6
const EXIT_DISTANCE = 260
const SETTLE_MS = 260
const EASING = 'cubic-bezier(0.22,1,0.36,1)'

function pseudoCardNumber(id: string): string {
  let hash = 0
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0
  const digits = String(hash % 10000).padStart(4, '0')
  return `•••• •••• •••• ${digits}`
}

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

/** ترتيب كاش أولاً ثم باقي الحسابات بنفس ترتيبها الأصلي — يحدد أي كرت يظهر افتراضيًا في المقدمة. */
function orderAccounts(accounts: Account[]): Account[] {
  const cash = accounts.filter((a) => a.type === 'cash')
  const rest = accounts.filter((a) => a.type !== 'cash')
  return [...cash, ...rest]
}

interface AccountCardProps {
  account: Account
  hidden: boolean
  style: CSSProperties
  transition: boolean
  interactive: boolean
  onPointerDown?: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerMove?: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerUp?: (e: ReactPointerEvent<HTMLDivElement>) => void
  onPointerCancel?: (e: ReactPointerEvent<HTMLDivElement>) => void
  onClick?: () => void
}

function AccountCard({ account, hidden, style, transition, interactive, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick }: AccountCardProps) {
  const mask = (s: string) => (hidden ? '•••••' : s)
  return (
    <div
      className="qb-card-elevated inset-x-0 top-0 select-none p-5"
      style={{
        position: 'absolute',
        height: CARD_HEIGHT,
        transition: transition ? `transform ${SETTLE_MS}ms ${EASING}, opacity ${SETTLE_MS}ms ease` : 'none',
        touchAction: interactive ? 'none' : undefined,
        willChange: 'transform, opacity',
        ...style,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={onClick}
    >
      <div className="relative flex h-full flex-col justify-between">
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
              <div className="text-[10px] text-[var(--color-text-3)]">{ACCOUNT_TYPE_LABELS[account.type]}</div>
            </div>
          </div>
          <div className="text-[11px] font-bold text-[var(--color-text-2)]" style={{ letterSpacing: 1 }}>
            QB-Nomia
          </div>
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
    </div>
  )
}

export function AccountCardStack({ accounts, hidden }: { accounts: Account[]; hidden: boolean }) {
  const navigate = useNavigate()
  const ordered = useMemo(() => orderAccounts(accounts), [accounts])
  const [activeIndex, setActiveIndex] = useState(0)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [snapId, setSnapId] = useState<string | null>(null)
  const startYRef = useRef(0)
  const maxDragRef = useRef(0)

  const count = ordered.length
  const visibleCount = Math.min(count, 3)
  const stackHeight = CARD_HEIGHT + (visibleCount - 1) * PEEK
  const dotsSpace = count > 1 ? 22 : 0
  const safeIndex = activeIndex % Math.max(count, 1)

  if (count === 0) {
    return (
      <button
        onClick={() => navigate('/accounts/new')}
        className="qb-card-elevated qb-press mb-4 flex w-full flex-col items-center justify-center gap-2 p-8 text-center"
        style={{ height: CARD_HEIGHT }}
      >
        <div className="text-[13px] font-bold">أضف حسابك الأول</div>
        <div className="text-[11.5px] text-[var(--color-text-3)]">كاش، بنكي، ادخار، أو محفظة رقمية</div>
      </button>
    )
  }

  const progress = dragging ? Math.min(1, Math.max(0, -dragY) / SWIPE_THRESHOLD) : committing ? 1 : 0

  function commitSwipe() {
    setCommitting(true)
    setTimeout(() => {
      const exitingId = ordered[safeIndex].id
      setSnapId(exitingId)
      setActiveIndex((i) => (i + 1) % count)
      setDragY(0)
      setCommitting(false)
      requestAnimationFrame(() => requestAnimationFrame(() => setSnapId(null)))
    }, SETTLE_MS)
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (committing) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    startYRef.current = e.clientY
    maxDragRef.current = 0
    setDragging(true)
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragging) return
    const delta = Math.min(0, e.clientY - startYRef.current)
    maxDragRef.current = Math.min(maxDragRef.current, delta)
    setDragY(Math.max(delta, -140))
  }

  function handlePointerUp() {
    if (!dragging) return
    setDragging(false)
    if (maxDragRef.current <= -SWIPE_THRESHOLD) {
      commitSwipe()
      return
    }
    if (Math.abs(maxDragRef.current) < DRAG_TAP_SLOP) {
      navigate(`/accounts/${ordered[safeIndex].id}/edit`)
    }
    setDragY(0)
  }

  return (
    <div className="relative mb-4" style={{ height: stackHeight + dotsSpace }}>
      {Array.from({ length: visibleCount }, (_, slot) => {
        const idx = (safeIndex + slot) % count
        const account = ordered[idx]
        const isFront = slot === 0

        const restOffset = slot * PEEK
        const nextOffset = isFront ? -EXIT_DISTANCE : (slot - 1) * PEEK
        const restScale = 1 - slot * 0.04
        const nextScale = isFront ? 0.9 : 1 - (slot - 1) * 0.04
        const restOpacity = isFront ? 1 : 1 - slot * 0.18
        const nextOpacity = isFront ? 0 : 1 - (slot - 1) * 0.18

        const translateY = isFront && dragging ? dragY : lerp(restOffset, nextOffset, progress)
        const scale = lerp(restScale, nextScale, progress)
        const opacity = lerp(restOpacity, nextOpacity, progress)

        const isSnapping = account.id === snapId
        const transitionEnabled = isSnapping ? false : !dragging

        return (
          <AccountCard
            key={account.id}
            account={account}
            hidden={hidden}
            transition={transitionEnabled}
            interactive={isFront}
            style={{
              transform: `translateY(${translateY}px) scale(${scale})`,
              opacity,
              zIndex: visibleCount - slot,
              cursor: isFront ? 'grab' : 'default',
            }}
            onPointerDown={isFront ? handlePointerDown : undefined}
            onPointerMove={isFront ? handlePointerMove : undefined}
            onPointerUp={isFront ? handlePointerUp : undefined}
            onPointerCancel={isFront ? handlePointerUp : undefined}
            onClick={!isFront ? () => setActiveIndex(idx) : undefined}
          />
        )
      })}

      {count > 1 && (
        <div className="absolute inset-x-0 flex items-center justify-center gap-1.5" style={{ top: stackHeight + 8 }}>
          {ordered.map((a, i) => (
            <button
              key={a.id}
              onClick={() => setActiveIndex(i)}
              aria-label={a.name}
              className="rounded-full transition-all"
              style={{
                width: i === safeIndex ? 14 : 5,
                height: 5,
                background: i === safeIndex ? 'var(--color-accent)' : 'rgba(255,255,255,0.18)',
              }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
