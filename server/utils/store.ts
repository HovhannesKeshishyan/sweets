import type { StoreDefaults } from "../services/settings.service";

/** Env-driven fallbacks used until an admin saves store settings. */
export function storeDefaults(): StoreDefaults {
  const { siteName, defaultCurrency } = useRuntimeConfig().public;
  return { storeName: siteName, currency: defaultCurrency };
}
