import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { randomUUID } from "node:crypto"
import { Readable } from "node:stream"
import { client } from "./client.js"
import type { Batch, BrowserControl, Handle, InspectorOptions, LiveRequest, Viewport } from "./types.js"
import type { LiveEvent } from "./live.js"
import { batch } from "./validate.js"

const endpoint = "/__opencode_inspect/annotations"
const htmlLimit = 10 * 1024 * 1024
const timeout = 30_000
const liveEndpoint = "/__opencode_inspect/change"
export const INSPECTOR_HEARTBEAT_MS = 5_000
export const INSPECTOR_ORPHAN_TIMEOUT_MS = 30_000
const lifecycleEndpoint = "/__opencode_inspect/lifecycle"
const viewportEndpoint = "/__opencode_inspect/viewport"
const hop = ["connection", "keep-alive", "proxy-authenticate", "proxy-authorization", "te", "trailer", "transfer-encoding", "upgrade"]

type Cookie = { name: string; value: string; domain: string; path: string; secure: boolean }

async function body(req: IncomingMessage, limit = 256 * 1024) {
  const chunks: Buffer[] = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > limit) throw new Error("Request body exceeds 256 KB")
    chunks.push(Buffer.from(chunk))
  }
  return Buffer.concat(chunks)
}

function reply(res: ServerResponse, status: number, data: unknown) {
  const text = JSON.stringify(data)
  res.writeHead(status, { "content-type": "application/json", "content-length": Buffer.byteLength(text) })
  res.end(text)
}

async function html(upstream: Response, limit: number) {
  const length = Number(upstream.headers.get("content-length"))
  if (Number.isFinite(length) && length > limit) throw new Error("Upstream HTML exceeds 10 MB")
  if (!upstream.body) return ""
  const reader = upstream.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  for (;;) {
    const item = await reader.read()
    if (item.done) break
    size += item.value.byteLength
    if (size > limit) {
      await reader.cancel()
      throw new Error("Upstream HTML exceeds 10 MB")
    }
    chunks.push(item.value)
  }
  const data = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    data.set(chunk, offset)
    offset += chunk.byteLength
  }
  return new TextDecoder().decode(data)
}

function path(value: string) {
  const item = value.split("?")[0]
  if (!item || !item.startsWith("/")) return "/"
  const index = item.lastIndexOf("/")
  return index > 0 ? item.slice(0, index) : "/"
}

function cookies(headers: Headers, base: URL, request: URL, jar: Map<string, Cookie>) {
  const list = (headers as Headers & { getSetCookie?: () => string[] }).getSetCookie?.() ?? []
  const fallback = headers.get("set-cookie")
  const values = list.length ? list : fallback ? [fallback] : []
  for (const value of values) {
    const parts = value.split(";").map((item) => item.trim())
    const pair = parts.shift()
    if (!pair) continue
    const index = pair.indexOf("=")
    if (index <= 0) continue
    const name = pair.slice(0, index).trim()
    const item = pair.slice(index + 1)
    const attrs = new Map(parts.map((part) => {
      const split = part.indexOf("=")
      return [part.slice(0, split < 0 ? part.length : split).toLowerCase(), split < 0 ? "" : part.slice(split + 1)]
    }))
    const domain = (attrs.get("domain") || base.hostname).toLowerCase().replace(/^\./, "")
    if (domain !== base.hostname && !base.hostname.endsWith(`.${domain}`)) continue
    const pathValue = attrs.get("path") || path(request.pathname)
    const key = `${name}\t${domain}\t${pathValue}`
    const maxAge = Number(attrs.get("max-age"))
    const expires = attrs.get("expires")
    if ((Number.isFinite(maxAge) && maxAge <= 0) || (expires !== undefined && !Number.isNaN(Date.parse(expires)) && Date.parse(expires) <= Date.now())) {
      jar.delete(key)
      continue
    }
    jar.set(key, { name, value: item, domain, path: pathValue.startsWith("/") ? pathValue : "/", secure: attrs.has("secure") })
  }
}

