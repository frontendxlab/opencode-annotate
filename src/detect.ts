import { readFile } from "node:fs/promises"
import path from "node:path"

const ports = [3000, 5173, 4173, 8080, 8000, 4000, 4200, 4321, 5000, 8888, 9000]

async function probe(url: string) {
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(800), redirect: "manual" })
    const type = res.headers.get("content-type") ?? ""
    await res.body?.cancel()
    return { status: res.status, ok: res.ok, type }
  } catch {
    return null
  }
}

export async function reachable(url: string) {
  const hit = await probe(url)
  return hit !== null && hit.status >= 200 && hit.status < 400
}

export async function inspectable(url: string) {
  const hit = await probe(url)
  return hit !== null && (hit.status >= 300 && hit.status < 400 || hit.ok && hit.type.includes("text/html"))
}

export async function detect(root: string) {
  const env = [process.env.OPENCODE_INSPECT_URL, process.env.PUBLIC_URL, process.env.SITE_URL]
    .find((item) => item?.toLowerCase().startsWith("http"))
  if (env && (await reachable(env))) return env

  const found = await Promise.all(ports.map(async (port) => {
    const url = `http://localhost:${port}`
    return (await inspectable(url)) ? url : null
  }))
  const local = found.find((item) => item)
  if (local) return local

  try {
    const pkg = JSON.parse(await readFile(path.join(root, "package.json"), "utf8")) as {
      homepage?: unknown
    }
    if (typeof pkg.homepage === "string" && /^https?:\/\//i.test(pkg.homepage) && (await inspectable(pkg.homepage))) {
      return pkg.homepage
    }
  } catch {}
  return null
}

export function normalize(raw: string) {
  const value = raw.trim()
  if (!value) return null
  if (/^[a-z][a-z\d+.-]*:\/\//i.test(value) && !/^https?:\/\//i.test(value)) {
    throw new Error("Only http and https URLs are supported")
  }
  const url = /^https?:\/\//i.test(value) ? value : `http://${value}`
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    throw new Error("Only http and https URLs are supported")
  }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error("Only http and https URLs are supported")
  return parsed.toString().replace(/\/$/, "")
}
