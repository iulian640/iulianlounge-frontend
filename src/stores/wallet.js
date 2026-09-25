import { ref } from 'vue'
import { defineStore } from 'pinia'

import { api } from '@/api/http'

// La cartera vista desde el HUD. Solo lectura: las fichas se mueven en el backend (ADR-04), aquí se consultan
export const useWalletStore = defineStore('wallet', () => {
  const balance = ref(null) // null = aún sin cargar (el HUD enseña un guion, no un 0 que mentiría)
  const transactions = ref([])

  async function loadBalance() {
    balance.value = (await api('/wallet')).balance
  }

  // Los 20 movimientos más recientes: el libro de cuentas del HUD no pagina (de momento no hay más)
  async function loadTransactions() {
    transactions.value = (await api('/wallet/transactions?size=20')).content
  }

  // Al salir del club: que el siguiente socio en este navegador no vea las fichas del anterior
  function $reset() {
    balance.value = null
    transactions.value = []
  }

  return { balance, transactions, loadBalance, loadTransactions, $reset }
})
