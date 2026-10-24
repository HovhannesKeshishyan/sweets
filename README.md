# Veloura Sweets

A production-oriented e-commerce store for chocolates and confections, built as a single Nuxt 4
application: SSR storefront, guest and registered checkout, coupons, and a full admin panel.

**Stack:** Nuxt 4 · Vue 3 (Composition API) · TypeScript (strict) · Nitro server routes ·
MongoDB + Mongoose · Tailwind CSS 4 · Zod · Vitest · Playwright

## Features

**Storefront** — homepage (featured, collections, seasonal offers, gift collections) · catalog
with search, collection filter, sorting and pagination · product pages with gallery, stock level
and structured data · persistent guest bag · optional accounts with profile and order history ·
SEO metadata, canonical URLs, `robots.txt` and `sitemap.xml` · responsive and accessible
(labelled forms, landmarks, skip links, focus styles, reduced-motion support).

**Checkout** — guest or signed-in · contact and delivery details · server-validated prices,
quantities, stock and coupons · order confirmation page · **no payments yet**: orders are created
`unpaid` and nothing in the app can mark them paid (see [Payments](#payments)).

**Coupons** — percentage or fixed amount · start/expiry dates · minimum order · maximum discount ·
total usage limit (safe under concurrent checkouts) · optional product/category restrictions.

**Admin (`/admin`)** — dashboard statistics · products (create, edit, archive, images, inventory,
featured) · categories · coupons (create, edit, enable/disable) · orders and fulfillment status ·
customers and their order history · store settings (name, contact, currency, shipping).

## Requirements

- Node.js 22+
- MongoDB 7+ **running as a replica set** (checkout uses transactions). Atlas works as-is.

## Quick start

```bash
npm install
cp .env.example .env                       # then edit values
npm run db:indexes                         # create indexes
npm run seed                               # optional: development sample catalog
npm run create-admin -- --email you@example.com --name "Your Name"
npm run dev                                # http://localhost:3000
```

### Local MongoDB replica set (Docker)

```bash
docker run -d --name mongo -p 27017:27017 mongo:8 --replSet rs0
docker exec mongo mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
```

Then set `NUXT_MONGODB_URI=mongodb://localhost:27017/velourasweets?replicaSet=rs0`.
Check: `curl http://localhost:3000/api/health` → `{"status":"ok","database":"up"}`.

## Environment variables

| Variable                                                           | Required   | Description                                                                      |
| ------------------------------------------------------------------ | ---------- | -------------------------------------------------------------------------------- |
| `NUXT_MONGODB_URI`                                                 | yes        | MongoDB replica-set connection string                                            |
| `NUXT_SESSION_SECRET`                                              | yes (prod) | ≥32 random chars; hashes session and order-link tokens. Dev uses a temporary one |
| `NUXT_PUBLIC_SITE_URL`                                             | yes        | Public base URL; `https://` enables Secure `__Host-` cookies                     |
| `NUXT_PUBLIC_SITE_NAME`                                            | no         | Store name until set in admin settings                                           |
| `NUXT_PUBLIC_DEFAULT_CURRENCY`                                     | no         | ISO 4217 code until set in admin settings (default `USD`)                        |
| `NUXT_TRUST_PROXY`                                                 | no         | `true` only behind a trusted reverse proxy (client IP from `X-Forwarded-For`)    |
| `NUXT_CLOUDINARY_CLOUD_NAME`, `_API_KEY`, `_API_SECRET`, `_FOLDER` | no         | Enables admin image uploads                                                      |

## Scripts

| Command                                        | What it does                                                          |
| ---------------------------------------------- | --------------------------------------------------------------------- |
| `npm run dev`                                  | Dev server with HMR                                                   |
| `npm run build` / `npm run preview`            | Production build into `.output/` / serve it                           |
| `npm run typecheck`                            | `vue-tsc` across app, server and shared code, plus tests and scripts  |
| `npm test`                                     | Vitest unit + integration tests                                       |
| `npm run test:e2e`                             | Playwright tests against the production build (`npm run build` first) |
| `npm run create-admin -- --email … [--name …]` | Create or promote an administrator                                    |
| `npm run seed [-- --reset]`                    | Load development sample data (refuses in production)                  |
| `npm run db:indexes`                           | Create/update all MongoDB indexes (run on every deploy)               |

## MongoDB

Models: `User`, `Session`, `Category`, `Product`, `Coupon`, `Order`, `StoreSettings`
(`server/db/models/`). `Session` was added because sessions are stored server-side.

- All money is stored as **integers in minor units** (cents). The currency is a store setting.
- Orders store **snapshots** of each line (name, slug, SKU, image, unit price, quantity,
  discount, line total) plus the coupon used, so later product edits never change past orders.
- Products are **archived, not deleted**, so orders keep valid references.
- Indexes cover catalog filters/sorts, order history, admin lists, unique slugs/SKUs/codes, and a
  TTL index that expires sessions. Production disables `autoIndex`; run `npm run db:indexes`.

## Administrator creation

There is no HTTP route that grants the admin role. Use the CLI:

```bash
npm run create-admin -- --email owner@example.com --name "Store Owner"
```

The password is prompted for (hidden, ≥10 characters), or read from `ADMIN_PASSWORD` for CI.
For an existing email the account is promoted and its password reset. Admins sign in at `/login`.

## Sample data

`npm run seed` loads 5 categories, 16 products (with placeholder photos from
[Lorem Picsum](https://picsum.photos)), 3 coupons (`WELCOME10`, `GIFT15`, `SWEET5`) and shipping settings
($7 flat, free from $75). It runs only when the catalog is empty (`--reset` replaces categories,
products, coupons and settings), never touches users or orders, and refuses to run with
`NODE_ENV=production`. The data lives in `scripts/seed-data.ts`, separate from application code.

## Architecture

```
app/                 Vue UI
  pages/             storefront, cart, checkout, order, account, admin/*
  components/        storefront components; admin/* for the admin UI
  composables/       useAuth, useCart (localStorage bag), useStore, usePageSeo
server/
  api/               thin route handlers: public /api/*, /api/account/*, /api/admin/*
  middleware/        body-size limit → CSRF origin check → role guards by route prefix
  services/          business logic: pricing (pure), cart, order, product, category,
                     coupon, customer, stats, settings, auth, session, password, upload, payments
  db/                connection + Mongoose models
  utils/             auto-imported helpers: validation, auth guards, rate limiting, db
shared/              code used by client and server: Zod schemas, DTO types, money, constants
scripts/             create-admin, seed (+ seed-data), sync-indexes
tests/               unit/, integration/ (Vitest), e2e/ (Playwright)
```

**Pricing** lives in one pure function (`server/services/pricing.ts`) used by both the bag preview
and order placement. The client only ever sends product ids, quantities and a coupon code.

**Order placement** (`server/services/order.service.ts`) runs in one MongoDB transaction:
re-price from the database → refuse if anything changed since the customer saw it → decrement stock
with conditional updates (`stock >= qty`) → claim a coupon use (`usedCount < usageLimit`) → insert
the order. Any failure rolls everything back; write conflicts from concurrent checkouts are retried
by the driver. Cancelling an order returns stock and the coupon use in a transaction.

## Security model

- **Passwords:** scrypt (N=2¹⁵, r=8, p=3) with per-hash salt; parameters stored per hash, rehash on login.
- **Sessions:** 256-bit random token in an HTTP-only, SameSite=Lax cookie (`Secure` + `__Host-`
  prefix on HTTPS). Only an HMAC of the token is stored; 30-day rolling expiry with a TTL index;
  the previous session is revoked on login. Roles are read from the database on every request.
- **Access control:** server middleware requires an admin for `/api/admin/**` and a user for
  `/api/account/**` (with path normalisation), and every handler checks again. Page guards are UX only.
  Guest order pages require the secret token from the confirmation link; otherwise 404.
- **Input:** every request body, query and route param is parsed with a Zod schema (unknown
  fields dropped — no mass assignment). Any `$`-prefixed or dotted key is rejected before parsing
  (NoSQL operator injection); Mongoose `strictQuery` is on. Search text is regex-escaped.
- **Never trusted from the client:** roles, prices, discounts, shipping, totals, stock, payment status.
- **CSRF:** state-changing `/api` requests with a foreign `Origin` are rejected.
- **Rate limits:** login (per IP and per email), registration, checkout, coupon attempts.
  The limiter is in-memory — use a shared store (e.g. Redis; see `RateLimitStore`) if you run
  several instances.
- **Other:** 100 KB JSON body limit (4.4 MB for uploads, 4 MB images); uploads are type-checked by file content;
  security headers (nosniff, frame denial, referrer policy, HSTS); generic error messages.

## Payments

No payment provider is active, by design: orders are `unpaid`, customers are told payment will be
arranged, and no card data is ever collected. `server/services/payments.ts` defines the
`PaymentProvider` interface and documents the Stripe integration path (hosted Checkout/Payment
Element + a signature-verified webhook as the **only** code allowed to mark an order paid).

## Testing

```bash
npm test                 # unit + integration
npm run build && npm run test:e2e
```

- **Unit tests** need nothing else: pricing and coupon engine, money, validation and injection
  guards, schemas, passwords, rate limiter, CSRF check, upload checks, order rules.
- **Integration tests** need MongoDB: they use an in-memory replica set from `mongodb-memory-server`
  (downloads a binary on first run), or your own with `MONGODB_TEST_URI=mongodb://…/?replicaSet=rs0`.
  They cover models, auth and sessions, catalog/admin services, checkout, **concurrent overselling
  and coupon-limit races**, order access and cancellation. `SKIP_DB_TESTS=1` skips them.
- **E2E tests:** the default run needs no database (smoke, SEO, API protection, CSRF, rate
  limiting, headers). The full shopping and admin workflows run against a server backed by a
  **throwaway** seeded database — they place real orders:

  ```bash
  export NUXT_MONGODB_URI="mongodb://localhost:27017/velourasweets-e2e?replicaSet=rs0"
  npm run seed -- --reset
  ADMIN_PASSWORD=admin-password-123 npm run create-admin -- --email admin@example.com
  npm run build && PORT=3200 NUXT_PUBLIC_SITE_URL=http://localhost:3200 node .output/server/index.mjs &
  E2E_WITH_DB=1 E2E_BASE_URL=http://localhost:3200 npx playwright test --project=chromium
  ```

  Install a browser once with `npx playwright install chromium`, or set `E2E_CHROMIUM_PATH`.

## Deployment

1. Provision MongoDB as a replica set (e.g. Atlas) and set the environment variables, with an
   `https://` `NUXT_PUBLIC_SITE_URL` and a strong `NUXT_SESSION_SECRET`.
2. `npm ci && npm run build`
3. `npm run db:indexes` against the production database.
4. `npm run create-admin -- --email …` for the first administrator.
5. Run `node .output/server/index.mjs` (any Node host or container), or deploy with a Nitro preset
   (Vercel, Netlify, …). Serve over HTTPS; set `NUXT_TRUST_PROXY=true` behind your load balancer.
6. Configure Cloudinary variables for image uploads, or use image URLs.

On serverless or multi-instance hosting, swap the in-memory rate-limit store for a shared one.
