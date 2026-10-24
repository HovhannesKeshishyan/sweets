/**
 * Payment integration point. No provider is active yet: orders are created
 * with `paymentStatus: "unpaid"` and nothing in the app can mark them paid.
 *
 * Adding Stripe later:
 *  1. Implement `PaymentProvider` with Stripe Checkout or Payment Intents
 *     (card details are entered on Stripe's hosted UI — never sent to this server).
 *  2. After `placeOrder`, call `createPayment` and redirect the customer.
 *  3. Add `POST /api/payments/stripe/webhook`: verify the signature, then set
 *     `paymentStatus: "paid"` and `payment.reference` for the matching order.
 *     The webhook is the only place an order may be marked paid.
 */
import type { OrderDTO } from '../../shared/types/api'

export interface PaymentSession {
  /** Where to send the customer to pay (e.g. a Stripe Checkout URL). */
  redirectUrl: string
  /** Provider reference stored on the order (e.g. Checkout Session id). */
  reference: string
}

export interface PaymentProvider {
  readonly name: string
  createPayment(order: OrderDTO, urls: { successUrl: string; cancelUrl: string }): Promise<PaymentSession>
}

/** Returns the configured provider, or null while payments are not enabled. */
export function getPaymentProvider(): PaymentProvider | null {
  return null
}
