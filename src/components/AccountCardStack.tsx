import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { BankCardFace } from './BankCardFace'
import type { Account } from '../types'

export const CARD_HEIGHT = 176
const PEEK = 13
const SWIPE_THRESHOLD = 48
const DRAG_TAP_SLOP = 8
const EXIT_DISTANCE = 260
const SETTLE_MS = 260
const DOWN_RESIST = 0.35
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
  slot: number
  style: CSSProperties
  transition: boolean
  entering: boolean
}

function PositionedCard({ account, hidden, slot, style, transition, entering }: PositionedCardProps) {
  return (
    <div
      data-slot={slot}
      className="inset-x-0 top-0"
      style={{
        position: 'absolute',
        height: CARD_HEIGHT,
        transition: transition ? `transform ${SETTLE_MS}ms ${EASING}, opacity ${SETTLE_MS}ms ease` : 'none',
        animation: entering ? `qb-card-drop-in ${SETTLE_MS}ms ${EASING}` : undefined,
        willChange: 'transform, opacity',
        ...style,
      }}
    >
      <BankCardFace account={account} hidden={hidden} className="h-full" compact />
    </div>
  )
}

/**
 * رزمة كروت الحسابات بالرئيسية — للعرض والتنقل فقط (التعديل من شاشة الحسابات بزر القلم).
 * الإيماءة يملكها الحاوي بالكامل (touch-action: none على الرزمة كلها، مو الكرت الأمامي بس)
 * حتى ما تتحول أي لمسة على الرزمة لتمرير للصفحة:
 *   سحب لأعلى ← الكرت التالي، سحب لأسفل ← الكرت السابق، نقرة ← الكرت التالي (أو الكرت الخلفي المنقور).
 */
export function AccountCardStack({ accounts, hidden }: { accounts: Account[]; hidden: boolean }) {
  const navigate = useNavigate()
  const ordered = useMemo(() => orderAccounts(accounts), [accounts])
  const [activeIndex, setActiveIndex] = useState(0)
  const [dragY, setDragY] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [snapId, setSnapId] = useState<string | null>(null)
  const [enteringId, setEnteringId] = useState<string | null>(null)
  const gesture = useRef({ active: false, pointerId: -1, startY: 0, startX: 0, maxDist: 0, lastY: 0 })
  const commitTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const count = ordered.length
  const visibleCount = Math.min(count, 3)
  const stackHeight = CARD_HEIGHT + (visibleCount - 1) * PEEK
  const dotsSpace = count > 1 ? 22 : 0
  const safeIndex = activeIndex % Math.max(count, 1)

  useEffect(() => () => {
    if (commitTimer.current) clearTimeout(commitTimer.current)
  }, [])

  if (count === 0) {
    return (
      <button
        onClick={() => navigate('/accounts/new')}
        className="qb-card-elevated qb-press mb-4 flex w-full flex-col items-center justify-center gap-2 p-8 text-center"
        style={{ height: CARD_HEIGHT }}
      >
        <div className="text-[13px] font-semibold">أضف حسابك الأول</div>
        <div className="text-[11.5px] text-[var(--color-text-3)]">كاش، بنكي، ادخار، أو محفظة رقمية</div>
      </button>
    )
  }

  const progress = dragging ? Math.min(1, Math.max(0, -dragY) / SWIPE_THRESHOLD) : committing ? 1 : 0

  /** ينهي حركة "التالي" الجارية فورًا — يُستدعى عند انتهاء المؤقت، أو لو بدأ المستخدم سحبة جديدة قبل انتهاء الحركة (بدل تجاهلها). */
  function finishCommit() {
    if (commitTimer.current) clearTimeout(commitTimer.current)
    commitTimer.current = null
    setSnapId(ordered[safeIndex].id)
    setActiveIndex((i) => (i + 1) % count)
    setDragY(0)
    setCommitting(false)
    requestAnimationFrame(() => requestAnimationFrame(() => setSnapId(null)))
  }

  function goNext() {
    if (count < 2) return
    setCommitting(true)
    commitTimer.current = setTimeout(finishCommit, SETTLE_MS)
  }

  function goPrev() {
    if (count < 2) return
    const prev = (safeIndex - 1 + count) % count
    setEnteringId(ordered[prev].id)
    setActiveIndex(prev)
    setDragY(0)
    setTimeout(() => setEnteringId(null), SETTLE_MS)
  }

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    if (e.button !== 0 || (e.target as Element).closest('button')) return
    if (committing) finishCommit()
    e.currentTarget.setPointerCapture?.(e.pointerId)
    gesture.current = { active: true, pointerId: e.pointerId, startY: e.clientY, startX: e.clientX, maxDist: 0, lastY: 0 }
    setDragging(true)
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current
    if (!g.active || e.pointerId !== g.pointerId) return
    const dy = e.clientY - g.startY
    g.maxDist = Math.max(g.maxDist, Math.hypot(dy, e.clientX - g.startX))
    g.lastY = dy
    setDragY(dy < 0 ? Math.max(dy, -140) : Math.min(dy * DOWN_RESIST, 50))
  }

  function handlePointerUp(e: ReactPointerEvent<HTMLDivElement>) {
    const g = gesture.current
    if (!g.active || e.pointerId !== g.pointerId) return
    g.active = false
    setDragging(false)

    if (e.type === 'pointercancel') {
      setDragY(0)
      return
    }
    if (g.lastY <= -SWIPE_THRESHOLD) {
      goNext()
      return
    }
    if (g.lastY >= SWIPE_THRESHOLD) {
      goPrev()
      return
    }
    setDragY(0)
    if (g.maxDist < DRAG_TAP_SLOP) {
      const slot = Number((e.target as Element).closest('[data-slot]')?.getAttribute('data-slot') ?? 0)
      if (slot > 0) setActiveIndex((safeIndex + slot) % count)
      else goNext()
    }
  }

  return (
    <div
      data-own-gesture
      className="relative mb-4 select-none"
      style={{ height: stackHeight + dotsSpace, touchAction: 'none', cursor: count > 1 ? 'grab' : 'default' }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
    >
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
            slot={slot}
            transition={transitionEnabled}
            entering={account.id === enteringId}
            style={{
              transform: `translateY(${translateY}px) scale(${scale})`,
              opacity,
              zIndex: visibleCount - slot,
            }}
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
