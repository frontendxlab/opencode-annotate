import { afterEach, describe, expect, test } from "bun:test"
import { createServer, type Server } from "node:http"
import { proxy } from "./proxy.js"
import { live } from "./live.js"
import type { Batch, Handle } from "./types.js"

const servers: Server[] = []
const handles: Handle[] = []

afterEach(async () => {
  await Promise.all(handles.splice(0).map((item) => item.stop()))
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()))))
})

async function fixture() {
  const server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html", "content-security-policy": "default-src 'none'", "x-frame-options": "DENY" })
    res.end("<!doctype html><html><body><button style=\"border-radius:12px\">Save</button></BODY   >")
  })
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("Fixture server did not start")
  return `http://127.0.0.1:${address.port}`
}

async function token(handle: Handle) {
  const html = await fetch(handle.url).then((res) => res.text())
  const value = html.match(/const token = "([^"]+)"/)?.[1]
  if (!value) throw new Error("Inspector token missing")
  return value
}

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const viewport = { label: "Desktop", width: 1440, height: 900 }
const annotation = {
  request: "Make this smaller",
  page: "http://localhost:3000",
  tag: "button",
  id: null,
  classes: [],
  selector: "button",
  xpath: "/html/body/button",
  pseudo: null,
  html: "<button>Save</button>",
  text: "Save",
  attributes: {},
  styles: { "border-radius": "12px" },
  rect: { x: 0, y: 0, width: 80, height: 32 },
  viewport,
  source: null,
}
const payload = { target: annotation.page, viewports: [viewport], delivery: "subagent-context", annotations: [annotation] }

