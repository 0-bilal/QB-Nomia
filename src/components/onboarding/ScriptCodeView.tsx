import { useMemo } from 'react'

/** كود Apps Script كما ينسخه المستخدم، مع تمييز سطر مفتاح الدخول (AUTH_KEY). */
export function ScriptCodeView({ code, highlight }: { code: string; highlight: string }) {
  // ترويسة الشرح الطويلة تنسخ مع الكود لكن ما تُعرض هنا — العرض يبدأ من سطر مفتاح الدخول.
  const lines = useMemo(() => {
    const all = code.split('\n')
    const start = all.findIndex((l) => l.startsWith('var AUTH_KEY'))
    return start > 0 ? all.slice(start) : all
  }, [code])
  return (
    <pre dir="ltr" className="select-text max-h-[220px] overflow-auto px-3 py-2.5 text-left font-mono text-[10.5px] leading-[1.7] text-[var(--color-text-2)]">
      {lines.map((l, i) => {
        if (l.includes(`'${highlight}'`) && l.includes('AUTH_KEY =')) {
          const [a, b] = l.split(`'${highlight}'`)
          return (
            <div key={i}>
              {a}
              <span className="rounded-[4px] px-0.5" style={{ background: 'color-mix(in srgb, var(--color-income) 16%, transparent)', color: 'var(--color-income)' }}>
                '{highlight}'
              </span>
              {b}
            </div>
          )
        }
        const comment = /^\s*(\/\/|\/\*\*?|\*)/.test(l)
        return (
          // التعليقات العربية بالخط العادي — الخط الأحادي يفكّك الحروف العربية.
          <div key={i} style={comment ? { color: 'var(--color-text-3)', fontFamily: 'var(--font-sans)' } : undefined}>
            {l || ' '}
          </div>
        )
      })}
    </pre>
  )
}
