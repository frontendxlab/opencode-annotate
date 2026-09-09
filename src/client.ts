export const client = String.raw`(() => {
  if (window.__ocInspect) return;
  window.__ocInspect = true;

  const app = __OC_TARGET__;
  const token = __OC_TOKEN__;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const copy = {
     inspect:"Inspect", toolbar:"OpenCode visual inspector", noAnnotations:"No annotations", annotation:"annotation", annotations:"annotations", clear:"Clear", send:"Send to OpenCode", exit:"Exit inspector", addToBatch:"Add to batch", inspectOn:"Inspect mode on. Focus a page element and press Alt+Shift+I to annotate.", inspectOff:"Inspect mode off. Page interactions restored.", added:"Annotation added to batch.", sendingStatus:"Sending annotations.", sentStatus:"Annotations sent.", retryStatus:"Sending failed. Retry.", actualViewport:"Viewport is now {width} by {height}.",
    viewport:"Viewport", current:"Current", custom:"Custom", desktop:"Desktop", laptop:"Laptop", iphone:"iPhone 16 Pro", pixel:"Pixel 9", width:"Width", height:"Height", apply:"Apply size",
    describe:"Describe the change", target:"Target", change:"Requested change", placeholder:"For example, make this button quieter and more compact",
    cancel:"Cancel", add:"Add annotation", missing:"Describe the requested change first.", element:"Element",
    sending:"Sending...", retry:"Retry", chooseDelivery:"Send annotations", chooseDeliveryBody:"Who should implement this batch?", chooseLiveDeliveryBody:"Who should apply this live change?",
    main:"Main agent", mainHelp:"Use the active agent and its current context.", context:"Subagent with context", contextHelp:"Pass relevant session and project context to a subagent.",
    fresh:"Fresh subagent", freshHelp:"Start with only the annotation batch and project files.", sent:"Annotations sent", sentBody:"What would you like to do next?",
     closeWindow:"Close browser window", continue:"Continue annotating", sizeError:"Enter a width from 320 to 7680 and a height from 320 to 4320.", viewportUnavailable:"Viewport control is unavailable in the default browser.", viewportFailed:"Viewport resize failed.",
    chatTitle:"Annotate element", changeLive:"Change live", liveLogLabel:"Annotation activity", liveSending:"Sending live change...", liveWorking:"Working on the change...", liveApplied:"Change applied. Reloading page...", liveFailed:"Live change failed", liveCancelled:"Live change cancelled", applied:"Change applied. Page reloaded.", cancelTrack:"Stop tracking", liveMissing:"Describe the change before requesting it live."
  };
  const t = (key) => copy[key] || key;
  const host = document.createElement("div");
  host.id = "__oc-inspector";
  const root = host.attachShadow({ mode: "open" });
   root.innerHTML = '<style></style><div class="box" aria-hidden="true"></div><div class="bar" role="toolbar"><span class="brand"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 13.6 4.7v6.6L8 14.5l-5.6-3.2V4.7L8 1.5Zm0 2.1L4.2 5.8v4.4L8 12.4l3.8-2.2V5.8L8 3.6Z"/></svg><span data-copy="inspect"></span></span><button class="inspect secondary" type="button" data-copy="inspect"></button><button class="view secondary" type="button"><svg viewBox="0 0 16 16" aria-hidden="true"><rect x="2.5" y="3" width="11" height="8" rx="1.2"/><path d="M6 13h4"/></svg><span class="view-label"></span></button><span class="count" aria-live="polite" data-copy="noAnnotations"></span><span class="rule"></span><button class="clear secondary" type="button" disabled data-copy="clear"></button><button class="send primary" type="button" disabled data-copy="send"></button><button class="exit icon" type="button"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4.3 4.3 7.4 7.4m0-7.4-7.4 7.4"/></svg></button><span class="status" role="status" aria-live="polite" aria-atomic="true"></span></div><section class="chat" role="region" hidden><div class="chat-head"><div class="title" data-copy="chatTitle"></div><div class="meta"></div><span class="target-label" data-copy="target"></span><div class="targets"></div></div><div class="log" role="log" aria-live="polite" aria-relevant="additions text"></div><div class="composer"><label for="oc-change" data-copy="change"></label><textarea id="oc-change" rows="1" aria-describedby="oc-change-error"></textarea><div class="error" id="oc-change-error" role="alert" hidden></div><div class="chat-actions"><button class="cancel secondary" type="button" data-copy="cancel"></button><button class="add secondary" type="button" data-copy="addToBatch"></button><button class="live primary" type="button" data-copy="changeLive"></button></div></div></section>';
  const css = function(){/*
    :host{all:initial;position:fixed;inset:0;z-index:2147483644;pointer-events:none;color-scheme:dark;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;line-height:1.4;-webkit-font-smoothing:antialiased;--spring:linear(0,0.008 1.1%,0.032 2.2%,0.123 4.7%,0.318 7.6%,0.607 11%,0.835 14.2%,0.944 16.2%,1.018 18.6%,1.05 21.5%,1.052 24.5%,1.033 28.2%,1.007 33%,0.994 38.7%,0.993 46.4%,1.001 61%,1);--out:cubic-bezier(.23,1,.32,1);--panel:rgba(24,24,27,.92);--panel-solid:#18181b;--raised:#27272a;--line:rgba(255,255,255,.11);--muted:#a1a1aa;--text:#fafafa;--accent:#fff;--accent-text:#18181b}
    *{box-sizing:border-box}
    button,textarea,input{font:inherit}
    .box{display:none;position:fixed;left:0;top:0;pointer-events:none;border:2px solid #60a5fa;background:rgba(96,165,250,.11);box-shadow:0 0 0 1px rgba(255,255,255,.2) inset,0 3px 14px rgba(37,99,235,.18);z-index:1;contain:strict;transition:opacity 120ms var(--out)}
    .bar{position:fixed;left:50%;bottom:18px;display:flex;align-items:center;gap:8px;min-height:44px;padding:6px 7px 6px 11px;color:var(--text);background:var(--panel);border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.3),0 2px 8px rgba(0,0,0,.24),0 1px 0 rgba(255,255,255,.08) inset;backdrop-filter:blur(22px) saturate(160%);-webkit-backdrop-filter:blur(22px) saturate(160%);pointer-events:auto;z-index:3;opacity:0;filter:blur(4px);transform:translate3d(-50%,12px,0) scale(.97);transition:transform 320ms var(--spring),opacity 180ms var(--out),filter 180ms var(--out);will-change:transform,opacity,filter}
    .bar.open{opacity:1;filter:none;transform:translate3d(-50%,0,0) scale(1)}
    .brand{display:flex;align-items:center;gap:7px;padding-right:2px;font-weight:620;letter-spacing:-.01em;white-space:nowrap}
    .brand svg{width:16px;height:16px;fill:currentColor}
    .view{gap:6px;color:var(--muted);font-variant-numeric:tabular-nums}
    .view svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:1.35;stroke-linecap:round}
    .count{min-width:80px;color:var(--muted);font-size:12px;white-space:nowrap;font-variant-numeric:tabular-nums}
    .rule{width:1px;height:20px;background:var(--line)}
    button{display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 11px;color:var(--text);background:transparent;border:0;border-radius:8px;cursor:pointer;pointer-events:auto;transition:transform 140ms var(--spring),background-color 140ms var(--out),color 140ms var(--out),opacity 140ms var(--out)}
    button:hover:not(:disabled){background:rgba(255,255,255,.09)}
    button:active:not(:disabled){transform:scale(.965)}
    button:focus-visible,textarea:focus-visible,input:focus-visible{outline:2px solid #60a5fa;outline-offset:2px}
    button:disabled{opacity:.38;cursor:not-allowed}
    .primary{color:var(--accent-text);background:var(--accent);font-weight:610}
    .primary:hover:not(:disabled){background:#e4e4e7}
    .icon{width:32px;padding:0;color:var(--muted)}
     .icon svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round}
     .status{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
    .chat{position:fixed;left:50%;bottom:76px;z-index:3;display:none;flex-direction:column;width:min(390px,calc(100vw - 24px));max-height:calc(100vh - 130px);color:var(--text);background:var(--panel);border:1px solid var(--line);border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.38),0 4px 14px rgba(0,0,0,.25),0 1px 0 rgba(255,255,255,.08) inset;backdrop-filter:blur(24px) saturate(150%);-webkit-backdrop-filter:blur(24px) saturate(150%);pointer-events:auto;opacity:0;filter:blur(4px);transform:translate3d(-50%,8px,0) scale(.965);transition:transform 280ms var(--spring),opacity 160ms var(--out),filter 180ms var(--out);will-change:transform,opacity,filter;overflow:hidden}
    .chat.open{display:flex;opacity:1;filter:none;transform:translate3d(-50%,0,0) scale(1)}
    .chat.closing{opacity:0;filter:blur(2px);transform:translate3d(-50%,3px,0) scale(.985);transition-duration:120ms}
    .chat-head{padding:12px 14px 10px;border-bottom:1px solid var(--line)}
    .chat .title{font-size:14px;font-weight:650;letter-spacing:-.012em}
    .chat .meta{margin-top:3px;color:#93c5fd;font:11px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .chat .target-label{display:block;margin:10px 0 6px;color:var(--muted);font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
    .log{flex:1 1 auto;min-height:0;overflow-y:auto;display:none;flex-direction:column;gap:8px;padding:10px 14px;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.2) transparent}
    .log.open{display:flex}
    .entry{padding:8px 10px;background:rgba(255,255,255,.055);border:1px solid var(--line);border-radius:10px 10px 10px 3px;font-size:12.5px;line-height:1.45;word-break:break-word;overflow-wrap:anywhere}
    .entry small{display:block;margin-top:3px;color:var(--muted);font:11px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;font-variant-numeric:tabular-nums}
    .state{font-size:12px;color:var(--muted);padding:2px 2px 0}
    .state.err{color:#fca5a5}
    .state.ok{color:#86efac}
    .state .live-cancel{height:26px;margin-top:4px;padding:0 8px;font-size:11px}
    .composer{border-top:1px solid var(--line);padding:10px 14px 12px}
    .composer label[for=oc-change]{display:block;margin-bottom:6px;color:var(--muted);font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
    .composer textarea{display:block;width:100%;height:auto;min-height:40px;max-height:132px;padding:10px 11px;color:var(--text);caret-color:#93c5fd;background:rgba(9,9,11,.62);border:1px solid var(--line);border-radius:9px;resize:none;overflow-y:auto;transition:border-color 140ms var(--out),box-shadow 140ms var(--out)}
    .chat-actions{display:flex;justify-content:space-between;gap:6px;margin-top:10px;flex-wrap:wrap}
    .chat-actions .cancel{margin-right:auto}
    .dialog{position:fixed;z-index:4;width:min(390px,calc(100vw - 24px));max-height:calc(100vh - 24px);overflow:auto;padding:15px;color:var(--text);background:var(--panel);border:1px solid var(--line);border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.38),0 4px 14px rgba(0,0,0,.25),0 1px 0 rgba(255,255,255,.08) inset;backdrop-filter:blur(24px) saturate(150%);-webkit-backdrop-filter:blur(24px) saturate(150%);pointer-events:auto;opacity:0;filter:blur(4px);transform:translateY(8px) scale(.965);transition:transform 280ms var(--spring),opacity 160ms var(--out),filter 180ms var(--out);will-change:transform,opacity,filter}
    .dialog.open{opacity:1;filter:none;transform:translateY(0) scale(1)}
    .dialog.closing{opacity:0;filter:blur(2px);transform:translateY(3px) scale(.985);transition-duration:120ms}
    .title{font-size:14px;font-weight:650;letter-spacing:-.012em}
    .meta{margin-top:3px;color:#93c5fd;font:11px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .target-label{display:block;margin:13px 0 6px;color:var(--muted);font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
    .targets{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
    .targets button{height:28px;padding:0 9px;color:var(--muted);background:rgba(255,255,255,.055);border:1px solid transparent;font:11px ui-monospace,SFMono-Regular,Consolas,monospace}
    .targets button[aria-pressed=true]{color:var(--text);background:rgba(96,165,250,.15);border-color:rgba(96,165,250,.38)}
    .presets{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin:12px 0}
    .size{max-height:calc(100vh - 88px)}
    .presets button{height:auto;min-height:44px;align-items:flex-start;flex-direction:column;padding:7px 9px;color:var(--text);background:rgba(255,255,255,.055);border:1px solid transparent}
    .presets small{color:var(--muted);font-size:11px;font-variant-numeric:tabular-nums}
    .custom{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}
    .custom label{color:var(--muted);font-size:11px}
    .custom input{display:block;width:100%;height:34px;margin-top:5px;padding:0 9px;color:var(--text);background:rgba(9,9,11,.62);border:1px solid var(--line);border-radius:8px;font-variant-numeric:tabular-nums}
    label[for=oc-change]{display:block;margin-bottom:6px;color:var(--muted);font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
    textarea{display:block;width:100%;height:92px;padding:10px 11px;color:var(--text);caret-color:#93c5fd;background:rgba(9,9,11,.62);border:1px solid var(--line);border-radius:9px;resize:vertical;transition:border-color 140ms var(--out),box-shadow 140ms var(--out)}
    textarea::placeholder{color:#71717a}
    textarea:focus{border-color:rgba(96,165,250,.52);box-shadow:0 0 0 3px rgba(59,130,246,.11);outline:none}
    .actions{display:flex;justify-content:flex-end;gap:6px;margin-top:12px}
    .error{margin-top:8px;color:#fca5a5;font-size:12px}
    .scrim{position:fixed;inset:0;z-index:3;background:rgba(0,0,0,.38);pointer-events:auto;opacity:0;transition:opacity 160ms var(--out)}
    .scrim.open{opacity:1}
    .decision{left:50%;top:50%;text-align:left;transform:translate(-50%,-50%) scale(.965)}
    .decision.open{transform:translate(-50%,-50%) scale(1)}
    .body{margin-top:6px;color:var(--muted)}
    .choices{display:grid;gap:7px;margin-top:13px}
    .choices button{height:auto;min-height:50px;align-items:flex-start;flex-direction:column;padding:8px 10px;color:var(--text);background:rgba(255,255,255,.055);border:1px solid transparent;text-align:left}
    .choices button:hover{border-color:rgba(255,255,255,.12)}
    .choices small{color:var(--muted);font-size:11px;font-weight:400}
    @media(prefers-reduced-motion:reduce){.bar,.dialog,.chat,.box,.scrim,button{transition-duration:.01ms!important;transform:none}.bar{transform:translateX(-50%)}.bar.open{transform:translateX(-50%)}.dialog,.chat{filter:none}.chat{transform:translateX(-50%)}.chat.open{transform:translateX(-50%)}.decision,.decision.open{transform:translate(-50%,-50%)}}
    @media(prefers-reduced-transparency:reduce){:host{--panel:#18181b}.bar,.dialog,.chat{backdrop-filter:none;-webkit-backdrop-filter:none}}
    @media(prefers-contrast:more){:host{--panel:#09090b;--line:rgba(255,255,255,.35)}.box{background:transparent;border-color:#93c5fd}}
     @media(forced-colors:active){:host{--panel:Canvas;--line:CanvasText;--muted:CanvasText;--text:CanvasText;--accent:Highlight;--accent-text:HighlightText}.bar,.dialog,.chat{backdrop-filter:none;-webkit-backdrop-filter:none;box-shadow:none}.box{background:transparent;border-color:Highlight}button:focus-visible,textarea:focus-visible,input:focus-visible{outline-color:Highlight}.entry,.log{background:Canvas;border-color:CanvasText}}
     @media(max-width:720px){.bar{bottom:10px;max-width:calc(100vw - 16px);flex-wrap:wrap;justify-content:center}.brand>span{display:none}.brand svg{width:18px;height:18px}.rule{display:none}.clear{display:none}.view-label{max-width:76px;overflow:hidden;text-overflow:ellipsis}.actions{flex-wrap:wrap}.actions button{min-height:40px}.chat{bottom:116px;max-height:calc(100vh - 170px)}.chat-actions button{min-height:40px}}
    @media(max-width:480px){.count{display:none}.chat{width:calc(100vw - 16px)}}
  */}.toString();
  root.querySelector("style").textContent = css.slice(css.indexOf("/*") + 2, css.lastIndexOf("*/"));
  const fill = (node) => {
    node.querySelectorAll("[data-copy]").forEach((item) => { item.textContent = t(item.dataset.copy); });
  };
  fill(root);
  root.querySelector(".bar").setAttribute("aria-label", t("toolbar"));
  root.querySelector(".exit").setAttribute("aria-label", t("exit"));
  document.documentElement.append(host);

  const box = root.querySelector(".box");
  const bar = root.querySelector(".bar");
  const count = root.querySelector(".count");
  const clear = root.querySelector(".clear");
   const send = root.querySelector(".send");
   const toggle = root.querySelector(".inspect");
   const status = root.querySelector(".status");
  const view = root.querySelector(".view");
  const viewLabel = root.querySelector(".view-label");
  const chat = root.querySelector(".chat");
  const chatMeta = chat.querySelector(".meta");
  const chatTargets = chat.querySelector(".targets");
  const chatLog = chat.querySelector(".log");
  const chatError = chat.querySelector(".error");
  const chatInput = chat.querySelector("textarea");
  const chatCancel = chat.querySelector(".composer .cancel");
  const chatAdd = chat.querySelector(".composer .add");
  const chatLive = chat.querySelector(".composer .live");
  chat.setAttribute("aria-label", t("chatTitle"));
  chatLog.setAttribute("aria-label", t("liveLogLabel"));
   chatInput.placeholder = t("placeholder");
   chatInput.addEventListener("input", () => { rows(); beat("activity"); });
  const notes = [];
  const views = [];
  const presets = [
    { label:t("desktop"), width:1440, height:900 },
    { label:t("laptop"), width:1280, height:800 },
    { label:t("iphone"), width:393, height:852 },
    { label:t("pixel"), width:412, height:915 },
  ];
  let active = { label:t("current"), width:innerWidth, height:innerHeight };
  let dialog = null;
  let overlay = null;
  let prior = null;
  let frame = 0;
   let hovered = null;
   let enabled = true;
   let pending = false;
  let target = null;
  let selected = null;
   let live = { id: null, state: "idle", after: 0, ctrl: null };
    let last = null;
   let delivery = "main";
   const storageKey = "__oc_inspect_live_" + token;
  let beatTimer = 0;
    const beat = (action) => { try { return fetch("/__opencode_inspect/lifecycle", { method:"POST", headers:{ "content-type":"application/json", "x-opencode-inspector":token }, body:JSON.stringify({ action }) }).catch(() => null); } catch { return Promise.resolve(null); } };
  void beat("heartbeat");
  beatTimer = setInterval(() => { void beat("heartbeat"); }, 5000);

  requestAnimationFrame(() => bar.classList.add("open"));
  viewLabel.textContent = active.width + "×" + active.height;
  view.setAttribute("aria-label", t("viewport"));
  view.setAttribute("aria-haspopup", "dialog");
  view.setAttribute("aria-expanded", "false");
  send.setAttribute("aria-haspopup", "dialog");
   send.setAttribute("aria-expanded", "false");
   toggle.setAttribute("aria-pressed", "true");
   toggle.setAttribute("aria-label", t("inspectOn"));
   const announce = (key) => { status.textContent = t(key); };

  const escape = (value) => CSS.escape(String(value));
  const unique = (value) => { try { return document.querySelectorAll(value).length === 1; } catch { return false; } };
  const selector = (el) => {
    if (el.id && unique("#" + escape(el.id))) return "#" + escape(el.id);
    for (const name of ["data-testid", "data-test", "data-component", "aria-label"]) {
      const value = el.getAttribute(name);
      if (value) { const hit = "[" + name + '=\"' + escape(value) + '\"]'; if (unique(hit)) return hit; }
    }
    const parts = [];
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      let part = node.tagName.toLowerCase();
      const classes = [...node.classList].filter((name) => !/[0-9]{5,}/.test(name)).slice(0, 2);
      if (classes.length) part += classes.map((name) => "." + escape(name)).join("");
      const siblings = node.parentElement ? [...node.parentElement.children].filter((item) => item.tagName === node.tagName) : [];
      if (siblings.length > 1) part += ":nth-of-type(" + (siblings.indexOf(node) + 1) + ")";
      parts.unshift(part);
      const hit = parts.join(" > ");
      if (unique(hit)) return hit;
    }
    return parts.join(" > ");
  };
  const xpath = (el) => {
    const parts = [];
    for (let node = el; node && node.nodeType === 1; node = node.parentElement) {
      const same = node.parentElement ? [...node.parentElement.children].filter((item) => item.tagName === node.tagName) : [node];
      parts.unshift(node.tagName.toLowerCase() + (same.length > 1 ? "[" + (same.indexOf(node) + 1) + "]" : ""));
    }
    return "/" + parts.join("/");
  };
  const pseudo = (el, name) => {
    const content = getComputedStyle(el, name).content;
    return content && content !== "none" && content !== "normal" && content !== '\"\"' && content !== "''";
  };
  const source = (el) => {
    const attr = ["data-source", "data-source-file", "data-loc", "data-component"].map((key) => el.getAttribute(key)).find(Boolean);
    if (attr) return attr;
    const vue = el.__vueParentComponent?.type?.__file;
    if (vue) return vue;
    const key = Object.keys(el).find((name) => name.startsWith("__reactFiber$"));
    for (let fiber = key ? el[key] : null; fiber; fiber = fiber.return) {
      const hit = fiber._debugSource;
      if (hit?.fileName) return hit.fileName + (hit.lineNumber ? ":" + hit.lineNumber : "");
    }
    return null;
  };
  const shape = (el, target = null) => {
    const css = target ? getComputedStyle(el, target) : getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    Object.assign(box.style, {
      display: rect.width || rect.height ? "block" : "none",
      transform: "translate3d(" + rect.left + "px," + rect.top + "px,0)",
      width: rect.width + "px",
      height: rect.height + "px",
      borderRadius: css.borderRadius || "0px",
    });
  };
  const refresh = () => {
    count.textContent = notes.length ? notes.length + " " + t(notes.length === 1 ? "annotation" : "annotations") : t("noAnnotations");
    clear.disabled = notes.length === 0;
    send.disabled = notes.length === 0;
    if (!reduce.matches && notes.length) count.animate([{ opacity:.45, transform:"translateY(2px)" }, { opacity:1, transform:"translateY(0)" }], { duration:180, easing:"cubic-bezier(.23,1,.32,1)" });
  };
   const close = (instant = false) => {
     if (!dialog) return;
    const item = dialog;
    const shade = overlay;
     const focus = prior;
    dialog = null;
    overlay = null;
    prior = null;
    view.setAttribute("aria-expanded", "false");
    send.setAttribute("aria-expanded", "false");
    if (instant || reduce.matches) {
      item.remove();
      shade?.remove();
      box.style.display = "none";
       (focus?.isConnected ? focus : toggle)?.focus?.({ preventScroll:true });
      return;
    }
    item.classList.add("closing");
    shade?.classList.remove("open");
    setTimeout(() => { item.remove(); shade?.remove(); }, 130);
    box.style.display = "none";
     (focus?.isConnected ? focus : toggle)?.focus?.({ preventScroll:true });
   };
    const chatClose = (restore = true) => { chat.hidden = true; chat.classList.remove("open"); chatLog.classList.remove("open"); chatTargets.replaceChildren(); chatInput.value = ""; chatError.hidden = true; box.style.display = "none"; if (restore) (prior?.isConnected ? prior : toggle).focus({ preventScroll:true }); };
   const rows = () => { chatInput.style.height = "auto"; chatInput.style.height = Math.min(132, Math.max(40, chatInput.scrollHeight)) + "px"; };
    const state = (value, error = "") => {
      if (!error && chatLog.lastElementChild?.dataset.state === value) return;
       live.state = value;
      if (value === "failed" || value === "cancelled") live.id = null;
      if (value !== "succeeded") sessionStorage.setItem(storageKey, JSON.stringify({ id:live.id, state:value, after:live.after }));
      const node = document.createElement("div");
      node.dataset.state = value;
      node.className = "state " + (value === "failed" ? "err" : value === "succeeded" ? "ok" : "");
     node.textContent = error || t(value === "submitting" ? "liveSending" : value === "working" ? "liveWorking" : value === "succeeded" ? "liveApplied" : value === "cancelled" ? "liveCancelled" : "liveFailed");
      if (value === "working" || value === "submitting") { const cancel = document.createElement("button"); cancel.type = "button"; cancel.className = "live-cancel secondary"; cancel.textContent = t("cancelTrack"); cancel.onclick = (event) => { if (!event.isTrusted) return; if (live.id) void fetch("/__opencode_inspect/change/" + encodeURIComponent(live.id) + "/cancel", { method:"POST", headers:{ "x-opencode-inspector":token } }).catch(() => {}); live.ctrl?.abort(); live.ctrl = null; state("cancelled"); }; node.append(" ", cancel); }
     chatLog.append(node); chatLog.classList.add("open"); chatLog.scrollTop = chatLog.scrollHeight;
      if (value === "succeeded") { sessionStorage.setItem(storageKey, JSON.stringify({ state:"applied" })); setTimeout(() => location.reload(), 0); }
      if (value === "failed" || value === "cancelled") { chatInput.disabled = false; chatLive.disabled = false; chatAdd.disabled = false; }
      if (value === "failed") { const retry = document.createElement("button"); retry.type = "button"; retry.className = "live-cancel secondary"; retry.textContent = t("retry"); retry.onclick = (event) => { if (event.isTrusted && last) void liveSend(last.request, last.delivery); }; node.append(" ", retry); }
   };
   const stream = async (id) => {
     const ctrl = new AbortController(); live.ctrl = ctrl;
     const res = await fetch("/__opencode_inspect/change/" + encodeURIComponent(id) + "?after=" + live.after, { headers:{ "accept":"text/event-stream", "x-opencode-inspector":token }, signal:ctrl.signal });
     if (!res.ok || !res.body) throw new Error(await res.text());
     const reader = res.body.getReader(); const decoder = new TextDecoder(); let buf = "";
      for (;;) { const item = await reader.read(); if (item.done) break; buf += decoder.decode(item.value, { stream:true }); const parts = buf.split("\n\n"); buf = parts.pop() || ""; for (const part of parts) { const idline = part.match(/(?:^|\n)id: (\d+)/); const data = part.match(/(?:^|\n)data: (.+)/); if (!data) continue; if (idline) live.after = Number(idline[1]); const value = JSON.parse(data[1]); state(value.state, value.error); if (value.state === "succeeded") return; } }
   };
    const liveSend = async (request, route) => {
      if (live.id || pending) return;
       close(true);
       pending = true; last = { request, delivery:route }; chatInput.disabled = true; chatLive.disabled = true; chatAdd.disabled = true; chatError.hidden = true;
     const id = crypto.randomUUID(); live = { id, state:"submitting", after:0, ctrl:null }; sessionStorage.setItem(storageKey, JSON.stringify({ id, state:"submitting", after:0 })); state("submitting");
       try { const res = await fetch("/__opencode_inspect/change", { method:"POST", headers:{ "content-type":"application/json", "x-opencode-inspector":token }, body:JSON.stringify({ requestID:id, target:app, viewports:[active], delivery:route, annotations:[request] }) }); if (!res.ok) throw new Error(await res.text()); const result = await res.json(); if (result.requestID !== id) throw new Error("Invalid live change response"); await stream(id); } catch (error) { if (live.state !== "cancelled") state("failed", error instanceof Error ? error.message : t("liveFailed")); } finally { pending = false; chatAdd.disabled = false; }
   };
  const modal = (title, body) => {
    close(true);
    prior = root.activeElement;
    overlay = document.createElement("div");
    overlay.className = "scrim";
    dialog = document.createElement("section");
    dialog.className = "dialog decision";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "oc-decision-title");
    dialog.setAttribute("aria-describedby", "oc-decision-body");
    dialog.innerHTML = '<div class="title" id="oc-decision-title"></div><div class="body" id="oc-decision-body"></div><div class="choices"></div><div class="actions"><button class="cancel secondary" type="button" data-copy="cancel"></button></div>';
    fill(dialog);
    dialog.querySelector(".title").textContent = title;
    dialog.querySelector(".body").textContent = body;
     dialog.querySelector(".cancel").onclick = (event) => { if (event.isTrusted) close(); };
    root.append(overlay, dialog);
    requestAnimationFrame(() => { overlay?.classList.add("open"); dialog?.classList.add("open"); });
    return dialog;
  };
  const choice = (node, title, body, run) => {
    const button = document.createElement("button");
    button.type = "button";
    button.innerHTML = "<span></span><small></small>";
    button.querySelector("span").textContent = title;
    button.querySelector("small").textContent = body;
    button.onclick = (event) => { if (event.isTrusted) run(); };
    node.querySelector(".choices").append(button);
    return button;
  };
  const remember = (item) => {
    if (!views.some((view) => view.width === item.width && view.height === item.height)) views.push(item);
  };
  const sync = () => {
    active = presets.find((item) => item.width === innerWidth && item.height === innerHeight) ?? { label:t("custom"), width:innerWidth, height:innerHeight };
    viewLabel.textContent = active.width + "×" + active.height;
  };
    const resize = async (item) => {
      const error = dialog?.querySelector(".error");
      try {
        const res = await fetch("/__opencode_inspect/viewport", { method:"POST", headers:{ "content-type":"application/json", "x-opencode-inspector":token }, body:JSON.stringify({ width:item.width, height:item.height }) });
        const value = await res.json();
        if (!res.ok || !value.actual || !Number.isInteger(value.actual.width) || !Number.isInteger(value.actual.height)) throw new Error(value.error || t("viewportFailed"));
        active = { label:item.label, width:value.actual.width, height:value.actual.height };
        remember(active);
        viewLabel.textContent = active.width + "×" + active.height;
        close(true);
        setTimeout(() => { sync(); status.textContent = t("actualViewport").replace("{width}", String(active.width)).replace("{height}", String(active.height)); }, 50);
      } catch (value) {
        if (error) { error.hidden = false; error.textContent = value instanceof Error && value.message.includes("unavailable") ? t("viewportUnavailable") : value instanceof Error ? value.message : t("viewportFailed"); }
      }
    };
  const sizes = () => {
    close(true);
    prior = view;
    view.setAttribute("aria-expanded", "true");
    dialog = document.createElement("section");
    dialog.className = "dialog size";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "oc-view-title");
    dialog.innerHTML = '<div class="title" id="oc-view-title" data-copy="viewport"></div><div class="presets"></div><div class="custom"><label><span data-copy="width"></span><input class="width" type="number" min="320" max="7680" inputmode="numeric"></label><label><span data-copy="height"></span><input class="height" type="number" min="320" max="4320" inputmode="numeric"></label></div><div class="actions"><button class="cancel secondary" type="button" data-copy="cancel"></button><button class="apply primary" type="button" data-copy="apply"></button></div><div class="error" role="alert" hidden></div>';
    fill(dialog);
    presets.forEach((item) => {
      const button = document.createElement("button");
      button.type = "button";
      button.innerHTML = "<span></span><small></small>";
      button.querySelector("span").textContent = item.label;
      button.querySelector("small").textContent = item.width + "×" + item.height;
       button.onclick = (event) => { if (event.isTrusted) void resize(item); };
      dialog.querySelector(".presets").append(button);
    });
    dialog.querySelector(".width").value = String(active.width);
    dialog.querySelector(".height").value = String(active.height);
     dialog.querySelector(".cancel").onclick = (event) => { if (event.isTrusted) close(); };
     dialog.querySelector(".apply").onclick = (event) => {
       if (!event.isTrusted) return;
      const width = Number(dialog.querySelector(".width").value);
      const height = Number(dialog.querySelector(".height").value);
      if (!Number.isInteger(width) || !Number.isInteger(height) || width < 320 || height < 320 || width > 7680 || height > 4320) {
        const error = dialog.querySelector(".error");
         error.hidden = false;
         error.textContent = t("sizeError");
         dialog.querySelector(".width").setAttribute("aria-invalid", "true");
         dialog.querySelector(".height").setAttribute("aria-invalid", "true");
         return;
      }
       void resize({ label:t("custom"), width, height });
    };
    root.append(dialog);
    const rect = view.getBoundingClientRect();
    dialog.style.left = Math.max(12, Math.min(innerWidth - dialog.offsetWidth - 12, rect.left)) + "px";
    dialog.style.bottom = Math.max(70, innerHeight - rect.top + 8) + "px";
    dialog.style.transformOrigin = "bottom left";
    requestAnimationFrame(() => dialog?.classList.add("open"));
    dialog.querySelector(".width").focus({ preventScroll:true });
  };
   const inspect = (el, x, y) => {
      close(true); chatClose(false); prior = el instanceof HTMLElement && el.isConnected ? el : toggle; target = el; shape(el);
     chatMeta.textContent = selector(el); chatTargets.replaceChildren(); chatLog.replaceChildren(); chatInput.value = ""; chatInput.disabled = false; chatLive.disabled = false; chatAdd.disabled = false;
     const targets = [[null, t("element")], ...(pseudo(el, "::before") ? [["::before", "::before"]] : []), ...(pseudo(el, "::after") ? [["::after", "::after"]] : [])];
     selected = null;
     for (const [value, label] of targets) {
       const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.setAttribute("aria-pressed", String(value === selected));
       button.onclick = (event) => {
         if (!event.isTrusted) return;
        selected = value;
        [...button.parentElement.children].forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
        shape(el, selected);
      };
       chatTargets.append(button);
     }
      chatCancel.onclick = (event) => { if (event.isTrusted) chatClose(); };
      chatAdd.onclick = (event) => {
        if (!event.isTrusted) return;
       const request = chatInput.value.trim();
       if (!request) {
          chatError.hidden = false; chatError.textContent = t("missing"); chatInput.setAttribute("aria-invalid", "true"); chatInput.focus();
         return;
       }
       chatInput.removeAttribute("aria-invalid"); chatError.hidden = true;
       sync();
      const css = selected ? getComputedStyle(el, selected) : getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const safe = [...el.attributes].filter((attr) => !/(token|secret|password|authorization|cookie|value)/i.test(attr.name)).slice(0, 20);
      remember(active);
      notes.push({ request, page: new URL(location.pathname + location.search + location.hash, app).href, tag: el.tagName.toLowerCase(), id: el.id || null, classes: [...el.classList], selector: selector(el), xpath: xpath(el), pseudo: selected, html: el.outerHTML.slice(0, 1200), text: (el.innerText || el.textContent || "").trim().slice(0, 300), attributes: Object.fromEntries(safe.map((attr) => [attr.name, attr.value])), styles: Object.fromEntries(["display","position","color","background-color","font-family","font-size","font-weight","line-height","margin","padding","border","border-radius","width","height"].map((key) => [key, css.getPropertyValue(key)])), rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, viewport: active, source: source(el) });
        chatClose();
        refresh();
        announce("added");
     };
      chatLive.onclick = (event) => { if (!event.isTrusted) return; const request = chatInput.value.trim(); if (!request) { chatError.hidden = false; chatError.textContent = t("liveMissing"); chatInput.setAttribute("aria-invalid", "true"); chatInput.focus(); return; } chatInput.removeAttribute("aria-invalid"); const rect = el.getBoundingClientRect(); const css = selected ? getComputedStyle(el, selected) : getComputedStyle(el); const safe = [...el.attributes].filter((attr) => !/(token|secret|password|authorization|cookie|value)/i.test(attr.name)).slice(0, 20); const annotation = { request, page:new URL(location.pathname + location.search + location.hash, app).href, tag:el.tagName.toLowerCase(), id:el.id || null, classes:[...el.classList], selector:selector(el), xpath:xpath(el), pseudo:selected, html:el.outerHTML.slice(0,1200), text:(el.innerText || el.textContent || "").trim().slice(0,300), attributes:Object.fromEntries(safe.map((attr) => [attr.name, attr.value])), styles:Object.fromEntries(["display","position","color","background-color","font-family","font-size","font-weight","line-height","margin","padding","border","border-radius","width","height"].map((key) => [key, css.getPropertyValue(key)])), rect:{ x:rect.x, y:rect.y, width:rect.width, height:rect.height }, viewport:active, source:source(el) }; const node = modal(t("changeLive"), t("chooseLiveDeliveryBody")); choice(node, t("main"), t("mainHelp"), () => { delivery = "main"; void liveSend(annotation, delivery); }); choice(node, t("context"), t("contextHelp"), () => { delivery = "subagent-context"; void liveSend(annotation, delivery); }); choice(node, t("fresh"), t("freshHelp"), () => { delivery = "subagent-fresh"; void liveSend(annotation, delivery); }); node.querySelector(".choices button").focus({ preventScroll:true }); };
     chat.hidden = false; chat.classList.add("open"); rows(); chatInput.focus({ preventScroll:true });
   };
   const move = (event) => {
     if (!enabled || dialog || event.composedPath().includes(host)) return;
    hovered = event.target;
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; if (hovered) shape(hovered); });
  };
   const click = (event) => {
      if (!event.isTrusted || !enabled || event.composedPath().includes(host)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    if (dialog) return;
    inspect(event.target, event.clientX, event.clientY);
  };
   const keydown = (event) => {
      if (event.isTrusted && enabled && event.altKey && event.shiftKey && event.key.toLowerCase() === "i" && !dialog) {
       const el = document.activeElement;
       if (el instanceof HTMLElement && el !== document.body && !host.contains(el)) { event.preventDefault(); inspect(el, 0, 0); }
       return;
     }
    if (event.key === "Escape" && dialog) { event.preventDefault(); const next = dialog.querySelector(".continue"); next ? next.click() : close(); }
    if (event.key !== "Tab" || !dialog) return;
    const items = [...dialog.querySelectorAll("button,input,textarea")].filter((item) => !item.disabled);
     if (!items.length) return;
     const first = items[0];
     const last = items[items.length - 1];
      if (!dialog.contains(root.activeElement)) { event.preventDefault(); first.focus(); return; }
    if (event.shiftKey && root.activeElement === first) { event.preventDefault(); last.focus(); }
    if (!event.shiftKey && root.activeElement === last) { event.preventDefault(); first.focus(); }
  };
  document.addEventListener("pointermove", move, true);
  document.addEventListener("click", click, true);
   document.addEventListener("keydown", keydown, true);
  window.addEventListener("resize", sync);
    view.onclick = (event) => { if (event.isTrusted) sizes(); };
    toggle.onclick = (event) => { if (!event.isTrusted) return; enabled = !enabled; toggle.setAttribute("aria-pressed", String(enabled)); toggle.setAttribute("aria-label", t(enabled ? "inspectOn" : "inspectOff")); box.style.display = enabled ? box.style.display : "none"; announce(enabled ? "inspectOn" : "inspectOff"); };
   clear.onclick = (event) => { if (!event.isTrusted) return; notes.length = 0; views.length = 0; refresh(); };
  const exit = root.querySelector(".exit");
   const leave = async (closeWindow = false) => {
    document.removeEventListener("pointermove", move, true);
    document.removeEventListener("click", click, true);
    document.removeEventListener("keydown", keydown, true);
    window.removeEventListener("resize", sync);
    cancelAnimationFrame(frame);
      clearInterval(beatTimer);
      live.ctrl?.abort();
      await beat("close");
      document.getElementById("__oc-inspector-script")?.remove();
     host.remove();
     delete window.__ocInspect;
     if (closeWindow) window.close();
   };
   exit.onclick = (event) => { if (event.isTrusted) void leave(); };
  const done = () => {
    const node = modal(t("sent"), t("sentBody"));
    node.querySelector(".cancel").remove();
    choice(node, t("closeWindow"), "", () => { void leave(true); });
    const next = choice(node, t("continue"), "", () => {
      notes.length = 0;
      views.length = 0;
      send.textContent = t("send");
      close();
      refresh();
    });
    next.classList.add("continue");
    next.focus({ preventScroll:true });
  };
   const submit = async (route) => {
     if (pending) return;
     delivery = route;
     pending = true;
     close(true);
    send.disabled = true;
     send.textContent = t("sending");
     announce("sendingStatus");
    try {
      const res = await fetch("/__opencode_inspect/annotations", { method:"POST", headers:{ "content-type":"application/json", "x-opencode-inspector":token }, body:JSON.stringify({ target:app, viewports:views, delivery, annotations:notes }) });
      if (!res.ok) throw new Error(await res.text());
      count.textContent = t("sent");
      send.textContent = t("sent");
      done();
    } catch (error) {
       count.textContent = t("retry");
       announce("retryStatus");
       send.textContent = t("retry");
       send.disabled = false;
     } finally {
       pending = false;
    }
  };
  send.onclick = (event) => {
    if (!event.isTrusted) return;
    const node = modal(t("chooseDelivery"), t("chooseDeliveryBody"));
    send.setAttribute("aria-expanded", "true");
    choice(node, t("main"), t("mainHelp"), () => submit("main"));
    choice(node, t("context"), t("contextHelp"), () => submit("subagent-context"));
    choice(node, t("fresh"), t("freshHelp"), () => submit("subagent-fresh"));
    node.querySelector(".choices button").focus({ preventScroll:true });
  };
  try {
    const saved = JSON.parse(sessionStorage.getItem(storageKey) || "null");
    if (saved?.state === "applied") {
      sessionStorage.removeItem(storageKey);
      chat.hidden = false;
      chat.classList.add("open");
      const node = document.createElement("div");
      node.className = "state ok";
      node.textContent = t("applied");
      chatLog.append(node);
      chatLog.classList.add("open");
      announce("applied");
    } else if (typeof saved?.id === "string" && (saved.state === "submitting" || saved.state === "working")) {
      live = { id:saved.id.slice(0,100), state:saved.state, after:Number.isFinite(saved.after) ? saved.after : 0, ctrl:null };
      chat.hidden = false;
      chat.classList.add("open");
      state(saved.state);
      void stream(live.id).catch((error) => state("failed", error instanceof Error ? error.message : t("liveFailed")));
    }
  } catch { sessionStorage.removeItem(storageKey); }
})();`
