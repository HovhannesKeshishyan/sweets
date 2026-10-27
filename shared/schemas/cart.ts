import { z } from "zod";
import { MAX_CART_LINES } from "../constants";
import { objectIdSchema } from "./common";
import { addressSchema, emailSchema, nameSchema, phoneSchema } from "./fields";

/** Only ids and quantities come from the client — never prices or totals. */
export const cartLineSchema = z.object({
  productId: objectIdSchema,
  quantity: z.number().int().min(1).max(999),
});

const couponCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .max(40)
  .transform((v) => v || undefined);

export const cartQuoteSchema = z.object({
  items: z.array(cartLineSchema).max(MAX_CART_LINES),
  couponCode: couponCodeSchema.optional(),
});

export const checkoutSchema = z.object({
  items: z
    .array(cartLineSchema)
    .min(1, "Your bag is empty")
    .max(MAX_CART_LINES),
  couponCode: couponCodeSchema.optional(),
  customer: z.object({
    email: emailSchema,
    name: nameSchema,
    phone: phoneSchema.optional(),
  }),
  shippingAddress: addressSchema,
  notes: z.string().trim().max(1000).optional(),
  /**
   * Total the customer saw. If server pricing differs (price change, coupon
   * expired), the order is refused so the customer can review — it is never
   * used to set the price.
   */
  expectedTotal: z.number().int().min(0),
});

export type CartQuoteInput = z.infer<typeof cartQuoteSchema>;
export type CheckoutInput = z.infer<typeof checkoutSchema>;
