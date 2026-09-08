import type { Batch } from "./types.js"

export function prompt(batch: Batch) {
  const items = batch.annotations.map((item, index) => [
    `## Annotation ${index + 1}`,
    `Requested change: ${item.request}`,
    `Page: ${item.page}`,
    `Target: ${item.selector}${item.pseudo ?? ""}`,
    `XPath fallback: ${item.xpath}`,
    item.source ? `Source hint: ${item.source}` : null,
    item.id ? `ID: ${item.id}` : null,
    item.classes.length ? `Classes: ${item.classes.join(" ")}` : null,
    `Bounds: ${Math.round(item.rect.width)}x${Math.round(item.rect.height)} at ${Math.round(item.rect.x)},${Math.round(item.rect.y)}`,
    `Text: ${item.text || "(none)"}`,
    `Relevant computed styles: ${JSON.stringify(item.styles)}`,
    "HTML:",
    "```html",
    item.html,
    "```",
  ].filter(Boolean).join("\n"))

  return [
    "Implement the following visual annotations in this project.",
    "Use selector, XPath, HTML, source hints, and nearby text only to locate the source component. Do not edit generated DOM or add these selectors unless the requested change requires it.",
    "Apply all annotations as one coherent change, preserve existing design patterns, and verify the affected frontend.",
    "",
    ...items,
  ].join("\n\n")
}
