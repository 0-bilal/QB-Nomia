import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useData } from '../state/DataContext'
import { formatMoney } from '../lib/format'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { colorFor } from '../components/Avatar'
import { CategoryIcon } from '../components/CategoryIcons'
import { BigAmount } from '../components/BigAmount'
import { EmptyState, HeaderAddButton, IconBubble, ListGroup, ProgressBar, RingProgress, SectionTitle } from '../components/ui'
import { budgetColor, rise } from '../lib/motion'

function EditIcon() {
  return (
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M13.5 8 16 10.5" />
    </svg>
  )
}

function ChevronUpIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 15 12 8 19 15" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 9 12 16 19 9" />
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
      <div className="absolute inset-0 bg-black/70 backdrop-blur-[6px]" style={{ animation: 'fade-in 180ms ease-out both' }} onClick={onCancel} aria-hidden="true" />
      <div
        className="relative w-full max-w-[330px] rounded-[32px] border border-[var(--color-border-strong)] bg-[var(--color-surface-elevated)] p-6 text-center shadow-[0_30px_70px_-20px_rgba(0,0,0,0.9)]"
        style={{ animation: 'qb-pop 340ms var(--ease-spring) both' }}
      >
        <div className="mb-2 text-[17px] font-semibold">الميزانية الإجمالية الشهرية</div>
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
          className="num mb-5 w-full rounded-[20px] border border-[var(--color-border)] bg-[var(--color-void)] px-4 py-4 text-center text-[28px] font-bold outline-none placeholder:text-[var(--color-text-3)]"
        />
        <div className="flex gap-2.5">
          <button onClick={onCancel} className="qb-press flex-1 rounded-full bg-white/[0.06] py-3 text-[13.5px] font-medium text-[var(--color-text)]">
            إلغاء
          </button>
          <button
            onClick={() => canSave && onSave(numeric)}
            disabled={!canSave}
            className="qb-press flex-1 rounded-full py-3 text-[13.5px] font-semibold text-[#0A0A0C] disabled:opacity-35"
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
  const { categories, categorySpentThisMonth, monthlyBudgetLimit, setMonthlyBudgetLimit, monthTotals, moveCategoryUp, moveCategoryDown } = useData()
  const navigate = useNavigate()
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)
  const expenseCategories = categories.filter((c) => c.kind === 'expense')

  const monthExpense = monthTotals().expense
  const overallRawPct = monthlyBudgetLimit ? (monthExpense / monthlyBudgetLimit) * 100 : null
  const overallPct = overallRawPct !== null ? Math.min(100, overallRawPct) : null

  const totalSpent = expenseCategories.reduce((sum, c) => sum + categorySpentThisMonth(c.id), 0)

  return (
    <ScreenScroll header={<ScreenHeader title="فئات المصاريف" onBack={() => navigate(-1)} right={<HeaderAddButton label="إضافة فئة" onClick={() => navigate('/categories/new')} />} />}>
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

      <button onClick={() => setBudgetDialogOpen(true)} className="qb-card-elevated qb-press qb-rise mb-6 block w-full p-5 text-right">
        <div className="flex items-center gap-5">
          <RingProgress pct={overallPct ?? 0} size={104} color={budgetColor(overallRawPct ?? 0)}>
            <span className="num text-[22px] font-bold leading-none">{overallRawPct !== null ? `${Math.round(overallRawPct)}%` : '—'}</span>
            <span className="mt-1 text-[10px] text-[var(--color-text-3)]">من الميزانية</span>
          </RingProgress>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex items-center justify-between">
              <span className="text-[12.5px] font-medium text-[var(--color-text-2)]">مصروف هذا الشهر</span>
              <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.08] text-[var(--color-text-2)]">
                <EditIcon />
              </span>
            </div>
            <BigAmount value={monthExpense} size={28} color={overallRawPct !== null && overallRawPct >= 100 ? 'var(--color-expense)' : undefined} />
            <div className="mt-2 text-[12px] text-[var(--color-text-3)]">
              {monthlyBudgetLimit === null ? 'اضغط لتحديد سقف مصاريف شهري' : `السقف الشهري ${formatMoney(monthlyBudgetLimit)}`}
            </div>
            {overallRawPct !== null && overallRawPct >= 100 && (
              <div className="mt-1 text-[11.5px] font-semibold" style={{ color: 'var(--color-expense)' }}>
                تجاوزت بـ {formatMoney(monthExpense - (monthlyBudgetLimit ?? 0))}
              </div>
            )}
            {overallRawPct !== null && overallRawPct >= 80 && overallRawPct < 100 && (
              <div className="mt-1 text-[11.5px] font-semibold" style={{ color: 'var(--color-subscription)' }}>
                قاربت على التجاوز
              </div>
            )}
          </div>
        </div>
      </button>

      {totalSpent > 0 && (
        <div className="qb-rise mb-6" style={rise(1)}>
          <SectionTitle title="توزيع الإنفاق" />
          <div className="flex h-3 gap-1 overflow-hidden rounded-full">
            {expenseCategories
              .map((c) => ({ c, spent: categorySpentThisMonth(c.id) }))
              .filter((x) => x.spent > 0)
              .sort((x, y) => y.spent - x.spent)
              .map(({ c, spent }) => (
                <div key={c.id} className="h-full rounded-full" style={{ width: `${(spent / totalSpent) * 100}%`, background: colorFor(c.name) }} title={c.name} />
              ))}
          </div>
        </div>
      )}

      <SectionTitle title="ميزانيات الفئات" hint="رتّب بالأسهم — الأعلى يظهر أول بقائمة اختيار الفئة عند إضافة حركة" />

      {expenseCategories.length === 0 ? (
        <EmptyState title="لا توجد فئات بعد" actionLabel="إضافة فئة" onAction={() => navigate('/categories/new')} />
      ) : (
        <ListGroup className="qb-rise">
          {expenseCategories.map((c, idx) => {
            const spent = categorySpentThisMonth(c.id)
            const rawPct = c.budgetLimit ? (spent / c.budgetLimit) * 100 : null
            const cColor = colorFor(c.name)
            return (
              <div key={c.id} className={`flex items-center gap-2 py-3 pe-4 ps-2 ${idx > 0 ? 'border-t qb-divider' : ''}`}>
                <button onClick={() => navigate(`/categories/${c.id}/edit`)} className="flex min-w-0 flex-1 items-center gap-3 ps-2 text-right">
                  <IconBubble color={cColor}>
                    {c.icon ? <CategoryIcon iconKey={c.icon} size={19} /> : <span style={{ fontWeight: 600, fontSize: 16 }}>{c.name.trim().charAt(0) || '؟'}</span>}
                  </IconBubble>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="truncate text-[14px] font-medium">{c.name}</div>
                      <div className="num flex-shrink-0 text-[13.5px] font-semibold">{formatMoney(spent)}</div>
                    </div>
                    {rawPct !== null ? (
                      <>
                        <div className="mt-2">
                          <ProgressBar pct={rawPct} color={budgetColor(rawPct)} height={6} />
                        </div>
                        <div className="mt-1 flex justify-between text-[10.5px]">
                          <span style={{ color: rawPct >= 80 ? budgetColor(rawPct) : 'var(--color-text-3)' }}>
                            {rawPct >= 100 ? `تجاوزت بـ ${formatMoney(spent - (c.budgetLimit ?? 0))}` : `${Math.round(rawPct)}%`}
                          </span>
                          <span className="num text-[var(--color-text-3)]">من {formatMoney(c.budgetLimit ?? 0)}</span>
                        </div>
                      </>
                    ) : (
                      <div className="text-[11px] text-[var(--color-text-3)]">بدون ميزانية</div>
                    )}
                  </div>
                </button>
                <div data-own-gesture className="flex flex-shrink-0 flex-col gap-1">
                  <button
                    onClick={() => moveCategoryUp(c.id)}
                    disabled={idx === 0}
                    aria-label="نقل الفئة لأعلى"
                    className="qb-press flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-[var(--color-text-2)] disabled:opacity-25"
                  >
                    <ChevronUpIcon />
                  </button>
                  <button
                    onClick={() => moveCategoryDown(c.id)}
                    disabled={idx === expenseCategories.length - 1}
                    aria-label="نقل الفئة لأسفل"
                    className="qb-press flex h-7 w-7 items-center justify-center rounded-full bg-white/[0.06] text-[var(--color-text-2)] disabled:opacity-25"
                  >
                    <ChevronDownIcon />
                  </button>
                </div>
              </div>
            )
          })}
        </ListGroup>
      )}
    </ScreenScroll>
  )
}