function cookieHeader(base: URL, request: URL, jar: Map<string, Cookie>) {
  const secure = base.protocol === "https:"
  return [...jar.values()]
    .filter((item) => {
      const domain = request.hostname === item.domain || request.hostname.endsWith(`.${item.domain}`)
      const path = request.pathname === item.path || request.pathname.startsWith(item.path.endsWith("/") ? item.path : `${item.path}/`)
      return (!item.secure || secure) && domain && path
    })
    .sort((a, b) => b.path.length - a.path.length)
    .map((item) => `${item.name}=${item.value}`)
    .join("; ")
}

type LiveService = {
  create(id: string, batch: Batch): { state: string }
  status(id: string, after?: number): { requestID: string; state: string; events: LiveEvent[]; error?: string } | null
  listen(id: string, after: number, listener: (event: LiveEvent) => void): (() => boolean) | null
  cancel(id: string): boolean
  stop(): void
}

export type ProxyOptions = {
  heartbeat?: number
  orphan?: number
}

function liveBatch(value: unknown): { id: string; batch: Batch } | null {
  if (!value || typeof value !== "object") return null
  const item = value as Partial<LiveRequest>
  if (typeof item.requestID !== "string" || item.requestID.length < 1 || item.requestID.length > 100 || !Array.isArray(item.annotations) || item.annotations.length !== 1) return null
  const result = batch({ target: item.target, viewports: item.viewports, delivery: item.delivery, annotations: item.annotations })
  return result ? { id: item.requestID, batch: result } : null
}

