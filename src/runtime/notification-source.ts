import GLib from "gi://GLib?version=2.0"
import Notifd from "gi://AstalNotifd?version=0.1"

import { createState, type Accessor } from "gnim"

export interface NotificationItem {
  id: number
  appName: string
  appIcon: string
  summary: string
  body: string
  urgency: Notifd.Urgency
  time: number
  image: string
  /** image > appIcon, ファイルパスかアイコン名 */
  resolvedIcon: string
  isIconPath: boolean
  actions: { id: string; label: string }[]
}

export interface NotificationSource {
  popups: Accessor<NotificationItem[]>
  popupTimestamps: Map<number, number>
  popupTimeoutMs: number
  all: Accessor<NotificationItem[]>
  unreadCount: Accessor<number>
  dnd: Accessor<boolean>
  setDnd: (v: boolean) => void
  dismiss: (id: number) => void
  invoke: (notifId: number, actionId: string) => void
  clear: () => void
  markAllRead: () => void
}

const POPUP_TIMEOUT_MS = 10000

function resolveIcon(image: string, appIcon: string): [string, boolean] {
  const icon = image || appIcon
  if (!icon) return ["", false]
  return [icon, icon.startsWith("/")]
}

function toItem(n: InstanceType<typeof Notifd.Notification>): NotificationItem {
  const actions: { id: string; label: string }[] = []
  for (const a of n.get_actions()) {
    actions.push({ id: a.id, label: a.label })
  }
  const image = n.image || ""
  const appIcon = n.app_icon || ""
  const [resolvedIcon, isIconPath] = resolveIcon(image, appIcon)
  return {
    id: n.id,
    appName: n.app_name || "",
    appIcon,
    summary: n.summary || "",
    body: n.body || "",
    urgency: n.urgency,
    image,
    resolvedIcon,
    isIconPath,
    actions,
    time: n.time,
  }
}

export function createNotificationSource(): NotificationSource {
  const notifd = Notifd.get_default()

  const [popups, setPopups] = createState<NotificationItem[]>([])
  const [all, setAll] = createState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount] = createState(0)
  const [dnd, setDndState] = createState(notifd.dont_disturb)
  const popupTimestamps = new Map<number, number>()

  // GSettings から通知履歴を復元
  const existing = notifd.get_notifications()
  if (existing.length > 0) {
    const items = existing.map(toItem)
    setAll(items)
  }

  function removePopup(id: number) {
    popupTimestamps.delete(id)
    setPopups((prev) => prev.filter((p) => p.id !== id))
  }

  notifd.connect("notified", (_, id: number, replaced: boolean) => {
    const n = notifd.get_notification(id)
    if (!n) return
    const item = toItem(n)

    // 履歴に常に追加
    setAll((prev) => {
      const filtered = prev.filter((p) => p.id !== id)
      return [item, ...filtered]
    })

    // 未読カウント増加
    setUnreadCount((c) => c + 1)

    // DND 中はポップアップを出さない (critical は除く)
    if (notifd.dont_disturb && item.urgency !== Notifd.Urgency.CRITICAL) {
      return
    }

    // ポップアップに追加
    popupTimestamps.set(id, Date.now())
    setPopups((prev) => {
      const filtered = prev.filter((p) => p.id !== id)
      return [item, ...filtered]
    })

    // 自動消去 (critical 以外)
    if (item.urgency !== Notifd.Urgency.CRITICAL) {
      GLib.timeout_add(GLib.PRIORITY_DEFAULT, POPUP_TIMEOUT_MS, () => {
        removePopup(id)
        return GLib.SOURCE_REMOVE
      })
    }
  })

  notifd.connect("resolved", (_, id: number) => {
    removePopup(id)
    setAll((prev) => prev.filter((p) => p.id !== id))
  })

  function dismiss(id: number) {
    const n = notifd.get_notification(id)
    if (n) n.dismiss()
    removePopup(id)
    setAll((prev) => prev.filter((p) => p.id !== id))
  }

  function invoke(notifId: number, actionId: string) {
    const n = notifd.get_notification(notifId)
    if (n) n.invoke(actionId)
  }

  function clear() {
    for (const n of notifd.get_notifications()) {
      n.dismiss()
    }
    setPopups([])
    setAll([])
  }

  function markAllRead() {
    setUnreadCount(0)
  }

  function setDnd(v: boolean) {
    notifd.dont_disturb = v
    setDndState(v)
  }

  return {
    popups,
    popupTimestamps,
    popupTimeoutMs: POPUP_TIMEOUT_MS,
    all,
    unreadCount,
    dnd,
    setDnd,
    dismiss,
    invoke,
    clear,
    markAllRead,
  }
}
