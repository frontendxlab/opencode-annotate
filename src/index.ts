import { Plugin } from "@opencode/plugin"
import { browser, launch } from "./browser.js"
import { detect, normalize, reachable } from "./detect.js"
import { prompt } from "./prompt.js"
import { proxy } from "./proxy.js"
import { live } from "./live.js"
import { gate } from "./trust.js"
import type { Handle } from "./types.js"

export default Plugin.define({
  id: "opencode.visual-inspector",
  async setup(ctx) {
    const active = new Map<string, Handle>()
    const sessions = new Map<string, ReturnType<typeof live>>()
    const api = (ctx as unknown as { client?: { event?: { subscribe(): Promise<{ stream: AsyncIterable<unknown> }> } } }).client
    const events = await api?.event?.subscribe()
    const iterator = events?.stream[Symbol.asyncIterator]()
    const consume = iterator ? (async () => {
      try {
        for await (const value of { [Symbol.asyncIterator]: () => iterator }) {
        if (!value || typeof value !== "object") continue
        const event = value as { type?: string; properties?: Record<string, unknown> }
        const props = event.properties
        const sessionID = typeof props?.sessionID === "string" ? props.sessionID : typeof (props?.info as { id?: unknown } | undefined)?.id === "string" ? (props?.info as { id: string }).id : undefined
        if (!sessionID) continue
        const state = sessions.get(sessionID)
        if (event.type === "session.deleted") {
          const handle = active.get(sessionID)
          if (handle) await handle.stop()
          if (active.get(sessionID) === handle) active.delete(sessionID)
          if (sessions.get(sessionID) === state) sessions.delete(sessionID)
          continue
        }
        if (!state) continue
        if (event.type === "session.error") state.observe("error", props?.error)
        if (event.type === "message.updated" || event.type === "message.part.updated") state.observe("activity")
        if (event.type === "session.status") {
          const status = props?.status
          if (status && typeof status === "object" && "type" in status) {
            const kind = (status as { type?: string }).type
            if (kind === "busy") state.observe("busy")
            if (kind === "idle") state.observe("idle")
          }
        }
        }
      } finally {
        await iterator.return?.()
      }
    })().catch(() => {}) : Promise.resolve()

    const open = async (raw: string | undefined, sessionID: string) => {
      const fallback = typeof ctx.options.url === "string" ? ctx.options.url : undefined
      const explicit = raw || fallback ? normalize(raw || fallback || "") : null
      const target = explicit ?? await detect(ctx.location.directory)
      if (!target) return null
      const refused = gate(target)
      if (refused) throw new Error(refused)
      if (explicit && !(await reachable(target))) throw new Error(`The inspector target is not reachable: ${target}`)
      const selected = await browser(ctx.options.browser ?? process.env.OPENCODE_INSPECT_BROWSER)
       const previous = active.get(sessionID)
       await previous?.stop()
       if (active.get(sessionID) === previous) active.delete(sessionID)
       if (sessions.has(sessionID)) sessions.delete(sessionID)
       const state = live(async (batch) => {
         await ctx.session.prompt({ sessionID, text: prompt(batch), delivery: "steer" })
       })
       sessions.set(sessionID, state)
       const handle = await proxy(target, async (batch) => {
         await ctx.session.prompt({ sessionID, text: prompt(batch), delivery: "steer" })
       }, state)
      active.set(sessionID, handle)
       handle.attach(launch(selected, handle.url))
      return { target, inspector: handle.url, browser: selected.name }
    }

    const command = await ctx.command.transform((editor) => {
      const execute = async ({ sessionID, prompt: input }: { sessionID: string; prompt: { text: string } }) => {
        const result = await open(input.text, sessionID)
        if (result) {
          await ctx.session.synthetic({ sessionID, text: `Visual inspector opened for ${result.target} using ${result.browser}. Add one or more annotations in the browser, then select Send to OpenCode.` })
          return
        }
        await ctx.session.prompt({
          sessionID,
          delivery: "steer",
          text: process.env.OPENCODE_INSPECT_ALLOW_PUBLIC === "1"
            ? "No running web app was detected. Inspect this project's setup, find or start its local web development server, then call the visual_inspect tool with its URL. If this project only has a deployed site, find its configured public URL and use that. Do not guess an unreachable URL."
            : "No running web app was detected. Inspect this project's setup, find or start its local web development server on 127.0.0.1 or localhost, then call the visual_inspect tool with its URL. The inspector refuses public and private network targets unless the process sets OPENCODE_INSPECT_ALLOW_PUBLIC=1 or OPENCODE_INSPECT_ALLOW_PRIVATE=1, so only propose the deployed public URL when the user asks for it and that opt-in is active. Do not guess an unreachable URL.",
        })
      }
      editor.add({ name: "inspect", description: "Open a browser to visually annotate UI elements", execute })
      editor.add({ name: "inpect", description: "Alias for /inspect", execute })
    })

    const tools = await ctx.tool.transform((editor) => {
      editor.namespace({ name: "visual", description: "Inspect a running web app visually" })
      editor.add({
        name: "inspect",
        description: "Open a browser visual inspector for a running web application",
        input: {
          type: "object",
          properties: { url: { type: "string", description: "Reachable http or https application URL on 127.0.0.1 or localhost by default; public and private network targets need OPENCODE_INSPECT_ALLOW_PUBLIC=1 or OPENCODE_INSPECT_ALLOW_PRIVATE=1" } },
          required: ["url"],
          additionalProperties: false,
        },
        options: { namespace: "visual" },
        execute: async (value, tool) => {
          const input = value as { url: string }
          const result = await open(input.url, tool.sessionID)
          if (!result) throw new Error(`Could not open ${input.url}`)
          return { content: `Visual inspector opened at ${result.inspector} for ${result.target} using ${result.browser}. Waiting for the user to submit annotations.` }
        },
      })
    })

    return async () => {
      sessions.forEach((item) => item.stop())
      sessions.clear()
      await Promise.all([...active.values()].map((item) => item.stop()))
      await iterator?.return?.()
      await consume
      await Promise.all([command.dispose(), tools.dispose()])
    }
  },
})
