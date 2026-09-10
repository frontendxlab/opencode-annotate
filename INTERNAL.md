# OpenCode Visual Inspector Internal Guide

## Purpose

`opencode-visual-inspector` opens a local browser inspector for a reachable web application. It captures rendered element context, viewport dimensions, pseudo-element targets, and a bounded description of the requested change.

The published package also exposes `bin/opencode-visual-inspector.mjs`. `npx` and `pnpm dlx` run its interactive installer, which detects V1, V2, and desktop availability, updates global or project configuration, backs up existing files, and optionally verifies Chrome or Chromium against a local smoke page.

The package has isolated adapters:

- V2 package root: `@frontendxlab/opencode-visual-inspector`
- V1 adapter: `@frontendxlab/opencode-visual-inspector/v1`

## Entry points

V2 uses `@opencode/plugin` and registers `/inspect`, `/inpect`, and `visual.inspect`. V1 uses `@opencode-ai/plugin` and registers `visual_inspect`. V1 command registration is supplied separately through `commands/inspect.md`.

The installer uses the native V2 plugin command for global setup when `opencode2` is available. It writes the V1 `plugin` list with the `/v1` package export because that adapter is a package subpath, not a standalone npm package. Desktop V2 uses the same user configuration as the V2 CLI. It never edits the OpenCode executable, desktop bundle, or browser installation.

## Argument contract

`src/args.ts` is the shared parser. It accepts one optional URL and these options:

```text
--model provider/model-id
--mode batch|quick
--context default|fork
--screenshot
--no-screenshot
```

Equals and colon forms are supported. Defaults are `mode=batch`, `context=default`, and `screenshot=false`. `--screenshot` and `--no-screenshot` are valueless flags, each may appear once, and the later one wins. Duplicate options, invalid enum values, malformed model identifiers, and multiple URLs fail before browser launch. A model with `context=default` produces a warning for the inspector UI.

The parser and warning are implemented in both adapters. The host-specific action of switching a model or creating a fork must remain aligned with the installed OpenCode session API. Do not document those actions as complete until adapter-level tests prove them.

## Browser client

`src/client.ts` is a self-contained generated browser script. The proxy replaces target, token, mode, and warning placeholders before injection. The UI uses an open Shadow DOM host, accessible toolbar and dialogs, focus restoration, keyboard annotation, forced-colors support, reduced motion, and narrow viewport reflow.

The inspector is on by default. Turning it off restores normal page interaction. The `quick` mode hides Add to batch and leaves Change live as the available annotation action.

## Delivery

Batch delivery uses `main`, `subagent-context`, or `subagent-fresh`. Live delivery uses the live state service and authenticated SSE. Live success requires accepted submission plus observed activity or busy state followed by idle. Cancellation stops tracking and does not claim to cancel the remote agent.

## Screenshots

Capture uses CDP `Page.captureScreenshot` (PNG) against the already launched Chrome instance, so no second browser is opened. `src/browser.ts` hides the `#__oc-inspector` overlay element before capture and restores its visibility afterwards, so the toolbar and annotation UI never appear in the image.

The flow is opt-in per session and per submission:

1. `--screenshot` (or the `screenshot: true` tool input) stores `screenshot=true` in the parsed options, and the injected client also renders an Attach screenshot toggle that sends its own state.
2. On submission, the client posts `screenshot: true` alongside the annotations on both the batch and the live change endpoints.
3. `src/proxy.ts` runs `capture(force)`: it returns null unless the option is enabled or the request explicitly asks, otherwise it calls the attached `BrowserControl.screenshot()` and wraps the base64 payload as `Shot = { mime, data }`. Any capture error is caught and returns null, so a failed screenshot never blocks submission.
4. The proxy assigns the captured shot to `batch.shots`, which is the optional `shots` field on the `Batch` type.
5. The adapter attaches the image: V2 (`src/index.ts`) passes `files[]` entries with `uri: data:<mime>;base64,<data>` to `ctx.session.prompt`; V1 (`src/v1.ts`) appends file parts with `url: data:<mime>;base64,<data>` and the same mime and filename fields.

The default browser fallback (`xdg-open` or `open`) has no CDP control, so `BrowserControl.screenshot()` throws there; the proxy swallows the error and submits without an image.

## Proxy and security

The proxy binds to loopback on a random port. Control endpoints require the generated `x-opencode-inspector` token and a validated Host header. Requests and HTML responses are bounded. Hop-by-hop and sensitive authorization headers are removed. Target-scoped cookies support same-origin login flows. Cross-origin redirects are rejected.

Target policy allows loopback by default. Private and public targets require independent exact environment opt-ins:

```sh
OPENCODE_INSPECT_ALLOW_PRIVATE=1
OPENCODE_INSPECT_ALLOW_PUBLIC=1
```

The injected client executes in the target document. This is a same-document trust boundary, not an isolated browser world. Only inspect applications the developer controls.

## Lifecycle

The client sends a heartbeat every five seconds. The proxy expires after 30 seconds without a heartbeat. Exit and Close browser send an authenticated close action. Session replacement, deletion, plugin teardown, and orphan expiry stop active proxies and live streams.

## Testing

Run from this package directory, never the monorepo root:

```sh
bun test
bun run typecheck
npm pack --dry-run
git diff --check
```

Tests cover argument parsing, client contract generation, proxy limits and authentication, trust policy, browser CDP resizing, live states, prompt construction, URL detection, V1 behavior, and V2 behavior.

## Release checklist

1. Run the complete test suite and typecheck.
2. Verify the package includes `src`, `commands`, `README.md`, and `LICENSE`.
3. Verify V1 and V2 installation from a clean project.
4. Verify `/inspect`, `/inpect`, `visual.inspect`, and `visual_inspect`.
5. Verify loopback defaults and private/public opt-ins.
6. Verify browser cleanup and viewport behavior with real Chromium.
7. Update the public docs page and deploy `docs/` to the `opencode-annotate` Cloudflare Pages project if documentation changes.
8. Push the release commit and update the global plugin installation.
