import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import imageLoader from './image-loader'

describe('imageLoader', () => {
  const originalEnv = process.env
  
  beforeEach(() => {
    process.env = { ...originalEnv }
  })
  
  afterEach(() => {
    process.env = originalEnv
  })

  it('should return remote URLs unchanged', () => {
    const url = 'https://i.ytimg.com/vi/xyz/maxresdefault.jpg'
    const result = imageLoader({ src: url, width: 640 })
    expect(result).toBe(url)
  })

  it('should handle entity images without basePath', () => {
    process.env.NEXT_PUBLIC_ASSET_PREFIX = ''
    process.env.NEXT_PUBLIC_BLOB_BASE_URL = ''
    
    const result = imageLoader({
      src: '/images/entities/toyota-corolla.png',
      width: 640
    })
    
    expect(result).toContain('toyota-corolla-w')
    expect(result).toContain('.webp')
    expect(result).toContain('/images/_optimized/')
  })

  it('should include basePath in entity image URLs', () => {
    process.env.NEXT_PUBLIC_ASSET_PREFIX = '/GTA6-CODEX'
    process.env.NEXT_PUBLIC_BLOB_BASE_URL = ''
    
    const result = imageLoader({
      src: '/images/entities/nissan-gt-r.png',
      width: 1024
    })
    
    expect(result).toStartWith('/GTA6-CODEX')
    expect(result).toContain('nissan-gt-r-w')
    expect(result).toContain('.webp')
  })

  it('should pick correct width for entity images', () => {
    process.env.NEXT_PUBLIC_ASSET_PREFIX = ''
    process.env.NEXT_PUBLIC_BLOB_BASE_URL = ''
    
    // Widths esperados: [256, 320, 384, 512, 640, 750, 828, 1024, 1440, 1920, 2560, 3840]
    // Solicitar 600px debería matchear con 640px
    const result = imageLoader({
      src: '/images/entities/ford-mustang.png',
      width: 600
    })
    
    expect(result).toContain('-w640.webp')
  })

  it('should handle UI images with basePath', () => {
    process.env.NEXT_PUBLIC_ASSET_PREFIX = '/GTA6-CODEX'
    
    const result = imageLoader({
      src: '/images/ui/icon.svg',
      width: 32
    })
    
    expect(result).toStartWith('/GTA6-CODEX')
    expect(result).toContain('/images/ui/icon.svg')
  })

  it('should use Vercel Blob URL if configured', () => {
    process.env.NEXT_PUBLIC_BLOB_BASE_URL = 'https://abc123.public.blob.vercel-storage.com/images/_optimized'
    process.env.NEXT_PUBLIC_ASSET_PREFIX = ''
    
    const result = imageLoader({
      src: '/images/entities/jeep-wrangler.png',
      width: 750
    })
    
    expect(result).toStartWith('https://abc123.public.blob.vercel-storage.com')
    expect(result).toContain('jeep-wrangler-w750.webp')
  })
})
