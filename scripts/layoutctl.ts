import { execFileSync } from "node:child_process"
import { mkdirSync, readFileSync, writeFileSync } from "node:fs"
import os from "node:os"
import path from "node:path"

import {
  buildApplyCommands,
  createDisplayProfile,
  parseDisplayProfilesFile,
  parseHyprMonitorsJson,
  resolveDisplayLayoutConfigPath,
  serializeDisplayProfiles,
  upsertDisplayProfile,
  type DisplayProfile,
} from "../src/modules/display-layout/domain.ts"

const XDG_CONFIG_HOME = process.env.XDG_CONFIG_HOME ?? path.join(os.homedir(), ".config")
const CONFIG_DIR = path.join(XDG_CONFIG_HOME, "ags")
const CONFIG_FILE = resolveDisplayLayoutConfigPath(CONFIG_DIR)

function loadProfiles(): DisplayProfile[] {
  try {
    return parseDisplayProfilesFile(readFileSync(CONFIG_FILE, "utf8"))
  } catch {
    return []
  }
}

function saveProfiles(profiles: DisplayProfile[]): void {
  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CONFIG_FILE, serializeDisplayProfiles(profiles))
}

function readCurrentProfile(): DisplayProfile {
  const json = execFileSync("hyprctl", ["monitors", "all", "-j"], { encoding: "utf8" })
  const outputs = parseHyprMonitorsJson(json)
  if (outputs.length === 0) {
    throw new Error("No monitor outputs found")
  }
  return createDisplayProfile("Current", outputs)
}

function usage(): never {
  console.error("Usage: npm run layout -- current|list|save <name>|apply <name>")
  process.exit(1)
}

function main(): void {
  const [command, ...args] = process.argv.slice(2)
  if (!command) usage()

  if (command === "current") {
    console.log(JSON.stringify(readCurrentProfile(), null, 2))
    return
  }

  if (command === "list") {
    const profiles = loadProfiles()
    for (const profile of profiles) {
      console.log(profile.name)
    }
    return
  }

  if (command === "save") {
    const name = args.join(" ").trim()
    if (!name) usage()
    const next = upsertDisplayProfile(loadProfiles(), {
      ...readCurrentProfile(),
      name,
    })
    saveProfiles(next)
    console.log(`Saved profile: ${name}`)
    return
  }

  if (command === "apply") {
    const name = args.join(" ").trim()
    if (!name) usage()

    const profile = loadProfiles().find((item) => item.name === name)
    if (!profile) {
      throw new Error(`Profile not found: ${name}`)
    }

    for (const cmd of buildApplyCommands(profile)) {
      execFileSync(cmd[0], cmd.slice(1), { stdio: "inherit" })
    }

    console.log(`Applied profile: ${name}`)
    return
  }

  usage()
}

main()
