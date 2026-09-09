import { access, readdir, readFile, rm } from "node:fs/promises"
import { constants, mkdtempSync } from "node:fs"
import { homedir, tmpdir } from "node:os"
import path from "node:path"
import { spawn } from "node:child_process"
import type { Browser, BrowserControl, Viewport } from "./types.js"
export type { BrowserControl } from "./types.js"

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

type Connection = {
  send<T>(method: string, params?: Record<string, unknown>): Promise<T>
  close(): void
}

async function connect(dir: string): Promise<Connection> {
  const file = path.join(dir, "DevToolsActivePort")
  let port = ""
  for (let i = 0; i < 100; i++) {
    try {
      port = (await readFile(file, "utf8")).split("\n")[0].trim()
      if (port) break
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  if (!port) throw new Error("Browser debugging endpoint did not start")
  const list = await fetch(`http://127.0.0.1:${port}/json/list`).then((response) => response.json()) as Array<{ type: string; webSocketDebuggerUrl?: string }>
  const target = list.find((item) => item.type === "page" && item.webSocketDebuggerUrl)
  if (!target?.webSocketDebuggerUrl) throw new Error("Browser page debugging endpoint not found")
  const socket = new WebSocket(target.webSocketDebuggerUrl)
  await new Promise<void>((resolve, reject) => {
    socket.addEventListener("open", () => resolve(), { once: true })
    socket.addEventListener("error", () => reject(new Error("Browser debugging connection failed")), { once: true })
  })
  let id = 0
  const pending = new Map<number, { resolve(value: unknown): void; reject(err: Error): void }>()
  socket.addEventListener("message", (event) => {
    const message = JSON.parse(String(event.data)) as { id?: number; result?: unknown; error?: { message: string } }
    if (message.id === undefined) return
    const done = pending.get(message.id)
    if (!done) return
    pending.delete(message.id)
    if (message.error) done.reject(new Error(message.error.message))
    else done.resolve(message.result)
  })
  return {
    send<T>(method: string, params?: Record<string, unknown>) {
      const current = ++id
      return new Promise<T>((resolve, reject) => {
        pending.set(current, { resolve, reject })
        socket.send(JSON.stringify({ id: current, method, params }))
        setTimeout(() => {
          if (!pending.delete(current)) return
          reject(new Error(`Browser debugging command timed out: ${method}`))
        }, 5000)
      })
    },
    close() {
      socket.close()
    },
  }
}

export function launchArgs(url: string, dir: string) {
  return ["--no-first-run", "--no-default-browser-check", "--remote-debugging-port=0", `--user-data-dir=${dir}`, `--app=${url}`]
}

export function launch(item: Browser, url: string): BrowserControl {
  const chrome = !item.bin.endsWith("xdg-open") && !item.bin.endsWith("/open")
  if (!chrome) {
    const child = spawn(item.bin, [...item.args, url], { detached: true, stdio: "ignore" })
    child.on("error", () => {})
    child.unref()
    return { ready: Promise.resolve(), resize: async () => { throw new Error("Viewport control is unavailable for the default browser") }, close: async () => {} }
  }
  const dir = mkdtempSync(path.join(tmpdir(), "opencode-inspector-"))
  const args = launchArgs(url, dir)
  const child = spawn(item.bin, [...item.args, ...args], { detached: true, stdio: "ignore" })
  child.on("error", () => {})
  child.unref()
  const dead = new Promise<void>((resolve) => child.once("exit", () => resolve()))
  const ready = connect(dir)
  ready.catch(() => {})
  let closed = false
  return {
    ready: ready.then(() => undefined),
    async resize(width, height) {
      const connection = await ready
      const target = await connection.send<{ windowId: number }>("Browser.getWindowForTarget")
      const bounds = await connection.send<{ bounds: { width: number; height: number } }>("Browser.getWindowBounds", { windowId: target.windowId })
      const measured = await connection.send<{ result: { value: Viewport } }>("Runtime.evaluate", { expression: "({width:innerWidth,height:innerHeight})", returnByValue: true })
      await connection.send("Browser.setWindowBounds", { windowId: target.windowId, bounds: { width: width + bounds.bounds.width - measured.result.value.width, height: height + bounds.bounds.height - measured.result.value.height } })
      for (let i = 0; i < 4; i++) {
        await new Promise((resolve) => setTimeout(resolve, 50))
        const value = await connection.send<{ result: { value: Viewport } }>("Runtime.evaluate", { expression: "({width:innerWidth,height:innerHeight})", returnByValue: true })
        if (value.result.value.width === width && value.result.value.height === height) return value.result.value
        await connection.send("Browser.setWindowBounds", { windowId: target.windowId, bounds: { width: width + width - value.result.value.width, height: height + height - value.result.value.height } })
      }
      const value = await connection.send<{ result: { value: Viewport } }>("Runtime.evaluate", { expression: "({width:innerWidth,height:innerHeight})", returnByValue: true })
      return value.result.value
    },
    async close() {
      if (closed) return
      closed = true
      const connection = await Promise.race([ready, new Promise<null>((resolve) => setTimeout(() => resolve(null), 250))]).catch(() => null)
      if (connection) {
        void connection.send("Browser.close").catch(() => {})
        connection.close()
      }
      child.kill()
      await Promise.race([dead, new Promise((resolve) => setTimeout(resolve, 500))])
      await rm(dir, { recursive: true, force: true })
    },
  }
}
