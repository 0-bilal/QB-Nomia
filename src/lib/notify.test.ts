import { afterEach, describe, expect, it, vi } from 'vitest'
import { dismissNotice, notify, subscribeNotice, type Notice } from './notify'

afterEach(() => {
  dismissNotice()
  vi.useRealTimers()
})

describe('notify', () => {
  it('replaces the current notice and auto-dismisses after its duration', () => {
    vi.useFakeTimers()
    const seen: (Notice | null)[] = []
    const off = subscribeNotice((n) => seen.push(n))
    notify('success', 'أ', 1000)
    notify('error', 'ب', 2000)
    expect(seen.at(-1)?.message).toBe('ب')
    vi.advanceTimersByTime(1500)
    expect(seen.at(-1)?.message).toBe('ب') // مؤقت الأول أُلغي
    vi.advanceTimersByTime(600)
    expect(seen.at(-1)).toBeNull()
    off()
  })

  it('keeps progress notices until replaced, and dismiss(id) ignores stale ids', () => {
    vi.useFakeTimers()
    let last: Notice | null = null
    const off = subscribeNotice((n) => (last = n))
    const first = notify('progress', 'جارٍ...')
    vi.advanceTimersByTime(60000)
    expect(last).not.toBeNull()
    notify('success', 'تم')
    dismissNotice(first)
    expect((last as Notice | null)?.message).toBe('تم')
    off()
  })
})
