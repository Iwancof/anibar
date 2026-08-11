import { createState, type Accessor } from "gnim"
import { safeExec } from "./command.ts"
import { pollWhile } from "./visibility-gate.ts"

const CONN_POLL_MS = 5_000

export interface ConnectionsSnapshot {
  established: number
  listening: number
  openPorts: number
}

const EMPTY: ConnectionsSnapshot = {
  established: 0,
  listening: 0,
  openPorts: 0,
}

async function fetchConnections(): Promise<ConnectionsSnapshot> {
  const [estRaw, listenRaw, portsRaw] = await Promise.all([
    safeExec(["sh", "-c", "ss -t state established | tail -n +2 | wc -l"]),
    safeExec(["sh", "-c", "ss -tln | tail -n +2 | wc -l"]),
    safeExec(["sh", "-c", "ss -tln | tail -n +2 | awk '{print $4}' | rev | cut -d: -f1 | rev | sort -un | wc -l"]),
  ])

  return {
    established: parseInt(estRaw, 10) || 0,
    listening: parseInt(listenRaw, 10) || 0,
    openPorts: parseInt(portsRaw, 10) || 0,
  }
}

export interface ConnectionsSource {
  snapshot: Accessor<ConnectionsSnapshot>
}

export function createConnectionsSource(active: Accessor<boolean>): ConnectionsSource {
  const [snapshot, setSnapshot] = createState<ConnectionsSnapshot>(EMPTY)

  // パネル可視時のみポーリング (ss×3 の fork を常時走らせない)
  pollWhile(active, CONN_POLL_MS, () => {
    fetchConnections().then(setSnapshot)
  })

  return { snapshot }
}
