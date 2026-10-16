import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react'
import { CheckIcon, ObIcon } from './ObUi'

/**
 * عرض حي لواجهة Google Apps Script داخل المعالج: إطارات تتبدّل تلقائيًا،
 * ومؤشر يتحرك للعنصر المطلوب (data-target) ويضغط عليه، وتحته تعليق عربي.
 * الواجهة إنجليزية لأن هذا اللي يشوفه المستخدم غالبًا في جوجل.
 */
export interface GuideFrame {
  node: ReactNode
  caption: string
}

const FRAME_MS = 2600

export function GuideDemo({ url, frames }: { url: string; frames: GuideFrame[] }) {
  const [i, setI] = useState(0)
  const [click, setClick] = useState(0)
  const [cursor, setCursor] = useState<{ x: number; y: number } | null>(null)
  const stage = useRef<HTMLDivElement>(null)
  const frameRefs = useRef<(HTMLDivElement | null)[]>([])

  useEffect(() => {
    const t = window.setTimeout(() => setI((n) => (n + 1) % frames.length), FRAME_MS)
    return () => clearTimeout(t)
  }, [i, frames.length])

  useEffect(() => {
    const target = frameRefs.current[i]?.querySelector('[data-target]')
    const box = stage.current
    if (!target || !box) return
    const b = box.getBoundingClientRect()
    const r = target.getBoundingClientRect()
    setCursor({ x: r.left - b.left + r.width / 2, y: r.top - b.top + r.height / 2 })
    const t = window.setTimeout(() => setClick((c) => c + 1), 900)
    return () => clearTimeout(t)
  }, [i])

  return (
    <div className="overflow-hidden rounded-[20px] border border-[var(--color-border-strong)] bg-[#0d0d10]" aria-hidden="true">
      <div dir="ltr" className="flex items-center gap-1.5 border-b border-[var(--color-border)] px-2.5 py-2">
        {[0, 1, 2].map((d) => (
          <i key={d} className="h-[7px] w-[7px] rounded-full bg-[var(--color-surface-high)]" />
        ))}
        <span className="num ml-1.5 flex h-[22px] flex-1 items-center rounded-full bg-[var(--color-surface)] px-2.5 text-[10px] text-[var(--color-text-2)]">{url}</span>
      </div>
      <div ref={stage} dir="ltr" className="relative h-[200px] font-[Inter,system-ui,sans-serif] text-[11px] text-[var(--color-text-2)]">
        {frames.map((f, j) => (
          <div
            key={j}
            ref={(el) => {
              frameRefs.current[j] = el
            }}
            className="absolute inset-0 p-3"
            style={{ opacity: j === i ? 1 : 0, transition: 'opacity 350ms var(--ease-out-expo)' }}
          >
            {j === i ? f.node : <div style={{ visibility: 'hidden' }}>{f.node}</div>}
          </div>
        ))}
        {cursor && (
          <span
            key={click}
            className={`pointer-events-none absolute left-0 top-0 z-10 ${click ? 'qb-ob-click' : ''}`}
            style={{ transform: `translate(${cursor.x}px, ${cursor.y}px)`, transition: 'transform 700ms cubic-bezier(.22,1,.36,1)', filter: 'drop-shadow(0 2px 4px #000)' }}
          >
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M4 2l15 9-6.5 1.5L16 20l-3 1.5-3.5-7.5L4 18z" fill="#fff" stroke="#000" strokeWidth="1" />
            </svg>
          </span>
        )}
      </div>
      <div className="flex min-h-[52px] items-center gap-2.5 border-t border-[var(--color-border)] px-3 py-2.5">
        <span className="num grid h-[22px] w-[22px] flex-none place-items-center rounded-full bg-[var(--color-accent)] text-[11px] font-bold text-[var(--color-on-accent)]">{i + 1}</span>
        <p key={i} className="qb-rise text-[12px] leading-[1.6]">
          {frames[i].caption}
        </p>
      </div>
      <div className="flex justify-center gap-1 pb-2.5">
        {frames.map((_, j) => (
          <i
            key={j}
            className="h-[5px] rounded-full"
            style={{ width: j === i ? 14 : 5, background: j === i ? 'var(--color-accent)' : 'var(--color-surface-high)', transition: 'width 300ms var(--ease-spring), background 300ms' }}
          />
        ))}
      </div>
    </div>
  )
}

// ---------- قطع واجهة جوجل المصغّرة ----------

export function GBtn({ children, blue, target }: { children: ReactNode; blue?: boolean; target?: boolean }) {
  return (
    <span
      data-target={target ? '' : undefined}
      className={`relative inline-flex h-[26px] items-center gap-1 rounded-[7px] px-2.5 text-[10.5px] font-semibold ${target ? 'qb-ob-target' : ''}`}
      style={blue ? { background: '#e8e8ee', color: 'var(--color-on-accent)' } : { background: 'var(--color-surface-high)', color: 'var(--color-text)' }}
    >
      {children}
    </span>
  )
}

export function GTarget({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <span data-target="" className="qb-ob-target rounded-[4px]" style={style}>
      {children}
    </span>
  )
}

export function GBar({ title = 'QB-Nomia Backup', children }: { title?: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-2.5 flex items-center gap-1.5">
      <b className="text-[11px] text-[var(--color-text)]">{title}</b>
      <span className="flex-1" />
      {children}
    </div>
  )
}

export function GCode({ children }: { children: ReactNode }) {
  return <div className="whitespace-pre font-mono text-[9.5px] leading-[1.6] text-[var(--color-text-3)]">{children}</div>
}

export function GDialog({ title, children, actions, style }: { title: string; children?: ReactNode; actions?: ReactNode; style?: CSSProperties }) {
  return (
    <div className="absolute inset-x-[22px] inset-y-4 flex flex-col gap-1.5 rounded-[12px] border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] p-3" style={style}>
      <b className="text-[12px] text-[var(--color-text)]">{title}</b>
      {children}
      {actions && <div className="mt-auto flex justify-end gap-1.5">{actions}</div>}
    </div>
  )
}

export function GField({ label, value, target }: { label: ReactNode; value?: ReactNode; target?: boolean }) {
  return (
    <div className="mt-1 flex items-center justify-between gap-2 rounded-[6px] bg-[var(--color-surface)] px-2 py-1.5 text-[10px]">
      <span className="min-w-0 truncate">{label}</span>
      {value !== undefined && (target ? <GTarget><b className="font-semibold text-[var(--color-text)]">{value}</b></GTarget> : <b className="font-semibold text-[var(--color-text)]">{value}</b>)}
    </div>
  )
}

export function GMenu({ items, active, style }: { items: string[]; active: number; style?: CSSProperties }) {
  return (
    <div className="absolute min-w-[130px] rounded-[8px] border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] p-1 shadow-[0_12px_30px_-10px_#000]" style={style}>
      {items.map((it, j) =>
        j === active ? (
          <div key={it} data-target="" className="qb-ob-target rounded-[5px] bg-white/[0.08] px-2 py-1.5 text-[10.5px] text-[var(--color-text)]">
            {it}
          </div>
        ) : (
          <div key={it} className="px-2 py-1.5 text-[10.5px]">
            {it}
          </div>
        ),
      )}
    </div>
  )
}

export function GDone() {
  return (
    <span className="text-[var(--color-income)]">
      <CheckIcon size={12} />
    </span>
  )
}

export function GGear() {
  return (
    <ObIcon size={12}>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9 7 7M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </ObIcon>
  )
}
