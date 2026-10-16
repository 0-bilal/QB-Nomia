/** خطوات جولة التعريف: كل خطوة تضيء عنصرًا معلّمًا بـ data-tour في صفحتها. */

export interface TourStep {
  route: string
  target: string
  title: string
  body: string
  round?: boolean
  pad?: number
}

export const TOUR_PAGES = [
  { route: '/', name: 'الرئيسية' },
  { route: '/accounts', name: 'الحسابات' },
  { route: '/loans', name: 'السلف' },
  { route: '/more', name: 'المزيد' },
]

export const TOUR_STEPS: TourStep[] = [
  // الرئيسية
  { route: '/', target: 'balance', title: 'إجمالي رصيدك', body: 'مجموع حساباتك. اسحب على المنحنى تشوف رصيدك في أي يوم، واضغط على العنوان تختار الحسابات المحسوبة.' },
  { route: '/', target: 'setup', title: 'خطوات التشغيل', body: 'البطاقة تبقى هنا لين تخلّص الخطوات، وتعرض اللي باقي لك. بعدها تختفي لحالها.' },
  { route: '/', target: 'actions', title: 'سجّل بسرعة', body: 'مصروف، دخل، تحويل، أو كل حركاتك. كل شيء يحدّث الرصيد والتقارير لحاله.' },
  { route: '/', target: 'plus', title: 'زر الإضافة', body: 'من أي شاشة: اضغط + واختر النوع، أو اسحب منه مباشرة للنوع اللي تبيه.', round: true, pad: 6 },
  { route: '/', target: 'nav', title: 'التبويبات', body: 'أربع صفحات رئيسية تتنقل بينها من هنا، أو بالسحب يمين ويسار. خلنا نمر عليها وحدة وحدة.', round: true, pad: 4 },

  // الحسابات
  { route: '/accounts', target: 'accounts-total', title: 'كل أرصدتك', body: 'الإجمالي وتغيّره خلال الفترة، وتوزيع فلوسك بين الأنواع. ومن هنا تحوّل بين حساباتك أو تودع مبلغ.' },
  { route: '/accounts', target: 'accounts-list', title: 'حساباتك', body: 'البنك والكاش والمدخرات. اعرضها قائمة أو بطاقات، واضغط أي حساب تشوف حركاته وتطابق رصيده مع الحقيقي.' },
  { route: '/accounts', target: 'accounts-add', title: 'حساب جديد', body: 'أضف حسابًا برصيده الحالي. الرصيد الصحيح أساس كل الأرقام في التطبيق.', round: true, pad: 6 },

  // السلف والديون
  { route: '/loans', target: 'loans-types', title: 'أنواع الديون', body: 'الكل، الأشخاص، سلفة الراتب، الخصومات، والمتاجر. النقطة الملوّنة تنبّهك لو فيه شيء مستحق.' },
  { route: '/loans', target: 'loans-panel', title: 'الصورة كاملة', body: 'كم لك عند الناس وكم عليك، وكيف تغيّر مع الوقت، وآخر الحركات. اضغط أي شخص تشوف كل تعاملاتك معه.' },
  { route: '/loans', target: 'loans-add', title: 'سجّل سلفة أو دَين', body: 'سلفة لشخص أو منه، سلفة راتب، أو دَين متجر. السداد يتسجّل على نفس السجل.', round: true, pad: 6 },

  // المزيد
  { route: '/more', target: 'more-search', title: 'ابحث عن أي أداة', body: 'اكتب اسم الشاشة أو الإعداد وتوصله مباشرة، وآخر الشاشات المفتوحة تطلع لك فوق.' },
  { route: '/more', target: 'more-finance', title: 'المالية', body: 'كل الحركات، الفئات وسقف كل فئة، مصادر الدخل، وأهداف الادخار مع الزكاة.' },
  { route: '/more', target: 'more-reports', title: 'التقارير', body: 'صحتك المالية واتجاهاتك، ومقارنة الأشهر، وتصدير PDF أو Excel.' },
  { route: '/more', target: 'more-system', title: 'النظام', body: 'الرقم السري والبصمة، والنسخة الاحتياطية والمزامنة، ومن «حول» تعيد هذه الجولة متى ما بغيت.' },
]
