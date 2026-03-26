import { createPoll } from "ags/time"

import { safeExec } from "./command.ts"

export interface ImeSnapshot {
  method: string   // "mozc", "keyboard-us", etc.
  active: boolean  // true = IME on, false = direct input
}

const POLL_MS = 500

async function readIme(): Promise<ImeSnapshot> {
  const [method, stateStr] = await Promise.all([
    safeExec(["fcitx5-remote", "-n"]),
    safeExec(["fcitx5-remote"]),
  ])
  const state = parseInt(stateStr, 10)
  return {
    method: method || "unknown",
    active: state === 2,
  }
}

export function createImeSource() {
  const snapshot = createPoll<ImeSnapshot | null>(null, POLL_MS, readIme)
  return { snapshot }
}
