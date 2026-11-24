// Componentes de interface reutilizados pelas páginas.

import { html, raw, h, fmtDate, fmtTime, dateParts, truncate, youtubeEmbed } from "../core/ui.js";
import { METHOD_LABELS } from "../logic/scoring.js";
import { EVENT_KINDS } from "../logic/services.js";

let uid = 0;

// Campo de formulário acessível: rótulo, dica e erro ligados por aria-describedby
export function field(name, label, { type = "text", value = "", hint = "", error = "", required = false, attrs = "", id = null } = {}) {
  const fid = id || name;
  const desc = [hint && `${fid}-hint`, error && `${fid}-err`].filter(Boolean).join(" ");
  return html`<div class="field">
    <label for="${fid}">${label}${required ? raw(' <span aria-hidden="true">*</span>') : ""}</label>
    ${hint ? html`<p class="hint" id="${fid}-hint">${hint}</p>` : ""}
    ${error ? html`<p class="error-msg" id="${fid}-err">${error}</p>` : ""}
    <input type="${type}" id="${fid}" name="${name}" value="${value ?? ""}" ${raw(required ? 'required aria-required="true"' : "")}
      ${raw(error ? 'aria-invalid="true"' : "")} ${raw(desc ? `aria-describedby="${desc}"` : "")} ${raw(attrs)}>
  </div>`;
}

export function textarea(name, label, { value = "", hint = "", rows = 4, id = null, required = false } = {}) {
  const fid = id || name;
  return html`<div class="field"><label for="${fid}">${label}${required ? raw(' <span aria-hidden="true">*</span>') : ""}</label>
    ${hint ? html`<p class="hint" id="${fid}-hint">${hint}</p>` : ""}
    <textarea id="${fid}" name="${name}" rows="${rows}" ${raw(hint ? `aria-describedby="${fid}-hint"` : "")} ${raw(required ? "required" : "")}>${value ?? ""}</textarea></div>`;
}

export function select(name, label, options, current, { id = null, hint = "" } = {}) {
  const fid = id || name;
  return html`<div class="field"><label for="${fid}">${label}</label>
    ${hint ? html`<p class="hint">${hint}</p>` : ""}
    <select id="${fid}" name="${name}">${Object.entries(options).map(([k, v]) => html`<option value="${k}" ${raw(String(k) === String(current ?? "") ? "selected" : "")}>${v}</option>`)}</select></div>`;
}

export function checkbox(name, label, checked, { value = "1", id = null } = {}) {
  return html`<label class="check"><input type="checkbox" name="${name}" value="${value}" ${raw(id ? `id="${id}"` : "")} ${raw(checked ? "checked" : "")}> ${label}</label>`;
}

export function errorSummary(errors) {
  const keys = Object.keys(errors || {});
  if (!keys.length) return "";
  return html`<div class="error-summary" role="alert" tabindex="-1" aria-labelledby="err-title">
    <h2 id="err-title" style="margin-top:0">Corrija ${keys.length} ${keys.length === 1 ? "item" : "itens"}:</h2>
    <ul>${keys.map((k) => html`<li><a href="#${k}" data-focus="${k}">${errors[k]}</a></li>`)}</ul></div>`;
}


export function pageHero(eyebrow, title, lead = "") {
  return html`<div class="page-hero"><div class="wrap">${eyebrow ? html`<p class="eyebrow">${eyebrow}</p>` : ""}
    <h1>${title}</h1>${lead ? html`<p class="lead">${lead}</p>` : ""}</div></div>`;
}

// Imagem: fotos da pasta img/ (vêm com o site) ou enviadas pelo painel (guardadas nos dados).
export function img(ref, alt, cls = "") {
  if (!ref) return "";
  if (ref.startsWith("img/")) return html`<img src="${ref}" alt="${alt || ""}" class="${cls}" loading="lazy">`;
  return html`<img data-media="${ref}" alt="${alt || ""}" class="${cls}" loading="lazy">`;
}

export function libras(url, title) {
  if (!url) return "";
  const embed = youtubeEmbed(url);
  return html`<div class="libras"><strong>🤟 Em Libras: ${title}</strong>
    ${embed ? html`<iframe src="${embed}" title="Vídeo em Libras: ${title}" loading="lazy" allowfullscreen></iframe>` : ""}
    <a href="${url}" target="_blank" rel="noopener">Abrir o vídeo em Libras em nova aba<span class="visually-hidden"> (${title})</span></a></div>`;
}

export function accTags(p) {
  return html`<span class="acc-icons">
    ${p.accLibras ? html`<span class="tag">🤟 Intérprete de Libras no palco</span>` : ""}
    ${p.accAudiodesc ? html`<span class="tag">🎧 Audiodescrição</span>` : ""}
    ${p.accSeating ? html`<span class="tag">♿ Espaço acessível na plateia</span>` : ""}</span>`;
}

