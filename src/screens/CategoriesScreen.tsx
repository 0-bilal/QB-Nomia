import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney } from '../lib/format'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M13.5 8 16 10.5" />
    </svg>
  )
}

function SetBudgetDialog({
  open,
  initialValue,
  onSave,
  onClear,
  onCancel,
}: {
  open: boolean
  initialValue: number | null
  onSave: (value: number) => void
  onClear: () => void
  onCancel: () => void
}) {
  const [value, setValue] = useState(initialValue ? String(initialValue) : '')

  if (!open) return null

  const numeric = Number(value)
  const canSave = value.trim() !== '' && numeric > 0

  return (
    <div dir="rtl" className="fixed inset-0 z-[60] flex items-center justify-center px-6">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" style={{ animation: 'fade-in 180ms ease-out both' }} onClick={onCancel} aria-hidden="true" />
      <div
        className="relative w-full max-w-[320px] rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface-elevated)] p-5 text-center shadow-[0_20px_50px_-12px_rgba(0,0,0,0.7)]"
        style={{ animation: 'speed-dial-in 200ms ease-out both' }}
      >
        <div className="mb-1.5 text-[15px] font-bold">الميزانية الإجمالية الشهرية</div>
        <div className="mb-4 text-[12.5px] leading-relaxed text-[var(--color-text-2)]">
          سقف عام لكل مصاريفك الشهرية، بجانب ميزانيات الفئات الفردية
        </div>
        <input
          autoFocus
          dir="ltr"
          inputMode="decimal"
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/[^0-9.]/g, ''))}
          placeholder="0"
          className="num mb-4 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-void)] px-4 py-3 text-center text-[18px] font-bold outline-none placeholder:text-[var(--color-text-3)]"
        />
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="flex-1 rounded-2xl border border-[var(--color-border)] py-2.75 text-[13px] font-semibold text-[var(--color-text-2)]">
            إلغاء
          </button>
          <button
            onClick={() => canSave && onSave(numeric)}
            disabled={!canSave}
            className="flex-1 rounded-2xl py-2.75 text-[13px] font-bold text-[#0A0A0C] disabled:opacity-40"
            style={{ background: 'var(--color-accent)' }}
          >
            حفظ
          </button>
        </div>
        {initialValue !== null && (
          <button onClick={onClear} className="mt-3 text-[12px] font-semibold" style={{ color: 'var(--color-expense)' }}>
            إزالة الميزانية الإجمالية
          </button>
        )}
      </div>
    </div>
  )
}

