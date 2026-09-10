import type { Batch, LiveState } from "./types.js"

export type LiveEvent = { id: number; state: LiveState; error?: string }
export type LiveJob = { accept(): void; busy(): void; activity(): void; idle(): void; fail(reason: unknown): void }
type Job = { id: string; state: LiveState; events: LiveEvent[]; listeners: Set<(event: LiveEvent) => void>; accepted: boolean; work: boolean; idle: boolean; timer: ReturnType<typeof setTimeout> }
type Options = { timeout?: number }

const limit = 2_000
const terminal = (state: LiveState) => state === "succeeded" || state === "failed" || state === "cancelled"

function message(value: unknown) {
  const text = value instanceof Error ? value.message : String(value)
  return text.slice(0, limit) || "Live change failed"
}

export function live(submit: (value: Batch) => Promise<void>, options: Options = {}) {
  const jobs = new Map<string, Job>()
  let current: Job | undefined
  let sequence = 0
  let active = false

  const emit = (job: Job, state: LiveState, reason?: unknown) => {
    if (terminal(job.state)) return
    job.state = state
    const event: LiveEvent = { id: ++sequence, state, ...(reason === undefined ? {} : { error: message(reason) }) }
    job.events.push(event)
    job.listeners.forEach((listener) => listener(event))
    if (terminal(state)) {
      clearTimeout(job.timer)
      active = false
      if (current === job) current = undefined
    }
  }

  const update = (job: Job | undefined, kind: "busy" | "activity" | "idle" | "error", reason?: unknown) => {
    if (!job || terminal(job.state)) return
    if (kind === "error") {
      emit(job, "failed", reason)
      return
    }
    if (kind === "busy" || kind === "activity") {
      job.work = true
      if (kind === "busy" && job.state !== "working") emit(job, "working")
      return
    }
    job.idle = true
    if (job.accepted && job.work) emit(job, "succeeded")
  }

  const observe = (kind: "busy" | "activity" | "idle" | "error", reason?: unknown) => {
    update(current, kind, reason)
  }

  const create = (id: string, value: Batch) => {
    const old = jobs.get(id)
    if (old) return { state: old.state }
    if (active) throw new Error("A live change is already active")
    const job = {} as Job
    job.id = id
    job.state = "submitting"
    job.events = []
    job.listeners = new Set()
    job.accepted = false
    job.work = false
    job.idle = false
    job.timer = setTimeout(() => emit(job, "failed", "Live change timed out"), options.timeout ?? 10 * 60_000)
    jobs.set(id, job)
    current = job
    active = true
    emit(job, "submitting")
    const handle: LiveJob = {
      accept: () => {
        job.accepted = true
        if (job.idle && job.work) emit(job, "succeeded")
      },
      busy: () => update(job, "busy"),
      activity: () => update(job, "activity"),
      idle: () => update(job, "idle"),
      fail: (reason) => update(job, "error", reason),
    }
    void submit(value).then(handle.accept).catch((reason) => handle.fail(reason))
    return { state: job.state }
  }

  const status = (id: string, after = 0) => {
    const job = jobs.get(id)
    if (!job) return null
    return { requestID: id, state: job.state, events: job.events.filter((event) => event.id > after), error: job.events.at(-1)?.error }
  }

  const listen = (id: string, after: number, listener: (event: LiveEvent) => void) => {
    const job = jobs.get(id)
    if (!job) return null
    if (!terminal(job.state)) job.listeners.add(listener)
    return () => job.listeners.delete(listener)
  }

  const cancel = (id: string) => {
    const job = jobs.get(id)
    if (!job) return false
    emit(job, "cancelled", "Client tracking cancelled")
    return true
  }

  const stop = () => {
    jobs.forEach((job) => emit(job, "cancelled", "Inspector stopped"))
    jobs.clear()
    current = undefined
    active = false
  }

  return { create, status, listen, cancel, stop, observe, get active() { return active } }
}
