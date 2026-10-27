import { cartQuoteSchema } from "../../../shared/schemas/cart";
import { quoteCart, toQuoteDTO } from "../../services/cart.service";
import { RATE_LIMITS } from "../../services/rate-limiter";
import { getStoreSettings } from "../../services/settings.service";

/**
 * Prices a cart with current server-side prices, stock and coupon rules.
 * The client only sends product ids, quantities and an optional coupon code.
 */
export default defineEventHandler(async (event) => {
  const input = await validateBody(event, cartQuoteSchema);
  // Coupon guessing is the abuse vector here, so only those requests are limited.
  if (input.couponCode) await enforceRateLimit(event, RATE_LIMITS.coupon);

  await useDatabase();
  const settings = await getStoreSettings(storeDefaults());
  setHeader(event, "Cache-Control", "no-store");
  return toQuoteDTO(await quoteCart(input, settings));
});
