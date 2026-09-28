export function parseTermInput(value: string): string[] {
  const seen = new Set<string>()

  return value
    .split(/[，,；;]/)
    .map((term) => term.trim())
    .filter(Boolean)
    .filter((term) => {
      if (seen.has(term)) return false
      seen.add(term)
      return true
    })
}
