import { createServer, type IncomingMessage, type ServerResponse } from "node:http"
import { randomUUID } from "node:crypto"
import { Readable } from "node:stream"
import { client } from "./client.js"
import type { Batch, Handle } from "./types.js"
import { batch } from "./validate.js"

const endpoint = "/__opencode_inspect/annotations"

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

export async function proxy(target: string, submit: (batch: Batch) => Promise<void>): Promise<Handle> {
  const base = new URL(target)
  const token = randomUUID()
  let origin = ""
  const server = createServer(async (req, res) => {
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
        await submit(value)
        reply(res, 200, { ok: true })
      } catch (error) {
        reply(res, 500, { error: error instanceof Error ? error.message : String(error) })
      }
      return
    }
    if (req.url === endpoint) {
      reply(res, 405, { error: "Method not allowed" })
      return
    }

    try {
      if (!req.url || /^https?:\/\//i.test(req.url)) {
        reply(res, 400, { error: "Invalid request target" })
        return
      }
      const url = new URL(req.url ?? "/", base)
      const headers = new Headers()
      Object.entries(req.headers).forEach(([key, value]) => {
        if (value) headers.set(key, Array.isArray(value) ? value.join(", ") : value)
      })
      headers.set("host", base.host)
      headers.delete("accept-encoding")
      const data = req.method === "GET" || req.method === "HEAD" ? undefined : await body(req, 10 * 1024 * 1024)
      const upstream = await fetch(url, { method: req.method, headers, body: data, redirect: "manual" })
      const output = new Headers(upstream.headers)
      for (const name of ["content-security-policy", "content-security-policy-report-only", "x-frame-options", "content-length", "content-encoding"]) output.delete(name)
      output.set("cache-control", "no-store")
      const location = output.get("location")
      if (location) {
        const redirect = new URL(location, base)
        if (redirect.origin === base.origin) output.set("location", `${origin}${redirect.pathname}${redirect.search}${redirect.hash}`)
      }
      const type = output.get("content-type") ?? ""
      if (type.includes("text/html")) {
        const html = await upstream.text()
        const script = client.replace("__OC_TARGET__", JSON.stringify(base.toString())).replace("__OC_TOKEN__", JSON.stringify(token))
        const tag = `<script id="__oc-inspector-script">${script}</script>`
        const end = /<\/body\s*>/i
        const text = end.test(html) ? html.replace(end, `${tag}</body>`) : html + tag
        res.writeHead(upstream.status, Object.fromEntries(output))
        res.end(text)
        return
      }
      res.writeHead(upstream.status, Object.fromEntries(output))
      if (upstream.body) Readable.fromWeb(upstream.body as never).pipe(res)
      else res.end()
    } catch (error) {
      reply(res, 502, { error: `Cannot reach ${target}: ${error instanceof Error ? error.message : String(error)}` })
    }
  })

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject)
    server.listen(0, "127.0.0.1", resolve)
  })
  const address = server.address()
  if (!address || typeof address === "string") throw new Error("Inspector server did not bind to a TCP port")
  origin = `http://127.0.0.1:${address.port}`
  return {
    port: address.port,
    url: `${origin}${base.pathname}${base.search}`,
    stop: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  }
}
