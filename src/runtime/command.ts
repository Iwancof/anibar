import { execAsync } from "ags/process"

export async function safeExec(command: string[]): Promise<string> {
  try {
    return (await execAsync(command)).trim()
  } catch (error) {
    console.error(`command failed: ${command.join(" ")}`, error)
    return ""
  }
}
