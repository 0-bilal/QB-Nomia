import type { ActivityItem } from '../state/DataContext'

/** المسار المناسب لتعديل الحركة المصدرية وراء عنصر نشاط — حركة مالية عادية أو حركة سلفة. */
export function activityEditPath(item: ActivityItem): string {
  if (item.kind === 'loan-given' || item.kind === 'loan-received') {
    return `/loans/${item.personId}/edit/${item.id}`
  }
  return `/add/transaction/${item.id}`
}
