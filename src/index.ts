import { Plugin } from "@opencode/plugin"
import { browser, launch } from "./browser.js"
import { detect, normalize, reachable } from "./detect.js"
import { prompt } from "./prompt.js"
import { proxy } from "./proxy.js"
import type { Handle } from "./types.js"

export default Plugin.define({
  id: "opencode.visual-inspector",
  async setup(ctx) {
    const active = new Map<string, Handle>()

    const open = async (raw: string | undefined, sessionID: string) => {
      const fallback = typeof ctx.options.url === "string" ? ctx.options.url : undefined
      const explicit = raw || fallback ? normalize(raw || fallback || "") : null
      const target = explicit ?? await detect(ctx.location.directory)
      if (!target) return null
      if (explicit && !(await reachable(target))) throw new Error(`The inspector target is not reachable: ${target}`)
      const selected = await browser(ctx.options.browser ?? process.env.OPENCODE_INSPECT_BROWSER)
      await active.get(sessionID)?.stop()
      const handle = await proxy(target, async (batch) => {
        await ctx.session.prompt({ sessionID, text: prompt(batch), delivery: "steer" })
      })
      active.set(sessionID, handle)
      launch(selected, handle.url)
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
          text: "No running web app was detected. Inspect this project's setup, find or start its local web development server, then call the visual_inspect tool with its URL. If this project only has a deployed site, find its configured public URL and use that. Do not guess an unreachable URL.",
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
          properties: { url: { type: "string", description: "Reachable http or https application URL" } },
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
      await Promise.all([...active.values()].map((item) => item.stop()))
      await Promise.all([command.dispose(), tools.dispose()])
    }
  },
})
