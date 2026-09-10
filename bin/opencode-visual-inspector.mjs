#!/usr/bin/env node
import { createServer } from "node:http"
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, realpathSync, renameSync, rmSync, statSync, writeFileSync } from "node:fs"
import { homedir, tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { spawn, spawnSync } from "node:child_process"
import { createInterface } from "node:readline/promises"

export const pkg = "@frontendxlab/opencode-visual-inspector"
export const v1pkg = `${pkg}/v1`
const old = ["opencode-visual-inspector", "git+https://github.com/frontendxlab/opencode-annotate.git#main"]

const help = `OpenCode Visual Inspector installer

Usage:
  npx ${pkg}
  pnpm dlx ${pkg}

Options:
  --scope global|project  Config scope. Default: interactive, global with --yes.
  --target all|v1|v2     Adapter target. Default: detected targets.
  --smoke-test            Launch a local browser smoke test after installation.
  --no-smoke-test         Skip the browser smoke test.
  --dry-run               Show changes without writing files.
  --yes, -y               Accept detected defaults without prompts.
  --help, -h              Show this help.
`

const run = (file, args) => spawnSync(file, args, { encoding: "utf8", timeout: 12_000, stdio: ["ignore", "pipe", "pipe"] })

const start = (file, args) => new Promise((resolvePromise) => {
  const child = spawn(file, args, { stdio: ["ignore", "pipe", "pipe"] })
  let output = ""
  const timer = setTimeout(() => child.kill("SIGKILL"), 12_000)
  child.stdout.on("data", (value) => { output += value })
  child.stderr.on("data", (value) => { output += value })
  child.on("error", (error) => {
    clearTimeout(timer)
    resolvePromise({ status: 1, output: error.message })
  })
  child.on("close", (status) => {
    clearTimeout(timer)
    resolvePromise({ status: status ?? 1, output })
  })
})

const native = async (found, target) => {
  const jobs = []
  if ((target === "all" || target === "v2") && found.v2) jobs.push({ name: "V2", file: found.v2, args: ["plugin", "add", pkg] })
  const results = []
  for (const job of jobs) {
    const result = await start(job.file, job.args)
    results.push({ ...job, ok: result.status === 0, output: result.output })
  }
  return results
}

const command = (name) => {
  const file = process.platform === "win32" ? "where.exe" : "which"
  const result = run(file, [name])
  if (result.status !== 0) return null
  return result.stdout.trim().split(/\r?\n/)[0] || null
}

const exists = (path) => path && existsSync(path) ? path : null

const browser = () => {
  const configured = process.env.OPENCODE_INSPECT_BROWSER
  if (configured && exists(configured)) return configured
  const names = process.platform === "darwin"
    ? ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome", "/Applications/Chromium.app/Contents/MacOS/Chromium"]
    : process.platform === "win32"
      ? [join(process.env.ProgramFiles || "", "Google/Chrome/Application/chrome.exe"), join(process.env.LOCALAPPDATA || "", "Google/Chrome/Application/chrome.exe")]
      : ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome"]
  for (const item of names) {
    const found = item.includes("/") || item.includes("\\") ? exists(item) : command(item)
    if (found) return found
  }
  const cache = join(homedir(), ".cache", "ms-playwright")
  if (exists(cache)) {
    for (const dir of readdirSync(cache)) {
      const found = exists(join(cache, dir, "chrome-linux", "chrome")) || exists(join(cache, dir, "chrome-linux64", "chrome"))
      if (found) return found
    }
  }
  return null
}

const gui = () => {
  const paths = process.platform === "darwin"
    ? ["/Applications/OpenCode.app"]
    : process.platform === "win32"
      ? [join(process.env.LOCALAPPDATA || "", "Programs/OpenCode/OpenCode.exe"), join(process.env.ProgramFiles || "", "OpenCode/OpenCode.exe")]
      : [join(homedir(), ".local/share/applications/opencode.desktop"), "/usr/share/applications/opencode.desktop", join(homedir(), ".local/share/applications/opencode.desktop")]
  return paths.find(exists) || null
}

export const detect = () => ({
  v1: command("opencode"),
  v2: command("opencode2"),
  gui: gui(),
  browser: browser(),
})

const config = (scope) => {
  if (scope === "project") {
    const root = process.cwd()
    const paths = ["opencode.json", "opencode.jsonc", join(".opencode", "opencode.json"), join(".opencode", "opencode.jsonc")].map((path) => join(root, path))
    return paths.find(exists) || paths[0]
  }
  const root = join(process.env.XDG_CONFIG_HOME || join(homedir(), ".config"), "opencode")
  return ["opencode.json", "opencode.jsonc"].map((name) => join(root, name)).find(exists) || join(root, "opencode.json")
}

const close = (text, start, open, end) => {
  let depth = 0
  let quote = false
  let comment = false
  let line = false
  for (let i = start; i < text.length; i++) {
    const char = text[i]
    const next = text[i + 1]
    if (line) {
      if (char === "\n") line = false
      continue
    }
    if (comment) {
      if (char === "*" && next === "/") {
        comment = false
        i++
      }
      continue
    }
    if (quote) {
      if (char === "\\") i++
      else if (char === '"') quote = false
      continue
    }
    if (char === '"') quote = true
    else if (char === "/" && next === "/") {
      line = true
      i++
    } else if (char === "/" && next === "*") {
      comment = true
      i++
    } else if (char === open) depth++
    else if (char === end && --depth === 0) return i
  }
  return -1
}

const array = (text, key) => {
  const match = new RegExp(`"${key}"\\s*:`).exec(text)
  if (!match) return null
  const start = text.indexOf("[", match.index + match[0].length)
  if (start < 0) throw new Error(`Invalid ${key} array in configuration`)
  const end = close(text, start, "[", "]")
  if (end < 0) throw new Error(`Invalid ${key} array in configuration`)
  return { start, end }
}

const strings = (text) => [...text.matchAll(/"(?:\\.|[^"\\])*"/g)].flatMap((item) => {
  try {
    return [JSON.parse(item[0])]
  } catch {
    return []
  }
})

