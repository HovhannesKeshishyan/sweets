import type { OrderDTO } from "../../shared/types/api"
import { PAYMENT_STATUS_LABELS } from "../../shared/utils/labels"
import { formatMoney } from "../../shared/utils/money"

/**
 * Store-owner notifications for new orders, sent through Resend's HTTP API.
 * A failed email never fails the order: it is already committed when this runs.
 */
export interface ResendConfig {
  apiKey: string
  from: string
  to: string
}

export interface EmailMessage {
  subject: string
  html: string
  text: string
  replyTo: string
}

const SEND_TIMEOUT_MS = 5000

/** Brand palette (mirrors app/assets/css/main.css); email clients need literal values. */
const C = {
  cocoa950: "#1c110b",
  cocoa900: "#2b1a12",
  cocoa700: "#573826",
  cocoa500: "#8a5d43",
  cream100: "#f6eee2",
  cream200: "#ecdfcb",
  ivory: "#fbf8f2",
  gold400: "#c9a45c",
  gold600: "#94702f",
  line: "#e6d9c6",
}
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif"
const SANS = "Manrope, 'Helvetica Neue', Helvetica, Arial, sans-serif"

export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function countryName(code: string): string {
  return new Intl.DisplayNames(["en"], { type: "region" }).of(code) ?? code
}

/**
 * Absolute, email-safe thumbnail URL, or null when a mail client couldn't load it
 * (no image, or a relative/localhost URL that only works on the dev machine).
 */
export function emailImageUrl(url: string | null, siteUrl: string): string | null {
  if (!url) return null
  let abs: URL
  try {
    abs = new URL(url, siteUrl)
  } catch {
    return null
  }
  if (abs.protocol !== "https:" && abs.protocol !== "http:") return null
  if (/^(localhost|127\.|0\.0\.0\.0|\[::1\])/.test(abs.hostname)) return null
  const href = abs.toString()
  // JPEG rather than f_auto: some mail clients can't show WebP/AVIF.
  return href.includes("res.cloudinary.com") && href.includes("/image/upload/")
    ? href.replace("/image/upload/", "/image/upload/f_jpg,q_auto,c_fill,w_144,h_144/")
    : href
}

