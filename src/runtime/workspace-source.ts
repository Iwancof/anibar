import { createPoll } from "ags/time"

import { parseWorkspacesJson, type WorkspaceSnapshot } from "../modules/workspace/domain.ts"
import { safeExec } from "./command.ts"

const POLL_MS = 1_000

async function readSnapshot(): Promise<WorkspaceSnapshot | null> {
  const [wsOut, clientsOut, activeOut] = await Promise.all([
    safeExec(["hyprctl", "workspaces", "-j"]),
    safeExec(["hyprctl", "clients", "-j"]),
    safeExec(["hyprctl", "activeworkspace", "-j"]),
  ])
  return parseWorkspacesJson(wsOut, clientsOut, activeOut)
}

export function createWorkspaceSource() {
  const snapshot = createPoll<WorkspaceSnapshot | null>(null, POLL_MS, readSnapshot)
  return { snapshot }
}

export function switchToWorkspace(id: number): void {
  safeExec(["hyprctl", "dispatch", "workspace", `${id}`])
}
