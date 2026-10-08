import { formatAmount } from './format'
import { dayPart, g, type UserProfile } from './profile'

export interface GreetingStats {
  /** مصروف اليوم. */
  todaySpent: number
  /** المتبقي لليوم من ميزانية الشهر (null = لا ميزانية). */
  dailyBudget: number | null
  /** المتبقي من ميزانية الشهر (null = لا ميزانية). */
  monthBudgetLeft: number | null
}

/** السطر الصغير تحت الترحيب — يتغيّر مع وقت اليوم. */
export function greetingSubline(hour: number, p: UserProfile | null, s: GreetingStats, mask: (v: string) => string): string {
  const money = (n: number) => mask(`${formatAmount(n)} ر.س`)
  switch (dayPart(hour)) {
    case 'night':
      return g(p, 'سهران؟ لا تنسى تسجّل مصاريف اليوم', 'سهرانة؟ لا تنسين تسجّلين مصاريف اليوم')
    case 'morning':
      return s.dailyBudget !== null && s.dailyBudget > 0 ? `يومك جديد — ميزانيتك اليوم ${money(s.dailyBudget)}` : 'يومك جديد — بداية موفّقة'
    case 'noon':
      return s.todaySpent > 0 ? `${g(p, 'صرفت', 'صرفتِ')} ${money(s.todaySpent)} اليوم حتى الآن` : `ما ${g(p, 'صرفت', 'صرفتِ')} شيء اليوم حتى الآن`
    default:
      return s.todaySpent > 0 ? `ختام يومك: ${g(p, 'صرفت', 'صرفتِ')} ${money(s.todaySpent)}` : 'يوم بدون مصاريف — ممتاز'
  }
}