const add = (text, key, spec = pkg) => {
  const found = array(text, key)
  if (found) {
    const body = text.slice(found.start + 1, found.end)
    const values = strings(body)
    if (values.includes(spec)) return { text, changed: false, key, action: "already configured" }
    const replace = values.find((value) => old.includes(value))
    if (replace) {
      const from = JSON.stringify(replace)
      const to = JSON.stringify(spec)
      return { text: text.slice(0, found.start + 1) + body.replace(from, to) + text.slice(found.end), changed: true, key, action: "updated existing plugin" }
    }
    const tail = body.match(/\s*$/)?.[0] || ""
    const core = body.slice(0, body.length - tail.length)
    const sep = core.trim() ? (core.trimEnd().endsWith(",") ? "\n" : ",\n") : "\n"
    const next = `${core}${sep}    ${JSON.stringify(spec)}\n${tail}`
    return { text: text.slice(0, found.start + 1) + next + text.slice(found.end), changed: true, key, action: "added plugin" }
  }
  const end = text.lastIndexOf("}")
  if (end < 0) throw new Error("Configuration must contain a root object")
  const before = text.slice(0, end)
  const core = before.trimEnd()
  const tail = before.slice(core.length)
  const empty = /^[{\s]*$/.test(before)
  const sep = empty ? "\n" : ",\n"
  const next = `${core}${sep}  ${JSON.stringify(key)}: [\n    ${JSON.stringify(spec)}\n  ]${tail}\n${text.slice(end)}`
  return { text: next, changed: true, key, action: "created plugin list" }
}

export const patch = (text, keys, spec = pkg) => keys.reduce((state, key) => {
  const result = add(state.text, key, spec)
  return { text: result.text, changes: result.changed ? [...state.changes, result] : state.changes }
}, { text, changes: [] })

const options = (args) => {
  const opts = { yes: false, dry: false, scope: null, target: null, smoke: null }
  for (let i = 0; i < args.length; i++) {
    const item = args[i]
    if (item === "--yes" || item === "-y") opts.yes = true
    else if (item === "--dry-run") opts.dry = true
    else if (item === "--smoke-test") opts.smoke = true
    else if (item === "--no-smoke-test") opts.smoke = false
    else if (item === "--scope") opts.scope = args[++i] || (() => { throw new Error("--scope requires global or project") })()
    else if (item.startsWith("--scope=")) opts.scope = item.slice(8)
    else if (item === "--target") opts.target = args[++i] || (() => { throw new Error("--target requires all, v1, or v2") })()
    else if (item.startsWith("--target=")) opts.target = item.slice(9)
    else if (item === "--help" || item === "-h") opts.help = true
    else if (item !== "setup") throw new Error(`Unknown option: ${item}`)
  }
  if (opts.scope && !["global", "project"].includes(opts.scope)) throw new Error("--scope must be global or project")
  if (opts.target && !["all", "v1", "v2"].includes(opts.target)) throw new Error("--target must be all, v1, or v2")
  return opts
}

const ask = async (rl, label, values, fallback) => {
  console.log(`\n${label}`)
  values.forEach((value, index) => console.log(`  ${index + 1}. ${value}`))
  const answer = (await rl.question(`Choose [${fallback}]: `)).trim()
  return values[Number(answer || fallback) - 1] || values[fallback - 1]
}

const selected = async (opts, found) => {
  if (opts.yes || !process.stdin.isTTY || !process.stdout.isTTY) return { scope: opts.scope || "global", target: opts.target || "all", smoke: opts.smoke ?? true }
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  try {
    const scope = opts.scope || ((await ask(rl, "Configuration scope", ["global user config", "current project config"], 1)) === "global user config" ? "global" : "project")
    const target = opts.target || ((found.v1 || found.v2 || found.gui) ? await ask(rl, "Install targets", ["all detected adapters", "V2 and GUI", "V1 only"], 1) : "all detected adapters")
    const kind = ["all", "v1", "v2"].includes(target) ? target : target === "all detected adapters" ? "all" : target === "V2 and GUI" ? "v2" : "v1"
    const smoke = opts.smoke ?? (await ask(rl, "Browser verification", ["run smoke test", "skip smoke test"], 1)) === "run smoke test"
    return { scope, target: kind, smoke }
  } finally {
    rl.close()
  }
}

const keys = (target, found) => {
  if (target === "v1") return ["plugin"]
  if (target === "v2") return ["plugins"]
  if (!found.v1 && (found.v2 || found.gui)) return ["plugins"]
  if (!found.v2 && !found.gui && found.v1) return ["plugin"]
  return ["plugin", "plugins"]
}

export const smoke = async (file) => {
  if (!file) return { ok: false, message: "No Chrome or Chromium executable found" }
  const server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html" })
    res.end("<!doctype html><title>OpenCode inspector smoke</title><main data-smoke>ready</main>")
  })
  await new Promise((resolvePromise) => server.listen(0, "127.0.0.1", resolvePromise))
  const address = server.address()
  const port = typeof address === "object" && address ? address.port : 0
  const dir = mkdtempSync(join(tmpdir(), "opencode-inspector-"))
  try {
    const result = await start(file, [`--user-data-dir=${dir}`, "--headless=new", "--no-sandbox", "--disable-gpu", "--dump-dom", `http://127.0.0.1:${port}`])
    return result.status === 0 && result.output.includes('data-smoke') ? { ok: true, message: `Browser launched: ${file}` } : { ok: false, message: `Browser launch failed: ${result.output.trim().slice(0, 240)}` }
  } finally {
    rmSync(dir, { recursive: true, force: true })
    await new Promise((resolvePromise) => server.close(resolvePromise))
  }
}

