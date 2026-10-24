import { describe, expect, it } from "vitest";
import {
  Category,
  Coupon,
  Product,
  StoreSettings,
  User,
} from "../../server/db/models";
import { hasDatabase, useTestDatabase } from "../setup/db";

describe.skipIf(!hasDatabase)("models", () => {
  useTestDatabase();

  it("hides password hashes from queries and JSON", async () => {
    await User.create({
      email: "A@Example.com",
      name: "A",
      passwordHash: "scrypt$x",
    });
    const found = await User.findOne({ email: "a@example.com" });
    expect(found?.email).toBe("a@example.com");
    expect(found?.passwordHash).toBeUndefined();

    const withHash = await User.findOne({ email: "a@example.com" }).select(
      "+passwordHash",
    );
    expect(withHash?.passwordHash).toBe("scrypt$x");
    expect(JSON.stringify(withHash)).not.toContain("scrypt$x");
  });

  it("defaults new users to the customer role and enforces unique emails", async () => {
    const user = await User.create({
      email: "b@example.com",
      name: "B",
      passwordHash: "h",
    });
    expect(user.role).toBe("customer");
    await expect(
      User.create({ email: "B@example.com", name: "B2", passwordHash: "h" }),
    ).rejects.toMatchObject({
      code: 11000,
    });
  });

  it("rejects non-integer prices and negative stock", async () => {
    await expect(
      Product.create({ name: "P", slug: "p", description: "d", price: 12.5 }),
    ).rejects.toThrow(/integer/);
    await expect(
      Product.create({
        name: "P",
        slug: "p2",
        description: "d",
        price: 100,
        stock: -1,
      }),
    ).rejects.toThrow();
  });

  it("enforces unique product slugs and SKUs, but allows many products without SKU", async () => {
    await Product.create({
      name: "A",
      slug: "a",
      description: "d",
      price: 100,
      sku: "abc-1",
    });
    await expect(
      Product.create({ name: "B", slug: "a", description: "d", price: 100 }),
    ).rejects.toMatchObject({
      code: 11000,
    });
    await expect(
      Product.create({
        name: "C",
        slug: "c",
        description: "d",
        price: 100,
        sku: "ABC-1",
      }),
    ).rejects.toMatchObject({ code: 11000 });
    await Product.create({
      name: "D",
      slug: "d",
      description: "d",
      price: 100,
    });
    await Product.create({
      name: "E",
      slug: "e",
      description: "d",
      price: 100,
    });
    expect(await Product.countDocuments()).toBe(3);
  });

  it("validates coupon percentages", async () => {
    await expect(
      Coupon.create({ code: "X", type: "percentage", value: 120 }),
    ).rejects.toThrow(/exceed 100/);
    const ok = await Coupon.create({
      code: "save10",
      type: "percentage",
      value: 10,
    });
    expect(ok.code).toBe("SAVE10");
    expect(ok.usedCount).toBe(0);
  });

  it("keeps store settings a singleton", async () => {
    await StoreSettings.create({ storeName: "Veloura Sweets", currency: "usd" });
    await expect(
      StoreSettings.create({ storeName: "Other", currency: "EUR" }),
    ).rejects.toMatchObject({ code: 11000 });
  });

  it("ignores filter keys that are not in the schema (strictQuery)", async () => {
    await Category.create({ name: "Bars", slug: "bars" });
    const found = await Category.find({ notAField: "x" } as Record<
      string,
      unknown
    >);
    expect(found).toHaveLength(1);
  });
});
