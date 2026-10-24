import { MAX_CART_LINES, MAX_QUANTITY_PER_LINE } from "#shared/constants"
import type { ImageDTO, QuoteDTO } from "#shared/types/api"

/**
 * Persistent guest cart, kept in localStorage. It stores product ids and
 * quantities (plus a display snapshot); all prices, discounts and totals come
 * from the server via /api/cart/quote.
 */
export interface CartItem {
  productId: string
  quantity: number
  name: string
  slug: string
  image: ImageDTO | null
}

const STORAGE_KEY = "mc-cart-v1"

interface Persisted {
  items: CartItem[]
  couponCode: string | null
}

function readStorage(): Persisted {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as Persisted | null
    if (!parsed || !Array.isArray(parsed.items)) return { items: [], couponCode: null }
    return {
      items: parsed.items
        .filter((i) => typeof i?.productId === "string" && Number.isInteger(i.quantity) && i.quantity > 0)
        .slice(0, MAX_CART_LINES),
      couponCode: typeof parsed.couponCode === "string" ? parsed.couponCode : null,
    }
  } catch {
    return { items: [], couponCode: null }
  }
}

export function useCart() {
  const items = useState<CartItem[]>("cart:items", () => [])
  const couponCode = useState<string | null>("cart:coupon", () => null)
  const hydrated = useState("cart:hydrated", () => false)
  const quote = useState<QuoteDTO | null>("cart:quote", () => null)
  const quoting = useState("cart:quoting", () => false)
  const quoteError = useState<string | null>("cart:quoteError", () => null)

  function persist() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: items.value, couponCode: couponCode.value }))
    } catch {
      // Storage full or blocked — the cart still works for this visit.
    }
  }

  /** Loads the saved cart once on the client and keeps tabs in sync. */
  function hydrate() {
    if (!import.meta.client || hydrated.value) return
    const saved = readStorage()
    items.value = saved.items
    couponCode.value = saved.couponCode
    hydrated.value = true
    window.addEventListener("storage", (event) => {
      if (event.key !== STORAGE_KEY) return
      const next = readStorage()
      items.value = next.items
      couponCode.value = next.couponCode
    })
  }

  const count = computed(() => items.value.reduce((n, i) => n + i.quantity, 0))

  function add(product: { id: string; name: string; slug: string; image: ImageDTO | null }, quantity = 1) {
    const existing = items.value.find((i) => i.productId === product.id)
    if (existing) {
      existing.quantity = Math.min(existing.quantity + quantity, MAX_QUANTITY_PER_LINE)
    } else if (items.value.length < MAX_CART_LINES) {
      items.value.push({
        productId: product.id,
        quantity: Math.min(quantity, MAX_QUANTITY_PER_LINE),
        name: product.name,
        slug: product.slug,
        image: product.image,
      })
    }
    persist()
  }

  function setQuantity(productId: string, quantity: number) {
    const item = items.value.find((i) => i.productId === productId)
    if (!item) return
    if (quantity <= 0) return remove(productId)
    item.quantity = Math.min(Math.floor(quantity), MAX_QUANTITY_PER_LINE)
    persist()
  }

  function remove(productId: string) {
    items.value = items.value.filter((i) => i.productId !== productId)
    persist()
  }

  function setCoupon(code: string | null) {
    couponCode.value = code?.trim().toUpperCase() || null
    persist()
  }

  function clear() {
    items.value = []
    couponCode.value = null
    quote.value = null
    persist()
  }

  /** Re-prices the cart on the server and reconciles quantities with what's available. */
  async function refreshQuote() {
    quoting.value = true
    quoteError.value = null
    try {
      const result = await $fetch<QuoteDTO>("/api/cart/quote", {
        method: "POST",
        body: {
          items: items.value.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          couponCode: couponCode.value ?? undefined,
        },
      })
      applyQuote(result)
    } catch (e) {
      quoteError.value = apiErrorMessage(e, "We could not update your bag. Please try again.")
    } finally {
      quoting.value = false
    }
    return quote.value
  }

  /** Syncs local items to a server quote (drops unavailable lines, clamps quantities). */
  function applyQuote(result: QuoteDTO) {
    quote.value = result
    const priced = new Map(result.lines.map((l) => [l.productId, l]))
    const unavailable = new Set(result.issues.filter((i) => i.code === "unavailable").map((i) => i.productId))
    items.value = items.value
      .filter((i) => !unavailable.has(i.productId))
      .map((i) => {
        const line = priced.get(i.productId)
        return line ? { ...i, quantity: line.quantity, name: line.name, slug: line.slug, image: line.image } : i
      })
    persist()
  }

  return {
    items: readonly(items),
    couponCode: readonly(couponCode),
    count,
    hydrated: readonly(hydrated),
    quote: computed(() => quote.value),
    quoting: readonly(quoting),
    quoteError: readonly(quoteError),
    hydrate,
    add,
    setQuantity,
    remove,
    setCoupon,
    clear,
    refreshQuote,
    applyQuote,
  }
}
