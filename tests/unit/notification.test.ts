import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildNewOrderEmail,
  emailImageUrl,
  escapeHtml,
  notifyNewOrder,
} from "../../server/services/notification.service";
import type { OrderDTO } from "../../shared/types/api";

const order: OrderDTO = {
  id: "665f00000000000000000001",
  orderNumber: "MC-260101-ABC123",
  status: "pending",
  paymentStatus: "unpaid",
  customer: {
    email: "ana@example.com",
    name: "Ana <script>",
    phone: "+15550100",
  },
  shippingAddress: {
    line1: "1 Main St",
    line2: null,
    city: "Springfield",
    region: "IL",
    postalCode: "62701",
    country: "US",
  },
  items: [
    {
      productId: "p1",
      name: "Madagascar 72% Bar",
      slug: "madagascar-72-bar",
      sku: null,
      image: null,
      unitPrice: 1200,
      quantity: 2,
      discount: 0,
      lineTotal: 2400,
    },
  ],
  currency: "USD",
  subtotal: 2400,
  discountTotal: 0,
  shippingTotal: 500,
  total: 2900,
  coupon: null,
  notes: "Happy birthday & <b>love</b>",
  statusHistory: [],
  isGuest: true,
  createdAt: "2026-01-01T00:00:00.000Z",
} as OrderDTO;

const opts = {
  storeName: "Veloura Sweets",
  adminUrl: "https://example.com/admin/orders/665f00000000000000000001",
  siteUrl: "https://example.com",
};

describe("emailImageUrl", () => {
  it("makes relative URLs absolute and resizes Cloudinary images as JPEG", () => {
    expect(emailImageUrl("/img/bar.jpg", "https://shop.test")).toBe(
      "https://shop.test/img/bar.jpg",
    );
    expect(
      emailImageUrl(
        "https://res.cloudinary.com/x/image/upload/v1/a.png",
        "https://shop.test",
      ),
    ).toBe(
      "https://res.cloudinary.com/x/image/upload/f_jpg,q_auto,c_fill,w_144,h_144/v1/a.png",
    );
  });

  it("drops images a mail client can't load", () => {
    expect(emailImageUrl(null, "https://shop.test")).toBeNull();
    expect(emailImageUrl("/img/bar.jpg", "http://localhost:3000")).toBeNull();
    expect(
      emailImageUrl("javascript:alert(1)", "https://shop.test"),
    ).toBeNull();
  });
});

describe("escapeHtml", () => {
  it("escapes markup characters", () => {
    expect(escapeHtml(`<a href="x">'&'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;&#39;&amp;&#39;&lt;/a&gt;",
    );
  });
});

describe("buildNewOrderEmail", () => {
  const email = buildNewOrderEmail(order, opts);

  it("summarises the order in the subject and replies to the customer", () => {
    expect(email.subject).toBe("New order MC-260101-ABC123 — $29.00");
    expect(email.replyTo).toBe("ana@example.com");
  });

  it("includes customer, address, items, totals and the admin link", () => {
    for (const part of [
      "ana@example.com",
      "+15550100",
      "1 Main St",
      "Springfield, IL, 62701",
      "United States",
      "2 × Madagascar 72% Bar",
      "$24.00",
      "$5.00",
      "$29.00",
      opts.adminUrl,
    ]) {
      expect(email.text).toContain(part);
    }
  });

  it("escapes customer input in the HTML part", () => {
    expect(email.html).not.toContain("<script>");
    expect(email.html).toContain("Ana &lt;script&gt;");
    expect(email.html).toContain(
      "Happy birthday &amp; &lt;b&gt;love&lt;/b&gt;",
    );
  });
});

describe("notifyNewOrder", () => {
  afterEach(() => vi.unstubAllGlobals());

  const base = { storeName: "Veloura Sweets", siteUrl: "https://example.com" };

  it("does nothing when Resend is not configured", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    await notifyNewOrder(order, {
      ...base,
      resend: { apiKey: "", from: "a@b.c", to: "o@b.c" },
    });
    await notifyNewOrder(order, {
      ...base,
      resend: { apiKey: "key", from: "a@b.c", to: "" },
      fallbackTo: null,
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts to Resend, falling back to the store contact email", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response("{}", { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    await notifyNewOrder(order, {
      ...base,
      resend: { apiKey: "key", from: "Shop <s@b.c>", to: "" },
      fallbackTo: "owner@b.c",
    });

    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://api.resend.com/emails");
    expect(init.headers.Authorization).toBe("Bearer key");
    const body = JSON.parse(init.body);
    expect(body.to).toEqual(["owner@b.c"]);
    expect(body.reply_to).toBe("ana@example.com");
  });

  it("never throws when sending fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("bad", { status: 500 })),
    );
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    await expect(
      notifyNewOrder(order, {
        ...base,
        resend: { apiKey: "key", from: "s@b.c", to: "o@b.c" },
      }),
    ).resolves.toBeUndefined();
    expect(log).toHaveBeenCalled();
    log.mockRestore();
  });
});
