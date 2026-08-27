import { useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BankCardFace } from './BankCardFace'
import type { Account } from '../types'

const CARD_HEIGHT = 176
const PEEK = 13
const SWIPE_THRESHOLD = 56
const DRAG_TAP_SLOP = 6
const EXIT_DISTANCE = 260
const SETTLE_MS = 260
const EASING = 'cubic-bezier(0.22,1,0.36,1)'

function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t
}

/** ترتيب كاش أولاً ثم باقي الحسابات بنفس ترتيبها الأصلي — يحدد أي كرت يظهر افتراضيًا في المقدمة. */
function orderAccounts(accounts: Account[]): Account[] {
  const cash = accounts.filter((a) => a.type === 'cash')
  const rest = accounts.filter((a) => a.type !== 'cash')
  return [...cash, ...rest]
}

interface PositionedCardProps {
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

function PositionedCard({ account, hidden, style, transition, interactive, onPointerDown, onPointerMove, onPointerUp, onPointerCancel, onClick }: PositionedCardProps) {
  return (
    <div
      className="inset-x-0 top-0"
      style={{
        position: 'absolute',
        height: CARD_HEIGHT,
        transition: transition ? `transform ${SETTLE_MS}ms ${EASING}, opacity ${SETTLE_MS}ms ease` : 'none',
        touchAction: interactive ? 'none' : undefined,
        willChange: 'transform, opacity',
        cursor: interactive ? 'grab' : 'default',
        ...style,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
      onClick={onClick}
    >
      <BankCardFace account={account} hidden={hidden} className="h-full" />
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
          <PositionedCard
            key={account.id}
            account={account}
            hidden={hidden}
            transition={transitionEnabled}
            interactive={isFront}
            style={{
              transform: `translateY(${translateY}px) scale(${scale})`,
              opacity,
              zIndex: visibleCount - slot,
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
