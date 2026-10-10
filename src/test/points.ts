/** Deterministic pseudo-random positions for property-style tests. */
export function* points(count: number, latMin = -80, latMax = 84) {
  let seed = 12345
  const random = () => (seed = (seed * 1103515245 + 12345) % 2 ** 31) / 2 ** 31
  for (let i = 0; i < count; i++) {
    yield { lat: latMin + random() * (latMax - latMin), lon: -180 + random() * 360 }
  }
}
