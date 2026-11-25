// Utilidades de interface: escape de HTML (contra XSS), datas, textos, mensagens.

export function h(value) {
  return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// Template seguro: tudo que é interpolado é escapado, exceto valores marcados com raw().
class Raw { constructor(s) { this.s = s; } toString() { return this.s; } }
export const raw = (s) => new Raw(String(s ?? ""));
export function html(strings, ...values) {
  return raw(strings.reduce((out, str, i) => {
    if (i === 0) return str;
    const v = values[i - 1];
    const piece = Array.isArray(v) ? v.map((x) => (x instanceof Raw ? x.s : h(x))).join("")
      : v instanceof Raw ? v.s : v === false || v == null ? "" : h(v);
    return out + piece + str;
  }, ""));
}

const MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

export function fmtDate(iso) {
  if (!iso) return "—";
  const [y, m, d] = iso.slice(0, 10).split("-");
  const date = `${d}/${m}/${y}`;
  return iso.length > 10 ? `${date} ${iso.slice(11, 16)}` : date;
}
export const fmtTime = (iso) => (iso && iso.length > 10 ? iso.slice(11, 16) : "—");
export function dateParts(iso) {
  if (!iso) return { day: "", month: "" };
  const [, m, d] = iso.slice(0, 10).split("-");
  return { day: d, month: MONTHS[Number(m) - 1] };
}
export const todayISO = () => new Date().toISOString().slice(0, 10);

// Texto do painel -> parágrafos (linha em branco separa parágrafos)
export function paragraphs(text) {
  return raw(String(text || "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean)
    .map((b) => `<p>${b.split("\n").map(h).join("<br>")}</p>`).join(""));
}
export const lines = (text) => String(text || "").split("\n").map((l) => l.trim()).filter(Boolean);
export function faqItems(text) {
  return String(text || "").split(/\n\s*\n/).map((b) => lines(b)).filter((ls) => ls.length).map((ls) => [ls[0], ls.slice(1).join("\n")]);
}
export function slugify(text) {
  return (String(text || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "").slice(0, 80)) || "item";
}
export function truncate(text, n) { const s = String(text || ""); return s.length > n ? s.slice(0, n - 1).trimEnd() + "…" : s; }

export function youtubeEmbed(url) {
  if (!url) return null;
  const m = String(url).match(/(?:watch\?v=|youtu\.be\/|embed\/)([\w-]{6,})/);
  return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
}

// ---------- Mensagens (flash) que sobrevivem à troca de página ----------
let pending = [];
// flash() guarda a mensagem; ela aparece no próximo desenho da página (ou em renderFlashes()).
export function flash(message, kind = "info") { pending.push({ message, kind }); }
export function renderFlashes() {
  const box = document.getElementById("flashes");
  if (!box) return;
  box.innerHTML = pending.map((f) => `<p class="flash ${h(f.kind)}" ${f.kind === "error" ? 'role="alert"' : ""}>${h(f.message)}</p>`).join("");
  pending = [];
}

// ---------- Formulários ----------
export function formData(form) {
  const fd = new FormData(form);
  const out = {};
  for (const [k, v] of fd.entries()) {
    if (v instanceof File) continue;
    if (k in out) out[k] = [].concat(out[k], v); else out[k] = v;
  }
  return out;
}
export const asList = (v) => (v == null ? [] : Array.isArray(v) ? v : [v]);
export const str = (v, max = 500) => String(v ?? "").trim().slice(0, max);
export const int = (v, dflt = null) => { const n = parseInt(v, 10); return Number.isFinite(n) ? n : dflt; };
export const num = (v) => { const n = parseFloat(String(v ?? "").replace(",", ".")); return Number.isFinite(n) ? n : null; };

export function download(filename, content, type = "text/plain") {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = Object.assign(document.createElement("a"), { href: url, download: filename });
  document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
