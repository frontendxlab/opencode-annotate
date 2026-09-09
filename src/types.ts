export type Pseudo = "::before" | "::after" | null

export type Viewport = {
  label: string
  width: number
  height: number
}

export type Delivery = "main" | "subagent-context" | "subagent-fresh"

export type Annotation = {
  request: string
  page: string
  tag: string
  id: string | null
  classes: string[]
  selector: string
  xpath: string
  pseudo: Pseudo
  html: string
  text: string
  attributes: Record<string, string>
  styles: Record<string, string>
  rect: { x: number; y: number; width: number; height: number }
  viewport: Viewport
  source: string | null
}

export type Batch = {
  target: string
  viewports: Viewport[]
  delivery: Delivery
  annotations: Annotation[]
}

export type LiveState = "submitting" | "working" | "succeeded" | "failed" | "cancelled"

export type LiveRequest = {
  requestID: string
  target: string
  viewports: Viewport[]
  delivery: Delivery
  annotations: [Annotation]
}

export type Browser = {
  bin: string
  args: string[]
  name: string
}

export type BrowserControl = {
  ready: Promise<void>
  resize(width: number, height: number): Promise<Viewport>
  close(): Promise<void>
}

export type Handle = {
  port: number
  url: string
  stop(): Promise<void>
  attach(control: BrowserControl): void
}
