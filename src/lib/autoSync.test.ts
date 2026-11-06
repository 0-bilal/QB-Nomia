import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSnapshot } from '../state/DataContext'

vi.mock('./sheetsSync', async (importOriginal) => {
  const real = await importOriginal<typeof import('./sheetsSync')>()
  return { ...real, pullFromSheets: vi.fn(), pushToSheets: vi.fn() }
})

import { runBackgroundPull, scheduleBackgroundSync, subscribeSyncStatus, syncNow } from './autoSync'
import { SyncConflictError, getConflict, setConflict } from './syncConflict'
import { hasPendingPush, markPendingPush, pullFromSheets, pushToSheets } from './sheetsSync'
import { setSheetsSyncCredentials } from '../config/sheetsSync'

const local = { accounts: [] } as unknown as DataSnapshot
const remote = { accounts: [{ id: 'old' }] } as unknown as DataSnapshot
const flush = () => new Promise((r) => setTimeout(r, 0))

describe('background sync never overwrites unpushed local changes', () => {
  beforeEach(() => {
    setSheetsSyncCredentials('https://script.google.com/macros/s/x/exec', 'token')
    vi.mocked(pushToSheets).mockResolvedValue(undefined)
    vi.mocked(pullFromSheets).mockResolvedValue(remote)
  })
  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('marks local changes as pending as soon as a background push is scheduled', () => {
    vi.useFakeTimers()
    scheduleBackgroundSync(() => local)
    expect(hasPendingPush()).toBe(true)
  })

  it('pulls and imports the remote copy when nothing is pending', async () => {
    const onSnapshot = vi.fn()
    runBackgroundPull(onSnapshot, () => local)
    await flush()
    expect(pullFromSheets).toHaveBeenCalled()
    expect(onSnapshot).toHaveBeenCalledWith(remote)
  })

  it('pushes local data instead of pulling when changes are pending', async () => {
    markPendingPush()
    const onSnapshot = vi.fn()
    runBackgroundPull(onSnapshot, () => local)
    await flush()
    expect(pushToSheets).toHaveBeenCalledWith(local)
    expect(pullFromSheets).not.toHaveBeenCalled()
    expect(onSnapshot).not.toHaveBeenCalled()
  })

  it('keeps local data when the push fails, without pulling', async () => {
    markPendingPush()
    vi.mocked(pushToSheets).mockRejectedValue(new Error('offline'))
    const onSnapshot = vi.fn()
    runBackgroundPull(onSnapshot, () => local)
    await flush()
    expect(pullFromSheets).not.toHaveBeenCalled()
    expect(onSnapshot).not.toHaveBeenCalled()
  })
})

describe('تعارض المزامنة في المزامنة التلقائية', () => {
  beforeEach(() => {
    setSheetsSyncCredentials('https://script.google.com/macros/s/x/exec', 'token')
    vi.mocked(pullFromSheets).mockResolvedValue(remote)
  })
  afterEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('عند الدخول مع تعديلات معلّقة وجدول متغيّر: يعلن التعارض وما يسحب', async () => {
    markPendingPush()
    vi.mocked(pushToSheets).mockRejectedValue(new SyncConflictError())
    const statuses: string[] = []
    const unsub = subscribeSyncStatus((s) => statuses.push(s))
    const onSnapshot = vi.fn()
    runBackgroundPull(onSnapshot, () => local)
    await flush()
    unsub()
    expect(statuses).toContain('conflict')
    expect(pullFromSheets).not.toHaveBeenCalled()
    expect(onSnapshot).not.toHaveBeenCalled()
    expect(hasPendingPush()).toBe(true)
  })

  it('تعارض قائم: الدخول يذكّر به بدون أي رفع أو سحب', async () => {
    setConflict(null)
    const statuses: string[] = []
    const unsub = subscribeSyncStatus((s) => statuses.push(s))
    runBackgroundPull(vi.fn(), () => local)
    await flush()
    unsub()
    expect(statuses).toEqual(['conflict'])
    expect(pushToSheets).not.toHaveBeenCalled()
    expect(pullFromSheets).not.toHaveBeenCalled()
  })

  it('تعارض قائم: الرفع الخلفي بعد التعديل يتوقف بصمت والتعديل يبقى معلّق', async () => {
    vi.useFakeTimers()
    setConflict(null)
    const statuses: string[] = []
    const unsub = subscribeSyncStatus((s) => statuses.push(s))
    scheduleBackgroundSync(() => local)
    await vi.advanceTimersByTimeAsync(2000)
    unsub()
    expect(pushToSheets).not.toHaveBeenCalled()
    expect(statuses).toEqual([])
    expect(hasPendingPush()).toBe(true)
    expect(getConflict()).not.toBeNull()
  })

  it('زر «مزامنة الآن» أثناء التعارض يرجّع false ويعلن التعارض', async () => {
    setConflict(null)
    const statuses: string[] = []
    const unsub = subscribeSyncStatus((s, _d, manual) => statuses.push(`${s}:${manual}`))
    expect(await syncNow(local)).toBe(false)
    unsub()
    expect(statuses[0]).toBe('conflict:true')
    expect(pushToSheets).not.toHaveBeenCalled()
  })
})

