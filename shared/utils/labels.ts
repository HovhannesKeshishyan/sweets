import type { OrderStatus, PaymentStatus } from '../constants'

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: 'Received',
  processing: 'Preparing',
  shipped: 'Shipped',
  delivered: 'Delivered',
  cancelled: 'Cancelled',
}

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: 'Awaiting payment',
  paid: 'Paid',
  refunded: 'Refunded',
}
