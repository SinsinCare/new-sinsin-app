export const MAX_COMMUNITY_TAGS = 10
export const MAX_COMMUNITY_TAG_LENGTH = 20

export function normalizeCommunityTag(value: string): string | null {
  const tag = value.trim().replace(/^#+/, "").trim().toLocaleLowerCase()
  if (!tag) return null
  if (/\s/.test(tag)) return null
  if (tag.length > MAX_COMMUNITY_TAG_LENGTH) return null
  return tag
}

export function mergeCommunityTags(
  current: string[],
  candidates: string[],
): string[] {
  const next: string[] = []
  const seen = new Set<string>()

  for (const tag of current) {
    const normalized = normalizeCommunityTag(tag)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    next.push(normalized)
  }

  for (const tag of candidates) {
    const normalized = normalizeCommunityTag(tag)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    next.push(normalized)
    if (next.length >= MAX_COMMUNITY_TAGS) break
  }

  return next
}
