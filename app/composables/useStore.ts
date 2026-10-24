import type { PublicStoreDTO } from '#shared/types/api'

/**
 * Public store settings (name, currency, shipping), loaded once and shared.
 * Falls back to env defaults if the API is unreachable so pages still render.
 */
export function useStore() {
  const config = useRuntimeConfig().public
  const store = useState<PublicStoreDTO>('store', () => ({
    storeName: config.siteName,
    currency: config.defaultCurrency,
    contactEmail: null,
    contactPhone: null,
    shipping: { flatRate: 0, freeShippingThreshold: null, allowedCountries: [] },
  }))
  const loaded = useState('store:loaded', () => false)
  const requestFetch = useRequestFetch()

  async function load(force = false) {
    if (loaded.value && !force) return
    try {
      store.value = await requestFetch<PublicStoreDTO>('/api/store')
      loaded.value = true
    } catch {
      // Keep defaults; a later navigation will retry.
    }
  }

  function money(minor: number) {
    return formatMoney(minor, store.value.currency)
  }

  return { store: readonly(store), load, money }
}
