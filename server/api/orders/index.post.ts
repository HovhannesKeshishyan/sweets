import { checkoutSchema } from "../../../shared/schemas/cart";
import { notifyNewOrder } from "../../services/notification.service";
import { placeOrder } from "../../services/order.service";
import { RATE_LIMITS } from "../../services/rate-limiter";
import { getStoreSettings } from "../../services/settings.service";

/**
 * Guest or signed-in checkout. Prices, discounts, shipping and stock are all
 * recomputed on the server; no payment is taken (orders start unpaid).
 */
export default defineEventHandler(async (event) => {
  await enforceRateLimit(event, RATE_LIMITS.checkout);
  const input = await validateBody(event, checkoutSchema);

  await useDatabase();
  const user = await getSessionUser(event);
  const settings = await getStoreSettings(storeDefaults());
  const result = await placeOrder(input, settings, {
    userId: user?._id ?? null,
    secret: getSessionSecret(),
  });

  // Awaited (not fire-and-forget) so serverless hosts don't freeze before it's sent; never throws.
  const config = useRuntimeConfig();
  await notifyNewOrder(result.order, {
    resend: config.resend,
    fallbackTo: settings.contactEmail,
    storeName: settings.storeName,
    siteUrl: config.public.siteUrl,
  });

  setResponseStatus(event, 201);
  setHeader(event, "Cache-Control", "no-store");
  return result;
});
