import type { CouponType, OrderStatus, PaymentStatus, ProductStatus, UserRole } from "../constants"

/** Response shapes shared by the API and the UI. Money is always integer minor units. */

export interface ImageDTO {
  url: string
  alt: string
  width?: number
  height?: number
}

export interface CategoryDTO {
  id: string
  name: string
  slug: string
  description: string | null
  image: ImageDTO | null
  sortOrder: number
  isActive: boolean
  productCount?: number
}

export type StockLevel = "in_stock" | "low_stock" | "out_of_stock"

export interface ProductSummaryDTO {
  id: string
  name: string
  slug: string
  shortDescription: string | null
  price: number
  compareAtPrice: number | null
  image: ImageDTO | null
  category: { name: string; slug: string } | null
  tags: string[]
  isFeatured: boolean
  stockLevel: StockLevel
  /** Most units a customer may add right now (stock, capped per order). */
  maxQuantity: number
}

export interface ProductDetailDTO extends ProductSummaryDTO {
  description: string
  images: ImageDTO[]
  ingredients: string | null
  allergens: string[]
  weightGrams: number | null
}

export interface AdminProductDTO extends ProductDetailDTO {
  sku: string | null
  stock: number
  status: ProductStatus
  categoryId: string | null
  createdAt: string
  updatedAt: string
}

export interface PublicStoreDTO {
  storeName: string
  currency: string
  contactEmail: string | null
  contactPhone: string | null
  shipping: { flatRate: number; freeShippingThreshold: number | null; allowedCountries: string[] }
}

export interface CartLineInput {
  productId: string
  quantity: number
}

export type CartIssueCode = "unavailable" | "insufficient_stock" | "quantity_adjusted"

export interface QuoteLineDTO {
  productId: string
  name: string
  slug: string
  image: ImageDTO | null
  unitPrice: number
  quantity: number
  maxQuantity: number
  discount: number
  lineTotal: number
}

export interface QuoteDTO {
  currency: string
  lines: QuoteLineDTO[]
  /** Lines that could not be priced as requested, with the reason. */
  issues: { productId: string; code: CartIssueCode; message: string }[]
  subtotal: number
  discountTotal: number
  shippingTotal: number
  total: number
  coupon: { code: string; type: CouponType; value: number; discount: number } | null
  couponError: string | null
  freeShippingRemaining: number | null
}

export interface OrderItemDTO {
  productId: string
  name: string
  slug: string
  sku: string | null
  image: string | null
  unitPrice: number
  quantity: number
  discount: number
  lineTotal: number
}

export interface OrderDTO {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  customer: { email: string; name: string; phone: string | null }
  shippingAddress: {
    line1: string
    line2: string | null
    city: string
    region: string | null
    postalCode: string
    country: string
  }
  items: OrderItemDTO[]
  currency: string
  subtotal: number
  discountTotal: number
  shippingTotal: number
  total: number
  coupon: { code: string; type: CouponType; value: number; discount: number } | null
  notes: string | null
  statusHistory: { status: OrderStatus; at: string; note: string | null }[]
  isGuest: boolean
  createdAt: string
}

export interface OrderSummaryDTO {
  id: string
  orderNumber: string
  status: OrderStatus
  paymentStatus: PaymentStatus
  customerName: string
  customerEmail: string
  itemCount: number
  total: number
  currency: string
  createdAt: string
}

export interface CustomerDTO {
  id: string
  name: string
  email: string
  phone: string | null
  role: UserRole
  isActive: boolean
  orderCount: number
  totalSpent: number
  createdAt: string
  lastLoginAt: string | null
}

export interface CouponDTO {
  id: string
  code: string
  description: string | null
  type: CouponType
  value: number
  minOrderAmount: number
  maxDiscountAmount: number | null
  startsAt: string | null
  expiresAt: string | null
  usageLimit: number | null
  usedCount: number
  products: string[]
  categories: string[]
  isActive: boolean
  createdAt: string
}

export interface DashboardStatsDTO {
  currency: string
  orders: { total: number; last30Days: number; byStatus: Record<OrderStatus, number> }
  /** Sum of non-cancelled order totals. Payments aren't processed yet, so this is order value, not collected revenue. */
  orderValue: { total: number; last30Days: number }
  products: { active: number; draft: number; archived: number; lowStock: number; outOfStock: number }
  customers: { total: number; last30Days: number }
  recentOrders: OrderSummaryDTO[]
  lowStockProducts: { id: string; name: string; stock: number }[]
}
