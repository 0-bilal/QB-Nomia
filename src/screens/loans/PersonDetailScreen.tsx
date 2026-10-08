import { useNavigate, useParams } from 'react-router-dom'
import { useData } from '../../state/DataContext'
import { Avatar } from '../../components/Avatar'
import { ScreenScroll } from '../../components/ScreenScroll'
import { formatDate, formatSigned } from '../../lib/format'
import { ScreenHeader } from '../../components/ScreenHeader'
import { BigAmount } from '../../components/BigAmount'
import { Badge, EmptyState, HeroCard, IconBubble, ListGroup, ListItem, SectionTitle, TintButton } from '../../components/ui'
import { rise } from '../../lib/motion'

export function PersonDetailScreen() {
  const { personId } = useParams<{ personId: string }>()
  const { people, personBalance, personTransactions, accounts } = useData()
  const navigate = useNavigate()

  const person = people.find((p) => p.id === personId)
  if (!person) {
    return (
      <div dir="rtl" className="safe-top px-5 pt-15 text-center text-[13px] text-[var(--color-text-3)]">
        هذا الشخص غير موجود
      </div>
    )
  }

  const balance = personBalance(person.id)
  const txns = personTransactions(person.id)
  const label = balance === 0 ? 'متعادل' : balance > 0 ? 'لك عنده' : 'عليك له'
  const color = balance === 0 ? 'var(--color-text-3)' : balance > 0 ? 'var(--color-owed-to)' : 'var(--color-owed-by)'
  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? ''

  const today = new Date().toISOString().slice(0, 10)

  return (
    <ScreenScroll
      header={
        <ScreenHeader
          title="دفتر الحساب"
          onBack={() => navigate(-1)}
          right={
            <button
              onClick={() => navigate(`/loans/${person.id}/edit`)}
              aria-label="تعديل الشخص"
              className="qb-glass-circle qb-press flex items-center justify-center rounded-full border text-[var(--color-text)]"
              style={{ width: 40, height: 40 }}
            >
              <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 20h4L19 9l-4-4L4 16v4Z" />
                <path d="M13.5 6.5l4 4" />
              </svg>
            </button>
          }
        />
      }
    >
      <HeroCard className="mb-4">
        <div className="flex items-center gap-3.5">
          <Avatar name={person.name} size={56} />
          <div className="min-w-0">
            <div className="truncate text-[19px] font-semibold">{person.name}</div>
            {person.phone ? (
              <div dir="ltr" className="num text-right text-[12.5px] text-[var(--color-text-3)]">
                {person.phone}
              </div>
            ) : (
              <div className="text-[12px] text-[var(--color-text-3)]">بدون رقم جوال</div>
            )}
          </div>
        </div>
        <div className="mt-6 flex items-end justify-between gap-3">
          <div>
            <div className="mb-1.5 text-[12.5px] font-medium" style={{ color }}>
              {label}
            </div>
            <BigAmount value={Math.abs(balance)} size={36} color={balance === 0 ? undefined : color} />
          </div>
          <Badge color={color}>{txns.length} حركة</Badge>
        </div>
      </HeroCard>

      <div className="qb-rise mb-6 grid grid-cols-2 gap-3" style={rise(1)}>
        <TintButton color="var(--color-owed-by)" onClick={() => navigate(`/loans/${person.id}/add?direction=given`)}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M7 17 17 7M9 7h8v8" />
          </svg>
          أعطه مبلغ
        </TintButton>
        <TintButton color="var(--color-owed-to)" onClick={() => navigate(`/loans/${person.id}/add?direction=received`)}>
          <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 7 7 17M15 17H7V9" />
          </svg>
          استلم منه
        </TintButton>
      </div>

      <SectionTitle title="سجل الحركات" />
      {txns.length === 0 ? (
        <EmptyState title={`لا توجد حركات مع ${person.name} بعد`} desc="سجّل أول مبلغ أعطيته أو استلمته من الأزرار بالأعلى." />
      ) : (
        <ListGroup className="qb-rise">
          {txns.map((t, i) => {
            const overdue = t.dueDate && t.dueDate < today
            const c = t.direction === 'given' ? 'var(--color-owed-by)' : 'var(--color-owed-to)'
            return (
              <ListItem
                key={t.id}
                divider={i > 0}
                onClick={() => navigate(`/loans/${person.id}/edit/${t.id}`)}
                leading={
                  <IconBubble color={c}>
                    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      {t.direction === 'given' ? <path d="M7 17 17 7M9 7h8v8" /> : <path d="M17 7 7 17M15 17H7V9" />}
                    </svg>
                  </IconBubble>
                }
                title={t.direction === 'given' ? 'أعطيته' : 'استلمت منه'}
                subtitle={`${formatDate(t.date)} · ${accountName(t.accountId)}${t.note ? ` · ${t.note}` : ''}`}
                trailing={
                  <span className="num text-[14px] font-bold" style={{ color: c }}>
                    {formatSigned(t.direction === 'given' ? t.amount : -t.amount)}
                  </span>
                }
                footer={
                  t.dueDate ? (
                    <Badge color={overdue ? 'var(--color-expense)' : 'var(--color-text-2)'}>{overdue ? 'متأخر السداد' : `الاستحقاق: ${formatDate(t.dueDate)}`}</Badge>
                  ) : undefined
                }
              />
            )
          })}
        </ListGroup>
      )}
    </ScreenScroll>
  )
}
