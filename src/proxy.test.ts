import { afterEach, describe, expect, test } from "bun:test"
import { createServer, type Server } from "node:http"
import { proxy } from "./proxy.js"
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
  source: null,
}

describe("inspector proxy", () => {
  test("injects isolated inspector code and strips blocking headers", async () => {
    const handle = await proxy(await fixture(), async () => {})
    handles.push(handle)
    const res = await fetch(handle.url)
    const html = await res.text()
    expect(res.headers.get("content-security-policy")).toBeNull()
    expect(res.headers.get("x-frame-options")).toBeNull()
    expect(html).toContain("OpenCode visual inspector")
    expect(html).toContain("borderRadius: css.borderRadius")
    expect(html).toContain("prefers-reduced-motion:reduce")
    expect(html).not.toContain("__OC_TARGET__")
    expect(html).not.toContain("__OC_TOKEN__")
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
    const denied = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ target: annotation.page, annotations: [annotation] }) })
    expect(denied.status).toBe(403)
    const accepted = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json", "x-opencode-inspector": token! }, body: JSON.stringify({ target: annotation.page, annotations: [annotation] }) })
    expect(accepted.status).toBe(200)
    expect(calls).toBe(1)
    expect((received as unknown as Batch).annotations[0].selector).toBe("button")
  })

  test("rejects malformed annotation batches", async () => {
    const handle = await proxy(await fixture(), async () => {})
    handles.push(handle)
    const html = await fetch(handle.url).then((res) => res.text())
    const token = html.match(/const token = "([^"]+)"/)?.[1]
    const invalid = await fetch(new URL("/__opencode_inspect/annotations", handle.url), { method: "POST", headers: { "content-type": "application/json", "x-opencode-inspector": token! }, body: JSON.stringify({ annotations: [] }) })
    expect(invalid.status).toBe(400)
  })
})
