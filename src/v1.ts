import { tool, type Plugin } from "@opencode-ai/plugin"
import { browser, launch } from "./browser.js"
import { detect, normalize, reachable } from "./detect.js"
import { prompt } from "./prompt.js"
import { proxy } from "./proxy.js"
import { live } from "./live.js"
import { gate } from "./trust.js"
import { parse, supported } from "./args.js"
import type { Batch, Handle } from "./types.js"

const plugin: Plugin = async ({ client, directory }) => {
  const active = new Map<string, Handle>()
  const sessions = new Map<string, ReturnType<typeof live>>()

  const submit = (sessionID: string) => async (batch: Batch) => {
    const shots = batch.shots ?? []
    await client.session.prompt({
      path: { id: sessionID },
      body: {
        parts: [
          { type: "text", text: prompt(batch) },
          ...shots.map((shot, index) => ({ type: "file" as const, mime: shot.mime, url: `data:${shot.mime};base64,${shot.data}`, filename: `screenshot-${index + 1}.png` })),
        ],
      },
    })
  }

  const open = async (raw: string | undefined, sessionID: string) => {
    const options = parse(raw)
    supported(options, { model: false, fork: true })
    const explicit = options.url ? normalize(options.url) : null
    const target = explicit ?? await detect(directory)
    if (!target) return null
    const refused = gate(target)
    if (refused) throw new Error(refused)
    if (explicit && !(await reachable(target))) throw new Error(`The inspector target is not reachable: ${target}`)
    const selected = await browser(process.env.OPENCODE_INSPECT_BROWSER)
    const session = options.context === "fork" ? (await client.session.fork({ path: { id: sessionID }, body: {} })).data?.id : undefined
    const routed = session ?? sessionID
    const previous = active.get(sessionID)
    await previous?.stop()
    if (active.get(sessionID) === previous) active.delete(sessionID)
    sessions.get(sessionID)?.stop()
    sessions.delete(sessionID)
    const service = live(submit(routed))
    const handle = await proxy(target, submit(routed), service, options)
    sessions.set(sessionID, service)
    active.set(sessionID, handle)
    handle.attach(launch(selected, handle.url))
    return { target, inspector: handle.url, browser: selected.name }
  }

  return {
    tool: {
      visual_inspect: tool({
        description: "Open a browser visual inspector for a running web application",
        args: {
          url: tool.schema.string().optional().describe("URL followed by optional --model provider/model-id, --mode batch|quick, --context default|fork, and --screenshot"),
        },
        async execute(args, context) {
          const result = await open(args.url, context.sessionID)
          if (!result) return "No running web app was detected. Provide a reachable URL to visual_inspect."
          return `Visual inspector opened at ${result.inspector} for ${result.target} using ${result.browser}. Waiting for the user to submit annotations.`
        },
      }),
    },
    event: async ({ event }) => {
      if (event.type === "session.deleted") {
        const sessionID = event.properties.info.id
        await active.get(sessionID)?.stop()
        active.delete(sessionID)
        sessions.get(sessionID)?.stop()
        sessions.delete(sessionID)
        return
      }
      if (event.type === "session.idle") sessions.get(event.properties.sessionID)?.observe("idle")
      if (event.type === "message.updated") sessions.get(event.properties.info.sessionID)?.observe("activity")
      if (event.type === "message.part.updated") sessions.get(event.properties.part.sessionID)?.observe("activity")
      if (event.type === "session.error" && event.properties.sessionID) sessions.get(event.properties.sessionID)?.observe("error", event.properties.error)
    },
  }
}

export default plugin
