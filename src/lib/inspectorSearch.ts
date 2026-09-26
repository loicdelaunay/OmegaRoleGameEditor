export function normalizeInspectorSearchQuery(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

export function sectionMatchesInspectorSearch(query: string, keywords: string[]) {
  if (!query) {
    return true
  }

  return keywords.some((keyword) => normalizeInspectorSearchQuery(keyword).includes(query))
}
