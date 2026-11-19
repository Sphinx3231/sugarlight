import "./styles.css";
import { createRealm } from "./scene.js";

const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const $ = (s, el = document) => el.querySelector(s), $$ = (s, el = document) => [...el.querySelectorAll(s)];
const svgNS = "http://www.w3.org/2000/svg";
const el = (tag, attrs = {}, parent) => { const n = document.createElementNS(svgNS, tag); for (const k in attrs) n.setAttribute(k, attrs[k]); parent?.appendChild(n); return n; };

/* ======================= the 3D scene (optional: the page works without WebGL) ======================= */
let realm = null;
try { realm = createRealm($("#realm")); } catch (e) { document.body.classList.add("no-webgl"); console.warn("WebGL unavailable, showing the page without the 3D scene", e); }

/* ======================= tabs (WAI-ARIA tabs, automatic activation) ======================= */
const tabs = $$('[role="tab"]'), panels = $$('[role="tabpanel"]');
const slug = t => t.id.replace("tab-", "");
const onShow = {};               // panel id -> callback run each time it becomes visible
let current = 0, swapping = null;

function select(i, { focus = false, instant = false } = {}) {
  if (i === current && !instant) { if (focus) tabs[i].focus(); return; }
  const prev = panels[current], next = panels[i];
  tabs.forEach((t, k) => { t.setAttribute("aria-selected", k === i); t.tabIndex = k === i ? 0 : -1; });
  if (focus) tabs[i].focus();
  moveInk(tabs[i], instant);
  realm?.setMood(+tabs[i].dataset.scene);
  history.replaceState(null, "", "#" + slug(tabs[i]));
  current = i;
  clearTimeout(swapping);
  const enter = () => {
    panels.forEach(p => { if (p !== next) { p.hidden = true; p.classList.remove("leaving"); } });
    next.hidden = false; next.classList.remove("entered"); void next.offsetWidth; next.classList.add("entered");
    onShow[next.id]?.();
  };
  if (instant || reduce || prev === next || prev.hidden) enter();
  else { prev.classList.add("leaving"); swapping = setTimeout(enter, 140); }   // exit is faster than the entrance
}
tabs.forEach((t, i) => {
  t.addEventListener("click", () => select(i));
  t.addEventListener("keydown", e => {
    const k = { ArrowRight:1, ArrowDown:1, ArrowLeft:-1, ArrowUp:-1 }[e.key];
    if (k) { e.preventDefault(); select((current + k + tabs.length) % tabs.length, { focus:true }); }
    else if (e.key === "Home") { e.preventDefault(); select(0, { focus:true }); }
    else if (e.key === "End") { e.preventDefault(); select(tabs.length - 1, { focus:true }); }
  });
});
/* the glowing ink bar under the selected tab */
const ink = document.createElement("span"); ink.className = "ink"; ink.setAttribute("aria-hidden", "true"); $("#tablist").appendChild(ink);
function moveInk(tab, instant) {
  ink.style.transition = instant ? "none" : "";
  ink.style.transform = `translateX(${tab.offsetLeft}px)`; ink.style.width = tab.offsetWidth + "px";
  /* keep the selected tab in view inside the strip (phones) without scrolling the page itself */
  const list = $("#tablist"), l = tab.offsetLeft - 16, r = tab.offsetLeft + tab.offsetWidth + 16;
  if (l < list.scrollLeft || r > list.scrollLeft + list.clientWidth)
    list.scrollTo({ left: l < list.scrollLeft ? l : r - list.clientWidth, behavior: instant || reduce ? "auto" : "smooth" });
}
addEventListener("resize", () => moveInk(tabs[current], true));

