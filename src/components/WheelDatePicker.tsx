import { useEffect, useRef, useState } from 'react'
import { SheetHandle } from './SheetHandle'
import { MONTHS_AR } from '../lib/txFilters'
import { ageLabel, ageOf } from '../lib/profile'
import { haptic } from '../lib/haptics'

const ITEM_H = 44
const VISIBLE = 5

/** عمود عجلة قابل للتمرير بالتقاط (scroll-snap) — العنصر بالمنتصف هو المختار. */
function Wheel<T extends string | number>({ items, value, onChange, render, label }: { items: T[]; value: T; onChange: (v: T) => void; render: (v: T) => string; label: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const timer = useRef<number | null>(null)
  const index = Math.max(0, items.indexOf(value))

  // المزامنة من القيمة للتمرير (أول فتح، أو تصحيح اليوم بعد تغيير الشهر).
  useEffect(() => {
    const el = ref.current
    if (el && Math.round(el.scrollTop / ITEM_H) !== index) el.scrollTop = index * ITEM_H
  }, [index])

  function onScroll() {
    if (timer.current !== null) window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => {
      const el = ref.current
      if (!el) return
      const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM_H)))
      if (items[i] !== value) {
        haptic('tick')
        onChange(items[i])
      }
    }, 90)
  }

  return (
    <div
      ref={ref}
      onScroll={onScroll}
      role="listbox"
      aria-label={label}
      data-own-gesture
      className="relative z-10 min-w-0 flex-1 snap-y snap-mandatory overflow-y-auto overscroll-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      style={{
        height: ITEM_H * VISIBLE,
        paddingBlock: ITEM_H * Math.floor(VISIBLE / 2),
        maskImage: 'linear-gradient(180deg, transparent, #000 30%, #000 70%, transparent)',
        WebkitMaskImage: 'linear-gradient(180deg, transparent, #000 30%, #000 70%, transparent)',
      }}
    >
      {items.map((it, i) => (
        <button
          key={String(it)}
          type="button"
          role="option"
          aria-selected={i === index}
          onClick={() => ref.current?.scrollTo({ top: i * ITEM_H, behavior: 'smooth' })}
          className="num flex w-full snap-center items-center justify-center whitespace-nowrap"
          style={{
            height: ITEM_H,
            fontSize: i === index ? 18 : 15,
            fontWeight: i === index ? 700 : 500,
            color: i === index ? 'var(--color-text)' : 'var(--color-text-3)',
            transition: 'font-size 150ms ease, color 150ms ease',
          }}
        >
          {render(it)}
        </button>
      ))}
    </div>
  )
}

const pad = (n: number) => String(n).padStart(2, '0')
const daysIn = (y: number, m: number) => new Date(y, m, 0).getDate()

/**
 * اختيار تاريخ ميلاد عملي: ورقة بثلاث عجلات (اليوم، الشهر، السنة) بدل تقويم شهري —
 * الوصول لأي سنة بتمريرة واحدة، والعمر يظهر مباشرة.
 */
export function WheelDatePicker({ value, onChange, placeholder = 'تاريخ الميلاد', minYear = 1930 }: { value: string; onChange: (v: string) => void; placeholder?: string; minYear?: number }) {
  const now = new Date()
  const maxYear = now.getFullYear()
  const [open, setOpen] = useState(false)
  const parsed = value.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  const [y, setY] = useState(0)
  const [m, setM] = useState(1)
  const [d, setD] = useState(1)

  function openSheet() {
    setY(parsed ? Number(parsed[1]) : maxYear - 25)
    setM(parsed ? Number(parsed[2]) : 1)
    setD(parsed ? Number(parsed[3]) : 1)
    setOpen(true)
  }

  const maxDay = y ? daysIn(y, m) : 31
  const day = Math.min(d, maxDay)
  const draftIso = `${y}-${pad(m)}-${pad(day)}`
  const draftAge = y ? ageOf(draftIso, now) : null
  const years = Array.from({ length: maxYear - minYear + 1 }, (_, i) => maxYear - i)
  const months = Array.from({ length: 12 }, (_, i) => i + 1)
  const days = Array.from({ length: maxDay }, (_, i) => i + 1)

  const label = parsed ? `${Number(parsed[3])} ${MONTHS_AR[Number(parsed[2]) - 1]} ${parsed[1]}` : placeholder

  return (
    <>
      <button
        type="button"
        onClick={openSheet}
        className="qb-press flex h-[52px] w-full items-center gap-2.5 rounded-[18px] border border-[var(--color-border)] bg-[var(--color-surface)] px-3.5 text-right"
      >
        <span className="text-[var(--color-text-3)]">
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="5" width="18" height="16" rx="3" />
            <path d="M3 10h18M8 3v4M16 3v4" />
          </svg>
        </span>
        <span className={`num min-w-0 flex-1 truncate text-[14.5px] ${parsed ? 'font-semibold' : 'text-[var(--color-text-3)]'}`}>{label}</span>
      </button>

      {open && (
        <div dir="rtl" className="fixed inset-0 z-[70] flex items-end justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" style={{ animation: 'fade-in 180ms ease-out both' }} onClick={() => setOpen(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-label="تاريخ الميلاد"
            className="relative w-full max-w-[480px] rounded-t-[32px] border-x border-t border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] px-5 pb-3"
            style={{ animation: 'sheet-in 420ms var(--ease-out-expo) both' }}
          >
            <SheetHandle onDismiss={() => setOpen(false)} />
            <div className="mb-3 mt-1 flex items-center justify-between">
              <div className="text-[17px] font-semibold">تاريخ الميلاد</div>
              {draftAge !== null && <span className="num rounded-full bg-white/[0.08] px-3 py-1.5 text-[12.5px] font-bold">{ageLabel(draftAge)}</span>}
            </div>

            <div className="relative flex gap-1" dir="rtl">
              {/* شريط التحديد بالمنتصف */}
              <div
                className="pointer-events-none absolute inset-x-0 rounded-2xl border border-[var(--color-border-strong)] bg-white/[0.06]"
                style={{ top: ITEM_H * Math.floor(VISIBLE / 2), height: ITEM_H }}
                aria-hidden="true"
              />
              <Wheel label="اليوم" items={days} value={day} onChange={setD} render={(v) => String(v)} />
              <Wheel label="الشهر" items={months} value={m} onChange={setM} render={(v) => MONTHS_AR[v - 1]} />
              <Wheel label="السنة" items={years} value={y} onChange={setY} render={(v) => String(v)} />
            </div>

            <div className="mt-4 flex gap-2">
              {value && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('')
                    setOpen(false)
                  }}
                  className="qb-press h-12 rounded-2xl border border-[var(--color-border)] px-5 text-[13.5px] font-semibold text-[var(--color-text-2)]"
                >
                  مسح
                </button>
              )}
              <button
                type="button"
                onClick={() => {
                  haptic('success')
                  onChange(draftIso)
                  setOpen(false)
                }}
                className="qb-press h-12 flex-1 rounded-2xl text-[14px] font-bold"
                style={{ background: 'var(--color-accent)', color: 'var(--color-on-accent)' }}
              >
                تم
              </button>
            </div>
            <div className="safe-bottom" />
          </div>
        </div>
      )}
    </>
  )
}
