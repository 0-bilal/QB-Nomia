import type { FuelLog } from '../types'

/** عدد آخر فترات (بين تعبئتين كاملتين متتاليتين) تُستخدم لحساب معدل الاستهلاك — متوسط متحرك بدل الاعتماد على فترة وحدة قد تتذبذب مع الزحمة أو نمط القيادة. */
const SEGMENT_WINDOW = 5

export interface FuelSegment {
  fromLogId: string
  toLogId: string
  drivenKm: number
  /** إجمالي اللترات المعبَّأة بين التعبئتين الكاملتين (يشمل أي تعبئات جزئية بينهما) — هذا هو الاستهلاك الفعلي لأن الخزان كان ممتلئًا بالبداية والنهاية. */
  litersUsed: number
  kmPerLiter: number
}

export interface FuelStats {
  segments: FuelSegment[]
  avgKmPerLiter: number | null
  avgLitersPer100Km: number | null
  /** المدى التقديري بخزان ممتلئ = سعة الخزان × معدل كم/لتر — null لو ما تحدّدت سعة الخزان أو ما فيه بيانات كافية بعد. */
  estimatedRangeKm: number | null
}

/**
 * يبني فترات الاستهلاك من تعبئة كاملة إلى التالية لها. لترات الفترة تشمل أي
 * تعبئات جزئية وقعت بينهما (لأنها كلها وقود استُهلك خلال نفس الممشى)، وليس
 * فقط لترات التعبئة الكاملة الثانية.
 */
export function computeFuelSegments(logs: FuelLog[]): FuelSegment[] {
  const sorted = [...logs].sort((a, b) => a.odometerKm - b.odometerKm)
  const segments: FuelSegment[] = []
  let lastFullIdx = -1

  for (let i = 0; i < sorted.length; i++) {
    if (!sorted[i].isFullTank) continue
    if (lastFullIdx !== -1) {
      const from = sorted[lastFullIdx]
      const to = sorted[i]
      const drivenKm = to.odometerKm - from.odometerKm
      const litersUsed = sorted.slice(lastFullIdx + 1, i + 1).reduce((sum, log) => sum + log.liters, 0)
      if (drivenKm > 0 && litersUsed > 0) {
        segments.push({ fromLogId: from.id, toLogId: to.id, drivenKm, litersUsed, kmPerLiter: drivenKm / litersUsed })
      }
    }
    lastFullIdx = i
  }

  return segments
}

/** معدل الاستهلاك والمدى التقديري، بمتوسط متحرك لآخر SEGMENT_WINDOW فترة. */
export function computeFuelStats(logs: FuelLog[], tankCapacityL: number | null): FuelStats {
  const allSegments = computeFuelSegments(logs)
  const segments = allSegments.slice(-SEGMENT_WINDOW)

  if (segments.length === 0) {
    return { segments, avgKmPerLiter: null, avgLitersPer100Km: null, estimatedRangeKm: null }
  }

  const totalKm = segments.reduce((sum, seg) => sum + seg.drivenKm, 0)
  const totalLiters = segments.reduce((sum, seg) => sum + seg.litersUsed, 0)
  const avgKmPerLiter = totalLiters > 0 ? totalKm / totalLiters : null
  const avgLitersPer100Km = avgKmPerLiter && avgKmPerLiter > 0 ? 100 / avgKmPerLiter : null
  const estimatedRangeKm = tankCapacityL !== null && avgKmPerLiter !== null ? tankCapacityL * avgKmPerLiter : null

  return { segments, avgKmPerLiter, avgLitersPer100Km, estimatedRangeKm }
}