/** Builds the owner's "new order" email. All customer input is escaped in the HTML part. */
export function buildNewOrderEmail(
  order: OrderDTO,
  opts: { storeName: string; adminUrl: string; siteUrl: string },
): EmailMessage {
  const money = (minor: number) => formatMoney(minor, order.currency)
  const e = escapeHtml
  const a = order.shippingAddress
  const addressLines = [
    a.line1,
    a.line2,
    [a.city, a.region, a.postalCode].filter(Boolean).join(", "),
    countryName(a.country),
  ].filter((l): l is string => Boolean(l))
  const itemCount = order.items.reduce((n, i) => n + i.quantity, 0)
  const placedAt = new Date(order.createdAt).toLocaleString("en-US", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "UTC",
  }) + " UTC"

  const totals: [string, string][] = [["Subtotal", money(order.subtotal)]]
  if (order.discountTotal) {
    totals.push([order.coupon ? `Discount (${order.coupon.code})` : "Discount", `−${money(order.discountTotal)}`])
  }
  totals.push(["Shipping", order.shippingTotal ? money(order.shippingTotal) : "Free"])

  const subject = `New order ${order.orderNumber} — ${money(order.total)}`
  const preheader = `${order.customer.name} ordered ${itemCount} item${itemCount === 1 ? "" : "s"} · ${money(order.total)}`

  const text = [
    `New order ${order.orderNumber} on ${opts.storeName}`,
    placedAt,
    "",
    "Customer",
    order.customer.name,
    order.customer.email,
    order.customer.phone ?? "",
    "",
    "Delivery address",
    ...addressLines,
    "",
    "Items",
    ...order.items.map((i) => `${i.quantity} × ${i.name} — ${money(i.lineTotal)}`),
    "",
    ...totals.map(([label, value]) => `${label}: ${value}`),
    `Total: ${money(order.total)}`,
    ...(order.notes ? ["", "Gift note", order.notes] : []),
    "",
    `View order: ${opts.adminUrl}`,
  ].join("\n")

  const label = (t: string) =>
    `<div style="font-family:${SANS};font-size:11px;letter-spacing:2px;text-transform:uppercase;color:${C.gold600};font-weight:600;margin:0 0 10px">${t}</div>`

  const itemRows = order.items
    .map((i, idx) => {
      const img = emailImageUrl(i.image, opts.siteUrl)
      const thumb = img
        ? `<img src="${e(img)}" width="64" height="64" alt="${e(i.name)}" style="display:block;width:64px;height:64px;border-radius:10px;object-fit:cover;border:0">`
        : `<div style="width:64px;height:64px;border-radius:10px;background:${C.cream200};text-align:center;line-height:64px;font-family:${SERIF};font-size:26px;color:${C.cocoa500}">${e(i.name.trim().charAt(0).toUpperCase())}</div>`
      const border = idx === order.items.length - 1 ? "" : `border-bottom:1px solid ${C.line};`
      return `<tr>
        <td width="64" style="padding:14px 0;${border}vertical-align:middle">${thumb}</td>
        <td style="padding:14px 16px;${border}vertical-align:middle;font-family:${SANS}">
          <div style="font-size:15px;font-weight:600;color:${C.cocoa900}">${e(i.name)}</div>
          <div style="font-size:13px;color:${C.cocoa500};margin-top:3px">Qty ${i.quantity} × ${e(money(i.unitPrice))}${i.sku ? ` · SKU ${e(i.sku)}` : ""}</div>
        </td>
        <td align="right" style="padding:14px 0;${border}vertical-align:middle;font-family:${SANS};font-size:15px;font-weight:600;color:${C.cocoa900};white-space:nowrap">${e(money(i.lineTotal))}</td>
      </tr>`
    })
    .join("")

  const totalRows = totals
    .map(
      ([l, v]) => `<tr>
        <td style="padding:4px 0;font-family:${SANS};font-size:14px;color:${C.cocoa700}">${e(l)}</td>
        <td align="right" style="padding:4px 0;font-family:${SANS};font-size:14px;color:${C.cocoa700}">${e(v)}</td>
      </tr>`,
    )
    .join("")

  const contactHtml = [
    `<div style="font-size:15px;font-weight:600;color:${C.cocoa900}">${e(order.customer.name)}</div>`,
    `<a href="mailto:${e(order.customer.email)}" style="color:${C.gold600};text-decoration:none">${e(order.customer.email)}</a>`,
    order.customer.phone
      ? `<a href="tel:${e(order.customer.phone.replace(/[^\d+]/g, ""))}" style="color:${C.cocoa700};text-decoration:none">${e(order.customer.phone)}</a>`
      : "",
    order.isGuest ? `<span style="color:${C.cocoa500};font-size:12px">Guest checkout</span>` : "",
  ]
    .filter(Boolean)
    .join("<br>")

  const noteHtml = order.notes
    ? `<tr><td style="padding:0 40px 32px" class="px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream100};border-left:3px solid ${C.gold400};border-radius:0 12px 12px 0">
          <tr><td style="padding:18px 22px">
            ${label("Gift note")}
            <div style="font-family:${SERIF};font-style:italic;font-size:19px;line-height:1.5;color:${C.cocoa900};white-space:pre-wrap">“${e(order.notes)}”</div>
          </td></tr>
        </table>
      </td></tr>`
    : ""

  const html = `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>${e(subject)}</title>
<style>
  @media (max-width:620px){
    .px{padding-left:24px!important;padding-right:24px!important}
    .col{display:block!important;width:100%!important;padding:0 0 24px!important}
    .total{font-size:34px!important}
  }
</style>
</head>
<body style="margin:0;padding:0;background:${C.cream100};-webkit-text-size-adjust:100%">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${e(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream100}">
  <tr><td align="center" style="padding:32px 12px">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.ivory};border-radius:20px;overflow:hidden;box-shadow:0 8px 30px rgba(43,26,18,0.08)">

      <tr><td align="center" style="background:${C.cocoa900};padding:30px 40px 26px">
        <div style="font-family:${SERIF};font-size:28px;letter-spacing:4px;color:${C.gold400};text-transform:uppercase">${e(opts.storeName)}</div>
        <div style="width:40px;height:1px;background:${C.gold400};margin:12px auto 0;line-height:1px;font-size:1px">&nbsp;</div>
      </td></tr>

      <tr><td align="center" style="padding:40px 40px 8px" class="px">
        ${label("New order received")}
        <div style="font-family:${SERIF};font-size:34px;line-height:1.2;color:${C.cocoa900}">${e(order.customer.name)} placed an order</div>
        <div style="font-family:${SANS};font-size:13px;color:${C.cocoa500};margin-top:10px">Order <strong style="color:${C.cocoa900}">${e(order.orderNumber)}</strong> · ${e(placedAt)}</div>
      </td></tr>

      <tr><td align="center" style="padding:24px 40px 8px" class="px">
        <div class="total" style="font-family:${SERIF};font-size:44px;font-weight:600;color:${C.cocoa900}">${e(money(order.total))}</div>
        <div style="font-family:${SANS};font-size:13px;color:${C.cocoa500};margin-top:4px">${itemCount} item${itemCount === 1 ? "" : "s"}</div>
        <div style="margin-top:14px">
          <span style="display:inline-block;font-family:${SANS};font-size:12px;font-weight:600;color:${C.gold600};background:${C.cream200};border-radius:999px;padding:6px 14px">${e(PAYMENT_STATUS_LABELS[order.paymentStatus])}</span>
        </div>
      </td></tr>

      <tr><td align="center" style="padding:28px 40px 36px" class="px">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>
          <td style="border-radius:999px;background:${C.cocoa900}">
            <a href="${e(opts.adminUrl)}" style="display:inline-block;padding:14px 32px;font-family:${SANS};font-size:14px;font-weight:600;letter-spacing:0.5px;color:${C.ivory};text-decoration:none;border-radius:999px">View order in admin →</a>
          </td>
        </tr></table>
      </td></tr>

      <tr><td style="padding:0 40px" class="px"><div style="height:1px;background:${C.line};line-height:1px;font-size:1px">&nbsp;</div></td></tr>

      <tr><td style="padding:32px 40px 8px" class="px">
        ${label("Order summary")}
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${itemRows}</table>
      </td></tr>

      <tr><td style="padding:8px 40px 32px" class="px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${C.line};padding-top:12px">
          ${totalRows}
          <tr>
            <td style="padding:12px 0 0;border-top:1px solid ${C.line};font-family:${SERIF};font-size:22px;font-weight:600;color:${C.cocoa900}">Total</td>
            <td align="right" style="padding:12px 0 0;border-top:1px solid ${C.line};font-family:${SERIF};font-size:22px;font-weight:600;color:${C.cocoa900}">${e(money(order.total))}</td>
          </tr>
        </table>
      </td></tr>

      ${noteHtml}

      <tr><td style="padding:0 40px 36px" class="px">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border:1px solid ${C.line};border-radius:14px">
          <tr>
            <td class="col" width="50%" style="padding:22px 22px;vertical-align:top;font-family:${SANS};font-size:14px;line-height:1.65;color:${C.cocoa700}">
              ${label("Customer")}
              ${contactHtml}
            </td>
            <td class="col" width="50%" style="padding:22px 22px;vertical-align:top;font-family:${SANS};font-size:14px;line-height:1.65;color:${C.cocoa700}">
              ${label("Deliver to")}
              <div style="font-size:15px;font-weight:600;color:${C.cocoa900}">${e(order.customer.name)}</div>
              ${addressLines.map(e).join("<br>")}
            </td>
          </tr>
        </table>
      </td></tr>

      <tr><td align="center" style="background:${C.cocoa950};padding:22px 40px" class="px">
        <div style="font-family:${SANS};font-size:12px;line-height:1.6;color:${C.cream200};opacity:0.75">
          Reply to this email to contact ${e(order.customer.name)} directly.<br>
          Sent by ${e(opts.storeName)} when an order is placed.
        </div>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`

  return { subject, html, text, replyTo: order.customer.email }
}

