import { afterEach, describe, expect, test } from "bun:test"
import { createServer, type Server } from "node:http"
import plugin from "./v1.js"
import type { Batch } from "./types.js"

const servers: Server[] = []
const oldBrowser = process.env.OPENCODE_INSPECT_BROWSER
const oldAllowPrivate = process.env.OPENCODE_INSPECT_ALLOW_PRIVATE
const oldAllowPublic = process.env.OPENCODE_INSPECT_ALLOW_PUBLIC

afterEach(async () => {
  if (oldBrowser === undefined) delete process.env.OPENCODE_INSPECT_BROWSER
  else process.env.OPENCODE_INSPECT_BROWSER = oldBrowser
  if (oldAllowPrivate === undefined) delete process.env.OPENCODE_INSPECT_ALLOW_PRIVATE
  else process.env.OPENCODE_INSPECT_ALLOW_PRIVATE = oldAllowPrivate
  if (oldAllowPublic === undefined) delete process.env.OPENCODE_INSPECT_ALLOW_PUBLIC
  else process.env.OPENCODE_INSPECT_ALLOW_PUBLIC = oldAllowPublic
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve) => server.close(() => resolve()))))
})

async function app() {
  const server = createServer((_req, res) => {
    res.writeHead(200, { "content-type": "text/html" })
    res.end("<!doctype html><html><body><button>Save</button></body></html>")
  })
  servers.push(server)
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("Fixture server did not start")
  return `http://127.0.0.1:${address.port}`
}

function annotation(target: string): Batch["annotations"][number] {
  return {
    request: "Make it rounder",
    page: target,
    tag: "button",
    id: null,
    classes: [],
    selector: "button",
    xpath: "/html/body/button",
    pseudo: null,
    html: "<button>Save</button>",
    text: "Save",
    attributes: {},
    styles: {},
    rect: { x: 0, y: 0, width: 80, height: 32 },
    viewport: { label: "Desktop", width: 1440, height: 900 },
    source: null,
  }
}

async function open(input: { prompt: (value: unknown) => Promise<void> }, url: string, sessionID = "ses-v1") {
  const hooks = await plugin({
    client: { session: input } as never,
    project: {} as never,
    directory: process.cwd(),
    worktree: process.cwd(),
    $: undefined as never,
  })
  const inspector = hooks.tool?.visual_inspect
  if (!inspector) throw new Error("V1 visual_inspect tool is missing")
  const result = await inspector.execute({ url }, { sessionID, messageID: "msg", agent: "build", abort: new AbortController().signal })
  const location = result.match(/at (http:\/\/127\.0\.0\.1:\d+[^ ]*) for/)
  if (!location) throw new Error(`Inspector URL missing from result: ${result}`)
  return { hooks, url: location[1] }
}

async function send(url: string, target: string, requestID = "change-1") {
  const html = await fetch(url).then((response) => response.text())
  const token = html.match(/const token = "([^"]+)"/)?.[1]
  if (!token) throw new Error("Inspector token missing")
  const response = await fetch(new URL("/__opencode_inspect/annotations", url), {
    method: "POST",
    headers: { "content-type": "application/json", "x-opencode-inspector": token },
    body: JSON.stringify({ target, viewports: [], delivery: "main", annotations: [annotation(target)], requestID }),
  })
  return { response, token }
}

