export function normalizeApiKeyTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return []
  }

  const normalizedTags: string[] = []
  const seenTags = new Set<string>()

  for (const item of value) {
    if (typeof item !== "string") {
      continue
    }

    const tag = item.trim()
    if (!tag || seenTags.has(tag)) {
      continue
    }

    seenTags.add(tag)
    normalizedTags.push(tag)
  }

  return normalizedTags
}
