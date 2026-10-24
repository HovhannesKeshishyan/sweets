# Veloura Sweets

An online shop for chocolates and sweets. It's one Nuxt 4 app that has the storefront,
checkout (guests can order without an account), coupons and an admin panel.

Built with Nuxt 4, Vue 3, TypeScript, MongoDB/Mongoose, Tailwind CSS 4 and Zod. Tests use
Vitest and Playwright.

## What it does

Storefront:

- Home page with featured products, collections, seasonal offers and gift boxes
- Catalog with search, category filter, sorting and pagination
- Product pages with a gallery, stock info and structured data for search engines
- The bag is saved in the browser, so guests don't lose it
- Optional accounts with a profile and order history
- SEO basics: meta tags, canonical URLs, `robots.txt`, `sitemap.xml`
- Works on mobile, and I tried to keep it accessible (labels, landmarks, skip links, focus
  styles, reduced motion)

Checkout works for guests and logged-in users. Prices, stock and coupons are all checked
on the server. There are no payments yet. Orders are saved as `unpaid` and nothing in the
app can mark them as paid (more in [Payments](#payments)).

Coupons can be a percentage or a fixed amount. They can have start and end dates, a minimum
order, a maximum discount, a usage limit (works correctly even if two people check out at the
same time) and can be limited to certain products or categories.

The admin panel lives at `/admin`. From there you can see stats and manage products (images,
stock, featured flag, archiving), categories, coupons, orders and their status, customers and
store settings like name, contact info, currency and shipping.

## Requirements

- Node.js 22 or newer
- MongoDB 7 or newer, running as a replica set. Checkout uses transactions, which don't work
  on a standalone server. Atlas is fine as it is.

## Getting started

```bash
npm install
cp .env.example .env      # fill in your values
npm run db:indexes
npm run seed              # optional, adds sample products
npm run create-admin -- --email you@example.com --name "Your Name"
npm run dev               # http://localhost:3000
```

If you don't have MongoDB locally, Docker is the easiest way to get a replica set:

```bash
docker run -d --name mongo -p 27017:27017 mongo:8 --replSet rs0
docker exec mongo mongosh --eval "rs.initiate({_id:'rs0',members:[{_id:0,host:'localhost:27017'}]})"
```

Then use `NUXT_MONGODB_URI=mongodb://localhost:27017/velourasweets?replicaSet=rs0`.

To check that everything is connected, open `http://localhost:3000/api/health`. It should
return `{"status":"ok","database":"up"}`.

## Environment variables

| Variable | Required | Notes |
| --- | --- | --- |
| `NUXT_MONGODB_URI` | yes | MongoDB connection string (replica set) |
| `NUXT_SESSION_SECRET` | in production | At least 32 random characters. Used to hash session and order-link tokens. In dev a temporary one is generated |
| `NUXT_PUBLIC_SITE_URL` | yes | Public URL of the site. With `https://` the cookies get `Secure` and the `__Host-` prefix |
| `NUXT_PUBLIC_SITE_NAME` | no | Store name, until you change it in admin settings |
| `NUXT_PUBLIC_DEFAULT_CURRENCY` | no | ISO 4217 code, until you change it in admin settings. Default is `USD` |
| `NUXT_TRUST_PROXY` | no | Set to `true` only behind a reverse proxy you trust (reads client IP from `X-Forwarded-For`) |
| `NUXT_CLOUDINARY_CLOUD_NAME`, `_API_KEY`, `_API_SECRET`, `_FOLDER` | no | Turns on image uploads in admin |

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Dev server with hot reload |
| `npm run build` | Production build into `.output/` |
| `npm run preview` | Serves the production build |
| `npm run typecheck` | Runs `vue-tsc` on the app, server, shared code, tests and scripts |
| `npm test` | Unit and integration tests |
| `npm run test:e2e` | Playwright tests (run `npm run build` first) |
| `npm run create-admin -- --email … [--name …]` | Creates an admin or promotes an existing user |
| `npm run seed [-- --reset]` | Loads sample data. Won't run in production |
| `npm run db:indexes` | Creates or updates MongoDB indexes. Run it on every deploy |

## Database

The models are in `server/db/models/`: `User`, `Session`, `Category`, `Product`, `Coupon`,
`Order` and `StoreSettings`. Sessions are stored in the database, which is why there's a
`Session` model.

A few things worth knowing:

- Money is always stored as whole numbers in cents. The currency is a store setting.
- Each order keeps a copy of its lines (name, slug, SKU, image, price, quantity, discount,
  total) and the coupon. If you edit a product later, old orders stay the same.
- Products are archived instead of deleted, so old orders still point to something.
- Indexes are set up for the catalog filters, order history, admin lists and unique
  slugs/SKUs/coupon codes. There's also a TTL index that removes expired sessions. In
  production `autoIndex` is off, so run `npm run db:indexes` yourself.

## Creating an admin

You can't become an admin through the website. Use the script:

```bash
npm run create-admin -- --email owner@example.com --name "Store Owner"
```

It asks for a password (at least 10 characters, hidden while typing). For CI you can pass it
with `ADMIN_PASSWORD` instead. If the email already exists, that user becomes an admin and
their password is reset. Admins log in at `/login` like everyone else.

## Sample data

`npm run seed` adds 5 categories and 16 products with placeholder photos from
[Lorem Picsum](https://picsum.photos). It also adds 3 coupons (`WELCOME10`, `GIFT15`,
`SWEET5`) and shipping settings ($7 flat, free over $75).

It only runs if the catalog is empty. With `--reset` it replaces categories, products, coupons
and settings first. It never touches users or orders, and it won't run when
`NODE_ENV=production`. The data itself is in `scripts/seed-data.ts`.

## Project structure

```
app/                 Vue frontend
  pages/             storefront, cart, checkout, order, account, admin/*
  components/        storefront components, admin/* for the admin panel
  composables/       useAuth, useCart (bag in localStorage), useStore, usePageSeo
server/
  api/               route handlers: public /api/*, /api/account/*, /api/admin/*
  middleware/        body size limit, CSRF origin check, role checks by route
  services/          the actual logic: pricing, cart, orders, products, categories,
                     coupons, customers, stats, settings, auth, sessions, passwords,
                     uploads, payments
  db/                connection and Mongoose models
  utils/             helpers (auto-imported): validation, auth guards, rate limiting, db
shared/              used on both sides: Zod schemas, types, money helpers, constants
scripts/             create-admin, seed, sync-indexes
tests/               unit/, integration/ (Vitest), e2e/ (Playwright)
```

All price calculation is in one function, `server/services/pricing.ts`. The bag preview and
the actual order both use it. The browser only sends product ids, quantities and a coupon
code, never prices.

Placing an order (`server/services/order.service.ts`) happens inside one MongoDB transaction.
It recalculates prices from the database and stops if anything changed since the customer saw
the bag. Then it lowers stock (only if there's enough left), uses up one coupon use (only if
the limit isn't reached) and saves the order. If any step fails, everything is rolled back.
When two checkouts collide, the driver retries. Cancelling an order gives the stock and the
coupon use back, also in a transaction.

## Security

- Passwords are hashed with scrypt (N=2¹⁵, r=8, p=3) and a salt per password. The parameters
  are saved with each hash, so old hashes get upgraded on login.
- Sessions use a random 256-bit token in an HTTP-only, SameSite=Lax cookie (plus `Secure` and
  the `__Host-` prefix on HTTPS). The database only stores an HMAC of the token. Sessions last
  30 days and get extended while you use them. Logging in ends your previous session. Roles
  are read from the database on every request.
- Server middleware requires an admin for `/api/admin/**` and a logged-in user for
  `/api/account/**`, and each handler checks again. The page guards on the frontend are just
  for convenience. Guest order pages need the secret token from the confirmation link,
  otherwise they return 404.
- Every request body, query and route param goes through a Zod schema, and unknown fields are
  dropped. Keys starting with `$` or containing a dot are rejected before that, to block NoSQL
  injection. Mongoose `strictQuery` is on and search text is escaped before it goes into a
  regex.
- The server never trusts the client for roles, prices, discounts, shipping, totals, stock or
  payment status.
- `/api` requests that change data are rejected if they come from another `Origin` (CSRF).
- Login (per IP and per email), registration, checkout and coupon attempts are rate limited.
  The limiter keeps its data in memory, so if you run more than one instance you'll need a
  shared store like Redis (see `RateLimitStore`).
- JSON bodies are limited to 100 KB (4.4 MB for uploads, images up to 4 MB). Uploaded files
  are checked by their actual content, not the extension. Security headers are set (nosniff,
  frame denial, referrer policy, HSTS) and error messages don't leak details.

## Payments

There's no payment provider yet, on purpose. Orders are saved as `unpaid`, customers are told
that payment will be arranged, and the site never asks for card details.

`server/services/payments.ts` has a `PaymentProvider` interface and notes on how to add
Stripe: hosted Checkout or Payment Element, plus a webhook with signature verification. That
webhook should be the only thing allowed to mark an order as paid.

## Tests

```bash
npm test
npm run build && npm run test:e2e
```

Unit tests don't need anything extra. They cover pricing and coupons, money, validation and
injection checks, schemas, passwords, the rate limiter, CSRF, upload checks and order rules.

Integration tests need MongoDB. By default they start an in-memory replica set with
`mongodb-memory-server` (it downloads MongoDB the first time, so the first run is slow). You
can point them at your own with `MONGODB_TEST_URI=mongodb://…/?replicaSet=rs0`, or skip them
with `SKIP_DB_TESTS=1`. They test models, auth and sessions, catalog and admin services,
checkout, overselling and coupon limits under concurrent orders, and order access and
cancellation.

The default e2e run doesn't need a database. It checks basic pages, SEO, API protection, CSRF,
rate limiting and headers. The full shopping and admin flows need a server with a seeded
database. They create real orders, so use a database you don't care about:

```bash
export NUXT_MONGODB_URI="mongodb://localhost:27017/velourasweets-e2e?replicaSet=rs0"
npm run seed -- --reset
ADMIN_PASSWORD=admin-password-123 npm run create-admin -- --email admin@example.com
npm run build && PORT=3200 NUXT_PUBLIC_SITE_URL=http://localhost:3200 node .output/server/index.mjs &
E2E_WITH_DB=1 E2E_BASE_URL=http://localhost:3200 npx playwright test --project=chromium
```

You'll need a browser for Playwright: `npx playwright install chromium`, or set
`E2E_CHROMIUM_PATH` to one you already have.

## Deploying

1. Set up MongoDB as a replica set (Atlas is easiest) and fill in the environment variables.
   Use an `https://` address for `NUXT_PUBLIC_SITE_URL` and a long random
   `NUXT_SESSION_SECRET`.
2. `npm ci && npm run build`
3. `npm run db:indexes` against the production database
4. `npm run create-admin -- --email …` to create the first admin
5. Start it with `node .output/server/index.mjs` on any Node host or container, or use a Nitro
   preset for Vercel, Netlify and so on. Serve it over HTTPS, and set `NUXT_TRUST_PROXY=true`
   if it's behind a load balancer.
6. Add the Cloudinary variables if you want image uploads. Otherwise just use image URLs.

If you host it on serverless or run several instances, replace the in-memory rate limiter
with a shared store.
