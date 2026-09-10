export type InspectArgs = {
  url?: string
  model?: { providerID: string; modelID: string }
  mode: "batch" | "quick"
  context: "default" | "fork"
  warning?: string
}

function value(raw: string) {
  const item = raw.trim()
  const slash = item.indexOf("/")
  if (slash < 1 || slash === item.length - 1 || item.indexOf("/", slash + 1) >= 0) throw new Error("--model must use provider/model-id")
  return { providerID: item.slice(0, slash), modelID: item.slice(slash + 1) }
}

export function parse(raw = ""): InspectArgs {
  const args = raw.match(/"[^"\n]*"|'[^'\n]*'|[^\s]+/g)?.map((item) => item.replace(/^(["'])(.*)\1$/, "$2")) ?? []
  const result: InspectArgs = { mode: "batch", context: "default" }
  const seen = new Set<string>()
  for (let index = 0; index < args.length; index++) {
    const item = args[index]
    if (!item.startsWith("--")) {
      if (result.url) throw new Error("/inspect accepts only one URL")
      result.url = item
      continue
    }
    const match = item.match(/^--(model|mode|context)(?:=|:)(.*)$/)
    const name = match?.[1] ?? item.slice(2)
    const next = match?.[2] || args[++index]
    if (seen.has(name)) throw new Error(`Duplicate --${name}`)
    seen.add(name)
    if (!next || next.startsWith("--")) throw new Error(`--${name} needs a value`)
    if (name === "model") result.model = value(next)
    else if (name === "mode" && (next === "batch" || next === "quick")) result.mode = next
    else if (name === "context" && (next === "default" || next === "fork")) result.context = next
    else throw new Error(`Invalid --${name} value: ${next}`)
  }
  if (result.model && result.context === "default") result.warning = `Model ${result.model.providerID}/${result.model.modelID} will change the current session model.`
  return result
}
