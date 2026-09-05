import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useData, isProtectedCategory } from '../state/DataContext'
import { ScreenScroll } from '../components/ScreenScroll'
import { ScreenHeader } from '../components/ScreenHeader'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { showUndoToast } from '../lib/undoToast'
import { formatDate, formatMoney } from '../lib/format'
import { ACCOUNT_TYPE_LABELS, AccountTypeIcon } from '../components/AccountVisuals'
import { colorFor } from '../components/Avatar'
import { CATEGORY_ICON_OPTIONS, CategoryIcon } from '../components/CategoryIcons'

function EditBadgeIcon() {
  return (
    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="M13.5 8 16 10.5" />
    </svg>
  )
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
      <line x1="6" y1="6" x2="18" y2="18" />
      <line x1="18" y1="6" x2="6" y2="18" />
    </svg>
  )
}

function IconPickerSheet({
  open,
  selected,
  color,
  onSelect,
  onClose,
}: {
  open: boolean
  selected?: string
  color: string
  onSelect: (key: string) => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div dir="rtl" className="fixed inset-0 z-[60] flex items-end justify-center">
      <div className="absolute inset-0 bg-black/65 backdrop-blur-[2px]" style={{ animation: 'fade-in 180ms ease-out both' }} onClick={onClose} aria-hidden="true" />
      <div
        className="relative flex max-h-[75vh] w-full max-w-[480px] flex-col rounded-t-[28px] border-x border-t border-[var(--color-border)] bg-[var(--color-surface-elevated)] shadow-[0_-24px_60px_-20px_rgba(0,0,0,0.85)]"
        style={{ animation: 'sheet-in 260ms cubic-bezier(0.16,1,0.3,1) both' }}
      >
        <div className="mx-auto mb-1 mt-2.5 h-1 w-9 flex-shrink-0 rounded-full bg-white/15" />
        <div className="flex flex-shrink-0 items-center justify-between px-5 py-3">
          <div className="text-[15px] font-bold">اختر أيقونة الفئة</div>
          <button onClick={onClose} aria-label="إغلاق" className="qb-press flex h-8 w-8 items-center justify-center rounded-full text-[var(--color-text-2)]" style={{ background: 'rgba(255,255,255,0.08)' }}>
            <CloseIcon />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-4 pb-2">
          <div className="grid grid-cols-4 gap-2.5 pb-2">
            {CATEGORY_ICON_OPTIONS.map((opt) => {
              const active = opt.key === selected
              return (
                <button
                  key={opt.key}
                  onClick={() => onSelect(opt.key)}
                  className="qb-press flex flex-col items-center gap-1.5 rounded-2xl border py-3"
                  style={active ? { borderColor: color, background: `${color}14` } : { borderColor: 'var(--color-border)', background: 'var(--color-surface)' }}
                >
                  <div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" style={{ width: 36, height: 36, background: `${color}22`, color }}>
                    <CategoryIcon iconKey={opt.key} size={18} />
                  </div>
                  <span className="truncate px-1 text-[10px] font-semibold text-[var(--color-text-2)]">{opt.label}</span>
                </button>
              )
            })}
          </div>
        </div>
        <div className="safe-bottom flex-shrink-0" />
      </div>
    </div>
  )
}

