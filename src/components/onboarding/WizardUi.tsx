import type { ReactNode } from 'react'
import { CheckIcon, Icons, ObIcon } from './ObUi'

/** عناصر مشتركة بين معالج النسخة الاحتياطية ومعالج تحديث حماية المزامنة. */

export type LineState = 'idle' | 'run' | 'ok' | 'fail'



export function Kicker({ children }: { children: ReactNode }) {
  return <div className="mt-1 text-[11.5px] font-semibold text-[var(--color-text-3)]">{children}</div>
}

export function Title({ children }: { children: ReactNode }) {
  return <h1 className="mt-0.5 text-[24px] font-bold leading-[1.4]">{children}</h1>
}

export function Lead({ children }: { children: ReactNode }) {
  return <p className="mb-3.5 mt-1 text-[12.5px] leading-[1.8] text-[var(--color-text-3)]">{children}</p>
}

export function Em({ children }: { children: ReactNode }) {
  return <b className="font-semibold text-[var(--color-text)]">{children}</b>
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <span dir="ltr" className="num inline-block rounded-[5px] border border-[var(--color-border-strong)] bg-[var(--color-surface-high)] px-1.5 text-[10.5px] text-[var(--color-text)]">
      {children}
    </span>
  )
}

export function Ordered({ items }: { items: ReactNode[] }) {
  return (
    <div className="mt-3 flex flex-col gap-2">
      {items.map((it, i) => (
        <div key={i} className="flex gap-2.5 text-[12px] leading-[1.7] text-[var(--color-text-2)]">
          <span className="num mt-0.5 grid h-5 w-5 flex-none place-items-center rounded-full bg-[var(--color-surface-high)] text-[10.5px] font-bold text-[var(--color-text)]">{i + 1}</span>
          <span>{it}</span>
        </div>
      ))}
    </div>
  )
}

/** قائمة خطوات الاختبار: دائرة تدور أثناء التشغيل، صح أخضر عند النجاح، وإكس أحمر عند الفشل. */
export function CheckLines({ labels, states }: { labels: string[]; states: LineState[] }) {
  return (
    <>
      {labels.map((label, i) => {
        const s = states[i]
        return (
          <div key={label} className="flex items-center gap-2.5 px-1 py-2.5 text-[12.5px]" style={{ color: s === 'idle' ? 'var(--color-text-3)' : s === 'run' ? 'var(--color-text)' : 'var(--color-text-2)' }}>
            <span
              className="grid h-[22px] w-[22px] flex-none place-items-center rounded-full border-[1.5px]"
              style={
                s === 'ok'
                  ? { background: 'var(--color-income)', borderColor: 'var(--color-income)', color: 'var(--color-on-accent)' }
                  : s === 'fail'
                    ? { background: 'var(--color-expense)', borderColor: 'var(--color-expense)', color: 'var(--color-on-accent)' }
                    : s === 'run'
                      ? { borderColor: 'rgba(255,255,255,.15)', borderTopColor: '#fff', animation: 'spin 800ms linear infinite' }
                      : { borderColor: 'var(--color-surface-high)' }
              }
            >
              {s === 'ok' && <CheckIcon size={12} />}
              {s === 'fail' && <ObIcon size={11} width={3}>{Icons.close}</ObIcon>}
            </span>
            {label}
          </div>
        )
              })}
    </>
  )
}
