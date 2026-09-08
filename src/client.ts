export const client = String.raw`(() => {
  if (window.__ocInspect) return;
  window.__ocInspect = true;

  const app = __OC_TARGET__;
  const token = __OC_TOKEN__;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)");
  const host = document.createElement("div");
  host.id = "__oc-inspector";
  const root = host.attachShadow({ mode: "open" });
  root.innerHTML = '<style></style><div class="box" aria-hidden="true"></div><div class="bar" role="toolbar" aria-label="OpenCode visual inspector"><span class="brand"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="M8 1.5 13.6 4.7v6.6L8 14.5l-5.6-3.2V4.7L8 1.5Zm0 2.1L4.2 5.8v4.4L8 12.4l3.8-2.2V5.8L8 3.6Z"/></svg>Inspect</span><span class="count" aria-live="polite">No annotations</span><span class="rule"></span><button class="clear secondary" type="button" disabled>Clear</button><button class="send primary" type="button" disabled>Send to OpenCode</button><button class="exit icon" type="button" aria-label="Exit inspector"><svg viewBox="0 0 16 16" aria-hidden="true"><path d="m4.3 4.3 7.4 7.4m0-7.4-7.4 7.4"/></svg></button></div>';
  const css = function(){/*
    :host{all:initial;position:fixed;inset:0;z-index:2147483644;pointer-events:none;color-scheme:dark;font-family:Inter,ui-sans-serif,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:13px;line-height:1.4;-webkit-font-smoothing:antialiased;--spring:linear(0,0.008 1.1%,0.032 2.2%,0.123 4.7%,0.318 7.6%,0.607 11%,0.835 14.2%,0.944 16.2%,1.018 18.6%,1.05 21.5%,1.052 24.5%,1.033 28.2%,1.007 33%,0.994 38.7%,0.993 46.4%,1.001 61%,1);--out:cubic-bezier(.23,1,.32,1);--panel:rgba(24,24,27,.92);--panel-solid:#18181b;--raised:#27272a;--line:rgba(255,255,255,.11);--muted:#a1a1aa;--text:#fafafa;--accent:#fff;--accent-text:#18181b}
    *{box-sizing:border-box}
    button,textarea{font:inherit}
    .box{display:none;position:fixed;left:0;top:0;pointer-events:none;border:2px solid #60a5fa;background:rgba(96,165,250,.11);box-shadow:0 0 0 1px rgba(255,255,255,.2) inset,0 3px 14px rgba(37,99,235,.18);z-index:1;contain:strict;transition:opacity 120ms var(--out)}
    .bar{position:fixed;left:50%;bottom:18px;display:flex;align-items:center;gap:8px;min-height:44px;padding:6px 7px 6px 11px;color:var(--text);background:var(--panel);border:1px solid var(--line);border-radius:14px;box-shadow:0 18px 50px rgba(0,0,0,.3),0 2px 8px rgba(0,0,0,.24),0 1px 0 rgba(255,255,255,.08) inset;backdrop-filter:blur(22px) saturate(160%);-webkit-backdrop-filter:blur(22px) saturate(160%);pointer-events:auto;z-index:3;opacity:0;filter:blur(4px);transform:translate3d(-50%,12px,0) scale(.97);transition:transform 320ms var(--spring),opacity 180ms var(--out),filter 180ms var(--out);will-change:transform,opacity,filter}
    .bar.open{opacity:1;filter:none;transform:translate3d(-50%,0,0) scale(1)}
    .brand{display:flex;align-items:center;gap:7px;padding-right:2px;font-weight:620;letter-spacing:-.01em;white-space:nowrap}
    .brand svg{width:16px;height:16px;fill:currentColor}
    .count{min-width:80px;color:var(--muted);font-size:12px;white-space:nowrap;font-variant-numeric:tabular-nums}
    .rule{width:1px;height:20px;background:var(--line)}
    button{display:inline-flex;align-items:center;justify-content:center;height:32px;padding:0 11px;color:var(--text);background:transparent;border:0;border-radius:8px;cursor:pointer;pointer-events:auto;transition:transform 140ms var(--spring),background-color 140ms var(--out),color 140ms var(--out),opacity 140ms var(--out)}
    button:hover:not(:disabled){background:rgba(255,255,255,.09)}
    button:active:not(:disabled){transform:scale(.965)}
    button:focus-visible,textarea:focus-visible{outline:2px solid #60a5fa;outline-offset:2px}
    button:disabled{opacity:.38;cursor:not-allowed}
    .primary{color:var(--accent-text);background:var(--accent);font-weight:610}
    .primary:hover:not(:disabled){background:#e4e4e7}
    .icon{width:32px;padding:0;color:var(--muted)}
    .icon svg{width:16px;height:16px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round}
    .dialog{position:fixed;z-index:4;width:min(390px,calc(100vw - 24px));padding:15px;color:var(--text);background:var(--panel);border:1px solid var(--line);border-radius:14px;box-shadow:0 24px 70px rgba(0,0,0,.38),0 4px 14px rgba(0,0,0,.25),0 1px 0 rgba(255,255,255,.08) inset;backdrop-filter:blur(24px) saturate(150%);-webkit-backdrop-filter:blur(24px) saturate(150%);pointer-events:auto;opacity:0;filter:blur(4px);transform:translateY(8px) scale(.965);transition:transform 280ms var(--spring),opacity 160ms var(--out),filter 180ms var(--out);will-change:transform,opacity,filter}
    .dialog.open{opacity:1;filter:none;transform:translateY(0) scale(1)}
    .dialog.closing{opacity:0;filter:blur(2px);transform:translateY(3px) scale(.985);transition-duration:120ms}
    .title{font-size:14px;font-weight:650;letter-spacing:-.012em}
    .meta{margin-top:3px;color:#93c5fd;font:11px/1.45 ui-monospace,SFMono-Regular,Consolas,monospace;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
    .target-label{display:block;margin:13px 0 6px;color:var(--muted);font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
    .targets{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:12px}
    .targets button{height:28px;padding:0 9px;color:var(--muted);background:rgba(255,255,255,.055);border:1px solid transparent;font:11px ui-monospace,SFMono-Regular,Consolas,monospace}
    .targets button[aria-pressed=true]{color:var(--text);background:rgba(96,165,250,.15);border-color:rgba(96,165,250,.38)}
    label[for=oc-change]{display:block;margin-bottom:6px;color:var(--muted);font-size:11px;font-weight:600;letter-spacing:.04em;text-transform:uppercase}
    textarea{display:block;width:100%;height:92px;padding:10px 11px;color:var(--text);caret-color:#93c5fd;background:rgba(9,9,11,.62);border:1px solid var(--line);border-radius:9px;resize:vertical;transition:border-color 140ms var(--out),box-shadow 140ms var(--out)}
    textarea::placeholder{color:#71717a}
    textarea:focus{border-color:rgba(96,165,250,.52);box-shadow:0 0 0 3px rgba(59,130,246,.11);outline:none}
    .actions{display:flex;justify-content:flex-end;gap:6px;margin-top:12px}
    .error{margin-top:8px;color:#fca5a5;font-size:12px}
    @media(prefers-reduced-motion:reduce){.bar,.dialog,.box,button{transition-duration:.01ms!important;transform:none}.bar{transform:translateX(-50%)}.bar.open{transform:translateX(-50%)}.dialog{filter:none}}
    @media(prefers-reduced-transparency:reduce){:host{--panel:#18181b}.bar,.dialog{backdrop-filter:none;-webkit-backdrop-filter:none}}
    @media(prefers-contrast:more){:host{--panel:#09090b;--line:rgba(255,255,255,.35)}.box{background:transparent;border-color:#93c5fd}}
    @media(max-width:620px){.bar{bottom:10px;max-width:calc(100vw - 16px)}.brand{font-size:0}.brand svg{width:18px;height:18px}.rule{display:none}.count{min-width:0}.clear{display:none}}
  */}.toString();
  root.querySelector("style").textContent = css.slice(css.indexOf("/*") + 2, css.lastIndexOf("*/"));
  document.documentElement.append(host);

  const box = root.querySelector(".box");
  const bar = root.querySelector(".bar");
  const count = root.querySelector(".count");
  const clear = root.querySelector(".clear");
  const send = root.querySelector(".send");
  const notes = [];
  let dialog = null;
  let frame = 0;
  let hovered = null;

  requestAnimationFrame(() => bar.classList.add("open"));

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
    count.textContent = notes.length ? notes.length + (notes.length === 1 ? " annotation" : " annotations") : "No annotations";
    clear.disabled = notes.length === 0;
    send.disabled = notes.length === 0;
    if (!reduce.matches && notes.length) count.animate([{ opacity:.45, transform:"translateY(2px)" }, { opacity:1, transform:"translateY(0)" }], { duration:180, easing:"cubic-bezier(.23,1,.32,1)" });
  };
  const close = (instant = false) => {
    if (!dialog) return;
    const item = dialog;
    dialog = null;
    if (instant || reduce.matches) { item.remove(); box.style.display = "none"; return; }
    item.classList.add("closing");
    setTimeout(() => item.remove(), 130);
    box.style.display = "none";
  };
  const inspect = (el, x, y) => {
    close(true);
    shape(el);
    dialog = document.createElement("section");
    dialog.className = "dialog";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-labelledby", "oc-dialog-title");
    dialog.innerHTML = '<div class="title" id="oc-dialog-title">Describe the change</div><div class="meta"></div><span class="target-label">Target</span><div class="targets"></div><label for="oc-change">Requested change</label><textarea id="oc-change" placeholder="For example, make this button quieter and more compact"></textarea><div class="actions"><button class="cancel secondary" type="button">Cancel</button><button class="add primary" type="button">Add annotation</button></div><div class="error" role="alert" hidden></div>';
    dialog.querySelector(".meta").textContent = selector(el);
    const targets = [[null, "Element"], ...(pseudo(el, "::before") ? [["::before", "::before"]] : []), ...(pseudo(el, "::after") ? [["::after", "::after"]] : [])];
    let selected = null;
    for (const [value, label] of targets) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      button.setAttribute("aria-pressed", String(value === selected));
      button.onclick = () => {
        selected = value;
        [...button.parentElement.children].forEach((item) => item.setAttribute("aria-pressed", String(item === button)));
        shape(el, selected);
      };
      dialog.querySelector(".targets").append(button);
    }
    dialog.querySelector(".cancel").onclick = () => close();
    dialog.querySelector(".add").onclick = () => {
      const request = dialog.querySelector("textarea").value.trim();
      if (!request) {
        const error = dialog.querySelector(".error");
        error.hidden = false;
        error.textContent = "Describe the requested change first.";
        dialog.querySelector("textarea").focus();
        return;
      }
      const css = selected ? getComputedStyle(el, selected) : getComputedStyle(el);
      const rect = el.getBoundingClientRect();
      const safe = [...el.attributes].filter((attr) => !/(token|secret|password|authorization|cookie|value)/i.test(attr.name)).slice(0, 20);
      notes.push({ request, page: new URL(location.pathname + location.search + location.hash, app).href, tag: el.tagName.toLowerCase(), id: el.id || null, classes: [...el.classList], selector: selector(el), xpath: xpath(el), pseudo: selected, html: el.outerHTML.slice(0, 1200), text: (el.innerText || el.textContent || "").trim().slice(0, 300), attributes: Object.fromEntries(safe.map((attr) => [attr.name, attr.value])), styles: Object.fromEntries(["display","position","color","background-color","font-family","font-size","font-weight","line-height","margin","padding","border","border-radius","width","height"].map((key) => [key, css.getPropertyValue(key)])), rect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }, source: source(el) });
      close();
      refresh();
    };
    root.append(dialog);
    const left = Math.min(x + 14, innerWidth - dialog.offsetWidth - 12);
    const top = Math.min(y + 14, innerHeight - dialog.offsetHeight - 12);
    dialog.style.left = Math.max(12, left) + "px";
    dialog.style.top = Math.max(12, top) + "px";
    dialog.style.transformOrigin = Math.max(0, Math.min(dialog.offsetWidth, x - Math.max(12, left))) + "px " + Math.max(0, Math.min(dialog.offsetHeight, y - Math.max(12, top))) + "px";
    requestAnimationFrame(() => dialog?.classList.add("open"));
    dialog.querySelector("textarea").focus({ preventScroll:true });
  };
  const move = (event) => {
    if (dialog || event.composedPath().includes(host)) return;
    hovered = event.target;
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; if (hovered) shape(hovered); });
  };
  const click = (event) => {
    if (event.composedPath().includes(host)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    inspect(event.target, event.clientX, event.clientY);
  };
  const keydown = (event) => {
    if (event.key === "Escape" && dialog) { event.preventDefault(); close(); }
  };
  document.addEventListener("pointermove", move, true);
  document.addEventListener("click", click, true);
  document.addEventListener("keydown", keydown, true);
  clear.onclick = () => { notes.length = 0; refresh(); };
  root.querySelector(".exit").onclick = () => {
    document.removeEventListener("pointermove", move, true);
    document.removeEventListener("click", click, true);
    document.removeEventListener("keydown", keydown, true);
    cancelAnimationFrame(frame);
    host.remove();
    delete window.__ocInspect;
  };
  send.onclick = async () => {
    send.disabled = true;
    send.textContent = "Sending...";
    try {
      const res = await fetch("/__opencode_inspect/annotations", { method:"POST", headers:{ "content-type":"application/json", "x-opencode-inspector":token }, body:JSON.stringify({ target:app, annotations:notes }) });
      if (!res.ok) throw new Error(await res.text());
      notes.length = 0;
      count.textContent = "Sent to OpenCode";
      send.textContent = "Sent";
      setTimeout(() => { send.textContent = "Send to OpenCode"; refresh(); }, 1200);
    } catch (error) {
      count.textContent = error instanceof Error ? error.message : String(error);
      send.textContent = "Retry";
      send.disabled = false;
    }
  };
})();`
