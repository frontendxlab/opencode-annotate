import { afterEach, describe, expect, test } from "bun:test"
import { createServer, type Server } from "node:http"
import { client } from "./client.js"
import { proxy } from "./proxy.js"
import type { Batch, Handle } from "./types.js"

const servers: Server[] = []
const handles: Handle[] = []

afterEach(async () => {
  await Promise.all(handles.splice(0).map((item) => item.stop()))
  await Promise.all(servers.splice(0).map((server) => new Promise<void>((resolve, reject) => server.close((err) => err ? reject(err) : resolve()))))
})

function rendered(): { css: string; html: string } {
  const text = client.replace("__OC_TARGET__", JSON.stringify("http://localhost:3000")).replace("__OC_TOKEN__", JSON.stringify("token-1"))
  const inner = text.match(/root\.querySelector\("style"\)\.textContent = css\.slice\(css\.indexOf\("\/\*"\) \+ 2, css\.lastIndexOf\("\*\/"\)\);/) ? text.slice(text.indexOf("/*") + 2, text.lastIndexOf("*/")) : ""
  const markup = text.match(/root\.innerHTML = '(.*)';/)?.[1] ?? ""
  return { css: inner, html: markup }
}

describe("generated browser script", () => {
  test("exports a self-contained vanilla script with placeholders", () => {
    expect(client).toContain("__OC_TARGET__")
    expect(client).toContain("__OC_TOKEN__")
    expect(client).not.toMatch(/import\s|require\(|from\s+["']/)
  })

  test("inherits exact host border radius with sharp corner fallback", () => {
    expect(client).toContain("borderRadius: css.borderRadius")
    expect(client).toContain('|| "0px"')
  })

  test("isolates UI in an open shadow root", () => {
    expect(client).toContain('host.id = "__oc-inspector"')
    expect(client).toContain('attachShadow({ mode: "open" })')
    expect(client).toContain("all:initial")
    expect(client).toContain("z-index:2147483644")
  })

  test("detects pseudo-element targets for before and after", () => {
    expect(client).toContain('pseudo(el, "::before")')
    expect(client).toContain('pseudo(el, "::after")')
    expect(client).toContain('aria-pressed')
    expect(client).toContain('<div class="targets"></div>')
    expect(client).toContain('.targets button[aria-pressed=true]')
  })

  test("batch controls include clear and send states", () => {
    expect(client).toContain("class=\"clear secondary\"")
    expect(client).toContain("class=\"send primary\"")
    expect(client).toContain("No annotations")
    expect(client).toContain("clear.disabled = notes.length === 0")
    expect(client).toContain("send.disabled = notes.length === 0")
    expect(client).toContain("Send to OpenCode")
    expect(client).toContain('fetch("/__opencode_inspect/annotations"')
    expect(client).toContain('"x-opencode-inspector":token')
  })

  test("supports safe inspect toggling and keyboard annotation", () => {
    expect(client).toContain('class="inspect secondary"')
    expect(client).toContain('aria-pressed')
    expect(client).toContain("if (!event.isTrusted || !enabled || event.composedPath().includes(host)) return")
    expect(client).toContain('event.altKey && event.shiftKey && event.key.toLowerCase() === "i"')
    expect(client).toContain('inspectOn:"Inspect mode on.')
    expect(client).toContain('inspectOff:"Inspect mode off.')
  })

  test("supports accessible errors, status, reflow, forced colors, and duplicate-send guard", () => {
    expect(client).toContain('role="status" aria-live="polite"')
    expect(client).toContain('aria-describedby="oc-change-error"')
    expect(client).toContain('setAttribute("aria-invalid", "true")')
    expect(client).toContain("@media(forced-colors:active)")
    expect(client).toContain("flex-wrap:wrap")
    expect(client).toContain("if (pending) return")
    expect(client).toContain("setTimeout(() => { sync();")
  })

  test("generated script parses as executable JavaScript", () => {
    const text = client.replace("__OC_TARGET__", JSON.stringify("http://localhost:3000")).replace("__OC_TOKEN__", JSON.stringify("token-1"))
    expect(() => new Function(text)).not.toThrow()
  })

  test("ships reduced-motion and related accessibility CSS", () => {
    const { css } = rendered()
    expect(css).toContain("@media(prefers-reduced-motion:reduce)")
    expect(css).toContain("transition-duration:.01ms!important")
    expect(css).toContain("transform:none")
    expect(css).toContain("prefers-reduced-transparency:reduce")
    expect(css).toContain("prefers-contrast:more")
    expect(client).toContain("reduce.matches")
    expect(client).toContain('dialog.setAttribute("role", "dialog")')
    expect(client).toContain('dialog.setAttribute("aria-modal", "true")')
    expect(client).toContain('role="alert"')
  })

  test("renders the inline live chat contract", () => {
    const { html, css } = rendered()
    for (const value of [
      'class="chat"', 'role="log"', 'class="add secondary"', 'class="live primary"',
      'class="composer"', 'aria-describedby="oc-change-error"', 'data-copy="target"',
    ]) expect(html).toContain(value)
    expect(css).toContain("max-height:132px")
    expect(client).toContain('chat.hidden = false')
    expect(client).toContain('chatInput.addEventListener("input"')
    expect(client).toContain('chatInput.style.height = "auto"')
    expect(client).toContain('chatAdd.hidden = mode === "quick"')
    expect(client).toContain("__OC_MODE__")
    expect(client).toContain("__OC_WARNING__")
  })

  test("keeps batch and live submissions separate", () => {
    expect(client).toContain('chatAdd.onclick')
    expect(client).toContain('chatLive.onclick')
    expect(client).toContain('annotations:[request]')
    expect(client).toContain('requestID:id')
    expect(client).toContain('delivery:route, annotations:[request]')
    expect(client).toContain('if (live.id || pending) return')
    expect(client).toContain('chooseLiveDeliveryBody:"Who should apply this live change?"')
    expect(client).toContain('void liveSend(annotation, delivery)')
    expect(client).toContain('fetch("/__opencode_inspect/change"')
    expect(client).toContain('fetch("/__opencode_inspect/change/" + encodeURIComponent(live.id) + "/cancel"')
  })

  test("covers authenticated split-safe SSE lifecycle and every backend state", () => {
    for (const value of ["submitting", "working", "succeeded", "failed", "cancelled"]) expect(client).toContain(`"${value}"`)
    expect(client).toContain('accept":"text/event-stream"')
    expect(client).toContain('"x-opencode-inspector":token')
    expect(client).toContain('split("\\n\\n")')
    expect(client).toContain('decoder.decode(item.value, { stream:true })')
    expect(client).toContain('id: (\\d+)')
    expect(client).toContain('data: (.+)')
    expect(client).toContain('?after=" + live.after')
    expect(client).toContain('sessionStorage.setItem(storageKey')
    expect(client).toContain('sessionStorage.removeItem(storageKey)')
  })

  test("reloads only on success, preserves editable failures and cancellation", () => {
    expect(client).toContain('if (value === "succeeded") { sessionStorage.setItem(storageKey, JSON.stringify({ state:"applied" })); setTimeout(() => location.reload(), 0); }')
    expect(client).toContain('if (value === "failed" || value === "cancelled") { chatInput.disabled = false; chatLive.disabled = false; chatAdd.disabled = false; }')
    expect(client).toContain('if (live.state !== "cancelled") state("failed"')
    expect(client).toContain('retry.onclick = (event) => { if (event.isTrusted && last) void liveSend(last.request, last.delivery); }')
    expect(client).toContain('sessionStorage.getItem(storageKey)')
    expect(client).toContain('saved?.state === "applied"')
    expect(client).toContain('node.dataset.state = value;\n      node.className = "state "')
    expect(client).toContain('const node = document.createElement("div");\n      node.className = "state ok"')
  })

  test("bounds token-scoped status and sends lifecycle at required boundaries", () => {
    expect(client).toContain('const storageKey = "__oc_inspect_live_" + token')
    expect(client).toContain('JSON.stringify({ id:live.id, state:value, after:live.after })')
    expect(client).toContain('void beat("heartbeat")')
    expect(client).toContain('setInterval(() => { void beat("heartbeat"); }, 5000)')
    expect(client).toContain('chatInput.addEventListener("input", () => { rows(); beat("activity"); })')
    expect(client).toContain('await beat("close")')
    expect(client).not.toContain('pagehide')
    expect(client).not.toContain('beforeunload')
  })

  test("preserves inspect toggle, focus order, and accessibility semantics", () => {
    expect(client).toContain('toggle.setAttribute("aria-pressed", String(enabled))')
    expect(client).toContain('toggle.onclick = (event) => { if (!event.isTrusted) return; enabled = !enabled')
    expect(client).toContain('role="alert"')
    expect(client).toContain('setAttribute("aria-invalid", "true")')
    expect(client).toContain('if (!dialog.contains(root.activeElement)) { event.preventDefault(); first.focus(); return; }')
    expect(client).toContain('const first = items[0]')
    expect(client).toContain('const last = items[items.length - 1]')
    expect(client).toContain('@media(forced-colors:active)')
    expect(client).toContain('setTimeout(() => { sync();')
  })

  test("uses a CSS spring easing token for motion", () => {
    const { css } = rendered()
    expect(css).toContain("--spring:linear(")
    expect(css).toContain("--out:cubic-bezier(.23,1,.32,1)")
    expect(css).toContain("var(--spring)")
  })

  test("filters sensitive attributes before submission", () => {
    expect(client).toContain("/(token|secret|password|authorization|cookie|value)/i")
  })

  test("annotation payload carries selector, xpath, pseudo, rect, viewport, and source fields", () => {
    for (const key of ["selector: selector(el)", "xpath: xpath(el)", "pseudo: selected", "rect: { x:", "viewport: active", "source: source(el)", "text:", "styles:", "attributes:"]) {
      expect(client).toContain(key)
    }
  })

  test("viewport dialog offers device presets and custom size controls", () => {
    expect(client).toContain('const presets = [')
    expect(client).toContain('{ label:t("desktop"), width:1440, height:900 }')
    expect(client).toContain('{ label:t("laptop"), width:1280, height:800 }')
    expect(client).toContain('{ label:t("iphone"), width:393, height:852 }')
    expect(client).toContain('{ label:t("pixel"), width:412, height:915 }')
    expect(client).toContain('desktop:"Desktop", laptop:"Laptop", iphone:"iPhone 16 Pro", pixel:"Pixel 9"')
    expect(client).toContain('class="presets"')
    expect(client).toContain('class="custom"')
    expect(client).toContain('input class="width" type="number" min="320" max="7680"')
    expect(client).toContain('input class="height" type="number" min="320" max="4320"')
    expect(client).toContain('resize({ label:t("custom"), width, height })')
    expect(client).toContain('t("sizeError")')
  })

  test("selected viewports are remembered and sent with the batch", () => {
    expect(client).toContain("const views = []")
    expect(client).toContain("const remember = (item) => {")
    expect(client).toContain("views.push(item)")
    expect(client).toContain("remember(active)")
    expect(client).toContain("viewports:views, delivery")
    expect(client).toContain("views.length = 0")
  })

  test("send routing offers main, subagent with context, and fresh subagent", () => {
    expect(client).toContain('modal(t("chooseDelivery"), t("chooseDeliveryBody"))')
    expect(client).toContain('choice(node, t("main"), t("mainHelp"), () => submit("main"));')
    expect(client).toContain('choice(node, t("context"), t("contextHelp"), () => submit("subagent-context"));')
    expect(client).toContain('choice(node, t("fresh"), t("freshHelp"), () => submit("subagent-fresh"));')
    expect(client).toContain('node.querySelector(".choices button").focus({ preventScroll:true });')
  })

  test("successful send presents close-window and continue-annotating choices", () => {
    expect(client).toContain('modal(t("sent"), t("sentBody"))')
    expect(client).toContain('node.querySelector(".cancel").remove()')
    expect(client).toContain('choice(node, t("closeWindow"), "", () => { void leave(true); });')
    expect(client).toContain('document.getElementById("__oc-inspector-script")?.remove()')
    expect(client).toContain('const next = choice(node, t("continue"), "", () => {')
    expect(client).toContain('next.focus({ preventScroll:true });')
    expect(client).toContain('count.textContent = t("sent")')
  })

  test("continue clears notes and viewport history", () => {
    expect(client).toContain("notes.length = 0;")
    expect(client).toContain("views.length = 0;")
    expect(client).toContain('send.textContent = t("send");')
    expect(client).toContain("close();")
    expect(client).toContain("refresh();")
  })

  test("proxy injects script with concrete target and token values", async () => {
    const server = createServer((_req, res) => {
      res.writeHead(200, { "content-type": "text/html" })
      res.end("<!doctype html><html><body><p>Hi</p></body></html>")
    })
    servers.push(server)
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Fixture server did not start")
    const target = `http://127.0.0.1:${address.port}`
    let received: Batch | null = null
    const handle = await proxy(target, async (value) => { received = value })
    handles.push(handle)
    const html = await fetch(handle.url).then((res) => res.text())
    expect(html).toContain(JSON.stringify(`${target}/`))
    expect(html).not.toContain("__OC_TARGET__")
    expect(html).not.toContain("__OC_TOKEN__")
    expect(html).toContain('<script id="__oc-inspector-script">')
    const token = html.match(/const token = "([^"]+)"/)?.[1]
    expect(token).toBeTruthy()
    const annotation = {
      request: "Make it rounder",
      page: target,
      tag: "button",
      id: null,
      classes: [],
      selector: "button",
      xpath: "/html/body/button",
      pseudo: "::before" as const,
      html: "<button>Save</button>",
      text: "Save",
      attributes: {},
      styles: { "border-radius": "0px" },
      rect: { x: 0, y: 0, width: 80, height: 32 },
      viewport: { label: "Desktop", width: 1440, height: 900 },
      source: null,
    }
    const res = await fetch(new URL("/__opencode_inspect/annotations", handle.url), {
      method: "POST",
      headers: { "content-type": "application/json", "x-opencode-inspector": token! },
      body: JSON.stringify({ target, viewports: [annotation.viewport], delivery: "subagent-context", annotations: [annotation] }),
    })
    expect(res.status).toBe(200)
    expect((received as unknown as Batch).annotations[0].pseudo).toBe("::before")
    expect((received as unknown as Batch).annotations[0].viewport).toEqual(annotation.viewport)
    expect((received as unknown as Batch).viewports).toEqual([annotation.viewport])
    expect((received as unknown as Batch).delivery).toBe("subagent-context")
  })

  test("sharp zero corners survive proxy injection", async () => {
    const server = createServer((_req, res) => {
      res.writeHead(200, { "content-type": "text/html" })
      res.end('<!doctype html><html><body><button style="border-radius:0">Save</button></body></html>')
    })
    servers.push(server)
    await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
    const address = server.address()
    if (!address || typeof address === "string") throw new Error("Fixture server did not start")
    const handle = await proxy(`http://127.0.0.1:${address.port}`, async () => {})
    handles.push(handle)
    const html = await fetch(handle.url).then((res) => res.text())
    expect(html).toContain('|| "0px"')
    expect(html).toContain("--spring:linear(")
    expect(html).toContain("prefers-reduced-motion:reduce")
  })
})
