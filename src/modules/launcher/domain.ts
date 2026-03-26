export interface AppEntry {
  id: string
  name: string
  description: string
  keywords: string[]
  icon: string | null
}

/**
 * Fuzzy match score. Higher = better match. 0 = no match.
 *
 * Scoring:
 *  - Exact prefix on name: 100 + name length bonus
 *  - Word start match: 80
 *  - Substring in name: 60
 *  - Substring in description/keywords: 30
 *  - Fuzzy character match in name: 10 + matched ratio
 */
export function fuzzyScore(entry: AppEntry, query: string): number {
  if (query.length === 0) return 1 // show all when empty

  const q = query.toLowerCase()
  const name = entry.name.toLowerCase()
  const desc = entry.description.toLowerCase()
  const kwStr = entry.keywords.join(" ").toLowerCase()

  // Exact prefix on name
  if (name.startsWith(q)) {
    return 100 + (q.length / name.length) * 50
  }

  // Word start match (e.g. "fi" matches "Visual Studio Code" via... no, matches "Firefox")
  const words = name.split(/[\s\-_]+/)
  for (const word of words) {
    if (word.startsWith(q)) return 80 + (q.length / word.length) * 20
  }

  // Substring in name
  if (name.includes(q)) return 60

  // Substring in description or keywords
  if (desc.includes(q) || kwStr.includes(q)) return 30

  // Fuzzy: all query chars appear in order in name
  let qi = 0
  for (let i = 0; i < name.length && qi < q.length; i++) {
    if (name[i] === q[qi]) qi++
  }
  if (qi === q.length) {
    return 10 + (q.length / name.length) * 10
  }

  return 0
}

export function searchApps(
  apps: AppEntry[],
  query: string,
  limit: number,
  recentIds: string[] = [],
): AppEntry[] {
  if (query.length === 0 && recentIds.length > 0) {
    // 空クエリ: 最近使ったアプリを先頭に、残りはアルファベット順
    const recentSet = new Set(recentIds)
    const recent = recentIds
      .map((id) => apps.find((a) => a.id === id))
      .filter((a): a is AppEntry => a != null)
    const rest = apps.filter((a) => !recentSet.has(a.id))
    return [...recent, ...rest].slice(0, limit)
  }

  return apps
    .map((app) => ({ app, score: fuzzyScore(app, query) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((r) => r.app)
}
