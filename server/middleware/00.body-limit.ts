/**
 * Caps request body size for API routes before anything reads the body.
 * JSON endpoints need very little; image uploads get a larger allowance.
 */
const JSON_LIMIT = 100 * 1024 // 100 KB
const UPLOAD_LIMIT = 4.4 * 1024 * 1024 // 4.4 MB (4 MB image + multipart overhead), under Vercel's 4.5 MB cap

export default defineEventHandler((event) => {
  if (!event.path.startsWith("/api/") || ["GET", "HEAD", "OPTIONS"].includes(event.method)) return

  const limit = event.path.startsWith("/api/admin/uploads") ? UPLOAD_LIMIT : JSON_LIMIT
  const header = getHeader(event, "content-length")
  if (header === undefined) {
    // Chunked bodies have no declared length; only uploads legitimately stream.
    if (getHeader(event, "transfer-encoding") && limit === JSON_LIMIT) {
      throw createError({ statusCode: 411, statusMessage: "Content-Length required" })
    }
    return
  }
  const length = Number(header)
  if (!Number.isFinite(length) || length < 0) throw createError({ statusCode: 400, statusMessage: "Invalid Content-Length" })
  if (length > limit) throw createError({ statusCode: 413, statusMessage: "Request body too large" })
})
