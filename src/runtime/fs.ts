import GLib from "gi://GLib?version=2.0"

const decoder = new TextDecoder()

export function fileExists(path: string): boolean {
  return GLib.file_test(path, GLib.FileTest.EXISTS)
}

export function readTextFile(path: string): string | null {
  if (!fileExists(path)) {
    return null
  }

  const [ok, bytes] = GLib.file_get_contents(path)
  if (!ok) {
    return null
  }

  return decoder.decode(bytes).trim()
}

export function readNumberFile(path: string): number | null {
  const value = readTextFile(path)
  if (value == null || value === "") {
    return null
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}