export function CategoriesScreen() {
  const { categories, categorySpentThisMonth, monthlyBudgetLimit, setMonthlyBudgetLimit, monthTotals } = useData()
  const navigate = useNavigate()
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)
  const expenseCategories = categories.filter((c) => c.kind === 'expense')

  const monthExpense = monthTotals().expense
  const overallRawPct = monthlyBudgetLimit ? (monthExpense / monthlyBudgetLimit) * 100 : null
  const overallPct = overallRawPct !== null ? Math.min(100, overallRawPct) : null

  return (
    <ScreenScroll
      header={
        <ScreenHeader
          title="فئات المصاريف"
          onBack={() => navigate(-1)}
          right={
            <button
              onClick={() => navigate('/categories/new')}
              className="qb-glass-circle qb-press flex h-9.5 w-9.5 items-center justify-center rounded-full border"
              style={{ width: 38, height: 38, color: 'var(--color-accent)' }}
              aria-label="إضافة فئة"
            >
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          }
        />
      }
    >
      <SetBudgetDialog
        open={budgetDialogOpen}
        initialValue={monthlyBudgetLimit}
        onSave={(v) => {
          setMonthlyBudgetLimit(v)
          setBudgetDialogOpen(false)
        }}
        onClear={() => {
          setMonthlyBudgetLimit(null)
          setBudgetDialogOpen(false)
        }}
        onCancel={() => setBudgetDialogOpen(false)}
      />

      <button onClick={() => setBudgetDialogOpen(true)} className="qb-card-elevated qb-press mb-5 block w-full p-4.5 text-right">
        <div className="mb-2 flex items-center justify-between">
          <div className="qb-section-label">الميزانية الإجمالية الشهرية</div>
          <div className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--color-text-3)]" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <EditIcon />
          </div>
        </div>
        {monthlyBudgetLimit === null ? (
          <div className="text-[12.5px] text-[var(--color-text-3)]">ما حددت سقف مصاريف شهري بعد — اضغط لتحديده</div>
        ) : (
          <>
            <div className="num mb-2.5 flex items-baseline justify-between">
              <span className="text-[20px] font-bold" style={{ color: overallRawPct !== null && overallRawPct >= 100 ? 'var(--color-expense)' : 'var(--color-text)' }}>
                {formatMoney(monthExpense)}
              </span>
              <span className="text-[12.5px] text-[var(--color-text-3)]">من {formatMoney(monthlyBudgetLimit)}</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/8">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${overallPct ?? 0}%`,
                  background: (overallRawPct ?? 0) >= 100 ? 'var(--color-expense)' : (overallRawPct ?? 0) >= 80 ? 'var(--color-subscription)' : 'var(--color-income)',
                }}
              />
            </div>
            {overallRawPct !== null && overallRawPct >= 100 && (
              <div className="mt-1.5 text-[11px] font-semibold" style={{ color: 'var(--color-expense)' }}>
                تجاوزت الميزانية الإجمالية بـ {formatMoney(monthExpense - monthlyBudgetLimit)}
              </div>
            )}
            {overallRawPct !== null && overallRawPct >= 80 && overallRawPct < 100 && (
              <div className="mt-1.5 text-[11px] font-semibold" style={{ color: 'var(--color-subscription)' }}>
                قاربت على تجاوز الميزانية الإجمالية ({Math.round(overallRawPct)}%)
              </div>
            )}
          </>
        )}
      </button>

      <div className="qb-section-label mb-2 px-1">ميزانيات الفئات</div>

      {expenseCategories.length === 0 ? (
        <div className="qb-card py-10 text-center text-[13px] text-[var(--color-text-3)]">لا توجد فئات بعد</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {expenseCategories.map((c) => {
            const spent = categorySpentThisMonth(c.id)
            const rawPct = c.budgetLimit ? (spent / c.budgetLimit) * 100 : null
            const pct = rawPct !== null ? Math.min(100, rawPct) : null
            return (
              <button
                key={c.id}
                onClick={() => navigate(`/categories/${c.id}/edit`)}
                className="qb-card qb-press p-4 text-right"
              >
                <div className="flex items-center justify-between">
                  <div className="text-[13.5px] font-bold">{c.name}</div>
                  <div className="num text-[13px] font-semibold text-[var(--color-text-2)]">
                    {formatMoney(spent)}
                    {c.budgetLimit ? ` / ${formatMoney(c.budgetLimit)}` : ''}
                  </div>
                </div>
                {pct !== null && (
                  <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/6">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--color-expense)' : pct >= 80 ? 'var(--color-subscription)' : 'var(--color-accent)' }}
                    />
                  </div>
                )}
                {rawPct !== null && rawPct >= 100 && (
                  <div className="mt-1.5 text-[11px] font-semibold" style={{ color: 'var(--color-expense)' }}>
                    تجاوزت الميزانية بـ {formatMoney(spent - (c.budgetLimit ?? 0))}
                  </div>
                )}
                {rawPct !== null && rawPct >= 80 && rawPct < 100 && (
                  <div className="mt-1.5 text-[11px] font-semibold" style={{ color: 'var(--color-subscription)' }}>
                    قاربت على تجاوز الميزانية ({Math.round(rawPct)}%)
                  </div>
                )}
              </button>
            )
          })}
        </div>
      )}
    </ScreenScroll>
  )
}