export function eventCard(e) {
  const dp = dateParts(e.startsOn);
  return html`<article class="card event-row">
    <span class="date-badge" aria-hidden="true"><span class="d">${dp.day}</span><span class="m">${dp.month}</span></span>
    <div><h3><a href="#/eventos/${e.id}">${e.name}</a></h3>
      <p class="muted" style="margin:0">${fmtDate(e.startsOn)}${e.timeLabel ? `, ${e.timeLabel}` : ""}${e.location ? ` · ${e.location}` : ""}</p>
      <p style="margin:.35rem 0 0"><span class="tag">${EVENT_KINDS[e.kind] || e.kind}</span>${e.librasVideoUrl ? html` <span class="tag">🤟 Libras</span>` : ""}</p>
      ${e.description ? html`<p style="margin:.4rem 0 0">${truncate(e.description, 160)}</p>` : ""}</div></article>`;
}

export function newsCard(n) {
  return html`<article class="card news-card project-card">
    <div class="cover">${n.image ? img(n.image, n.imageAlt) : raw('<span aria-hidden="true">📰</span>')}</div>
    <div class="body"><p class="date" style="margin:0">${fmtDate(n.date)}${n.category ? ` · ${n.category}` : ""}</p>
      <h3><a href="#/noticias/${n.id}">${n.title}</a></h3>${n.summary ? html`<p style="margin:0">${n.summary}</p>` : ""}</div></article>`;
}

export function projectCard(p) {
  const icon = p.area === "Cultura" ? "🎵" : (p.modalities || []).some((m) => m.includes("jiu") || m.includes("taekwondo")) ? "🥋" : "🏀";
  return html`<article class="card project-card">
    <div class="cover">${p.image ? img(p.image, p.imageAlt) : raw(`<span aria-hidden="true">${icon}</span>`)}</div>
    <div class="body">${p.area ? html`<p class="eyebrow">${p.area}</p>` : ""}<h3>${p.name}</h3>
      <p style="margin:0">${p.summary}</p>${p.participants ? html`<p class="muted" style="margin:0">${p.participants} participantes</p>` : ""}
      <a class="more" href="#/projetos/${p.id}">Conheça o projeto<span class="visually-hidden"> ${p.name}</span> →</a></div></article>`;
}

// ---------- chaves ----------
export function matchBox(m, names, link = null) {
  const aWin = m.winner && m.winner === m.a, bWin = m.winner && m.winner === m.b;
  const na = m.a ? names[m.a] || "?" : m.status === "bye" ? "BYE" : "A definir";
  const nb = m.b ? names[m.b] || "?" : m.status === "bye" ? "BYE" : "A definir";
  const meta = m.status === "encerrada" ? `${METHOD_LABELS[m.method] || m.method || ""}${m.isDraw ? " · empate" : ""}`
    : m.status === "bye" ? "Avança direto" : m.scheduledAt ? `${fmtDate(m.scheduledAt)}${m.venue ? ` · ${m.venue}` : ""}` : "Horário a definir";
  const inner = html`<div class="side ${aWin ? "win" : ""}"><span>${na}${aWin ? raw('<span class="visually-hidden"> (vencedor)</span>') : ""}</span><span>${m.scoreA ?? ""}</span></div>
    <div class="side ${bWin ? "win" : ""}"><span>${nb}${bWin ? raw('<span class="visually-hidden"> (vencedor)</span>') : ""}</span><span>${m.scoreB ?? ""}</span></div>
    <div class="meta">${meta}</div>`;
  return html`<div class="match">${link ? html`<a href="${link}" aria-label="Súmula: ${na} contra ${nb}">${inner}</a>` : inner}</div>`;
}

// Chave espelhada (estilo "pôster de luta"): metade dos confrontos à esquerda, metade
// à direita, a Grande Final no centro. Em telas estreitas vira a lista por fases.
const fightLabel = (name, total, round, n) => round === total ? "Grande Final" : `${name.replace(/ de final$/i, " de Final")} ${n}`;

function fighterBox(m, side, names) {
  const id = m[side];
  const won = m.winner && m.winner === id, lost = m.winner && id && m.winner !== id;
  const name = id ? names[id] || "?" : m.status === "bye" ? "BYE" : "";
  const score = side === "a" ? m.scoreA : m.scoreB;
  return html`<div class="fb ${won ? "won" : ""} ${lost ? "lost" : ""} ${id ? "" : "empty"}">
    <span class="fb-name">${name || raw('<span class="visually-hidden">A definir</span>')}${won ? raw('<span class="visually-hidden"> (vencedor)</span>') : ""}</span>
    ${score != null && m.status === "encerrada" && m.method !== "wo" ? html`<span class="fb-score">${score}</span>` : ""}</div>`;
}

function fightCard(m, label, names, admin) {
  const meta = m.status === "encerrada" ? `${METHOD_LABELS[m.method] || m.method || ""}` : m.status === "bye" ? "Avança direto"
    : m.scheduledAt ? `${fmtTime(m.scheduledAt)}${m.venue ? ` · ${m.venue}` : ""}` : "";
  const body = html`${fighterBox(m, "a", names)}<div class="fc-label"><strong>${label}</strong>${meta ? html`<span>${meta}</span>` : ""}</div>${fighterBox(m, "b", names)}`;
  const link = admin && m.status !== "bye" ? `#/painel/partidas/${m.id}` : null;
  return html`<div class="fight">${link ? html`<a href="${link}" aria-label="Súmula de ${label}">${body}</a>` : body}</div>`;
}

