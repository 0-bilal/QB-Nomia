import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { DataSnapshot } from '../state/DataContext'

vi.mock('./sheetsSync', async (importOriginal) => {
  const real = await importOriginal<typeof import('./sheetsSync')>()
  return { ...real, pullFromSheets: vi.fn(), pushToSheets: vi.fn() }
})

import { runBackgroundPull, scheduleBackgroundSync } from './autoSync'
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
