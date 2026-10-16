import { GBar, GBtn, GCode, GDialog, GDone, GField, GGear, GMenu, GTarget, type GuideFrame } from '../../components/onboarding/GuideDemo'

/** إطارات العروض الحية لكل خطوة في معالج النسخة الاحتياطية. */

const EDITOR_URL = 'script.google.com/…/edit'

export const OPEN_FRAMES: GuideFrame[] = [
  {
    node: (
      <div className="flex h-full flex-col items-center justify-center gap-2.5">
        <div className="h-9 w-9 rounded-[10px] border-2 border-[var(--color-text-3)]" />
        <div>Sign in to continue</div>
        <GBtn blue target>
          Next
        </GBtn>
      </div>
    ),
    caption: 'سجّل دخولك بحساب Google لو طلب.',
  },
  {
    node: (
      <>
        <GBar title={<GTarget style={{ padding: '2px 4px' }}>Untitled project</GTarget>} />
        <GCode>{'function myFunction() {\n\n}'}</GCode>
      </>
    ),
    caption: 'المحرر فتح. اضغط على «Untitled project» فوق.',
  },
  {
    node: (
      <>
        <GBar title="Untitled project" />
        <GDialog title="Rename project" style={{ top: 40, bottom: 'auto', height: 104 }} actions={<GBtn blue target>Rename</GBtn>}>
          <GField label={<b className="text-[var(--color-text)]">QB-Nomia Backup</b>} />
        </GDialog>
      </>
    ),
    caption: 'اكتب QB-Nomia Backup واضغط Rename.',
  },
]

export const PASTE_FRAMES: GuideFrame[] = [
  {
    node: (
      <>
        <GBar />
        <GCode>
          <GTarget style={{ background: 'rgba(139,123,255,.28)', color: 'var(--color-text)' }}>{'function myFunction() {\n\n}'}</GTarget>
        </GCode>
      </>
    ),
    caption: 'حدّد كل الموجود (Ctrl + A) وامسحه.',
  },
  {
    node: (
      <>
        <GBar />
        <GCode>
          <GTarget>{"var SECRET_TOKEN = '••••••••'\n\nvar SHEET_NAME = 'sync_data'\n…\nfunction setup() {\n  var ss = getSpreadsheet()"}</GTarget>
        </GCode>
      </>
    ),
    caption: 'الصق الكود اللي نسخته من تحت.',
  },
  {
    node: (
      <>
        <GBar>
          <GBtn target>Save</GBtn>
        </GBar>
        <GCode>{"var SECRET_TOKEN = '••••••••'\n\nvar SHEET_NAME = 'sync_data'\n…"}</GCode>
      </>
    ),
    caption: 'احفظ المشروع: Ctrl + S أو أيقونة الحفظ.',
  },
]

const RUN_CODE = 'function setup() {\n  var ss = getSpreadsheet()\n  …'

