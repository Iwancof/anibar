export interface MonitorDiffResult {
  toAdd: string[]
  toRemove: string[]
}

export function computeMonitorDiff(
  registryConnectors: Iterable<string>,
  currentConnectors: Iterable<string>,
): MonitorDiffResult {
  const reg = new Set(registryConnectors)
  const cur = new Set(currentConnectors)
  const toRemove: string[] = []
  const toAdd: string[] = []
  for (const c of reg) if (!cur.has(c)) toRemove.push(c)
  for (const c of cur) if (!reg.has(c)) toAdd.push(c)
  return { toAdd, toRemove }
}
