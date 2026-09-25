import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

import { useWalletStore } from '../wallet'
import { api } from '@/api/http'

vi.mock('@/api/http', () => ({ api: vi.fn() }))

describe('useWalletStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('empieza sin saldo (null), no con un 0 que mentiría', () => {
    expect(useWalletStore().balance).toBeNull()
  })

  it('carga el saldo de /wallet', async () => {
    api.mockResolvedValueOnce({ balance: 100 })
    const wallet = useWalletStore()

    await wallet.loadBalance()

    expect(api).toHaveBeenCalledWith('/wallet')
    expect(wallet.balance).toBe(100)
  })

  it('carga los movimientos más recientes', async () => {
    const bonus = { id: 't-1', amount: 100, type: 'WELCOME_BONUS', balanceAfter: 100, createdAt: '2026-09-25T12:00:00Z' }
    api.mockResolvedValueOnce({ content: [bonus], page: 0, size: 20, totalElements: 1 })
    const wallet = useWalletStore()

    await wallet.loadTransactions()

    expect(api).toHaveBeenCalledWith('/wallet/transactions?size=20')
    expect(wallet.transactions).toEqual([bonus])
  })

  it('si la carga falla, guarda el code del error en vez de fingir que no hay nada', async () => {
    api.mockRejectedValueOnce({ code: 'wallet.not_found' })
    const wallet = useWalletStore()

    await wallet.loadTransactions()

    expect(wallet.error).toBe('wallet.not_found')
    expect(wallet.transactions).toEqual([])
  })

  it('$reset olvida el saldo al salir', async () => {
    api.mockResolvedValueOnce({ balance: 100 })
    const wallet = useWalletStore()
    await wallet.loadBalance()

    wallet.$reset()

    expect(wallet.balance).toBeNull()
    expect(wallet.transactions).toEqual([])
  })
})