export const RUN_FRAMES: GuideFrame[] = [
  {
    node: (
      <>
        <GBar>
          <GBtn target>setup</GBtn>
          <GBtn>Run</GBtn>
        </GBar>
        <GCode>{RUN_CODE}</GCode>
      </>
    ),
    caption: 'اختر الدالة setup من القائمة فوق.',
  },
  {
    node: (
      <>
        <GBar>
          <GBtn>setup</GBtn>
          <GBtn target>Run</GBtn>
        </GBar>
        <GCode>{RUN_CODE}</GCode>
      </>
    ),
    caption: 'اضغط Run (تشغيل).',
  },
  {
    node: (
      <GDialog title="Authorization required" actions={<><GBtn>Cancel</GBtn><GBtn blue target>Review permissions</GBtn></>}>
        <div>QB-Nomia Backup needs your permission to access your data on Google.</div>
      </GDialog>
    ),
    caption: 'Review permissions، ثم اختر حسابك.',
  },
  {
    node: (
      <GDialog title="Google hasn't verified this app" actions={<><GBtn target>Advanced</GBtn><GBtn blue>Back to safety</GBtn></>}>
        <div>The app is requesting access to sensitive info in your Google Account.</div>
      </GDialog>
    ),
    caption: 'تحذير طبيعي لسكربتك الخاص. اضغط Advanced.',
  },
  {
    node: (
      <GDialog title="Google hasn't verified this app">
        <div>Continue only if you trust the developer (you).</div>
        <div className="mt-1 self-start text-[var(--color-text)] underline">
          <GTarget>Go to QB-Nomia Backup (unsafe)</GTarget>
        </div>
      </GDialog>
    ),
    caption: 'اضغط Go to QB-Nomia Backup (unsafe).',
  },
  {
    node: (
      <GDialog title="QB-Nomia Backup wants to access your Google Account" actions={<><GBtn>Cancel</GBtn><GBtn blue target>Allow</GBtn></>}>
        <div>See, edit, create and delete your spreadsheets</div>
      </GDialog>
    ),
    caption: 'اضغط Allow (سماح).',
  },
  {
    node: (
      <>
        <GBar>
          <GBtn>setup</GBtn>
          <GBtn>Run</GBtn>
        </GBar>
        <div className="border-t border-[var(--color-border)] pt-2">
          <div className="text-[10px] text-[var(--color-text-3)]">Execution log</div>
          <GField label="Execution completed" value={<GDone />} target />
        </div>
      </>
    ),
    caption: 'ظهرت «Execution completed»؟ تمام، الجدول انخلق في حسابك.',
  },
]

export const DEPLOY_FRAMES: GuideFrame[] = [
  {
    node: (
      <>
        <GBar>
          <GBtn blue target>
            Deploy
          </GBtn>
        </GBar>
        <GCode>…</GCode>
      </>
    ),
    caption: 'اضغط Deploy (نشر) فوق.',
  },
  {
    node: (
      <>
        <GBar>
          <GBtn blue>Deploy</GBtn>
        </GBar>
        <GMenu items={['New deployment', 'Manage deployments', 'Test deployments']} active={0} style={{ right: 12, top: 40 }} />
      </>
    ),
    caption: 'اختر New deployment.',
  },
  {
    node: (
      <GDialog title="New deployment">
        <div className="flex items-center gap-1.5">
          Select type
          <GBtn target>
            <GGear />
          </GBtn>
        </div>
        <div className="mt-1 rounded-[8px] border border-[var(--color-border-strong)] p-1">
          <div className="rounded-[5px] bg-white/[0.08] px-2 py-1.5 text-[var(--color-text)]">Web app</div>
          <div className="px-2 py-1.5">API Executable</div>
        </div>
      </GDialog>
    ),
    caption: 'من الترس اختر Web app.',
  },
  {
    node: (
      <GDialog title="Web app" actions={<GBtn blue>Deploy</GBtn>}>
        <GField label="Execute as" value="Me" target />
        <GField label="Who has access" value="Anyone" />
      </GDialog>
    ),
    caption: 'Execute as: Me (التشغيل باسمك).',
  },
  {
    node: (
      <GDialog title="Web app" actions={<GBtn blue>Deploy</GBtn>}>
        <GField label="Execute as" value="Me" />
        <GField label="Who has access" value="Anyone" target />
      </GDialog>
    ),
    caption: 'Who has access: Anyone (أي أحد).',
  },
  {
    node: (
      <GDialog title="Web app" actions={<GBtn blue target>Deploy</GBtn>}>
        <GField label="Execute as" value="Me" />
        <GField label="Who has access" value="Anyone" />
      </GDialog>
    ),
    caption: 'اضغط Deploy.',
  },
  {
    node: (
      <GDialog title="New deployment" actions={<GBtn blue>Done</GBtn>}>
        <div className="text-[10px]">Web app URL</div>
        <div className="flex items-center gap-1.5 rounded-[6px] bg-[var(--color-surface)] px-2 py-1.5 text-[10px]">
          <span className="min-w-0 flex-1 truncate">https://script.google.com/macros/s/AKfy…/exec</span>
          <GBtn target>Copy</GBtn>
        </div>
      </GDialog>
    ),
    caption: 'انسخ رابط Web app. نحتاجه في الخطوة الجاية.',
  },
]

export { EDITOR_URL }
