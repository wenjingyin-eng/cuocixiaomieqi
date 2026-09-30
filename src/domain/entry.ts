export function parseTermInput(value: string): string[] {
  const seen = new Set<string>()
  const wordSegments = value.match(/[\p{L}\p{N}\p{M}]+/gu) ?? []

  return wordSegments
    .filter((term) => {
      if (seen.has(term)) return false
      seen.add(term)
      return true
    })
}
