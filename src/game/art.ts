type Palette = string[]

const patternCache = new Map<string, CanvasPattern>()

const createNoiseCanvas = (width: number, height: number, palette: Palette, alphaRange = [0.4, 0.9]) => {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return null
  const imageData = ctx.createImageData(width, height)
  for (let i = 0; i < imageData.data.length; i += 4) {
    const color = palette[Math.floor(Math.random() * palette.length)]
    const r = parseInt(color.slice(1, 3), 16)
    const g = parseInt(color.slice(3, 5), 16)
    const b = parseInt(color.slice(5, 7), 16)
    const alpha = alphaRange[0] + Math.random() * (alphaRange[1] - alphaRange[0])
    imageData.data[i] = r
    imageData.data[i + 1] = g
    imageData.data[i + 2] = b
    imageData.data[i + 3] = Math.round(alpha * 255)
  }
  ctx.putImageData(imageData, 0, 0)
  return canvas
}

const createPattern = (
  ctx: CanvasRenderingContext2D,
  key: string,
  palette: Palette,
  size = 128,
  alphaRange?: [number, number],
) => {
  const cacheKey = `${key}-${size}-${palette.join('-')}`
  if (patternCache.has(cacheKey)) return patternCache.get(cacheKey) ?? null
  const noiseCanvas = createNoiseCanvas(size, size, palette, alphaRange)
  if (!noiseCanvas) return null
  const pattern = ctx.createPattern(noiseCanvas, 'repeat')
  if (pattern) {
    patternCache.set(cacheKey, pattern)
  }
  return pattern
}

export const getSandPattern = (ctx: CanvasRenderingContext2D) =>
  createPattern(ctx, 'sand', ['#f3d9a4', '#eac188', '#d6aa6a', '#c8974f'], 160, [0.6, 0.9])

export const getCliffPattern = (ctx: CanvasRenderingContext2D) =>
  createPattern(ctx, 'cliff', ['#4a3724', '#3a2a1b', '#5c4330'], 120, [0.4, 0.7])

export const getWaterPattern = (ctx: CanvasRenderingContext2D) =>
  createPattern(ctx, 'water', ['#0c4a6e', '#0f5d91', '#1e88c7'], 140, [0.3, 0.6])

export const getSuitHighlight = (ctx: CanvasRenderingContext2D) =>
  createPattern(ctx, 'suit', ['#1a1a1a', '#2b2b2b', '#0f172a'], 90, [0.5, 0.8])