export async function sendWithResend(config: ResendConfig, message: EmailMessage): Promise<void> {
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { "Authorization": `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: config.from,
      to: config.to.split(",").map((s) => s.trim()).filter(Boolean),
      reply_to: message.replyTo,
      subject: message.subject,
      html: message.html,
      text: message.text,
    }),
    signal: AbortSignal.timeout(SEND_TIMEOUT_MS),
  })
  if (!response.ok) {
    throw new Error(`Resend responded ${response.status}: ${await response.text().catch(() => "")}`)
  }
}

/**
 * Emails the store owner about a new order. Does nothing when Resend isn't configured;
 * logs instead of throwing so the customer's checkout always succeeds.
 */
export async function notifyNewOrder(
  order: OrderDTO,
  opts: { resend: Partial<ResendConfig>; fallbackTo?: string | null; storeName: string; siteUrl: string },
): Promise<void> {
  const { apiKey, from } = opts.resend
  const to = opts.resend.to || opts.fallbackTo
  if (!apiKey || !from || !to) return

  const adminUrl = new URL(`/admin/orders/${order.id}`, opts.siteUrl).toString()
  try {
    const message = buildNewOrderEmail(order, { storeName: opts.storeName, adminUrl, siteUrl: opts.siteUrl })
    await sendWithResend({ apiKey, from, to }, message)
  } catch (error) {
    console.error(`[notify] Could not send new-order email for ${order.orderNumber}`, error)
  }
}
