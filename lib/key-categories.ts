export interface KeyCategory {
  id: string
  name: string
  sortOrder: number
}

export const DEFAULT_KEY_CATEGORY_ID = "default"
export const DEFAULT_KEY_CATEGORY_NAME = "默认分类"
export const ALL_KEY_CATEGORY_ID = "all"

function createDefaultKeyCategory(): KeyCategory {
  return {
    id: DEFAULT_KEY_CATEGORY_ID,
    name: DEFAULT_KEY_CATEGORY_NAME,
    sortOrder: 0,
  }
}

export function sortKeyCategories(categories: KeyCategory[]): KeyCategory[] {
  return [...categories].sort((a, b) => a.sortOrder - b.sortOrder)
}

export function normalizeKeyCategories(value: unknown): KeyCategory[] {
  const categories: KeyCategory[] = []
  const seenIds = new Set<string>()

  if (Array.isArray(value)) {
    for (const item of value) {
      if (!item || typeof item !== "object") {
        continue
      }

      const candidate = item as Partial<KeyCategory>
      const id = typeof candidate.id === "string" ? candidate.id.trim() : ""
      const name = typeof candidate.name === "string" ? candidate.name.trim() : ""

      if (!id || !name || seenIds.has(id)) {
        continue
      }

      seenIds.add(id)
      categories.push({
        id,
        name,
        sortOrder: categories.length,
      })
    }
  }

  if (!seenIds.has(DEFAULT_KEY_CATEGORY_ID)) {
    categories.unshift(createDefaultKeyCategory())
  }

  return categories.map((category, index) => ({
    ...category,
    name: category.id === DEFAULT_KEY_CATEGORY_ID ? category.name || DEFAULT_KEY_CATEGORY_NAME : category.name,
    sortOrder: index,
  }))
}

export function ensureValidKeyCategoryId(
  value: unknown,
  categories: KeyCategory[],
  fallbackId = DEFAULT_KEY_CATEGORY_ID,
): string {
  const normalizedValue = typeof value === "string" ? value.trim() : ""
  if (normalizedValue && categories.some((category) => category.id === normalizedValue)) {
    return normalizedValue
  }

  if (categories.some((category) => category.id === fallbackId)) {
    return fallbackId
  }

  return categories[0]?.id ?? DEFAULT_KEY_CATEGORY_ID
}

export function normalizeStoredKeyCategoryId(value: unknown): string {
  return typeof value === "string" && value.trim() ? value.trim() : DEFAULT_KEY_CATEGORY_ID
}
