import { ref } from 'vue'
import { defineStore } from 'pinia'

import { api } from '@/api/http'

// La cartera vista desde el HUD. Solo lectura: las fichas se mueven en el backend (ADR-04), aquí se consultan
export const useWalletStore = defineStore('wallet', () => {
  const balance = ref(null) // null = aún sin cargar (el HUD enseña un guion, no un 0 que mentiría)
  const transactions = ref([])
  // Clave del último fallo (ADR-06): "no se pudo cargar" no es lo mismo que "no hay movimientos"
  const error = ref(null)

  async function loadBalance() {
    try {
      balance.value = (await api('/wallet')).balance
      error.value = null
    } catch (failure) {
      error.value = failure?.code ?? 'generic'
    }
  }

  // Los 20 movimientos más recientes: el libro de cuentas del HUD no pagina (de momento no hay más)
  async function loadTransactions() {
    try {
      transactions.value = (await api('/wallet/transactions?size=20')).content
      error.value = null
    } catch (failure) {
      error.value = failure?.code ?? 'generic'
    }
  }

  // Al salir del club: que el siguiente socio en este navegador no vea las fichas del anterior
  function $reset() {
    balance.value = null
    transactions.value = []
    error.value = null
  }

  return { balance, transactions, error, loadBalance, loadTransactions, $reset }
})
