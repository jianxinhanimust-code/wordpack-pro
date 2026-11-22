import 'fake-indexeddb/auto'
import { beforeAll, describe, expect, it } from 'vitest'
import { createData } from './schema'
import { importBackup, initVault, save } from './vault'

beforeAll(() => {
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } })
  Object.defineProperty(globalThis, 'BroadcastChannel', { configurable: true, value: undefined })
})

describe('IndexedDB transactions', () => {
  it('preserves simultaneous changes and rejects corrupt backups without overwriting', async () => {
    await initVault()
    await save(() => createData())
    await Promise.all([
      save(d => ({ ...d, favorites: [...d.favorites, 'adapt'] })),
      save(d => ({ ...d, favorites: [...d.favorites, 'adopt'] })),
    ])
    await expect(importBackup('{"version":2,"data":{"favorites":["corrupt"]}}')).rejects.toThrow()
    const preserved = await save(d => d)
    expect(preserved.favorites).toEqual(['adapt', 'adopt'])
    await expect(save(d => ({ ...d, settings: { ...d.settings, dailyGoal: 0 } }))).rejects.toThrow()
    expect((await save(d => d)).settings.dailyGoal).toBe(12)
  })
})