export function AddCategoryScreen() {
  const { id } = useParams<{ id?: string }>()
  const { categories, addCategory, updateCategory, deleteCategory, transactions, accounts } = useData()
  const navigate = useNavigate()

  const existing = id ? categories.find((c) => c.id === id) : undefined
  const isEditing = Boolean(existing)
  const isProtected = Boolean(id && isProtectedCategory(id))

  const [name, setName] = useState(existing?.name ?? '')
  const [budgetLimit, setBudgetLimit] = useState(existing?.budgetLimit ? String(existing.budgetLimit) : '')
  const [icon, setIcon] = useState(existing?.icon)
  const [iconPickerOpen, setIconPickerOpen] = useState(false)
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const previewColor = colorFor(name || 'فئة')

  // كل حركات هذي الفئة من أول ما استُخدمت — مو بس الشهر الحالي (المعروض
  // أصلًا بشاشة "فئات المصاريف" نفسها كمصروف/ميزانية الشهر).
  const categoryTransactions = isEditing
    ? transactions.filter((t) => t.type === 'expense' && t.categoryId === id).sort((a, b) => (a.date === b.date ? 0 : a.date < b.date ? 1 : -1))
    : []
  const categoryTotal = categoryTransactions.reduce((sum, t) => sum + t.amount, 0)

  function handleSave() {
    if (!name.trim()) return
    const input = {
      name,
      kind: 'expense' as const,
      budgetLimit: budgetLimit ? Number(budgetLimit) : undefined,
      icon,
    }
    if (isEditing && id) updateCategory(id, input)
    else addCategory(input)
    navigate('/categories', { replace: true })
  }

  function handleDelete() {
    if (!id || !existing) return
    const { name, kind, budgetLimit, icon } = existing
    deleteCategory(id)
    navigate('/categories', { replace: true })
    showUndoToast('تم حذف الفئة', () => addCategory({ name, kind, budgetLimit, icon }))
  }

  return (
    <ScreenScroll
      header={
        <ScreenHeader
          title={isEditing ? 'تعديل فئة' : 'إضافة فئة'}
          onBack={() => navigate(-1)}
          cancelLabel="إلغاء"
          className="pt-8 pb-6"
          right={
            isEditing && !isProtected ? (
              <button onClick={() => setConfirmDeleteOpen(true)} className="qb-press text-[13px] font-semibold" style={{ color: 'var(--color-expense)' }}>
                حذف
              </button>
            ) : (
              <div className="w-10" />
            )
          }
        />
      }
      footer={
        <div className="px-5 pb-6 pt-3">
          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full rounded-2xl py-3.5 text-center text-[14.5px] font-bold text-[#0A0A0C] disabled:opacity-40"
            style={{ background: 'var(--color-accent)' }}
          >
            {isEditing ? 'حفظ التعديلات' : 'حفظ'}
          </button>
        </div>
      }
    >
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="حذف الفئة"
        message="بيتم حذف هذي الفئة — الحركات المسجّلة عليها سابقًا بتبقى بسجلك بس بدون فئة."
        confirmLabel="حذف"
        color="var(--color-expense)"
        onConfirm={handleDelete}
        onCancel={() => setConfirmDeleteOpen(false)}
      />

      <IconPickerSheet
        open={iconPickerOpen}
        selected={icon}
        color={previewColor}
        onSelect={(key) => {
          setIcon(key)
          setIconPickerOpen(false)
        }}
        onClose={() => setIconPickerOpen(false)}
      />

      <div className="mb-5 flex justify-center">
        <button type="button" onClick={() => setIconPickerOpen(true)} className="qb-press flex flex-col items-center gap-2" aria-label="اختيار أيقونة الفئة">
          <div className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center">
            <div
              className="flex h-16 w-16 items-center justify-center rounded-full"
              style={{ width: 64, height: 64, background: `${previewColor}22`, color: previewColor }}
            >
              {icon ? <CategoryIcon iconKey={icon} size={28} /> : <span style={{ fontWeight: 700, fontSize: 24 }}>{name.trim().charAt(0) || '؟'}</span>}
            </div>
            <div
              className="absolute -bottom-1 -left-1 flex h-6 w-6 items-center justify-center rounded-full border-2"
              style={{ background: 'var(--color-surface-elevated)', borderColor: 'var(--color-bg)', color: 'var(--color-text-2)' }}
            >
              <EditBadgeIcon />
            </div>
          </div>
          <span className="text-[11.5px] font-semibold" style={{ color: 'var(--color-accent)' }}>
            اختر أيقونة
          </span>
        </button>
      </div>

      {isProtected && (
        <div className="mb-5 rounded-2xl border border-dashed p-3.5 text-[12px] leading-relaxed" style={{ borderColor: 'rgba(255,255,255,0.16)', color: 'var(--color-text-2)' }}>
          هذي فئة أساسية يعتمد عليها التطبيق داخليًا (لحركات مثل الاشتراكات أو الالتزامات أو تسديد الديون)، فما ينحذفها حتى ما تختفي فئة تلك الحركات مستقبلًا. تقدر تعدّل اسمها أو أيقونتها بس.
        </div>
      )}

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">اسم الفئة</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="مثال: صيانة السيارة"
        className="mb-5 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      <label className="mb-1.5 block text-[12.5px] font-semibold text-[var(--color-text-2)]">ميزانية شهرية (اختياري)</label>
      <input
        dir="ltr"
        inputMode="decimal"
        value={budgetLimit}
        onChange={(e) => setBudgetLimit(e.target.value.replace(/[^0-9.]/g, ''))}
        placeholder="0"
        className="num mb-4 w-full rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-[14px] outline-none placeholder:text-[var(--color-text-3)]"
      />

      {isEditing && (
        <>
          <div className="mb-2 mt-3 flex items-center justify-between px-1">
            <div className="qb-section-label">حركات هذه الفئة</div>
            {categoryTransactions.length > 0 && (
              <span className="num text-[12.5px] font-bold" style={{ color: 'var(--color-expense)' }}>
                الإجمالي {formatMoney(categoryTotal)}
              </span>
            )}
          </div>
          {categoryTransactions.length === 0 ? (
            <div className="qb-card py-8 text-center text-[12.5px] text-[var(--color-text-3)]">لا توجد حركات مسجّلة على هذي الفئة بعد</div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {categoryTransactions.map((t) => {
                const account = accounts.find((a) => a.id === t.accountId)
                return (
                  <button key={t.id} onClick={() => navigate(`/add/transaction/${t.id}`)} className="qb-card qb-press p-3.5 text-right">
                    <div className="flex items-center justify-between">
                      <div className="text-[13px] font-bold">{formatDate(t.date)}</div>
                      <span className="num text-[13px] font-bold" style={{ color: 'var(--color-expense)' }}>
                        {formatMoney(t.amount)}
                      </span>
                    </div>
                    {t.note && <div className="mt-1 truncate text-[11.5px] text-[var(--color-text-2)]">{t.note}</div>}
                    {account && (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-[var(--color-text-3)]">
                        <AccountTypeIcon type={account.type} size={13} />
                        <span>{account.name} · {ACCOUNT_TYPE_LABELS[account.type]}</span>
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </>
      )}
    </ScreenScroll>
  )
}
