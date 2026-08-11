import GLib from "gi://GLib?version=2.0"

import { createState, type Accessor } from "gnim"

// active が true の間だけ回すポーリング。activate 時に即1回実行するので、
// パネルを開いた瞬間に最新値へ更新される。source は singleton で破棄されない
// 前提のため cleanup 経路は持たない。
export function pollWhile(
  active: Accessor<boolean>,
  intervalMs: number,
  fn: () => void,
): void {
  let id = 0
  const sync = () => {
    if (active()) {
      if (!id) {
        fn()
        id = GLib.timeout_add(GLib.PRIORITY_DEFAULT, intervalMs, () => {
          fn()
          return GLib.SOURCE_CONTINUE
        })
      }
    } else if (id) {
      GLib.source_remove(id)
      id = 0
    }
  }
  active.subscribe(sync)
  sync()
}

export function orAccessors(
  a: Accessor<boolean>,
  b: Accessor<boolean>,
): Accessor<boolean> {
  const [state, setState] = createState(a() || b())
  const sync = () => setState(a() || b())
  a.subscribe(sync)
  b.subscribe(sync)
  return state
}
