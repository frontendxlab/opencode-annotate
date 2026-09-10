export type InspectArgs = {
  url?: string
  model?: { providerID: string; modelID: string }
  mode: "batch" | "quick"
  context: "default" | "fork"
  screenshot: boolean
  warning?: string
}

export type AdapterCapabilities = { model: boolean; fork: boolean }

export function supported(result: InspectArgs, caps: AdapterCapabilities) {
  if (result.model && !caps.model) throw new Error("--model is not supported by this OpenCode adapter. Remove --model or switch to an adapter that supports model switching.")
  if (result.context === "fork" && !caps.fork) throw new Error("--context=fork is not supported by this OpenCode adapter. Remove --context=fork.")
  return result
}

function value(raw: string) {
  const item = raw.trim()
  const slash = item.indexOf("/")
  if (slash < 1 || slash === item.length - 1 || item.indexOf("/", slash + 1) >= 0) throw new Error("--model must use provider/model-id")
  return { providerID: item.slice(0, slash), modelID: item.slice(slash + 1) }
}

export function parse(raw = ""): InspectArgs {
  const args = raw.match(/"[^"\n]*"|'[^'\n]*'|[^\s]+/g)?.map((item) => item.replace(/^(["'])(.*)\1$/, "$2")) ?? []
  const result: InspectArgs = { mode: "batch", context: "default", screenshot: false }
  const seen = new Set<string>()
  for (let index = 0; index < args.length; index++) {
    const item = args[index]
    if (!item.startsWith("--")) {
      if (result.url) throw new Error("/inspect accepts only one URL")
      result.url = item
      continue
    }
    const name = item.match(/^--([a-z-]+)(?:=|:)?/)?.[1] ?? item.slice(2)
    if (seen.has(name)) throw new Error(`Duplicate --${name}`)
    seen.add(name)
    if (name === "screenshot") {
      result.screenshot = true
      continue
    }
    if (name === "no-screenshot") {
      result.screenshot = false
      continue
    }
    const match = item.match(/^--(model|mode|context)(?:=|:)(.*)$/)
    const next = match?.[2] || args[++index]
    if (!next || next.startsWith("--")) throw new Error(`--${name} needs a value`)
    if (name === "model") result.model = value(next)
    else if (name === "mode" && (next === "batch" || next === "quick")) result.mode = next
    else if (name === "context" && (next === "default" || next === "fork")) result.context = next
    else throw new Error(`Invalid --${name} value: ${next}`)
  }
  if (result.model && result.context === "default") result.warning = `Model ${result.model.providerID}/${result.model.modelID} will change the current session model.`
  return result
}
