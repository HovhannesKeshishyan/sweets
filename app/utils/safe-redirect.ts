/** Accepts only same-site relative paths, blocking open redirects like `//evil.com` or `https://…`. */
export function safeRedirect(target: unknown, fallback = "/"): string {
  if (typeof target !== "string") return fallback
  if (!target.startsWith("/") || target.startsWith("//") || target.startsWith("/\\")) return fallback
  return target
}
