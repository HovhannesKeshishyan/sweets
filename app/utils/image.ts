const WIDTHS = [320, 480, 640, 960, 1280]

function isCloudinary(url: string) {
  return url.includes("res.cloudinary.com/") && url.includes("/image/upload/")
}

/** Resized, auto-format URL for Cloudinary images; other URLs are returned unchanged. */
export function imageUrl(url: string, width?: number): string {
  if (!width || !isCloudinary(url)) return url
  return url.replace("/image/upload/", `/image/upload/f_auto,q_auto,c_limit,w_${width}/`)
}

/** `srcset` for responsive images when the provider can resize; empty otherwise. */
export function imageSrcset(url: string): string | undefined {
  if (!isCloudinary(url)) return undefined
  return WIDTHS.map((w) => `${imageUrl(url, w)} ${w}w`).join(", ")
}
