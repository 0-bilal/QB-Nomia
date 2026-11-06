import { useEffect } from 'react'
import { getSyncScheme, isSheetsSyncConfigured } from '../config/sheetsSync'
import { notify } from '../lib/notify'

const UPGRADE_NOTICED_KEY = 'qbnomia.sync.upgradeNoticed'

/** تنبيه مرة وحدة في الجزيرة لمستخدم الصيغة القديمة (الخيار 2 المعتمد) — بعد ما تهدأ تنبيهات الدخول. */
export function useSyncUpgradeNotice(): void {
  useEffect(() => {
    const id = window.setTimeout(() => {
      try {
        if (!isSheetsSyncConfigured() || getSyncScheme() !== 'v1' || localStorage.getItem(UPGRADE_NOTICED_KEY)) return
        localStorage.setItem(UPGRADE_NOTICED_KEY, '1')
        notify('info', 'فيه تحديث لحماية المزامنة · من «المزامنة»', 5000)
      } catch {
        // تنبيه اختياري — تجاهل فشل التخزين.
      }
    }, 4000)
    return () => window.clearTimeout(id)
  }, [])
}