export async function proxy(target: string, submit: (batch: Batch) => Promise<void>, service?: LiveService, options: ProxyOptions & InspectorOptions = {}): Promise<Handle> {
  const base = new URL(target)
  const token = randomUUID()
  const jar = new Map<string, Cookie>()
  let origin = ""
  let port = 0
  let timer: ReturnType<typeof setTimeout> | undefined
  let stopped = false
  let closing: Promise<void> | undefined
  let control: BrowserControl | undefined
  const streams = new Set<ServerResponse>()
  const orphan = options.orphan ?? INSPECTOR_ORPHAN_TIMEOUT_MS
  const touch = () => {
    if (stopped) return
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => { void shutdown() }, orphan)
  }
  const shutdown = () => {
    if (closing) return closing
    stopped = true
    if (timer) clearTimeout(timer)
    service?.stop()
    const close = control?.close() ?? Promise.resolve()
    streams.forEach((stream) => stream.end())
    streams.clear()
    closing = new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error && (error as NodeJS.ErrnoException).code !== "ERR_SERVER_NOT_RUNNING") reject(error)
        else resolve()
      })
    }).then(() => close)
    return closing
  }
  const server = createServer(async (req, res) => {
    const host = (req.headers.host ?? "").toLowerCase()
    if (host !== `127.0.0.1:${port}` && host !== `localhost:${port}`) {
      reply(res, 403, { error: "Invalid inspector host" })
      return
    }
    if (req.url?.split("?", 1)[0] === lifecycleEndpoint && req.method === "POST") {
      if (req.headers["x-opencode-inspector"] !== token) { reply(res, 403, { error: "Invalid inspector token" }); return }
      try {
        const value = JSON.parse((await body(req)).toString("utf8")) as { action?: unknown }
        if (value.action === "heartbeat" || value.action === "activity") {
          touch()
          reply(res, 200, { ok: true, action: value.action })
          return
        }
        if (value.action === "close") {
          reply(res, 200, { ok: true, action: "close" })
          res.once("finish", () => { void shutdown() })
          return
        }
        reply(res, 400, { error: "Unknown lifecycle action" })
      } catch (error) { reply(res, 400, { error: error instanceof Error ? error.message.slice(0, 2_000) : "Invalid lifecycle request" }) }
      return
    }
    if (req.url?.split("?", 1)[0] === lifecycleEndpoint) { reply(res, 405, { error: "Method not allowed" }); return }
    if (req.url === viewportEndpoint && req.method === "POST") {
      if (req.headers["x-opencode-inspector"] !== token) { reply(res, 403, { error: "Invalid inspector token" }); return }
      try {
        const value = JSON.parse((await body(req)).toString("utf8")) as { width?: unknown; height?: unknown }
        const width = value.width
        const height = value.height
        if (!Number.isInteger(width) || !Number.isInteger(height) || (width as number) < 320 || (width as number) > 7680 || (height as number) < 320 || (height as number) > 4320) {
          reply(res, 400, { error: "Viewport width must be 320..7680 and height 320..4320" }); return
        }
        if (!control) { reply(res, 503, { error: "Viewport control unavailable", unavailable: true }); return }
        touch()
        const actual = await control.resize(width as number, height as number)
        reply(res, 200, { requested: { width, height }, actual })
      } catch (error) { reply(res, 502, { error: error instanceof Error ? error.message : "Viewport resize failed" }) }
      return
    }
    if (req.url === viewportEndpoint) { reply(res, 405, { error: "Method not allowed" }); return }
    if (req.url?.startsWith(`${liveEndpoint}/`) && req.method === "GET") {
      if (req.headers["x-opencode-inspector"] !== token || !service) { reply(res, 403, { error: "Invalid inspector token" }); return }
      const parsed = new URL(req.url, "http://localhost")
      const id = parsed.pathname.slice(`${liveEndpoint}/`.length).split("/", 1)[0]
      const after = Number(parsed.searchParams.get("after") ?? 0)
      const first = service.status(id, Number.isFinite(after) ? after : 0)
      if (!first) { reply(res, 404, { error: "Unknown live change" }); return }
      res.writeHead(200, { "content-type": "text/event-stream", "cache-control": "no-cache", connection: "keep-alive" })
      streams.add(res)
      const write = (event: LiveEvent) => { res.write(`id: ${event.id}\nevent: state\ndata: ${JSON.stringify({ requestID: id, state: event.state, error: event.error })}\n\n`) }
      let off: (() => boolean) | null = null
      let closed = false
      const close = () => { if (closed) return; closed = true; off?.(); streams.delete(res); res.end() }
      const send = (event: LiveEvent) => { if (closed) return; write(event); if (["succeeded", "failed", "cancelled"].includes(event.state)) close() }
      first.events.forEach(send)
      if (["succeeded", "failed", "cancelled"].includes(first.state)) { close(); return }
      off = service.listen(id, Number.isFinite(after) ? after : 0, send)
      req.on("aborted", close); res.on("close", close)
      return
    }
    if (req.url?.startsWith(`${liveEndpoint}/`) && req.method === "POST") {
      if (req.headers["x-opencode-inspector"] !== token || !service) { reply(res, 403, { error: "Invalid inspector token" }); return }
      const parsed = new URL(req.url, "http://localhost")
      const path = parsed.pathname.slice(`${liveEndpoint}/`.length)
      const id = path.split("/", 1)[0]
      if (path.endsWith("/cancel")) { if (!service.cancel(id)) reply(res, 404, { error: "Unknown live change" }); else reply(res, 200, { requestID: id, state: "cancelled" }); return }
      reply(res, 404, { error: "Unknown live change" })
      return
    }
    if (req.url === liveEndpoint && req.method === "POST") {
      try {
        if (req.headers["x-opencode-inspector"] !== token || !service) { reply(res, 403, { error: "Invalid inspector token" }); return }
        const value = liveBatch(JSON.parse((await body(req)).toString("utf8")))
        if (!value) { reply(res, 400, { error: "Invalid live change" }); return }
        touch()
        const result = service.create(value.id, value.batch)
        reply(res, 202, { requestID: value.id, state: result.state })
      } catch (error) { reply(res, 409, { error: error instanceof Error ? error.message.slice(0, 2_000) : "Live change rejected" }) }
      return
    }
    if (req.url === endpoint && req.method === "POST") {
      try {
        if (req.headers["x-opencode-inspector"] !== token) {
          reply(res, 403, { error: "Invalid inspector token" })
          return
        }
        const value = batch(JSON.parse((await body(req)).toString("utf8")))
        if (!value) {
          reply(res, 400, { error: "Invalid annotation batch" })
          return
        }
        touch()
        await submit(value)
        reply(res, 200, { ok: true })
      } catch (error) {
        reply(res, 500, { error: error instanceof Error ? error.message : String(error) })
      }
      return
    }
    if (req.url === endpoint || req.url === liveEndpoint) {
      reply(res, 405, { error: "Method not allowed" })
      return
    }
    if (req.url?.startsWith(`${liveEndpoint}/`)) {
      reply(res, 405, { error: "Method not allowed" })
      return
    }

    let clean = () => {}
    try {
      const url = new URL(req.url ?? "/", base)
      if (!req.url || url.origin !== base.origin) {
        reply(res, 400, { error: "Invalid request target" })
        return
      }
      const headers = new Headers()
      const blocked = new Set([...hop, ...(Array.isArray(req.headers.connection) ? req.headers.connection.join(",") : req.headers.connection ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean)])
      Object.entries(req.headers).forEach(([key, value]) => {
        if (value && !blocked.has(key.toLowerCase()) && !["authorization", "cookie", "host"].includes(key.toLowerCase())) headers.set(key, Array.isArray(value) ? value.join(", ") : value)
      })
      headers.set("host", base.host)
      headers.delete("accept-encoding")
      const cookie = cookieHeader(base, url, jar)
      if (cookie) headers.set("cookie", cookie)
      const data = req.method === "GET" || req.method === "HEAD" ? undefined : await body(req, 10 * 1024 * 1024)
      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), timeout)
      const cancel = () => { if (!res.writableEnded) controller.abort() }
      clean = () => {
        clearTimeout(timer)
        req.removeListener("aborted", cancel)
        res.removeListener("close", cancel)
      }
      req.on("aborted", cancel)
      res.on("close", cancel)
      const upstream = await fetch(url, { method: req.method, headers, body: data, redirect: "manual", signal: controller.signal })
      cookies(upstream.headers, base, url, jar)
      const output = new Headers(upstream.headers)
      const blockedOutput = [...hop, ...(output.get("connection") ?? "").split(",").map((item) => item.trim().toLowerCase()).filter(Boolean)]
      for (const name of ["content-security-policy", "content-security-policy-report-only", "x-frame-options", "content-length", "content-encoding", "set-cookie", ...blockedOutput]) output.delete(name)
      output.set("cache-control", "no-store")
      const location = output.get("location")
      if (location) {
        const redirect = new URL(location, url)
        if (redirect.origin !== base.origin) {
          upstream.body?.cancel()
          clean()
          reply(res, 502, { error: "Cross-origin redirects are not supported by the inspector proxy" })
          return
        }
        output.set("location", `${origin}${redirect.pathname}${redirect.search}${redirect.hash}`)
      }
      const type = output.get("content-type") ?? ""
      if (type.includes("text/html")) {
        const text = await html(upstream, htmlLimit)
        const script = client.replace("__OC_TARGET__", () => JSON.stringify(base.toString())).replace("__OC_TOKEN__", () => JSON.stringify(token)).replace("__OC_MODE__", () => JSON.stringify(options.mode ?? "batch")).replace("__OC_WARNING__", () => JSON.stringify(options.warning ?? ""))
        const tag = `<script id="__oc-inspector-script">${script}</script>`
        const end = /<\/body\s*>/i
        const outputText = end.test(text) ? text.replace(end, `${tag}</body>`) : text + tag
        res.writeHead(upstream.status, Object.fromEntries(output))
        if (req.method === "HEAD") res.end()
        else res.end(outputText)
        clean()
        return
      }
      res.writeHead(upstream.status, Object.fromEntries(output))
      if (req.method === "HEAD") {
        res.end()
      } else if (upstream.body) {
        const stream = Readable.fromWeb(upstream.body as never)
        stream.on("close", clean)
        stream.pipe(res)
      } else {
        res.end()
        clean()
      }
    } catch (error) {
      clean()
      reply(res, 502, { error: `Cannot reach ${target}: ${error instanceof Error ? error.message : String(error)}` })
    }
  })

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolve)
  })
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("Inspector server did not bind to a TCP port")
  port = address.port
  origin = `http://127.0.0.1:${port}`
  touch()
  return {
    port: address.port,
    url: `${origin}${base.pathname}${base.search}`,
      stop: shutdown,
      attach(item: BrowserControl) {
        if (stopped) { void item.close(); return }
        control = item
        void item.ready.catch(() => {})
      },
  }
}