/* ======================= count-up numbers ======================= */
function countUp(root) {
  $$(".big-num[data-count]", root).forEach(n => {
    const to = +n.dataset.count, dec = +(n.dataset.decimals || 0), pre = n.dataset.prefix || "", suf = n.dataset.suffix || "";
    const unit = suf.trim().startsWith("in") || suf === "%" ? `<small class="inline">${suf}</small>` : `<small>${suf.trim()}</small>`;
    const fmt = v => pre + v.toFixed(dec) + (suf ? unit : "");
    n.setAttribute("aria-label", pre + to.toFixed(dec) + suf);
    if (reduce || to <= 1) { n.innerHTML = fmt(to); return; }
    const t0 = performance.now(), dur = 1100;
    const step = now => { const k = Math.min((now - t0)/dur, 1), e = 1 - Math.pow(1 - k, 4);
      n.innerHTML = fmt(to*e); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

/* ======================= tilt cards (fine pointers only) ======================= */
if (finePointer && !reduce) $$(".tilt").forEach(c => {
  c.addEventListener("pointermove", e => { const r = c.getBoundingClientRect(), x = (e.clientX - r.left)/r.width - .5, y = (e.clientY - r.top)/r.height - .5;
    c.style.setProperty("--rx", (-y*2).toFixed(2) + "deg"); c.style.setProperty("--ry", (x*3).toFixed(2) + "deg");
    c.style.setProperty("--mx", (x*100 + 50).toFixed(1) + "%"); c.style.setProperty("--my", (y*100 + 50).toFixed(1) + "%"); });
  c.addEventListener("pointerleave", () => { c.style.setProperty("--rx", "0deg"); c.style.setProperty("--ry", "0deg"); });
});

/* ======================= shared tooltip ======================= */
const tip = document.createElement("div"); tip.className = "tip"; tip.setAttribute("role", "status"); document.body.appendChild(tip);
function showTip(html, x, y) { tip.innerHTML = html; tip.classList.add("on");
  const w = tip.offsetWidth, h = tip.offsetHeight; tip.style.transform = `translate(${Math.min(Math.max(x - w/2, 8), innerWidth - w - 8)}px, ${Math.max(y - h - 14, 8)}px)`; }
const hideTip = () => tip.classList.remove("on");

/* ======================= chart 1: an illustrative day ======================= */
function buildDayChart() {
  const host = $("#dayChart .chart"), narrow = host.clientWidth < 520;
  const W = narrow ? 380 : 720, H = narrow ? 280 : 310, m = { l:narrow ? 34 : 44, r:narrow ? 8 : 16, t:30, b:34 };
  const x = h => m.l + h/24*(W - m.l - m.r), y = v => m.t + (1 - (v - 50)/(180 - 50))*(H - m.t - m.b);
  /* illustrative curve: resting ~88 mg/dL with a rise and fall after each meal */
  const meals = [[7.5, 46, "Breakfast"], [12.5, 38, "Lunch"], [18.75, 50, "Dinner"]];
  const val = h => 88 + Math.sin(h/24*Math.PI*2)*2 + meals.reduce((s, [t, a]) => { const d = h - t; return d > 0 ? s + a*(d/0.75)*Math.exp(1 - d/0.75)*(d < 4 ? 1 : Math.exp(-(d - 4))) : s; }, 0);
  const pts = []; for (let h = 0; h <= 24.001; h += .1) pts.push([h, val(h)]);
  const svg = el("svg", { viewBox:`0 0 ${W} ${H}`, class:"viz", "aria-hidden":"true" }, host);
  el("rect", { x:m.l, y:y(70), width:W - m.l - m.r, height:y(50) - y(70), class:"zone-low" }, svg);
  el("text", { x:W - m.r - 6, y:y(70) + 15, class:"zone-label", "text-anchor":"end" }, svg).textContent = "Low: under 70";
  [70, 100, 140, 180].forEach(v => { el("line", { x1:m.l, x2:W - m.r, y1:y(v), y2:y(v), class:"grid" }, svg);
    el("text", { x:m.l - 8, y:y(v) + 4, class:"axis", "text-anchor":"end" }, svg).textContent = v; });
  el("text", { x:m.l, y:m.t - 6, class:"axis unit", "text-anchor":"start" }, svg).textContent = "mg/dL";
  (narrow ? [[0, "12am"], [12, "12pm"], [24, "12am"]] : [[0, "12 am"], [6, "6 am"], [12, "12 pm"], [18, "6 pm"], [24, "12 am"]]).forEach(([h, s]) =>
    el("text", { x:x(h), y:H - 10, class:"axis", "text-anchor":h === 0 ? "start" : h === 24 ? "end" : "middle" }, svg).textContent = s);
  const d = pts.map(([h, v], i) => (i ? "L" : "M") + x(h).toFixed(1) + " " + y(v).toFixed(1)).join("");
  el("path", { d:d + `L${x(24)} ${y(50)}L${x(0)} ${y(50)}Z`, class:"area" }, svg);
  const line = el("path", { d, class:"line", pathLength:1 }, svg);
  meals.forEach(([t, , name]) => { const g = el("g", { class:"meal" }, svg);
    el("line", { x1:x(t), x2:x(t), y1:y(val(t)) + 6, y2:y(72), class:"meal-stem" }, g);
    el("text", { x:x(t), y:y(76), "text-anchor":"middle", class:"meal-label" }, g).textContent = name; });
  /* hover: crosshair + tooltip */
  const cross = el("line", { y1:m.t, y2:H - m.b, class:"cross" }, svg), mark = el("circle", { r:5, class:"mark" }, svg);
  const hit = el("rect", { x:m.l, y:m.t, width:W - m.l - m.r, height:H - m.t - m.b, fill:"transparent" }, svg);
  const fmtH = h => { const hh = Math.floor(h) % 24, mm = Math.round((h % 1)*60/15)*15 % 60; return `${(hh % 12) || 12}:${String(mm).padStart(2, "0")} ${hh < 12 ? "am" : "pm"}`; };
  hit.addEventListener("pointermove", e => { const r = svg.getBoundingClientRect(), h = Math.min(Math.max(((e.clientX - r.left)/r.width*W - m.l)/(W - m.l - m.r)*24, 0), 24), v = val(h);
    cross.setAttribute("x1", x(h)); cross.setAttribute("x2", x(h)); mark.setAttribute("cx", x(h)); mark.setAttribute("cy", y(v)); svg.classList.add("hovering");
    showTip(`<b>${Math.round(v)} mg/dL</b><span>${fmtH(h)} · illustration</span>`, r.left + x(h)/W*r.width, r.top + y(v)/H*r.height); });
  hit.addEventListener("pointerleave", () => { svg.classList.remove("hovering"); hideTip(); });
  return () => { if (reduce) return; line.classList.remove("draw"); void line.getBoundingClientRect(); line.classList.add("draw"); };
}

/* ======================= chart 2: regions 2024 -> 2050 (dumbbell) ======================= */
const REGIONS = [["Western Pacific", 215.4, 253.8], ["South-East Asia", 106.9, 184.5], ["Middle East & North Africa", 84.7, 162.6], ["Europe", 65.6, 72.4],
  ["North America & Caribbean", 56.2, 68.1], ["South & Central America", 35.4, 51.5], ["Africa", 24.6, 59.5]];
function buildRegionChart() {
  const host = $("#regionChart .chart"), narrow = host.clientWidth < 520;
  const W = narrow ? 360 : 720, rowH = narrow ? 50 : 40, lab = narrow ? 0 : 196, m = { l:lab + 8, r:56, t:narrow ? 6 : 10, b:30 };
  const H = m.t + REGIONS.length*rowH + m.b, max = 270, x = v => m.l + v/max*(W - m.l - m.r);
  const svg = el("svg", { viewBox:`0 0 ${W} ${H}`, class:"viz dumbbell", "aria-hidden":"true" }, host);
  [0, 50, 100, 150, 200, 250].forEach(v => { el("line", { x1:x(v), x2:x(v), y1:m.t, y2:H - m.b, class:"grid" }, svg);
    el("text", { x:x(v), y:H - 10, class:"axis", "text-anchor":"middle" }, svg).textContent = v; });
  const rows = REGIONS.map(([name, a, b], i) => {
    const cy = m.t + i*rowH + (narrow ? rowH - 14 : rowH/2), g = el("g", { class:"row", style:`--i:${i}` }, svg);
    el("rect", { x:0, y:cy - (narrow ? rowH - 4 : rowH/2), width:W, height:rowH, class:"row-hit" }, g);
    el("text", { x:narrow ? m.l : lab, y:narrow ? cy - 14 : cy + 4, class:"row-label", "text-anchor":narrow ? "start" : "end" }, g).textContent = name;
    el("line", { x1:x(a), x2:x(b), y1:cy, y2:cy, class:"stem" }, g);
    el("circle", { cx:x(a), cy, r:6, class:"d1" }, g); el("circle", { cx:x(b), cy, r:6, class:"d2" }, g);
    el("text", { x:x(b) + 12, y:cy + 4, class:"chg" }, g).textContent = "+" + Math.round((b/a - 1)*100) + "%";
    const show = e => { const r = svg.getBoundingClientRect();
      showTip(`<b>${name}</b><span><i class="s1"></i>2024: ${a} million</span><span><i class="s2"></i>2050: ${b} million (projected)</span>`, r.left + x(b)/W*r.width, r.top + cy/H*r.height); g.classList.add("hot"); };
    g.addEventListener("pointerenter", show); g.addEventListener("pointerleave", () => { hideTip(); g.classList.remove("hot"); });
    return g;
  });
  $("#regionRows").innerHTML = REGIONS.map(([n, a, b]) => `<tr><th scope="row">${n}</th><td>${a}</td><td>${b}</td></tr>`).join("");
  host.setAttribute("role", "img");
  host.setAttribute("aria-label", "Adults with diabetes by region, 2024 to 2050 projection: " + REGIONS.map(([n, a, b]) => `${n} ${a} to ${b} million`).join("; ") + ".");
  return () => { if (reduce) return; svg.classList.remove("grow"); void svg.getBoundingClientRect(); svg.classList.add("grow"); };
}

/* ======================= the range gauge ======================= */
const TESTS = {
  a1c:     { label:"A1C shows your average blood sugar over the past 2 to 3 months.", unit:"%", min:4, max:9, step:.1, cuts:[5.7, 6.5], start:5.4, mmol:false },
  fasting: { label:"Fasting blood sugar is measured after not eating overnight.", unit:"mg/dL", min:60, max:200, step:1, cuts:[100, 126], start:92, mmol:true },
  ogtt:    { label:"The glucose tolerance test checks blood sugar 2 hours after a sweet glucose drink.", unit:"mg/dL", min:80, max:260, step:1, cuts:[140, 200], start:120, mmol:true }
};
const ZONES = [
  { cls:"ok",  name:"Normal range",      icon:'<path d="M5 12.5l4.5 4.5L19 7.5"/>' },
  { cls:"pre", name:"Prediabetes range", icon:'<path d="M12 7v6M12 16.5v.5"/>' },
  { cls:"dia", name:"Diabetes range",    icon:'<path d="M12 6.5v7M12 16.5v.5"/><path d="M4 20h16L12 4z" fill="none"/>' }
];
function buildGauge() {
  const input = $("#val"), out = $("#verdict"), desc = $("#testDesc"), track = $("#gauge .track"), ticks = $("#gauge .ticks");
  let test = "a1c", unit = "mg";
  const conv = v => unit === "mmol" && TESTS[test].mmol ? v/18 : v;
  const fmt = v => TESTS[test].mmol ? (unit === "mmol" ? (v/18).toFixed(1) + " mmol/L" : Math.round(v) + " mg/dL") : v.toFixed(1) + "%";
  function layout() {
    const T = TESTS[test], span = T.max - T.min, p = c => (c - T.min)/span*100;
    input.min = T.min; input.max = T.max; input.step = T.step; input.value = T.start;
    track.style.setProperty("--c1", p(T.cuts[0]) + "%"); track.style.setProperty("--c2", p(T.cuts[1]) + "%");
    ticks.innerHTML = T.cuts.map(c => `<span style="left:${p(c)}%">${T.mmol ? (unit === "mmol" ? (c/18).toFixed(1) : c) : c}</span>`).join("");
    desc.textContent = T.label;
    $$("#unitPick input").forEach(r => r.disabled = !T.mmol); $("#unitPick").classList.toggle("off", !T.mmol);
    update();
  }
  function update() {
    const T = TESTS[test], v = +input.value, z = v < T.cuts[0] ? 0 : v < T.cuts[1] ? 1 : 2, Z = ZONES[z];
    input.setAttribute("aria-valuetext", `${fmt(v)}: ${Z.name}`);
    track.style.setProperty("--v", ((v - T.min)/(T.max - T.min)*100) + "%");
    const low = test === "fasting" && v < 70 ? `<span class="extra">Under 70 mg/dL is low blood sugar. See “Highs &amp; lows”.</span>` : "";
    out.className = "verdict " + Z.cls;
    out.innerHTML = `<svg viewBox="0 0 24 24" aria-hidden="true">${Z.icon}</svg><span><b>${fmt(v)}</b> is in the <b>${Z.name.toLowerCase()}</b>.</span>${low}`;
  }
  $$("#testPick input").forEach(r => r.addEventListener("change", () => { test = r.value; layout(); }));
  $$("#unitPick input").forEach(r => r.addEventListener("change", () => { unit = r.value; const v = input.value; layout(); input.value = v; update(); }));
  input.addEventListener("input", update);
  layout();
}

/* ======================= wire panels ======================= */
let drawDay = null;
let growRegions = null;
buildGauge();
onShow["panel-basics"] = () => countUp($("#panel-basics"));
onShow["panel-signs"] = () => { if (!drawDay) drawDay = buildDayChart(); drawDay(); };
onShow["panel-world"] = () => { if (!growRegions) growRegions = buildRegionChart(); growRegions(); countUp($("#panel-world")); };
onShow["panel-prevent"] = () => { countUp($("#panel-prevent")); const r = $(".ring-fg"); r.classList.remove("fill"); void r.getBoundingClientRect(); r.classList.add("fill"); };

const fromHash = tabs.findIndex(t => "#" + slug(t) === location.hash);
current = -1; select(Math.max(fromHash, 0), { instant:true });
addEventListener("hashchange", () => { const i = tabs.findIndex(t => "#" + slug(t) === location.hash); if (i < 0) return;
  select(i); $(".tabs").scrollIntoView({ block:"start", behavior: reduce ? "auto" : "smooth" }); });
requestAnimationFrame(() => document.body.classList.add("ready"));
/* dim the realm while reading (hero mostly scrolled away) */
new IntersectionObserver(([e]) => document.body.classList.toggle("reading", !e.isIntersecting), { threshold:0, rootMargin:"0px 0px -65% 0px" }).observe($(".hero"));
window.__sugar = { select, tabs: tabs.map(slug), ready: true };
