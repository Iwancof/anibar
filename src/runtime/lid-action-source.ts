import { createState, type Accessor } from "gnim"
import { safeExec } from "./command.ts"
import { parseLidAction, type LidAction } from "../modules/power-save/domain.ts"

const LOGIND_DROPIN = "/etc/systemd/logind.conf.d/lid-action.conf"

export interface LidActionSource {
  action: Accessor<LidAction>
  setAction: (action: LidAction) => void
}

export function createLidActionSource(): LidActionSource {
  const [action, setActionState] = createState<LidAction>("suspend")

  readCurrentAction().then((a) => setActionState(a))

  async function readCurrentAction(): Promise<LidAction> {
    const catResult = await safeExec([
      "bash", "-c",
      `grep -h '^HandleLidSwitch=' ${LOGIND_DROPIN} 2>/dev/null | tail -1 | cut -d= -f2`,
    ])
    if (catResult.trim()) return parseLidAction(catResult)
    return "suspend"
  }

  async function setAction(newAction: LidAction) {
    await safeExec(["sudo", "lidctl", newAction])
    setActionState(newAction)
  }

  return { action, setAction }
}