describe("V1 plugin adapter", () => {
  test("exports the documented hook-returning plugin shape", async () => {
    const input = {
      client: { session: { prompt: async () => undefined } },
      project: {},
      directory: process.cwd(),
      worktree: process.cwd(),
      $: undefined,
    } as unknown as Parameters<typeof plugin>[0]

    const hooks = await plugin(input)
    expect(hooks.tool?.visual_inspect).toBeDefined()
    expect(hooks.event).toBeDefined()
    expect(hooks.tool?.visual_inspect.description).toContain("visual inspector")
  })

  test("uses an optional URL so V1 can use target detection", async () => {
    const input = {
      client: { session: { prompt: async () => undefined } },
      project: {},
      directory: process.cwd(),
      worktree: process.cwd(),
      $: undefined,
    } as unknown as Parameters<typeof plugin>[0]

    const hooks = await plugin(input)
    const tool = hooks.tool?.visual_inspect
    expect(tool?.args.url).toBeDefined()
  })

  test("routes submitted annotations through the invoking V1 session", async () => {
    process.env.OPENCODE_INSPECT_BROWSER = "/bin/true"
    const target = await app()
    const prompts: unknown[] = []
    const opened = await open({ prompt: async (value) => { prompts.push(value) } }, target, "ses-submit")
    const result = await send(opened.url, target)
    expect(result.response.status).toBe(200)
    expect(prompts).toHaveLength(1)
    expect(prompts[0]).toEqual({
      path: { id: "ses-submit" },
      body: { parts: [{ type: "text", text: expect.stringContaining("Make it rounder") }] },
    })
  })

  test("normalizes supported URLs and rejects unsupported or unreachable URLs", async () => {
    process.env.OPENCODE_INSPECT_BROWSER = "/bin/true"
    const target = await app()
    const prompts: unknown[] = []
    const opened = await open({ prompt: async (value) => { prompts.push(value) } }, `${target}/`, "ses-url")
    expect(opened.url).toMatch(/^http:\/\/127\.0\.0\.1:\d+\/$/)
    const hooks = await plugin({ client: { session: { prompt: async () => undefined } } as never, project: {} as never, directory: process.cwd(), worktree: process.cwd(), $: undefined as never })
    const inspector = hooks.tool?.visual_inspect
    if (!inspector) throw new Error("V1 visual_inspect tool is missing")
    await expect(inspector.execute({ url: "ftp://example.com" }, { sessionID: "ses-invalid", messageID: "msg", agent: "build", abort: new AbortController().signal })).rejects.toThrow("Only http and https URLs are supported")
    await expect(inspector.execute({ url: "http://127.0.0.1:1" }, { sessionID: "ses-invalid", messageID: "msg", agent: "build", abort: new AbortController().signal })).rejects.toThrow("not reachable")
  })

  test("replaces the prior proxy for a session", async () => {
    process.env.OPENCODE_INSPECT_BROWSER = "/bin/true"
    const first = await app()
    const second = await app()
    const hooks = await plugin({ client: { session: { prompt: async () => undefined } } as never, project: {} as never, directory: process.cwd(), worktree: process.cwd(), $: undefined as never })
    const inspector = hooks.tool?.visual_inspect
    if (!inspector) throw new Error("V1 visual_inspect tool is missing")
    const args = { sessionID: "ses-replace", messageID: "msg", agent: "build", abort: new AbortController().signal }
    const result = await inspector.execute({ url: first }, args)
    const replacement = await inspector.execute({ url: second }, args)
    const oldURL = result.match(/at (http:\/\/127\.0\.0\.1:\d+[^ ]*) for/)?.[1]
    const newURL = replacement.match(/at (http:\/\/127\.0\.0\.1:\d+[^ ]*) for/)?.[1]
    if (!oldURL || !newURL) throw new Error("Inspector URL missing")
    await expect(fetch(oldURL)).rejects.toThrow()
    expect((await fetch(newURL)).status).toBe(200)
  })

  test("stops the proxy on verified V1 session deletion", async () => {
    process.env.OPENCODE_INSPECT_BROWSER = "/bin/true"
    const target = await app()
    const opened = await open({ prompt: async () => undefined }, target, "ses-delete")
    await opened.hooks.event?.({
      event: {
        type: "session.deleted",
        properties: {
          info: {
            id: "ses-delete",
            projectID: "project",
            directory: process.cwd(),
            title: "fixture",
            version: "v1",
            time: { created: 0, updated: 0 },
          },
        },
      },
    })
    await expect(fetch(opened.url)).rejects.toThrow()
  })

  test("refuses private and public targets by default and names the opt-in", async () => {
    process.env.OPENCODE_INSPECT_BROWSER = "/bin/true"
    const hooks = await plugin({ client: { session: { prompt: async () => undefined } } as never, project: {} as never, directory: process.cwd(), worktree: process.cwd(), $: undefined as never })
    const inspector = hooks.tool?.visual_inspect
    if (!inspector) throw new Error("V1 visual_inspect tool is missing")
    const args = { sessionID: "ses-gate", messageID: "msg", agent: "build", abort: new AbortController().signal }
    await expect(inspector.execute({ url: "http://192.168.7.7:1" }, args)).rejects.toThrow("The inspector refuses private network targets by default. Set OPENCODE_INSPECT_ALLOW_PRIVATE=1 to inspect http://192.168.7.7:1.")
    await expect(inspector.execute({ url: "http://example.com:1" }, args)).rejects.toThrow("The inspector refuses public network targets by default. Set OPENCODE_INSPECT_ALLOW_PUBLIC=1 to inspect http://example.com:1.")
    await expect(inspector.execute({ url: "http://user:pass@localhost:1" }, args)).rejects.toThrow("The inspector target is invalid or unsupported")
  })

  test("public and private opt-ins are independent", async () => {
    process.env.OPENCODE_INSPECT_BROWSER = "/bin/true"
    process.env.OPENCODE_INSPECT_ALLOW_PUBLIC = "1"
    const hooks = await plugin({ client: { session: { prompt: async () => undefined } } as never, project: {} as never, directory: process.cwd(), worktree: process.cwd(), $: undefined as never })
    const inspector = hooks.tool?.visual_inspect
    if (!inspector) throw new Error("V1 visual_inspect tool is missing")
    const args = { sessionID: "ses-optin", messageID: "msg", agent: "build", abort: new AbortController().signal }
    await expect(inspector.execute({ url: "http://192.0.2.1" }, args)).rejects.toThrow("not reachable")
    await expect(inspector.execute({ url: "http://192.168.7.7:1" }, args)).rejects.toThrow("Set OPENCODE_INSPECT_ALLOW_PRIVATE=1")
    process.env.OPENCODE_INSPECT_ALLOW_PRIVATE = "1"
    await expect(inspector.execute({ url: "http://192.168.7.7:1" }, args)).rejects.toThrow("not reachable")
  })
})
