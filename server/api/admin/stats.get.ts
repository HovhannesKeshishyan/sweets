import { getStoreSettings } from "../../services/settings.service";
import { getDashboardStats } from "../../services/stats.service";

export default defineEventHandler(async (event) => {
  await requireAdmin(event);
  const settings = await getStoreSettings(storeDefaults());
  return getDashboardStats(settings.currency);
});
