export interface WorkspaceClient {
  class: string
  title: string
}

export interface WorkspaceInfo {
  id: number
  name: string
  windows: number
  lastWindowTitle: string
  clients: WorkspaceClient[]
}

export interface WorkspaceSnapshot {
  activeId: number
  workspaces: WorkspaceInfo[]
}

export function parseWorkspacesJson(wsJson: string, clientsJson: string, activeJson: string): WorkspaceSnapshot | null {
  try {
    const workspaces = JSON.parse(wsJson) as any[]
    const clients = JSON.parse(clientsJson) as any[]
    const active = JSON.parse(activeJson) as any

    const activeId = active?.id ?? 1

    // Group clients by workspace
    const clientsByWs = new Map<number, WorkspaceClient[]>()
    for (const c of clients) {
      const wsId = c.workspace?.id
      if (wsId == null || wsId < 0) continue
      if (!clientsByWs.has(wsId)) clientsByWs.set(wsId, [])
      clientsByWs.get(wsId)!.push({
        class: c.class ?? "",
        title: (c.title ?? "").slice(0, 60),
      })
    }

    const infos: WorkspaceInfo[] = workspaces
      .filter((ws) => ws.id > 0)
      .sort((a, b) => a.id - b.id)
      .map((ws) => ({
        id: ws.id,
        name: ws.name ?? `${ws.id}`,
        windows: ws.windows ?? 0,
        lastWindowTitle: (ws.lastwindowtitle ?? "").slice(0, 60),
        clients: clientsByWs.get(ws.id) ?? [],
      }))

    return { activeId, workspaces: infos }
  } catch {
    return null
  }
}
