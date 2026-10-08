import { useNavigate } from 'react-router-dom'
import { useData, type ActivityItem } from '../state/DataContext'
import { activityEditPath } from '../lib/activityNav'
import { showUndoToast } from '../lib/undoToast'
import { haptic } from '../lib/haptics'
import { PencilIcon, RepeatIcon, TrashIcon, type SwipeAction } from '../components/SwipeableRow'

/**
 * اختصارات السحب الموحّدة لأي صف حركة بالتطبيق:
 *  - سحب لليسار ← حذف فوري مع زر "تراجع" (للحركات المالية العادية).
 *  - سحب لليمين ← "كرّرها" يفتح حركة جديدة بنفس النوع والمبلغ والحساب
 *    (حركات السلف: تعديل بدل التكرار لأن لها شاشة مستقلة).
 */
export function useActivitySwipe() {
  const navigate = useNavigate()
  const { transactions, deleteTransaction } = useData()

  return function swipeFor(item: ActivityItem): { leftSwipe?: SwipeAction; rightSwipe?: SwipeAction } {
    const isLoan = item.kind === 'loan-given' || item.kind === 'loan-received'
    if (isLoan) {
      return {
        rightSwipe: {
          label: 'تعديل',
          icon: <PencilIcon />,
          color: 'var(--color-transfer)',
          onTrigger: () => navigate(activityEditPath(item)),
        },
      }
    }

    const txn = transactions.find((t) => t.id === item.id)
    if (!txn) return {}

    return {
      leftSwipe: {
        label: 'حذف',
        icon: <TrashIcon />,
        color: 'var(--color-expense)',
        onTrigger: () => {
          deleteTransaction(txn.id)
          haptic('warning')
          showUndoToast('تم حذف الحركة', (data) =>
            data.addTransaction({
              type: txn.type,
              amount: txn.amount,
              date: txn.date,
              accountId: txn.accountId,
              categoryId: txn.categoryId,
              incomeSourceId: txn.incomeSourceId,
              transferToAccountId: txn.transferToAccountId,
              note: txn.note,
            }),
          )
        },
      },
      rightSwipe: {
        label: 'كرّرها',
        icon: <RepeatIcon />,
        color: 'var(--color-accent)',
        textColor: 'var(--color-on-accent)',
        onTrigger: () => {
          const params = new URLSearchParams({ type: txn.type, amount: String(txn.amount), from: txn.accountId })
          if (txn.transferToAccountId) params.set('to', txn.transferToAccountId)
          navigate(`/add/transaction?${params.toString()}`)
        },
      },
    }
  }
}
