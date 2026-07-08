// Interpole une position (lng, lat) sur un tracé en fonction d'un pourcentage 0-100
export function interpolateOnPath(path: [number, number][], t: number): [number, number] {
  const segCount = path.length - 1
  if (segCount <= 0) return path[0]

  const scaled = (t / 100) * segCount
  const i = Math.min(Math.floor(scaled), segCount - 1)
  const r = scaled - i

  const [lng0, lat0] = path[i]
  const [lng1, lat1] = path[i + 1]

  return [lng0 + (lng1 - lng0) * r, lat0 + (lat1 - lat0) * r]
}