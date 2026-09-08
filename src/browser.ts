import { access, readdir } from "node:fs/promises"
import { constants } from "node:fs"
import { homedir } from "node:os"
import path from "node:path"
import { spawn } from "node:child_process"
import type { Browser } from "./types.js"

async function executable(bin: string) {
  try {
    await access(bin, constants.X_OK)
    return true
  } catch {
    return false
  }
}

async function cached() {
  const root = path.join(homedir(), ".cache", "ms-playwright")
  try {
    const dirs = (await readdir(root)).filter((dir) => dir.startsWith("chromium-")).sort().reverse()
    const names = process.platform === "darwin"
      ? ["chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing", "chrome-mac/Chromium.app/Contents/MacOS/Chromium"]
      : process.platform === "win32"
        ? ["chrome-win64/chrome.exe", "chrome-win/chrome.exe"]
        : ["chrome-linux64/chrome", "chrome-linux/chrome"]
    for (const dir of dirs) {
      for (const name of names) {
        const bin = path.join(root, dir, name)
        if (await executable(bin)) return bin
      }
    }
  } catch {}
  return null
}

export async function browser(preferred?: unknown): Promise<Browser> {
  const requested = typeof preferred === "string" ? preferred.trim() : ""
  const platform = process.platform === "darwin"
    ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"]
    : process.platform === "win32"
      ? [
          process.env.PROGRAMFILES ? path.join(process.env.PROGRAMFILES, "Google/Chrome/Application/chrome.exe") : "",
          process.env["PROGRAMFILES(X86)"] ? path.join(process.env["PROGRAMFILES(X86)"], "Microsoft/Edge/Application/msedge.exe") : "",
        ]
      : ["/usr/bin/google-chrome", "/usr/bin/google-chrome-stable", "/usr/bin/chromium", "/usr/bin/chromium-browser"]
  const bins = [requested, process.env.BROWSER, ...platform]
    .filter((item): item is string => Boolean(item))
  for (const bin of bins) {
    if (await executable(bin)) return { bin, name: path.basename(bin), args: [] }
  }

  const bin = await cached()
  if (bin) return { bin, name: "Playwright Chromium", args: [] }

  const opener = process.platform === "darwin" ? "/usr/bin/open" : "/usr/bin/xdg-open"
  if (await executable(opener)) return { bin: opener, name: "default browser", args: [] }
  throw new Error("No supported browser found. Install Chrome/Chromium or set OPENCODE_INSPECT_BROWSER to an executable path.")
}

export function launch(item: Browser, url: string) {
  const chrome = !item.bin.endsWith("xdg-open") && !item.bin.endsWith("/open")
  const args = chrome
    ? ["--no-first-run", "--no-default-browser-check", `--app=${url}`]
    : [url]
  const child = spawn(item.bin, [...item.args, ...args], { detached: true, stdio: "ignore" })
  child.on("error", () => {})
  child.unref()
}
