import { ref } from 'vue'
import { defineStore } from 'pinia'

import { api } from '@/api/http'

export const useWalletStore = defineStore('wallet', () => {
  const balance = ref(null)
  const transactions = ref([])
  const error = ref(null)

  async function loadBalance() {
    try {
      balance.value = (await api('/wallet')).balance
      error.value = null
    } catch (failure) {
      error.value = failure?.code ?? 'generic'
    }
  }

  async function loadTransactions() {
    try {
      transactions.value = (await api('/wallet/transactions?size=20')).content
      error.value = null
    } catch (failure) {
      error.value = failure?.code ?? 'generic'
    }
  }

  function $reset() {
    balance.value = null
    transactions.value = []
    error.value = null
  }

  return { balance, transactions, error, loadBalance, loadTransactions, $reset }
})
