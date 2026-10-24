import tailwindcss from "@tailwindcss/vite";

export default defineNuxtConfig({
  modules: ["@nuxt/eslint"],
  compatibilityDate: "2026-10-01",
  devtools: { enabled: true },

  css: ["~/assets/css/main.css"],

  vite: {
    plugins: [tailwindcss()],
  },

  typescript: {
    strict: true,
    typeCheck: false, // run explicitly via `npm run typecheck`
  },

  // Values are overridden at runtime by NUXT_* environment variables
  // (e.g. NUXT_MONGODB_URI, NUXT_PUBLIC_SITE_URL). See .env.example.
  runtimeConfig: {
    mongodbUri: "",
    sessionSecret: "",
    /** Honour X-Forwarded-For for client IPs (only behind a trusted proxy). */
    trustProxy: false,
    /** Cloudinary image uploads (optional; admins can always paste image URLs). */
    cloudinary: {
      cloudName: "",
      apiKey: "",
      apiSecret: "",
      folder: "velourasweets/products",
    },
    public: {
      siteUrl: "http://localhost:3000",
      siteName: "Veloura Sweets",
      defaultCurrency: "USD",
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: "en" },
      titleTemplate: "%s · Veloura Sweets",
      meta: [
        { name: "viewport", content: "width=device-width, initial-scale=1" },
        { name: "theme-color", content: "#2b1a12" },
      ],
      link: [
        { rel: "preconnect", href: "https://fonts.googleapis.com" },
        {
          rel: "preconnect",
          href: "https://fonts.gstatic.com",
          crossorigin: "",
        },
        {
          rel: "stylesheet",
          href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;0,600;1,500&family=Manrope:wght@400;500;600&display=swap",
        },
      ],
    },
  },

  routeRules: {
    // Admin is a client-rendered app; every admin API is still protected server-side.
    "/admin/**": {
      ssr: false,
      headers: { "X-Robots-Tag": "noindex, nofollow" },
    },
  },

  nitro: {
    // Security headers applied to every response.
    routeRules: {
      "/**": {
        headers: {
          "X-Content-Type-Options": "nosniff",
          "X-Frame-Options": "DENY",
          "Referrer-Policy": "strict-origin-when-cross-origin",
          "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
          // Ignored by browsers over plain HTTP, so safe in local development.
          "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
        },
      },
    },
  },
});