describe("inspector proxy", () => {
  test("injects isolated inspector code and strips blocking headers", async () => {
    const handle = await proxy(await fixture(), async () => {})
    handles.push(handle)
    const res = await fetch(handle.url)
    const html = await res.text()
    expect(res.headers.get("content-security-policy")).toBeNull()
    expect(res.headers.get("x-frame-options")).toBeNull()
    expect(html).toContain('host.id = "__oc-inspector"')
    expect(html).toContain('setAttribute("aria-label", t("toolbar"))')
    expect(html).toContain("borderRadius: css.borderRadius")
    expect(html).toContain("prefers-reduced-motion:reduce")
    expect(html).not.toContain("__OC_TARGET__")
    expect(html).not.toContain("__OC_TOKEN__")
  })

  test("keeps target cookies scoped and strips dynamic hop headers", async () => {
    const seen: Array<string | undefined> = []
    const headers: Array<string | undefined> = []
    const server = createServer((req, res) => {
      seen.push(req.headers.cookie)
      headers.push(req.headers["x-client"] as string | undefined)
      res.setHeader("content-type", "text/plain")
      res.setHeader("connection", "x-internal")
      res.setHeader("x-internal", "secret")
      if (req.url === "/login") res.setHeader("set-cookie", "sid=abc; Path=/app; HttpOnly")
      res.end("ok")
    })
    servers.push(server)
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Fixture server did not start")
    const handle = await proxy(`http://127.0.0.1:${address.port}`, async () => {})
    handles.push(handle)
    const login = await fetch(new URL("/login", handle.url), { headers: { connection: "x-client", "x-client": "secret" } })
    expect(login.headers.get("x-internal")).toBeNull()
    expect(login.headers.get("set-cookie")).toBeNull()
    await fetch(new URL("/app/page", handle.url))
    await fetch(new URL("/apple", handle.url))
    expect(seen).toEqual([undefined, "sid=abc", undefined])
    expect(headers).toEqual([undefined, undefined, undefined])
  })

  test("authenticates and submits a valid batch once", async () => {
    let received: Batch | null = null
    let calls = 0
    const handle = await proxy(await fixture(), async (value) => { received = value; calls++ })
    handles.push(handle)
    const html = await fetch(handle.url).then((res) => res.text())
    const token = html.match(/const token = "([^"]+)"/)?.[1]
    expect(token).toBeTruthy()
    const endpoint = new URL("/__opencode_inspect/annotations", handle.url)
    const denied = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) })
    expect(denied.status).toBe(403)
    const accepted = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", "x-opencode-inspector": token! }, body: JSON.stringify(payload) })
    expect(accepted.status).toBe(200)
    expect(calls).toBe(1)
    expect((received as unknown as Batch).annotations[0].selector).toBe("button")
    expect((received as unknown as Batch).annotations[0].viewport).toEqual(viewport)
    expect((received as unknown as Batch).viewports).toEqual([viewport])
    expect((received as unknown as Batch).delivery).toBe("subagent-context")
  })

  test("captures a screenshot only when the request opts in", async () => {
    let received: Batch | null = null
    let calls = 0
    const handle = await proxy(await fixture(), async (value) => { received = value })
    handles.push(handle)
    handle.attach({
      ready: Promise.resolve(),
      resize: async (width, height) => ({ label: "x", width, height }),
      screenshot: async () => { calls++; return "AAAA" },
      close: async () => {},
    })
    const value = await token(handle)
    const endpoint = new URL("/__opencode_inspect/annotations", handle.url)
    const first = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", "x-opencode-inspector": value }, body: JSON.stringify({ ...payload, screenshot: true }) })
    expect(first.status).toBe(200)
    expect(calls).toBe(1)
    expect((received as unknown as Batch).shots).toEqual([{ mime: "image/png", data: "AAAA" }])
    const second = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", "x-opencode-inspector": value }, body: JSON.stringify(payload) })
    expect(second.status).toBe(200)
    expect((received as unknown as Batch).shots).toBeUndefined()
    expect(calls).toBe(1)
  })

  test("keeps submitting when screenshot capture fails", async () => {
    let received: Batch | null = null
    let calls = 0
    const handle = await proxy(await fixture(), async (value) => { received = value; calls++ })
    handles.push(handle)
    handle.attach({
      ready: Promise.resolve(),
      resize: async (width, height) => ({ label: "x", width, height }),
      screenshot: async () => { throw new Error("capture failed") },
      close: async () => {},
    })
    const value = await token(handle)
    const res = await fetch(new URL("/__opencode_inspect/annotations", handle.url), { method: "POST", headers: { "content-type": "application/json", "x-opencode-inspector": value }, body: JSON.stringify({ ...payload, screenshot: true }) })
    expect(res.status).toBe(200)
    expect(calls).toBe(1)
    expect((received as unknown as Batch).shots).toBeUndefined()
  })

  test("rejects malformed annotation batches", async () => {
    const handle = await proxy(await fixture(), async () => {})
    handles.push(handle)
    const html = await fetch(handle.url).then((res) => res.text())
    const token = html.match(/const token = "([^"]+)"/)?.[1]
    const invalid = await fetch(new URL("/__opencode_inspect/annotations", handle.url), { method: "POST", headers: { "content-type": "application/json", "x-opencode-inspector": token! }, body: JSON.stringify({ annotations: [] }) })
    expect(invalid.status).toBe(400)
  })

  test("authenticates, bounds, and reports unavailable viewport control", async () => {
    const handle = await proxy(await fixture(), async () => {})
    handles.push(handle)
    const endpoint = new URL("/__opencode_inspect/viewport", handle.url)
    const denied = await fetch(endpoint, { method: "POST", body: JSON.stringify({ width: 900, height: 700 }) })
    expect(denied.status).toBe(403)
    const value = await token(handle)
    const invalid = await fetch(endpoint, { method: "POST", headers: { "x-opencode-inspector": value }, body: JSON.stringify({ width: 319, height: 700 }) })
    expect(invalid.status).toBe(400)
    const unavailable = await fetch(endpoint, { method: "POST", headers: { "x-opencode-inspector": value }, body: JSON.stringify({ width: 900, height: 700 }) })
    expect(unavailable.status).toBe(503)
    expect((await unavailable.json()).unavailable).toBe(true)
  })

  test("refuses proxy requests for foreign origins", async () => {
    const target = await fixture()
    const other = await fixture()
    const handle = await proxy(target, async () => {})
    handles.push(handle)
    const port = Number(new URL(handle.url).port)
    const otherPort = new URL(other).port
    const request = `GET http://127.0.0.1:${otherPort}/ HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n\r\n`
    const raw = await new Promise<string>((resolve, reject) => {
      Bun.connect({ hostname: "127.0.0.1", port, socket: {
        data(socket, chunk) { if (chunk.toString().includes("400")) resolve("400") },
        error(_socket, error) { reject(error) },
        open(socket) { socket.write(request) },
      } })
    })
    expect(raw).toBe("400")
  })

  test("rejects a mismatched Host header and accepts the bound host", async () => {
    const handle = await proxy(await fixture(), async () => {})
    handles.push(handle)
    const port = Number(new URL(handle.url).port)
    const send = (request: string) => new Promise<string>((resolve, reject) => {
      Bun.connect({ hostname: "127.0.0.1", port, socket: {
        data(socket, chunk) { socket.end(); resolve(chunk.toString()) },
        error(_socket, error) { reject(error) },
        open(socket) { socket.write(request) },
      } })
    })
    const wrong = await send(`GET / HTTP/1.1\r\nHost: 127.0.0.1:${port + 1}\r\nConnection: close\r\n\r\n`)
    expect(wrong).toContain("403")
    expect(wrong).toContain("Invalid inspector host")
    const rebinding = await send(`GET / HTTP/1.1\r\nHost: evil.example:80\r\nConnection: close\r\n\r\n`)
    expect(rebinding).toContain("403")
    const missing = await send("GET / HTTP/1.1\r\nConnection: close\r\n\r\n")
    expect(missing).toMatch(/400|403/)
    const bound = await send(`GET / HTTP/1.1\r\nHost: 127.0.0.1:${port}\r\nConnection: close\r\n\r\n`)
    expect(bound).toContain("200")
    const aliased = await send(`GET / HTTP/1.1\r\nHost: localhost:${port}\r\nConnection: close\r\n\r\n`)
    expect(aliased).toContain("200")
  })

  test("rejects token endpoints with a wrong Host before the token check", async () => {
    const handle = await proxy(await fixture(), async () => {})
    handles.push(handle)
    const port = Number(new URL(handle.url).port)
    const send = (request: string) => new Promise<string>((resolve, reject) => {
      Bun.connect({ hostname: "127.0.0.1", port, socket: {
        data(socket, chunk) { socket.end(); resolve(chunk.toString()) },
        error(_socket, error) { reject(error) },
        open(socket) { socket.write(request) },
      } })
    })
    const lifecycle = await send(`POST /__opencode_inspect/lifecycle HTTP/1.1\r\nHost: 127.0.0.1:${port + 1}\r\nContent-Length: 0\r\nConnection: close\r\n\r\n`)
    expect(lifecycle).toContain("403")
    expect(lifecycle).toContain("Invalid inspector host")
    const annotations = await send(`POST /__opencode_inspect/annotations HTTP/1.1\r\nHost: evil.example:80\r\nContent-Length: 0\r\nConnection: close\r\n\r\n`)
    expect(annotations).toContain("403")
    expect(annotations).toContain("Invalid inspector host")
  })

  test("authenticates heartbeat and rejects unknown lifecycle actions", async () => {
    const handle = await proxy(await fixture(), async () => {}, undefined, { orphan: 100 })
    handles.push(handle)
    const endpoint = new URL("/__opencode_inspect/lifecycle", handle.url)
    const denied = await fetch(endpoint, { method: "POST", body: JSON.stringify({ action: "heartbeat" }) })
    expect(denied.status).toBe(403)
    const value = await token(handle)
    const bad = await fetch(endpoint, { method: "POST", headers: { "x-opencode-inspector": value }, body: JSON.stringify({ action: "wat" }) })
    expect(bad.status).toBe(400)
    const beat = await fetch(endpoint, { method: "POST", headers: { "x-opencode-inspector": value }, body: JSON.stringify({ action: "heartbeat" }) })
    expect(beat.status).toBe(200)
  })

  test("heartbeat extends life, close acknowledges, and stop is repeatable", async () => {
    const handle = await proxy(await fixture(), async () => {}, undefined, { orphan: 35 })
    handles.push(handle)
    const value = await token(handle)
    const endpoint = new URL("/__opencode_inspect/lifecycle", handle.url)
    await wait(20)
    const beat = await fetch(endpoint, { method: "POST", headers: { "x-opencode-inspector": value }, body: JSON.stringify({ action: "activity" }) })
    expect(beat.status).toBe(200)
    await wait(20)
    expect((await fetch(handle.url)).status).toBe(200)
    const close = await fetch(endpoint, { method: "POST", headers: { "x-opencode-inspector": value }, body: JSON.stringify({ action: "close" }) })
    expect(close.status).toBe(200)
    await wait(60)
    expect((await fetch(handle.url).catch(() => null))?.status).not.toBe(200)
    await handle.stop()
    await handle.stop()
  })

  test("orphan expiry closes the proxy", async () => {
    const handle = await proxy(await fixture(), async () => {}, undefined, { orphan: 15 })
    handles.push(handle)
    await wait(35)
    expect((await fetch(handle.url).catch(() => null))?.status).not.toBe(200)
  })

  test("live endpoint remains functional and stop ends its stream", async () => {
    const service = live(async () => {})
    const handle = await proxy(await fixture(), async () => {}, service, { orphan: 100 })
    handles.push(handle)
    const value = await token(handle)
    const create = await fetch(new URL("/__opencode_inspect/change", handle.url), { method: "POST", headers: { "content-type": "application/json", "x-opencode-inspector": value }, body: JSON.stringify({ ...payload, requestID: "one" }) })
    expect(create.status).toBe(202)
    const stream = await fetch(new URL("/__opencode_inspect/change/one?after=0", handle.url), { headers: { "x-opencode-inspector": value } })
    expect(stream.status).toBe(200)
    await handle.stop()
    expect(await stream.text()).toContain("submitting")
    expect(service.active).toBe(false)
  })

  test("an interrupted upstream body does not crash the proxy", async () => {
    const server = createServer((req, res) => {
      if (req.url === "/stream") {
        res.writeHead(200, { "content-type": "application/octet-stream" })
        res.write("first")
        setTimeout(() => res.socket?.destroy(), 5)
        return
      }
      res.writeHead(200, { "content-type": "text/plain" })
      res.end("ok")
    })
    servers.push(server)
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Fixture server did not start")
    const handle = await proxy(`http://127.0.0.1:${address.port}`, async () => {})
    handles.push(handle)
    const result = await fetch(new URL("/stream", handle.url)).then(async (res) => res.text()).catch((error: unknown) => error)
    expect(typeof result === "string" || result instanceof Error).toBe(true)
    await wait(20)
    expect((await fetch(handle.url)).status).toBe(200)
  })
})