const save = (path, text) => {
  const dir = dirname(path)
  mkdirSync(dir, { recursive: true })
  const current = exists(path) ? statSync(path) : null
  if (current) copyFileSync(path, `${path}.bak.${Date.now()}`)
  const temp = join(dir, `.${process.pid}.${Date.now()}.tmp`)
  writeFileSync(temp, text, { mode: current?.mode || 0o600 })
  renameSync(temp, path)
}

export const main = async (args = process.argv.slice(2)) => {
  const opts = options(args)
  if (opts.help) return console.log(help)
  const found = detect()
  const choice = await selected(opts, found)
  const path = config(choice.scope)
  const text = exists(path) ? readFileSync(path, "utf8") : "{\n}\n"
  const nativeResults = choice.scope === "global" && !opts.dry ? await native(found, choice.target) : []
  const nativeNames = new Set(nativeResults.filter((item) => item.ok).map((item) => item.name))
  const fallback = choice.target === "all"
    ? [found.v1 && !nativeNames.has("V1") ? "plugin" : null, (found.v2 || found.gui) && !nativeNames.has("V2") ? "plugins" : null].filter(Boolean)
    : choice.target === "v1" && !nativeNames.has("V1") ? ["plugin"]
      : choice.target === "v2" && !nativeNames.has("V2") ? ["plugins"]
        : []
  const result = fallback.reduce((state, key) => {
    const next = patch(state.text, [key], key === "plugin" ? v1pkg : pkg)
    return { text: next.text, changes: [...state.changes, ...next.changes] }
  }, { text, changes: [] })
  console.log(`\nConfig: ${path}`)
  console.log(`Detected: ${found.v2 ? "opencode2 " : ""}${found.v1 ? "opencode " : ""}${found.gui ? "GUI " : ""}`.trim() || "no OpenCode executable")
  nativeResults.forEach((item) => console.log(`${item.ok ? "PASS" : "WARN"}: ${item.name} native installer${item.ok ? " completed" : ` failed: ${item.output.trim().slice(-240)}`}`))
  result.changes.forEach((item) => console.log(`${item.key}: ${item.action}`))
  if (!result.changes.length) console.log("Plugin already configured")
  if (choice.scope === "project" && !exists(path)) console.log("Creating project configuration")
  if (opts.dry) console.log("Dry run: no files changed")
  else if (result.changes.length || !exists(path)) save(path, result.text)
  if (choice.smoke) {
    const result = await smoke(found.browser)
    console.log(`${result.ok ? "PASS" : "WARN"}: ${result.message}`)
  }
  console.log("\nRestart OpenCode or its desktop app to load the plugin.")
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) main().catch((error) => { console.error(`Error: ${error.message}`); process.exitCode = 1 })
