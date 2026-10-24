const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"])

export function isSafeMethod(method: string): boolean {
  return SAFE_METHODS.has(method.toUpperCase())
}

/**
 * CSRF defence for cookie-authenticated, state-changing requests.
 * Browsers attach `Origin` to cross-site POST/PUT/PATCH/DELETE, so a present
 * Origin must match this site. A missing Origin (curl, server-to-server) is
 * allowed: such clients cannot ride a victim's browser cookies.
 */
export function isAllowedOrigin(origin: string | undefined, requestHost: string | undefined, siteUrl: string): boolean {
  if (!origin) return true
  if (origin === "null") return false

  let originUrl: URL
  try {
    originUrl = new URL(origin)
  } catch {
    return false
  }

  const allowedHosts = new Set<string>()
  if (requestHost) allowedHosts.add(requestHost.toLowerCase())
  try {
    allowedHosts.add(new URL(siteUrl).host.toLowerCase())
  } catch {
    // Ignore an invalid siteUrl; the request host still applies.
  }
  return allowedHosts.has(originUrl.host.toLowerCase())
}
