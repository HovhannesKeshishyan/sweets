import { createHash } from 'node:crypto'
import { createError } from 'h3'
import type { ImageInput } from '../../shared/schemas/fields'

/**
 * Product image uploads go to an external provider; MongoDB stores only the
 * resulting URL and metadata. Cloudinary is implemented; another provider
 * (e.g. S3-compatible storage) can implement `ImageStorage`.
 */
export interface ImageStorage {
  upload(file: { data: Buffer; mimeType: string; filename: string }): Promise<ImageInput>
}

export const MAX_UPLOAD_BYTES = 4 * 1024 * 1024 // stays under Vercel's 4.5 MB request limit

type ImageType = 'image/jpeg' | 'image/png' | 'image/webp' | 'image/avif'

/** Identifies the image type from its leading bytes; the client-declared type is not trusted. */
export function sniffImageType(data: Buffer): ImageType | null {
  if (data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff) return 'image/jpeg'
  if (data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return 'image/png'
  }
  if (data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP') {
    return 'image/webp'
  }
  if (data.length >= 12 && data.toString('ascii', 4, 8) === 'ftyp' && /^avi[fs]$/.test(data.toString('ascii', 8, 12))) {
    return 'image/avif'
  }
  return null
}

export function validateImageFile(data: Buffer): ImageType {
  if (data.length === 0) throw createError({ statusCode: 422, statusMessage: 'The file is empty' })
  if (data.length > MAX_UPLOAD_BYTES) throw createError({ statusCode: 413, statusMessage: 'Images must be 4 MB or smaller' })
  const type = sniffImageType(data)
  if (!type) throw createError({ statusCode: 415, statusMessage: 'Upload a JPEG, PNG, WebP or AVIF image' })
  return type
}

export interface CloudinaryConfig {
  cloudName: string
  apiKey: string
  apiSecret: string
  folder: string
}

/** Cloudinary request signature: SHA-1 of sorted params joined with the API secret. */
export function signCloudinaryParams(params: Record<string, string>, apiSecret: string): string {
  const payload = Object.keys(params)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join('&')
  return createHash('sha1').update(payload + apiSecret).digest('hex')
}

export function createCloudinaryStorage(config: CloudinaryConfig): ImageStorage {
  return {
    async upload({ data, mimeType, filename }) {
      const params = { folder: config.folder, timestamp: String(Math.floor(Date.now() / 1000)) }
      const form = new FormData()
      form.append('file', new Blob([new Uint8Array(data)], { type: mimeType }), filename)
      form.append('api_key', config.apiKey)
      form.append('folder', params.folder)
      form.append('timestamp', params.timestamp)
      form.append('signature', signCloudinaryParams(params, config.apiSecret))

      const response = await fetch(`https://api.cloudinary.com/v1_1/${encodeURIComponent(config.cloudName)}/image/upload`, {
        method: 'POST',
        body: form,
      })
      if (!response.ok) {
        console.error('[upload] Cloudinary error', response.status, await response.text().catch(() => ''))
        throw createError({ statusCode: 502, statusMessage: 'Image upload failed. Please try again.' })
      }
      const result = (await response.json()) as { secure_url: string; public_id: string; width: number; height: number }
      return {
        url: result.secure_url,
        alt: '',
        provider: 'cloudinary',
        publicId: result.public_id,
        width: result.width,
        height: result.height,
      }
    },
  }
}
