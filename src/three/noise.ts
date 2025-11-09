// Simple fractal noise utilities for terrain/ocean animation.
// Deterministic based on seed to keep world consistent per reload.

export class FractalNoise {
  private seed: number

  constructor(seed = 1337) {
    this.seed = seed
  }

  private hash(x: number, y: number, z = 0): number {
    let n = x * 374761393 + y * 668265263 + z * 2147483647 + this.seed * 73856093
    n = (n << 13) ^ n
    return 1.0 - ((n * (n * n * 15731 + 789221) + 1376312589) & 0x7fffffff) / 1073741824
  }

  private lerp(a: number, b: number, t: number) {
    return a + (b - a) * (t * t * (3 - 2 * t))
  }

  private valueNoise(x: number, y: number, z = 0): number {
    const xi = Math.floor(x)
    const yi = Math.floor(y)
    const zi = Math.floor(z)
    const xf = x - xi
    const yf = y - yi
    const zf = z - zi

    const n000 = this.hash(xi, yi, zi)
    const n100 = this.hash(xi + 1, yi, zi)
    const n010 = this.hash(xi, yi + 1, zi)
    const n110 = this.hash(xi + 1, yi + 1, zi)
    const n001 = this.hash(xi, yi, zi + 1)
    const n101 = this.hash(xi + 1, yi, zi + 1)
    const n011 = this.hash(xi, yi + 1, zi + 1)
    const n111 = this.hash(xi + 1, yi + 1, zi + 1)

    const x00 = this.lerp(n000, n100, xf)
    const x10 = this.lerp(n010, n110, xf)
    const x01 = this.lerp(n001, n101, xf)
    const x11 = this.lerp(n011, n111, xf)

    const y0 = this.lerp(x00, x10, yf)
    const y1 = this.lerp(x01, x11, yf)

    return this.lerp(y0, y1, zf)
  }

  sample(x: number, y: number, z = 0, octaves = 4, falloff = 0.5) {
    let amplitude = 1
    let frequency = 1
    let total = 0
    let norm = 0
    for (let i = 0; i < octaves; i += 1) {
      total += this.valueNoise(x * frequency, y * frequency, z * frequency) * amplitude
      norm += amplitude
      amplitude *= falloff
      frequency *= 2
    }
    return total / norm
  }
}
