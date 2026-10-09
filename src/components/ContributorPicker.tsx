import { colorFor } from './Avatar'
import type { Person } from '../types'

/** «أو دفعها عنك شخص» داخل ورقة الحساب — الأشخاص المفعّل لهم «مساهم» في السلف. */
export function ContributorPicker({ people, selectedId, onPick }: { people: Person[]; selectedId: string | null; onPick: (id: string) => void }) {
  return (
    <div className="mb-3 mt-1">
      <div className="mx-1 mb-2 text-[11.5px] font-semibold text-[var(--color-text-3)]">أو دفعها عنك شخص</div>
      {people.length === 0 ? (
        <div className="rounded-[18px] border border-dashed border-[var(--color-border-strong)] px-3.5 py-3 text-[11.5px] leading-relaxed text-[var(--color-text-3)]">
          فعّل «مساهم» لأي شخص من صفحته في السلف، ويظهر هنا لتسجيل مصروف دفعه عنك.
        </div>
      ) : (
        <div data-own-gesture className="-mx-4 flex gap-2.5 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {people.map((p) => {
            const on = p.id === selectedId
            const c = colorFor(p.name)
            return (
              <button key={p.id} onClick={() => onPick(p.id)} className="qb-press flex w-[64px] flex-shrink-0 flex-col items-center gap-1.5">
                <span
                  className="flex h-12 w-12 items-center justify-center rounded-full text-[18px] font-semibold"
                  style={{
                    background: `radial-gradient(120% 120% at 30% 20%, ${c}55, ${c}14 70%)`,
                    boxShadow: on ? `0 0 0 2px var(--color-surface-elevated), 0 0 0 4px ${c}` : `inset 0 0 0 1.5px ${c}40`,
                    color: c,
                    transition: 'box-shadow 250ms ease',
                  }}
                >
                  {p.name.trim().charAt(0) || '؟'}
                </span>
                <span className="max-w-full truncate text-[11px]" style={{ color: on ? 'var(--color-text)' : 'var(--color-text-2)', fontWeight: on ? 600 : 400 }}>
                  {p.name}
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
