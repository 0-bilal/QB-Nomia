import type { ReactNode } from 'react'
import type { SetupStepId } from '../../lib/onboarding'
import { Icons } from '../../components/onboarding/ObUi'

export interface StepMeta {
  title: string
  desc: string
  color: string
  icon: ReactNode
  to: string
  tag?: [string, string]
}

/** نصوص ووجهات خطوات «جهّز محفظتك» — مشتركة بين الشاشة وبطاقة الرئيسية. */
export const STEP_META: Record<SetupStepId, StepMeta> = {
  accounts: {
    title: 'أضف حساباتك وأرصدتها',
    desc: 'البنك والكاش والمدخرات بالرصيد الحالي. كل الأرقام تبدأ من هنا.',
    color: 'var(--color-text)',
    icon: Icons.account,
    to: '/accounts/new',
    tag: ['ضروري', 'var(--color-text)'],
  },
  income: {
    title: 'سجّل دخلك',
    desc: 'أضف راتبك كدخل متكرر، عشان نحسب الشهر والمسموح لك يوميًا.',
    color: 'var(--color-commitment)',
    icon: Icons.income,
    to: '/recurring/new',
  },
  budget: {
    title: 'اضبط السقف',
    desc: 'سقف شهري عام أو لكل فئة، وننبّهك لما تقرب منه.',
    color: 'var(--color-owed-by)',
    icon: Icons.budget,
    to: '/categories',
  },
  backup: {
    title: 'فعّل النسخة الاحتياطية',
    desc: 'Google Sheets مشفّرة. تحميك لو ضاع جوالك أو غيّرته.',
    color: 'var(--color-income)',
    icon: Icons.cloud,
    to: '/sync-settings/setup',
    tag: ['موصى به', 'var(--color-income)'],
  },
  biometric: {
    title: 'الدخول بالبصمة',
    desc: 'افتح التطبيق بلمسة بدل الرقم السري.',
    color: 'var(--color-transfer)',
    icon: Icons.fingerprint,
    to: '/security',
  },
}
