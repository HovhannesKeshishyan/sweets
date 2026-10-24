import { describe, expect, it } from 'vitest'
import { generateOrderNumber } from '../../server/services/order.service'
import { signCloudinaryParams, sniffImageType, validateImageFile } from '../../server/services/upload.service'
import { imageInputSchema } from '../../shared/schemas/fields'
import { canTransition, orderNumberSchema } from '../../shared/schemas/order'
import { countryOptions } from '../../shared/utils/countries'
import { slugify } from '../../shared/utils/slug'

describe('slugify', () => {
  it('produces clean URL slugs', () => {
    expect(slugify('Dark Chocolate — 70% Cacao!')).toBe('dark-chocolate-70-cacao')
    expect(slugify('Crème Brûlée')).toBe('creme-brulee')
    expect(slugify('Salt & Pepper')).toBe('salt-and-pepper')
    expect(slugify('***')).toBe('')
  })
})

describe('order numbers', () => {
  it('match the public format and are unpredictable', () => {
    const a = generateOrderNumber(new Date('2026-10-24T00:00:00Z'))
    expect(a).toMatch(/^MC-261024-[A-HJ-NP-Z2-9]{6}$/)
    expect(orderNumberSchema.safeParse(a).success).toBe(true)
    const many = new Set(Array.from({ length: 500 }, () => generateOrderNumber()))
    expect(many.size).toBe(500)
  })
})

describe('order transitions', () => {
  it('only allows forward moves and cancellation before shipping', () => {
    expect(canTransition('pending', 'processing')).toBe(true)
    expect(canTransition('pending', 'cancelled')).toBe(true)
    expect(canTransition('processing', 'shipped')).toBe(true)
    expect(canTransition('shipped', 'cancelled')).toBe(false)
    expect(canTransition('pending', 'delivered')).toBe(false)
    expect(canTransition('delivered', 'pending')).toBe(false)
    expect(canTransition('cancelled', 'processing')).toBe(false)
  })
})

describe('image uploads', () => {
  const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0])
  const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0])
  const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')])

  it('identifies images by content, not by claimed type', () => {
    expect(sniffImageType(png)).toBe('image/png')
    expect(sniffImageType(jpeg)).toBe('image/jpeg')
    expect(sniffImageType(webp)).toBe('image/webp')
    expect(sniffImageType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull()
    expect(sniffImageType(Buffer.from('<?php echo 1; ?>'))).toBeNull()
  })

  it('rejects empty, oversized and non-image files', () => {
    expect(() => validateImageFile(Buffer.alloc(0))).toThrow()
    expect(() => validateImageFile(Buffer.concat([png, Buffer.alloc(6 * 1024 * 1024)]))).toThrow(/4 MB/)
    expect(() => validateImageFile(Buffer.from('GIF89a......'))).toThrow()
    expect(validateImageFile(png)).toBe('image/png')
  })

  it('signs Cloudinary params in sorted order', () => {
    // Example from Cloudinary's signature documentation.
    const signature = signCloudinaryParams(
      { timestamp: '1315060510', public_id: 'sample_image', eager: 'w_400,h_300,c_pad|w_260,h_200,c_crop' },
      'abcd',
    )
    expect(signature).toBe('bfd09f95f331f558cbd1320e67aa8d488770583e')
  })
})

describe('image URL validation', () => {
  it('accepts http(s) and site paths, rejects other schemes and protocol-relative URLs', () => {
    const ok = (url: string) => imageInputSchema.safeParse({ url }).success
    expect(ok('https://res.cloudinary.com/x/image/upload/a.jpg')).toBe(true)
    expect(ok('/images/seed/truffles-dark.svg')).toBe(true)
    expect(ok('//evil.example/a.png')).toBe(false)
    expect(ok('javascript:alert(1)')).toBe(false)
    expect(ok('/images/"><script>')).toBe(false)
  })
})

describe('countries', () => {
  it('lists named countries, optionally restricted', () => {
    const all = countryOptions()
    expect(all.length).toBeGreaterThan(240)
    expect(all.find((c) => c.code === 'FR')?.name).toBe('France')
    expect(countryOptions(['US', 'CA']).map((c) => c.code)).toEqual(['CA', 'US'])
  })
})
