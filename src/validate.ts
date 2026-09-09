import type { Annotation, Batch, Delivery, Viewport } from "./types.js"

const text = (value: unknown, max: number) => typeof value === "string" ? value.slice(0, max) : ""
const number = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : 0

function viewport(value: unknown): Viewport {
  const item = value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {}
  return {
    label: text(item.label, 100) || "Viewport",
    width: Math.min(7_680, Math.max(320, Math.round(number(item.width)))),
    height: Math.min(4_320, Math.max(320, Math.round(number(item.height)))),
  }
}

function annotation(value: unknown): Annotation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const item = value as Record<string, unknown>
  const request = text(item.request, 2_000).trim()
  const selector = text(item.selector, 1_000).trim()
  const xpath = text(item.xpath, 2_000).trim()
  if (!request || (!selector && !xpath)) return null
  const rect = item.rect && typeof item.rect === "object" ? item.rect as Record<string, unknown> : {}
  const attributes = item.attributes && typeof item.attributes === "object" && !Array.isArray(item.attributes)
    ? Object.fromEntries(Object.entries(item.attributes).slice(0, 20).map(([key, val]) => [key.slice(0, 100), text(val, 500)]))
    : {}
  const styles = item.styles && typeof item.styles === "object" && !Array.isArray(item.styles)
    ? Object.fromEntries(Object.entries(item.styles).slice(0, 30).map(([key, val]) => [key.slice(0, 100), text(val, 500)]))
    : {}
  return {
    request,
    page: text(item.page, 2_000),
    tag: text(item.tag, 100),
    id: item.id === null ? null : text(item.id, 500) || null,
    classes: Array.isArray(item.classes) ? item.classes.map((val) => text(val, 300)).filter(Boolean).slice(0, 50) : [],
    selector,
    xpath,
    pseudo: item.pseudo === "::before" || item.pseudo === "::after" ? item.pseudo : null,
    html: text(item.html, 1_200),
    text: text(item.text, 300),
    attributes,
    styles,
    rect: { x: number(rect.x), y: number(rect.y), width: number(rect.width), height: number(rect.height) },
    viewport: viewport(item.viewport),
    source: item.source === null ? null : text(item.source, 1_000) || null,
  }
}

export function batch(value: unknown): Batch | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null
  const input = value as Record<string, unknown>
  if (!Array.isArray(input.annotations) || input.annotations.length === 0 || input.annotations.length > 50) return null
  const annotations = input.annotations.map(annotation)
  if (annotations.some((item) => !item)) return null
  const viewports = Array.isArray(input.viewports)
    ? input.viewports.slice(0, 100).map(viewport).filter((item, index, list) => list.findIndex((other) => other.width === item.width && other.height === item.height) === index).slice(0, 20)
    : []
  const delivery: Delivery = input.delivery === "subagent-context" || input.delivery === "subagent-fresh" ? input.delivery : "main"
  return { target: text(input.target, 2_000), viewports, delivery, annotations: annotations as Annotation[] }
}