export function bracketView(rounds, names, admin = false, { title = "", subtitle = "", gender = "misto" } = {}) {
  if (!rounds.length) return "";
  const total = rounds.length;
  const final = rounds[total - 1].matches[0];
  const champ = final?.status === "encerrada" && final.winner ? names[final.winner] : null;
  const col = (r, matches, side, offset) => html`<ol class="bk-col bk-${side} ${r.round === 1 ? "first" : ""}" aria-label="${r.name} (${side === "left" ? "lado esquerdo" : "lado direito"})">
    ${matches.map((m, i) => html`<li>${fightCard(m, fightLabel(r.name, total, r.round, offset + i + 1), names, admin)}</li>`)}</ol>`;
  const left = [], right = [];
  for (const r of rounds.slice(0, -1)) {
    const half = r.matches.length / 2;
    left.push(col(r, r.matches.slice(0, half), "left", 0));
    right.unshift(col(r, r.matches.slice(half), "right", half));
  }
  const cols = 2 * (total - 1) + 1;
  const linear = html`<div class="bracket bk-linear" role="region" aria-label="Chave eliminatória por fases" tabindex="0">
    ${rounds.map((r) => html`<section aria-labelledby="round-${r.round}-${++uid}"><h3 id="round-${r.round}-${uid}">${r.name}</h3>
      <ol>${r.matches.map((m) => html`<li>${matchBox(m, names, admin && m.status !== "bye" ? `#/painel/partidas/${m.id}` : null)}</li>`)}</ol></section>`)}</div>`;
  return html`<div class="bk-poster" role="region" aria-label="Chave eliminatória" tabindex="0">
    ${title || subtitle ? html`<header class="bk-head">${title ? html`<p class="bk-title">${title}</p>` : ""}${subtitle ? html`<p class="bk-sub">${subtitle}</p>` : ""}</header>` : ""}
    <div class="bk-grid" style="grid-template-columns:repeat(${cols}, minmax(170px, 1fr))">
      ${left}
      <ol class="bk-col bk-final ${total === 1 ? "solo" : ""}" aria-label="Grande Final"><li><div class="bk-octagon" aria-hidden="true"></div>
        ${fightCard(final, "Grande Final", names, admin)}
        ${champ ? html`<p class="bk-champ">🏆 ${gender === "feminino" ? "Campeã" : "Campeão"}: <strong>${champ}</strong></p>` : ""}</li></ol>
      ${right}
    </div></div>${linear}`;
}

export function groupView(groups, names, admin = false) {
  return groups.map((g) => html`<h3>Grupo ${g.label}</h3>
    <div class="table-wrap"><table><caption>Classificação do grupo ${g.label}</caption>
      <thead><tr><th scope="col">#</th><th scope="col">Competidor</th><th scope="col">J</th><th scope="col">V</th><th scope="col">E</th><th scope="col">D</th><th scope="col">Pró</th><th scope="col">Contra</th><th scope="col">Saldo</th><th scope="col">Pts</th></tr></thead>
      <tbody>${g.table.map((r, i) => html`<tr><td>${i + 1}</td><th scope="row">${r.name}</th><td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td><td>${r.for}</td><td>${r.against}</td><td>${r.diff}</td><td><strong>${r.points}</strong></td></tr>`)}</tbody>
    </table></div>
    <details><summary>Partidas do grupo ${g.label}</summary><div class="grid" style="margin-top:.75rem">
      ${g.matches.map((m) => matchBox(m, names, admin ? `#/painel/partidas/${m.id}` : null))}</div></details>`);
}

export const loading = html`<p class="muted">Carregando…</p>`;
export { h, raw, html, fmtDate, fmtTime };

// Bloco de Libras da categoria: vídeo com intérprete (se houver) + explicação automática
// gerada a partir das características da categoria, com avatar VLibras e leitura em voz alta.
export function librasBlock(key, ex, videoUrl) {
  return html`<section class="libras-box" aria-labelledby="lb-${key}">
    <h2 id="lb-${key}">🤟 Em Libras: como funciona esta categoria</h2>
    ${videoUrl ? html`<p><strong>Vídeo com intérprete de Libras:</strong></p>${libras(videoUrl, ex.title)}` : ""}
    <div class="actions"><button class="btn" type="button" data-libras="lt-${key}">🤟 Ver em Libras (avatar VLibras)</button>
      <button class="btn secondary" type="button" data-speak="lt-${key}">🔊 Ouvir explicação</button></div>
    <div id="lt-${key}" class="libras-text">${ex.sections.map((sec) => html`<h3>${sec.title}</h3><p>${sec.text}</p>`)}</div>
    <p class="hint">Explicação montada automaticamente a partir das características da categoria e das regras em vigor.
      O avatar VLibras é a tradução automática do Governo Federal e precisa de internet${videoUrl ? "" : "; o vídeo com intérprete humano, quando publicado, aparece aqui"}.</p>
  </section>`;
}
