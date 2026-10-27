import type { StoreSettingsUpdate } from "../../shared/schemas/settings";
import type { PublicStoreDTO } from "../../shared/types/api";
import { StoreSettings, type IStoreSettings } from "../db/models";

export interface StoreDefaults {
  storeName: string;
  currency: string;
}

export type ResolvedSettings = Omit<
  IStoreSettings,
  "_id" | "key" | "createdAt" | "updatedAt"
>;

/** Store settings from the DB, falling back to env defaults until an admin saves them. */
export async function getStoreSettings(
  defaults: StoreDefaults,
): Promise<ResolvedSettings> {
  const doc = await StoreSettings.findOne({ key: "store" }).lean();
  return {
    storeName: doc?.storeName ?? defaults.storeName,
    contactEmail: doc?.contactEmail,
    contactPhone: doc?.contactPhone,
    address: doc?.address,
    currency: (doc?.currency ?? defaults.currency).toUpperCase(),
    shipping: {
      flatRate: doc?.shipping?.flatRate ?? 0,
      freeShippingThreshold: doc?.shipping?.freeShippingThreshold ?? undefined,
      allowedCountries: doc?.shipping?.allowedCountries ?? [],
    },
  };
}

export function toPublicStore(s: ResolvedSettings): PublicStoreDTO {
  return {
    storeName: s.storeName,
    currency: s.currency,
    contactEmail: s.contactEmail ?? null,
    contactPhone: s.contactPhone ?? null,
    shipping: {
      flatRate: s.shipping.flatRate,
      freeShippingThreshold: s.shipping.freeShippingThreshold ?? null,
      allowedCountries: s.shipping.allowedCountries,
    },
  };
}

export async function updateStoreSettings(
  input: StoreSettingsUpdate,
  defaults: StoreDefaults,
) {
  const current = await getStoreSettings(defaults);
  const $set: Record<string, unknown> = {};
  const $unset: Record<string, ""> = {};

  if (input.storeName !== undefined) $set.storeName = input.storeName;
  if (input.currency !== undefined) $set.currency = input.currency;
  for (const key of ["contactEmail", "contactPhone", "address"] as const) {
    const value = input[key];
    if (value === null) $unset[key] = "";
    else if (value !== undefined) $set[key] = value;
  }
  if (input.shipping) {
    $set["shipping.flatRate"] = input.shipping.flatRate;
    $set["shipping.allowedCountries"] = input.shipping.allowedCountries;
    if (input.shipping.freeShippingThreshold === null)
      $unset["shipping.freeShippingThreshold"] = "";
    else
      $set["shipping.freeShippingThreshold"] =
        input.shipping.freeShippingThreshold;
  }

  await StoreSettings.updateOne(
    { key: "store" },
    {
      $set,
      ...(Object.keys($unset).length ? { $unset } : {}),
      // First save: seed required fields that weren't part of this update.
      // (`key` comes from the filter on insert.)
      $setOnInsert: {
        ...(input.storeName === undefined && { storeName: current.storeName }),
        ...(input.currency === undefined && { currency: current.currency }),
      },
    },
    { upsert: true, runValidators: true },
  );
  return getStoreSettings(defaults);
}
