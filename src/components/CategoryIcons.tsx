export type CategoryIconKey =
  | 'food'
  | 'groceries'
  | 'coffee'
  | 'transport'
  | 'bills'
  | 'shopping'
  | 'clothing'
  | 'health'
  | 'gym'
  | 'sports'
  | 'fun'
  | 'subscriptions'
  | 'commitments'
  | 'home'
  | 'education'
  | 'travel'
  | 'pets'
  | 'gifts'
  | 'kids'
  | 'electronics'
  | 'insurance'
  | 'phone'
  | 'internet'
  | 'beauty'
  | 'savings'
  | 'other'

/** قائمة واسعة من أيقونات جاهزة للفئات — يختار المستخدم منها ما يناسب أي فئة أنشأها بنفسه، بدل الاكتفاء بأول حرف من الاسم. */
export const CATEGORY_ICON_OPTIONS: { key: CategoryIconKey; label: string }[] = [
  { key: 'food', label: 'مطاعم' },
  { key: 'groceries', label: 'بقالة' },
  { key: 'coffee', label: 'قهوة' },
  { key: 'transport', label: 'مواصلات' },
  { key: 'bills', label: 'فواتير' },
  { key: 'shopping', label: 'تسوق' },
  { key: 'clothing', label: 'ملابس' },
  { key: 'health', label: 'صحة' },
  { key: 'gym', label: 'رياضة' },
  { key: 'sports', label: 'ألعاب رياضية' },
  { key: 'fun', label: 'ترفيه' },
  { key: 'subscriptions', label: 'اشتراكات' },
  { key: 'commitments', label: 'التزامات' },
  { key: 'home', label: 'منزل' },
  { key: 'education', label: 'تعليم' },
  { key: 'travel', label: 'سفر' },
  { key: 'pets', label: 'حيوانات أليفة' },
  { key: 'gifts', label: 'هدايا' },
  { key: 'kids', label: 'أطفال' },
  { key: 'electronics', label: 'إلكترونيات' },
  { key: 'insurance', label: 'تأمين' },
  { key: 'phone', label: 'اتصالات' },
  { key: 'internet', label: 'إنترنت' },
  { key: 'beauty', label: 'عناية وجمال' },
  { key: 'savings', label: 'ادخار' },
  { key: 'other', label: 'أخرى' },
]

/** أيقونة فئة واحدة برسم خطّي بسيط (بدون تلوين مضمَّن) — اللون يُحدَّد من الأب عبر currentColor، نفس هوية بقية أيقونات التطبيق. */
export function CategoryIcon({ iconKey, size = 18 }: { iconKey?: string; size?: number }) {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const }

  switch (iconKey as CategoryIconKey) {
    case 'food':
      return (
        <svg {...common}>
          <path d="M6 3v7a2 2 0 0 0 4 0V3" />
          <path d="M8 3v18" />
          <path d="M8 10v0" />
          <path d="M17 3c-1.7 0-3 2-3 5s1.3 5 3 5v9" />
        </svg>
      )
    case 'groceries':
      return (
        <svg {...common}>
          <path d="M3 6h2l2.4 11.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L21 9H6.5" />
          <circle cx="9.5" cy="21" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="17" cy="21" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'coffee':
      return (
        <svg {...common}>
          <path d="M4 8h13v5a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5V8Z" />
          <path d="M17 9h1.5a2.5 2.5 0 0 1 0 5H17" />
          <path d="M7 2.5c0 1-1 1-1 2s1 1 1 2" />
          <path d="M11 2.5c0 1-1 1-1 2s1 1 1 2" />
        </svg>
      )
    case 'transport':
      return (
        <svg {...common}>
          <path d="M3 13.5 5 8a2 2 0 0 1 1.9-1.4h10.2A2 2 0 0 1 19 8l2 5.5" />
          <path d="M2.5 13.5h19v4a1 1 0 0 1-1 1h-1.5a1 1 0 0 1-1-1v-1h-11v1a1 1 0 0 1-1 1H4.5a1 1 0 0 1-1-1v-4Z" />
          <circle cx="7" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
          <circle cx="17" cy="15.5" r="1.3" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'bills':
      return (
        <svg {...common}>
          <path d="M6 2.5h12v19l-2.5-1.5L13 21l-2.5-1.5L8 21l-2-1.5V2.5Z" />
          <path d="M8.5 7.5h7M8.5 11h7M8.5 14.5h4" />
        </svg>
      )
    case 'shopping':
      return (
        <svg {...common}>
          <path d="M6 8h12l-1 12.5a1.5 1.5 0 0 1-1.5 1.5h-7A1.5 1.5 0 0 1 7 20.5L6 8Z" />
          <path d="M9 8V6a3 3 0 0 1 6 0v2" />
        </svg>
      )
    case 'clothing':
      return (
        <svg {...common}>
          <path d="M9 3 3 6.5 5.5 10 8 8.5V21h8V8.5l2.5 1.5L21 6.5 15 3a3 3 0 0 1-6 0Z" />
        </svg>
      )
    case 'health':
      return (
        <svg {...common}>
          <path d="M20.5 8.5c0 5-8.5 11.5-8.5 11.5S3.5 13.5 3.5 8.5a4.5 4.5 0 0 1 8.5-2 4.5 4.5 0 0 1 8.5 2Z" />
        </svg>
      )
    case 'gym':
      return (
        <svg {...common}>
          <path d="M4 9v6M2.5 10.5v3M20 9v6M21.5 10.5v3" />
          <path d="M7 12h10" />
          <path d="M7 8v8M17 8v8" />
        </svg>
      )
    case 'sports':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 3v18M3 12h18" />
          <path d="M5.5 5.5c2 2.5 2 10.5 0 13M18.5 5.5c-2 2.5-2 10.5 0 13" />
        </svg>
      )
    case 'fun':
      return (
        <svg {...common}>
          <rect x="3" y="5" width="18" height="14" rx="2.5" />
          <polygon points="10,9 15,12 10,15" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'subscriptions':
      return (
        <svg {...common}>
          <path d="M4 12a8 8 0 0 1 13.7-5.7L20 8" />
          <path d="M20 4v4h-4" />
          <path d="M20 12a8 8 0 0 1-13.7 5.7L4 16" />
          <path d="M4 20v-4h4" />
        </svg>
      )
    case 'commitments':
      return (
        <svg {...common}>
          <rect x="4" y="3" width="16" height="18" rx="2.5" />
          <path d="M8 8h8M8 12h8M8 16h5" />
        </svg>
      )
    case 'home':
      return (
        <svg {...common}>
          <path d="M4 11 12 4l8 7" />
          <path d="M6 9.5V20h12V9.5" />
          <path d="M10 20v-6h4v6" />
        </svg>
      )
    case 'education':
      return (
        <svg {...common}>
          <path d="M2 8 12 4l10 4-10 4L2 8Z" />
          <path d="M6 10.5V16c0 1.5 2.7 3 6 3s6-1.5 6-3v-5.5" />
          <path d="M21 8v6" />
        </svg>
      )
    case 'travel':
      return (
        <svg {...common}>
          <path d="M11 3 3.5 10 2 9.3 3 12l2.7 1 6.3-2.3" />
          <path d="M11 3 21 9l-8 3-3.5 8-1.2-1.5 1-3.2" />
          <path d="M3.5 10 12 13l3.5 8" />
        </svg>
      )
    case 'pets':
      return (
        <svg {...common}>
          <circle cx="6.5" cy="10" r="1.7" />
          <circle cx="10.5" cy="6.5" r="1.7" />
          <circle cx="13.5" cy="6.5" r="1.7" />
          <circle cx="17.5" cy="10" r="1.7" />
          <path d="M12 12c-3.5 0-6 2-6 4.5S8 21 12 21s6-2 6-4.5S15.5 12 12 12Z" />
        </svg>
      )
    case 'gifts':
      return (
        <svg {...common}>
          <rect x="3.5" y="9" width="17" height="12" rx="1.5" />
          <path d="M3.5 13.5h17" />
          <path d="M12 9v12" />
          <path d="M12 9C9 9 8 6 9.5 4.5S13 4 12 9Z" />
          <path d="M12 9c3 0 4-3 2.5-4.5S11 4 12 9Z" />
        </svg>
      )
    case 'kids':
      return (
        <svg {...common}>
          <circle cx="12" cy="7" r="3.2" />
          <path d="M5 21v-2a7 7 0 0 1 14 0v2" />
        </svg>
      )
    case 'electronics':
      return (
        <svg {...common}>
          <rect x="3" y="4.5" width="18" height="12" rx="1.5" />
          <path d="M2 19.5h20" />
          <path d="M9 19.5v-3M15 19.5v-3" />
        </svg>
      )
    case 'insurance':
      return (
        <svg {...common}>
          <path d="M12 3 4.5 6v6c0 5 3.5 8 7.5 9 4-1 7.5-4 7.5-9V6L12 3Z" />
          <path d="M9 12l2 2 4-4" />
        </svg>
      )
    case 'phone':
      return (
        <svg {...common}>
          <path d="M5.5 4.5h3.2L10 8l-1.8 1.4a12 12 0 0 0 6.4 6.4L16 14l3.5 1.3v3.2a1.5 1.5 0 0 1-1.6 1.5A15 15 0 0 1 4 5.6a1.5 1.5 0 0 1 1.5-1.1Z" />
        </svg>
      )
    case 'internet':
      return (
        <svg {...common}>
          <path d="M3.5 9a13 13 0 0 1 17 0" />
          <path d="M6.5 12.5a8.5 8.5 0 0 1 11 0" />
          <path d="M9.7 16a4 4 0 0 1 4.6 0" />
          <circle cx="12" cy="19" r="1.1" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'beauty':
      return (
        <svg {...common}>
          <path d="M12 2.5 13.5 8 19 9.5l-5.5 1.5L12 16.5 10.5 11 5 9.5 10.5 8Z" />
          <path d="M18.5 15.5 19.3 18l2.5.8-2.5.8-.8 2.5-.8-2.5-2.5-.8 2.5-.8Z" />
        </svg>
      )
    case 'savings':
      return (
        <svg {...common}>
          <path d="M4 12.5c0-3.5 3.5-6 8-6s8 1.8 8 4.5c0 1-.5 1.8-1.3 2.4" />
          <path d="M4 12.5v3a2 2 0 0 0 2 2h8.5a4 4 0 0 0 3.7-2.5" />
          <path d="M16 6.5c1-1 2-1 3 0" />
          <circle cx="9.5" cy="13" r="1" fill="currentColor" stroke="none" />
        </svg>
      )
    case 'other':
    default:
      return (
        <svg {...common}>
          <path d="M12.5 3.5H20a.5.5 0 0 1 .5.5v7.5a1 1 0 0 1-.3.7l-9 9a1 1 0 0 1-1.4 0l-7.5-7.5a1 1 0 0 1 0-1.4l9-9a1 1 0 0 1 .7-.3Z" />
          <circle cx="16" cy="8" r="1.4" fill="currentColor" stroke="none" />
        </svg>
      )
  }
}
