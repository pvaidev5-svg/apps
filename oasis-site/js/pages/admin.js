// Painel: Central do evento, eventos, categorias/chaves, súmulas, equipes, apresentações,
// roteiro de palco, calendário unificado, pessoas e regras de pontuação.

import { db, listSorted, auth, exportAll, importAll, storageUsage, dataMode } from "../data/db.js";
import { route, go } from "../core/router.js";
import { html, raw, flash, fmtDate, fmtTime, str, int, num, asList, download, slugify } from "../core/ui.js";
import { session, getSettings, invalidateSettings } from "../core/session.js";
import { ageToday, findConflicts } from "../logic/calendar.js";
import { BJJ_LABELS, TKD_LABELS, TEAM_LABELS, METHOD_LABELS } from "../logic/scoring.js";
import { uploadImage, removeImage } from "../core/media.js";
import * as C from "./components.js";
import * as S from "../logic/services.js";
import { bindForm, confirmText, notFound } from "./helpers.js";
import { anonymizeUser } from "./account.js";
import { explainCategory, explanationText } from "../logic/explain.js";
import { divisionCategories, tableToText, textToTable, catWeightLabel } from "../logic/divisions.js";

const ADMIN = { auth: "admin" }, STAFF = { auth: "staff" };

export function adminLayout(current, content) {
  const item = (href, label) => html`<li><a href="#${href}" ${raw(current === href ? 'aria-current="page"' : "")}>${label}</a></li>`;
  const admin = session.isAdmin;
  return html`<div class="admin-layout"><nav class="admin-nav" aria-label="Menu do painel"><ul>
    <li class="nav-group">Eventos</li>${item("/painel", raw("<strong>Central do evento</strong>"))}
    ${admin ? html`${item("/painel/eventos", "Eventos e chaves")}${item("/painel/equipes", "Equipes")}` : ""}${item("/painel/calendario", "Calendário unificado")}
    ${admin ? html`${item("/painel/pessoas", "Pessoas")}${item("/painel/avisos", "Avisos aos inscritos")}${item("/painel/regras", "Pontuação e regras")}
      <li class="nav-group">Site</li>${item("/painel/site", "Textos e contatos")}${item("/painel/site/noticias", "Notícias")}${item("/painel/site/projetos", "Projetos")}
      ${item("/painel/site/patrocinadores", "Patrocinadores")}${item("/painel/site/mensagens", "Mensagens")}` : ""}
    ${admin ? html`<li class="nav-group">Sistema</li>${item("/painel/backup", "Backup dos dados")}` : ""}
    <li class="nav-group">Conta</li>${item("/senha", "Trocar senha")}</ul></nav><div>${content}</div></div>`;
}
const page = (title, current, content, after) => ({ title, body: adminLayout(current, content), after });

// ------------------------------------------------------------------ Central do evento
route("/painel", async ({ query }) => {
  const events = await listSorted("events", [], "startsOn", "desc");
  const eventId = query.evento || (await S.defaultEventId());
  const hub = eventId ? await S.eventHub(eventId, { full: session.isAdmin }) : null;
  const users = session.isAdmin ? await db.list("users") : [];
  const students = users.filter((u) => ["atleta", "lutador", "artista"].includes(u.role) && u.active !== false).length;
  const teachers = users.filter((u) => u.role === "professor" && u.active !== false).length;
  const A = session.isAdmin;
  const warn = session.profile?.defaultCredential && A ? html`<div class="flash warning" role="alert"><strong>Credencial inicial em uso.</strong>
    Troque a senha do administrador antes de usar com dados reais: <a href="#/senha">trocar senha agora</a>.</div>` : "";
  if (!hub) return page("Central do evento", "/painel", html`${warn}<p class="eyebrow">Central do evento</p><h1>Nenhum evento ainda</h1>
    <div class="card"><h2 style="margin-top:0">Comece por aqui</h2><ol><li>Confira os valores em <a href="#/painel/regras">Pontuação e regras</a>.</li>
    <li>Crie o primeiro evento em <a href="#/painel/eventos">Eventos e chaves</a>.</li><li>Divulgue a página de <a href="#/cadastro">inscrição</a>.</li></ol></div>`);
  const { ev } = hub;
  const lnk = (kind, id) => (kind === "category" ? `#/painel/categorias/${id}` : kind === "match" ? `#/painel/partidas/${id}` : `#/painel/apresentacoes/${id}`);
  return page("Central do evento", "/painel", html`${warn}
    <div class="hub-head"><div><p class="eyebrow">Central do evento</p><h1>${ev.name}</h1>
      <p class="muted">${fmtDate(ev.startsOn)}${ev.location ? ` · ${ev.location}` : ""} · ${S.EVENT_KINDS[ev.kind]}${!ev.published ? html` · <span class="tag accent">rascunho</span>` : ""}</p></div>
      ${events.length > 1 ? html`<form class="actions" style="margin:0" id="ev-pick"><label for="evento" class="visually-hidden">Trocar de evento</label>
        <select id="evento" name="evento" style="max-width:18rem">${events.map((e) => html`<option value="${e.id}" ${raw(e.id === ev.id ? "selected" : "")}>${e.name}</option>`)}</select>
        <button class="btn secondary small" type="submit">Abrir</button></form>` : ""}</div>
    <div class="actions">${A ? html`<a class="btn small" href="#/painel/eventos/${ev.id}">Gerenciar evento</a>` : ""}
      <a class="btn secondary small" href="#/painel/calendario?evento=${ev.id}">Calendário</a><a class="btn secondary small" href="#/painel/eventos/${ev.id}/roteiro">Roteiro de palco</a>
      ${ev.published ? html`<a class="btn secondary small" href="#/eventos/${ev.id}">Página pública</a>` : ""}</div>
    <ul class="kpis" aria-label="Resumo do evento">
      <li class="card"><span class="stat">${hub.progress.percent}%</span>das lutas e partidas concluídas (${hub.progress.done} de ${hub.progress.matches})</li>
      <li class="card"><span class="stat">${hub.progress.performances}</span>apresentações no palco</li>
      <li class="card ${hub.conflicts.length ? "kpi-alert" : ""}"><span class="stat">${hub.conflicts.length}</span>conflitos palco × quadra</li>
      <li class="card ${hub.todo.length ? "kpi-alert" : ""}"><span class="stat">${hub.todo.length}</span>pendências</li>
      ${A ? html`<li class="card"><span class="stat">${students}</span>alunos · ${teachers} professores</li>` : ""}</ul>
    <div class="hub-grid"><section aria-labelledby="prog-h" class="card hub-main"><h2 id="prog-h">Programação unificada — palco e quadra</h2>
      ${hub.timeline.length ? html`<ol class="timeline">${hub.timeline.map((it, i) => html`
        ${hub.multiDay && (i === 0 || it.start.slice(0, 10) !== hub.timeline[i - 1].start.slice(0, 10)) ? html`<li class="tl-day">${fmtDate(it.start.slice(0, 10))}</li>` : ""}
        <li class="tl-item tl-${it.kind} ${it.conflict ? "is-conflict" : ""} ${it.status === "encerrada" ? "is-done" : ""}">
          <span class="tl-time">${fmtTime(it.start)}</span><div class="tl-body">
          ${it.kind === "match" ? html`<span class="tl-cat">${it.category}${it.venue ? ` · ${it.venue}` : ""}</span>
            <span class="tl-title">${A ? html`<a href="#/painel/partidas/${it.id}">${it.a} × ${it.b}</a>` : `${it.a} × ${it.b}`}</span>
            ${it.status === "encerrada" ? html`<span class="tl-result">Resultado: ${it.scoreA} × ${it.scoreB} — ${it.winner === "Empate" ? "empate" : `vitória de ${it.winner}`} (${METHOD_LABELS[it.method] || it.method})</span>`
              : html`<span class="tl-result muted">A disputar · ${it.duration_min} min</span>`}`
          : html`<span class="tl-cat">${S.SLOTS[it.slot]} · Palco · ${it.duration_min} min</span>
            <span class="tl-title">${A ? html`<a href="#/painel/apresentacoes/${it.id}">${it.title}</a>` : it.title}</span>${C.accTags(it)}`}
          ${it.conflict ? html`<span class="tl-warn">Conflito: alguém deste compromisso está em outro no mesmo horário</span>` : ""}</div></li>`)}</ol>`
        : html`<p class="muted">Nada agendado ainda. Defina horários nas súmulas e nas apresentações.</p>`}</section>
      <div class="hub-side">
        <section aria-labelledby="conf-h" class="card"><h2 id="conf-h">Conflitos</h2>${hub.conflicts.length ? html`<ul class="compact">${hub.conflicts.map((c) => html`<li><strong>${fmtTime(c.a.start)}</strong> ${c.a.label}<br><span class="muted">choca com</span> <strong>${fmtTime(c.b.start)}</strong> ${c.b.label}</li>`)}</ul>` : html`<p class="muted">Nenhum conflito.</p>`}</section>
        <section aria-labelledby="todo-h" class="card"><h2 id="todo-h">Pendências</h2>${hub.todo.length ? html`<ul class="compact">${hub.todo.slice(0, 12).map(([k, id, t]) => html`<li>${A ? html`<a href="${lnk(k, id)}">${t}</a>` : t}</li>`)}</ul>
          ${hub.todo.length > 12 ? html`<p class="muted">e mais ${hub.todo.length - 12}.</p>` : ""}` : html`<p class="muted">Tudo em dia.</p>`}</section>
        <section aria-labelledby="staff-h" class="card"><h2 id="staff-h">Equipe de apoio</h2>${hub.staff.length ? html`<ul class="compact">${hub.staff.map((s) => html`<li>${s.fullName || s.publicName} — ${S.SUPPORT_FUNCTIONS[s.function]}</li>`)}</ul>` : html`<p class="muted">Ninguém escalado.</p>`}</section></div></div>
    <section aria-labelledby="chaves-h"><h2 id="chaves-h">Chaves</h2>${hub.categories.length ? html`<div class="grid">${hub.categories.map((c) => html`<article class="card">
      <h3 style="margin:0 0 .25rem">${A ? html`<a href="#/painel/categorias/${c.id}">${c.name}</a>` : c.name}</h3><p class="muted" style="margin:0 0 .5rem">${c.modalityName}${c.adapted ? html` · <span class="tag accent">adaptada</span>` : ""}</p>
      ${c.total ? html`<label for="prog-${c.id}" class="hint">${c.done} de ${c.total} concluídas</label><progress id="prog-${c.id}" max="${c.total}" value="${c.done}">${c.done} de ${c.total}</progress>` : html`<p class="hint">${c.confirmed} inscritos confirmados · chave não gerada</p>`}
      ${c.champion ? html`<p class="champion">Campeão: <strong>${c.champion}</strong></p>` : c.next.length ? html`<p style="margin:.5rem 0 .25rem"><strong>Próximas:</strong></p>
        <ul class="compact">${c.next.map((n) => html`<li>${A ? html`<a href="#/painel/partidas/${n.id}">${n.a} × ${n.b}</a>` : `${n.a} × ${n.b}`}${n.at ? ` · ${fmtTime(n.at)}` : ""}</li>`)}</ul>` : ""}</article>`)}</div>`
      : html`<p class="muted">Nenhuma categoria.</p>`}</section>
    <section aria-labelledby="palco-h"><h2 id="palco-h">Palco — ordem de entrada</h2>${hub.script.length ? html`<div class="grid">${Object.entries(S.SLOTS).map(([slot, label]) => { const items = hub.script.filter((p) => p.slot === slot); return html`
      <div class="card"><h3 style="margin-top:0">${label}</h3>${items.length ? html`<ol class="compact">${items.map((p) => html`<li>${A ? html`<a href="#/painel/apresentacoes/${p.id}">${p.title}</a>` : p.title}
        <span class="muted">(${p.durationMin} min${p.scheduledAt ? `, ${fmtTime(p.scheduledAt)}` : ""}, ${p.members.length} integrantes)</span> ${C.accTags(p)}</li>`)}</ol>` : html`<p class="muted">—</p>`}</div>`; })}</div>`
      : html`<p class="muted">Nenhuma apresentação.</p>`}</section>`,
  (root) => root.querySelector("#ev-pick")?.addEventListener("submit", (e) => { e.preventDefault(); go(`/painel?evento=${e.target.evento.value}`); }));
}, STAFF);

// ------------------------------------------------------------------ Eventos
function eventForm(ev = {}) {
  return html`${C.field("name", "Nome do evento", { value: ev.name, required: true })}
    <div class="row">${C.select("kind", "Tipo", S.EVENT_KINDS, ev.kind || "misto")}${C.field("startsOn", "Início", { type: "date", value: ev.startsOn, required: true })}
      ${C.field("endsOn", "Fim", { type: "date", value: ev.endsOn })}${C.field("timeLabel", "Horário na agenda", { value: ev.timeLabel, hint: "Ex.: 19h" })}</div>
    ${C.field("location", "Local", { value: ev.location })}${C.textarea("description", "Descrição", { value: ev.description })}
    ${C.field("librasVideoUrl", "Vídeo de apresentação em Libras (URL)", { type: "url", value: ev.librasVideoUrl, hint: "Vídeo com intérprete. Links do YouTube são incorporados na página." })}
    <fieldset><legend>Imagem de capa</legend>${ev.image ? html`${C.img(ev.image, ev.imageAlt, "thumb")}${C.checkbox("remove_image", "Remover imagem", false)}` : ""}
      <div class="field"><label for="ev_image">Enviar imagem</label><input type="file" id="ev_image" name="image_file" accept="image/*"></div>
      ${C.field("imageAlt", "Descrição da imagem (para leitores de tela)", { value: ev.imageAlt, id: "ev_alt" })}</fieldset>
    ${C.checkbox("published", "Publicado na área pública", !!ev.published)}${C.checkbox("registrationsOpen", "Inscrições abertas", ev.registrationsOpen !== false)}`;
}

export async function handleImage(form, d, current) {
  const file = form.querySelector("input[type=file]")?.files?.[0];
  let image = current?.image || "";
  if (file) { const id = await uploadImage(file); await removeImage(image); image = id; }
  else if (d.remove_image) { await removeImage(image); image = ""; }
  const alt = str(d.imageAlt, 300);
  if (image && !alt) throw new Error("Descreva a imagem (texto alternativo) para quem usa leitor de tela.");
  return { image, imageAlt: alt };
}

function eventData(d) {
  if (!str(d.name) || !d.startsOn) throw new Error("Nome e data de início são obrigatórios.");
  return { name: str(d.name, 150), kind: S.EVENT_KINDS[d.kind] ? d.kind : "misto", startsOn: d.startsOn, endsOn: d.endsOn || d.startsOn,
    timeLabel: str(d.timeLabel, 30), location: str(d.location, 200), description: str(d.description, 3000), librasVideoUrl: str(d.librasVideoUrl, 300),
    published: !!d.published, registrationsOpen: !!d.registrationsOpen };
}

route("/painel/eventos", async () => {
  const events = await listSorted("events", [], "startsOn", "desc");
  return page("Eventos", "/painel/eventos", html`<h1>Eventos</h1>
    <p><a class="btn" href="#/painel/eventos/novo">Novo evento (passo a passo)</a></p>
    ${events.length ? "" : html`<p class="muted">Nenhum evento cadastrado ainda.</p>`}
    <div class="table-wrap"><table><thead><tr><th scope="col">Evento</th><th scope="col">Data</th><th scope="col">Tipo</th><th scope="col">Situação</th></tr></thead>
      <tbody>${events.map((e) => html`<tr><th scope="row"><a href="#/painel/eventos/${e.id}">${e.name}</a></th><td>${fmtDate(e.startsOn)}</td><td>${S.EVENT_KINDS[e.kind]}</td><td>${e.published ? "Publicado" : "Rascunho"}</td></tr>`)}</tbody></table></div>
`);
}, ADMIN);

route("/painel/eventos/:id", async ({ params }) => {
  const ev = await db.get("events", params.id);
  if (!ev) return notFound();
  const { general } = await getSettings();
  const [cats, entries, script, staff, users] = await Promise.all([db.list("categories", [["eventId", "==", ev.id]]), db.list("entries", [["eventId", "==", ev.id]]),
    S.stageScript(ev.id, { full: true }), db.list("staff", [["eventId", "==", ev.id]]), listSorted("users", [], "name")]);
  const people = users.filter((u) => u.role !== "admin" && u.active !== false).sort((a, b) => (b.supportInterest?.length || 0) - (a.supportInterest?.length || 0) || a.name.localeCompare(b.name));
  const teachers = users.filter((u) => u.role === "professor" && u.active !== false);
  cats.sort((a, b) => S.MOD[a.modality].name.localeCompare(S.MOD[b.modality].name) || a.ageMin - b.ageMin || (a.gender || "").localeCompare(b.gender || "") || (a.weightMax ?? 999) - (b.weightMax ?? 999));
  return page(ev.name, "/painel/eventos", html`<p><a href="#/painel/eventos">← Eventos</a></p><h1>${ev.name}</h1>
    <div class="actions">${ev.published ? html`<a class="btn secondary small" href="#/eventos/${ev.id}">Ver página pública</a>` : ""}
      <a class="btn secondary small" href="#/painel?evento=${ev.id}">Central do evento</a><a class="btn secondary small" href="#/painel/eventos/${ev.id}/roteiro">Roteiro de palco</a></div>
    <details><summary>Editar dados do evento</summary><form class="card" id="ev-edit">${eventForm(ev)}<button class="btn" type="submit">Salvar</button></form></details>
    <h2 id="categorias">Categorias e chaves</h2>
    ${cats.length ? html`<div class="table-wrap"><table><thead><tr><th scope="col">Categoria</th><th scope="col">Idade</th><th scope="col">Peso</th><th scope="col">Formato</th><th scope="col">Inscritos</th><th scope="col">Situação</th></tr></thead>
      <tbody>${cats.map((c) => { const es = entries.filter((e) => e.categoryId === c.id); const pend = es.filter((e) => e.status === "pendente").length; return html`<tr>
        <th scope="row"><a href="#/painel/categorias/${c.id}">${c.name}</a>${S.MOD[c.modality].adaptedOf ? html` <span class="tag accent">adaptada</span>` : ""}</th>
        <td>${c.ageMin}–${c.ageMax}</td><td>${catWeightLabel(c) || "—"}</td><td>${c.format === "grupos" ? "Grupos + mata-mata" : "Eliminatória simples"}</td><td>${es.length}${pend ? ` (${pend} pendentes)` : ""}</td>
        <td>${{ inscricoes: "Inscrições", chave_gerada: "Chave gerada", encerrada: "Encerrada" }[c.status]}</td></tr>`; })}</tbody></table></div>` : html`<p class="muted">Nenhuma categoria.</p>`}
    <details ${raw(cats.length ? "" : "open")}><summary>Nova categoria</summary><form class="card" id="cat-form">
      <div class="row">${C.select("modality", "Modalidade", Object.fromEntries(S.MODALITIES.filter((m) => m.kind !== "arte").map((m) => [m.code, m.name + (m.adaptedOf ? " (adaptada)" : "")])), ev.modality || "jiu_jitsu")}
        ${C.select("gender", "Sexo", { ...S.GENDERS, ambos: "Feminino e masculino (categorias separadas)" }, "misto")}${C.select("format", "Formato da chave", { eliminatoria: "Eliminatória simples", grupos: "Grupos + mata-mata" }, "eliminatoria")}</div>
      <fieldset><legend>Divisões por idade</legend>
        <p class="hint">Marque as divisões. Nas lutas (jiu-jitsu, taekwondo e adaptadas), com sexo feminino ou masculino, é criada uma categoria para cada peso da tabela da divisão
          (<a href="#/painel/regras">ver/editar tabela de peso</a>).</p>
        <div class="checks">${general.ageBands.map((b, i) => C.checkbox(`div_${i}`, `${b.name} (${b.min}–${b.max} anos)`, false))}</div>
        <details><summary>Ou uma faixa específica (sem usar as divisões)</summary><div class="row">${C.field("name", "Nome (opcional)", { id: "cat_name" })}
        ${C.field("ageMin", "Idade mínima", { type: "number", attrs: 'min="4" max="17"' })}${C.field("ageMax", "Idade máxima", { type: "number", attrs: 'min="4" max="17"' })}</div>
      <div class="row">${C.field("weightMin", "Peso mínimo (kg, lutas)", { type: "number", attrs: 'step="0.1"' })}${C.field("weightMax", "Peso máximo (kg, lutas)", { type: "number", attrs: 'step="0.1"' })}</div></details></fieldset>
      <div class="row">        ${C.field("matchMinutes", "Duração de cada luta/partida (min)", { type: "number", value: 10 })}</div>
      <div class="row">${C.field("groupCount", "Nº de grupos", { type: "number", value: 2 })}${C.field("qualifiers", "Classificados por grupo", { type: "number", value: 2 })}</div>
      <fieldset><legend>Libras</legend>
        ${C.checkbox("librasAuto", "Gerar a explicação da categoria em Libras automaticamente (avatar VLibras), a partir das características escolhidas acima", true)}
        <p class="hint">O texto é montado com a modalidade, idade, sexo, peso, formato da chave, duração e regras de pontuação. Depois de criar, você pode baixar o roteiro para um intérprete gravar o vídeo.</p>
        ${C.field("librasVideoUrl", "Vídeo com intérprete humano (URL, opcional)", { type: "url", id: "cat_libras" })}</fieldset>
      <button class="btn" type="submit">Criar</button></form></details>
    <h2 id="apresentacoes">Apresentações culturais</h2>
    ${script.length ? html`<div class="table-wrap"><table><thead><tr><th scope="col">Momento</th><th scope="col">Ordem</th><th scope="col">Título</th><th scope="col">Horário</th><th scope="col">Integrantes</th><th scope="col">Acessibilidade</th></tr></thead>
      <tbody>${script.map((p) => html`<tr><td>${S.SLOTS[p.slot]}</td><td>${p.order}</td><th scope="row"><a href="#/painel/apresentacoes/${p.id}">${p.title}</a></th><td>${fmtDate(p.scheduledAt)}</td><td>${p.members.length}</td><td>${C.accTags(p)}</td></tr>`)}</tbody></table></div>` : ""}
    <details ${raw(script.length ? "" : "open")}><summary>Nova apresentação</summary><form class="card" id="perf-form">${perfForm({}, teachers)}<button class="btn" type="submit">Cadastrar apresentação</button></form></details>
    <h2 id="apoio">Equipe de apoio e organização</h2>
    <p class="hint">Inclua alunos — inclusive com deficiência — como mesários, cronometristas, som/palco e fotografia. Quem marcou interesse no cadastro aparece primeiro.</p>
    ${staff.length ? html`<ul>${staff.map((s) => html`<li>${s.fullName || s.publicName} — ${S.SUPPORT_FUNCTIONS[s.function]}${s.notes ? ` (${s.notes})` : ""}
      <button class="btn small secondary" type="button" data-remove-staff="${s.id}">Remover<span class="visually-hidden"> ${s.fullName}</span></button></li>`)}</ul>` : ""}
    <form class="card" id="staff-form"><div class="row">
      ${C.select("uid", "Pessoa", Object.fromEntries(people.map((u) => [u.id, u.name + (u.supportInterest?.length ? ` — interesse: ${u.supportInterest.map((x) => S.SUPPORT_FUNCTIONS[x]).join(", ")}` : "")])), "", { id: "staff_user" })}
      ${C.select("function", "Função", S.SUPPORT_FUNCTIONS, "mesario")}${C.field("notes", "Observações (ex.: adaptação necessária)", { id: "staff_notes" })}</div>
      <button class="btn" type="submit">Adicionar à equipe</button></form>
    <h2>Excluir evento</h2><form class="card" id="ev-del">${C.field("confirm", "Digite EXCLUIR para apagar o evento com categorias, chaves e apresentações", { id: "ev_confirm" })}
      <button class="btn danger" type="submit">Excluir evento</button></form>`,
  (root) => {
    bindForm(root, "#ev-edit", async (d, form) => {
      await db.update("events", ev.id, { ...eventData(d), ...(await handleImage(form, d, ev)) });
      flash("Evento atualizado.", "success"); go(`/painel/eventos/${ev.id}`);
    });
    bindForm(root, "#cat-form", async (d) => {
      const mod = S.MOD[d.modality];
      if (!mod || mod.kind === "arte") throw new Error("Escolha uma modalidade esportiva.");
      const genders = d.gender === "ambos" ? ["feminino", "masculino"] : [S.GENDERS[d.gender] ? d.gender : "misto"];
      const common = { eventId: ev.id, modality: d.modality, format: d.format === "grupos" ? "grupos" : "eliminatoria",
        groupCount: int(d.groupCount, 2), qualifiers: int(d.qualifiers, 2), matchMinutes: int(d.matchMinutes, 10),
        librasVideoUrl: str(d.librasVideoUrl, 300), librasAuto: !!d.librasAuto, status: "inscricoes" };
      const divisions = general.ageBands.filter((_, i) => d[`div_${i}`]);
      if (divisions.length) {
        const { cats: made, missing } = divisionCategories({ modality: d.modality, divisions, genders, table: general.weightTable });
        for (const c of made) await db.add("categories", { ...common, ...c });
        flash(`${made.length} categorias criadas.` + (missing.length ? ` Sem tabela de peso (criadas sem peso): ${missing.join(", ")}. Cadastre os pesos em Pontuação e regras.` : ""), missing.length ? "info" : "success");
        return go(`/painel/eventos/${ev.id}`);
      }
      const amin = int(d.ageMin), amax = int(d.ageMax);
      if (amin == null || amax == null || !(amin >= 4 && amin <= amax && amax <= 17)) throw new Error("Marque ao menos uma divisão ou informe uma faixa de idade entre 4 e 17 anos.");
      if (genders.length > 1) throw new Error("Para criar feminino e masculino juntos, use as divisões.");
      const gl = genders[0] !== "misto" ? ` ${S.GENDERS[genders[0]]}` : "";
      const id = await db.add("categories", { ...common, gender: genders[0], weightMin: num(d.weightMin), weightMax: num(d.weightMax),
        name: str(d.name, 150) || `${mod.name} ${amin}–${amax} anos${gl}`, ageMin: amin, ageMax: amax });
      flash("Categoria criada.", "success"); go(`/painel/categorias/${id}`);
    });
    bindForm(root, "#perf-form", async (d) => {
      const data = perfData(d);
      const id = await db.add("performances", { ...data, eventId: ev.id, members: [] });
      flash("Apresentação cadastrada. Agora adicione os integrantes.", "success"); go(`/painel/apresentacoes/${id}`);
    });
    bindForm(root, "#staff-form", async (d) => {
      const u = users.find((x) => x.id === d.uid);
      if (!u || !S.SUPPORT_FUNCTIONS[d.function]) throw new Error("Escolha a pessoa e a função.");
      await db.add("staff", { eventId: ev.id, uid: u.id, fullName: u.name, publicName: S.publicName(u), function: d.function, notes: str(d.notes, 300) });
      flash("Pessoa adicionada à equipe de apoio.", "success"); go(`/painel/eventos/${ev.id}`);
    });
    root.querySelectorAll("[data-remove-staff]").forEach((b) => b.addEventListener("click", async () => { await db.remove("staff", b.dataset.removeStaff); go(`/painel/eventos/${ev.id}`); }));
    bindForm(root, "#ev-del", async (d, form) => {
      if (!confirmText(form)) throw new Error("Digite EXCLUIR para confirmar a exclusão do evento.");
      for (const c of ["matches", "categories", "entries", "performances", "staff"]) for (const x of await db.list(c, [["eventId", "==", ev.id]])) await db.remove(c, x.id);
      await removeImage(ev.image);
      await db.remove("events", ev.id);
      flash("Evento excluído.", "success"); go("/painel/eventos");
    });
  });
}, ADMIN);

// ------------------------------------------------------------------ Categoria e chave
route("/painel/categorias/:id", async ({ params }) => {
  const cat = await db.get("categories", params.id);
  if (!cat) return notFound();
  const ev = await db.get("events", cat.eventId);
  const mod = S.MOD[cat.modality], teamBased = mod.kind === "coletivo";
  const entries = (await db.list("entries", [["categoryId", "==", cat.id]])).sort((a, b) => a.status.localeCompare(b.status) || (a.seed ?? 9999) - (b.seed ?? 9999));
  const names = await S.entryLabels(entries, { full: true });
  const users = await db.list("users");
  const usersById = Object.fromEntries(users.map((u) => [u.id, u]));
  const [rounds, groups] = await Promise.all([S.knockoutRounds(cat.id), S.groupTables(cat.id, names)]);
  const taken = new Set(entries.map((e) => e.userId).filter(Boolean));
  const eligible = [];
  if (!teamBased) for (const u of users.filter((u) => ["atleta", "lutador", "artista"].includes(u.role) && u.active !== false && !taken.has(u.id))) {
    if (!(await S.eligibilityProblem(u, cat, ev))) eligible.push(u);
  }
  const teams = teamBased ? (await db.list("teams", [["modality", "==", cat.modality]])).filter((t) => !entries.some((e) => e.teamId === t.id)) : [];
  const scorers = teamBased ? await S.topScorers(cat.id, { full: true }) : [];
  const librasEx = explainCategory(cat, ev, await getSettings());
  return page(cat.name, "/painel/eventos", html`<p><a href="#/painel/eventos/${ev.id}">← ${ev.name}</a></p><h1>${cat.name}</h1>
    <p>${mod.name} · ${cat.ageMin}–${cat.ageMax} anos · ${S.GENDERS[cat.gender]}${catWeightLabel(cat) ? ` · ${catWeightLabel(cat)}` : ""}${mod.adaptedOf ? html` · <span class="tag accent">adaptada</span>` : ""}</p>
    <details><summary>Editar categoria</summary><form class="card" id="cat-edit">${C.field("name", "Nome", { value: cat.name })}
      <div class="row">${C.select("format", "Formato", { eliminatoria: "Eliminatória simples", grupos: "Grupos + mata-mata" }, cat.format)}
        ${C.field("groupCount", "Nº de grupos", { type: "number", value: cat.groupCount })}${C.field("qualifiers", "Classificados por grupo", { type: "number", value: cat.qualifiers })}
        ${C.field("matchMinutes", "Duração (min)", { type: "number", value: cat.matchMinutes })}</div>
      ${C.checkbox("librasAuto", "Mostrar a explicação automática em Libras (avatar VLibras)", cat.librasAuto !== false)}
      ${C.field("librasVideoUrl", "Vídeo com intérprete humano (URL, opcional)", { type: "url", value: cat.librasVideoUrl })}<button class="btn" type="submit">Salvar</button></form></details>
    <details ${raw(cat.librasAuto !== false ? "open" : "")}><summary>Explicação em Libras desta categoria</summary>
      <div class="actions"><button class="btn secondary small" type="button" id="dl-roteiro">Baixar roteiro para intérprete (.txt)</button>
        ${ev.published ? html`<a class="btn secondary small" href="#/chaves/${cat.id}">Ver como o público vê</a>` : ""}</div>
      ${C.librasBlock(`adm-${cat.id}`, librasEx, cat.librasVideoUrl)}</details>
    <h2>Inscrições</h2><form id="seeds-form"><div class="table-wrap"><table><caption class="visually-hidden">Inscrições da categoria</caption>
      <thead><tr><th scope="col">Competidor</th><th scope="col">Idade hoje</th><th scope="col">Situação</th><th scope="col">Cabeça de chave</th><th scope="col">Ações</th></tr></thead>
      <tbody>${entries.length ? entries.map((e) => html`<tr><th scope="row">${names[e.id]}</th><td>${e.userId ? ageToday(usersById[e.userId]?.birthDate) ?? "—" : "—"}</td><td>${e.status}</td>
        <td><label class="visually-hidden" for="seed_${e.id}">Cabeça de chave de ${names[e.id]}</label><input id="seed_${e.id}" name="seed_${e.id}" type="number" min="1" value="${e.seed ?? ""}" style="max-width:6rem"></td>
        <td>${["confirmada", "recusada"].filter((s) => s !== e.status).map((s) => html`<button class="btn small secondary" type="button" data-entry="${e.id}" data-status="${s}">${s === "confirmada" ? "Confirmar" : "Recusar"}<span class="visually-hidden"> ${names[e.id]}</span></button> `)}
          <button class="btn small danger" type="button" data-entry="${e.id}" data-status="remove">Remover<span class="visually-hidden"> ${names[e.id]}</span></button></td></tr>`)
        : html`<tr><td colspan="5">Nenhuma inscrição.</td></tr>`}</tbody></table></div>
      ${entries.length ? html`<button class="btn small" type="submit">Salvar cabeças de chave</button>` : ""}</form>
    ${teamBased ? html`<form class="card" style="margin-top:1rem" id="add-team">${teams.length ? C.select("teamId", "Inscrever equipe", Object.fromEntries(teams.map((t) => [t.id, t.name])), "")
        : html`<p class="hint">Nenhuma equipe de ${mod.name} disponível. Cadastre em <a href="#/painel/equipes">Equipes</a>.</p>`}
        <button class="btn" type="submit" ${raw(teams.length ? "" : "disabled")}>Inscrever equipe</button></form>`
      : html`<form class="card" style="margin-top:1rem" id="add-user">${C.select("userId", "Inscrever aluno elegível", Object.fromEntries(eligible.map((u) => [u.id, u.name + (u.affiliation ? ` (${u.affiliation})` : "")])), "",
          { hint: "Lista filtrada por idade de referência, sexo, peso e modalidade vinculada ao perfil." })}
        <button class="btn" type="submit" ${raw(eligible.length ? "" : "disabled")}>Inscrever</button></form>`}
    <h2>Chave</h2><div class="actions"><button class="btn" type="button" id="gen">${rounds.length || groups.length ? "Gerar novamente" : "Gerar chave"}</button>
      ${cat.format === "grupos" && groups.length ? html`<button class="btn secondary" type="button" id="ko">Gerar mata-mata com os classificados</button>` : ""}
      <span class="hint">Gerar de novo apaga resultados já lançados nesta categoria.</span></div>
    ${groups.length ? C.groupView(groups, names, true) : ""}${rounds.length ? html`<h3>Mata-mata</h3>${C.bracketView(rounds, names, true, { title: ev?.name || "", subtitle: cat.name, gender: cat.gender })}` : ""}
    ${scorers.length ? html`<h2>Artilharia / pontuação individual</h2><ol>${scorers.map((s) => html`<li>${s.name} — ${s.total}</li>`)}</ol>` : ""}
    <h2>Excluir categoria</h2><button class="btn danger small" type="button" id="cat-del">Excluir categoria e chave</button>`,
  (root) => {
    const reload = () => go(`/painel/categorias/${cat.id}`);
    root.querySelector("#dl-roteiro").addEventListener("click", () => download(`roteiro-libras-${slugify(cat.name)}.txt`,
      `ROTEIRO PARA INTÉRPRETE DE LIBRAS\n${ev.name}\n\n${explanationText(librasEx)}\n\nDepois de gravar, publique o vídeo (por exemplo, no YouTube) e cole o link no campo "Vídeo com intérprete humano" desta categoria.\n`, "text/plain;charset=utf-8"));
    bindForm(root, "#cat-edit", async (d) => {
      await db.update("categories", cat.id, { name: str(d.name, 150) || cat.name, format: d.format === "grupos" ? "grupos" : "eliminatoria", groupCount: int(d.groupCount, 2),
        qualifiers: int(d.qualifiers, 2), matchMinutes: int(d.matchMinutes, 10), librasVideoUrl: str(d.librasVideoUrl, 300), librasAuto: !!d.librasAuto });
      flash("Categoria atualizada.", "success"); reload();
    });
    bindForm(root, "#seeds-form", async (d) => {
      for (const e of entries) await db.update("entries", e.id, { seed: int(d[`seed_${e.id}`]) });
      flash("Cabeças de chave salvos.", "success"); reload();
    });
    root.querySelectorAll("[data-entry]").forEach((b) => b.addEventListener("click", async () => {
      if (b.dataset.status === "remove") await db.remove("entries", b.dataset.entry); else await db.update("entries", b.dataset.entry, { status: b.dataset.status });
      reload();
    }));
    bindForm(root, "#add-user", async (d) => {
      const u = usersById[d.userId];
      if (!u) throw new Error("Escolha um aluno.");
      await db.add("entries", { categoryId: cat.id, eventId: cat.eventId, userId: u.id, teamId: null, publicName: S.publicName(u), status: "confirmada", seed: null });
      flash("Inscrição adicionada.", "success"); reload();
    });
    bindForm(root, "#add-team", async (d) => {
      const t = teams.find((x) => x.id === d.teamId);
      if (!t) throw new Error("Escolha uma equipe.");
      await db.add("entries", { categoryId: cat.id, eventId: cat.eventId, userId: null, teamId: t.id, publicName: t.name, status: "confirmada", seed: null });
      flash("Equipe inscrita.", "success"); reload();
    });
    const act = (sel, fn, msg) => root.querySelector(sel)?.addEventListener("click", async (e) => {
      e.target.disabled = true;
      try { await fn(); flash(msg, "success"); reload(); } catch (err) { flash(err.message, "error"); reload(); }
    });
    act("#gen", () => S.generateBracket(cat.id), "Chave gerada.");
    act("#ko", () => S.generateKnockoutFromGroups(cat.id), "Mata-mata gerado a partir dos grupos.");
    root.querySelector("#cat-del").addEventListener("click", async () => {
      if (!window.confirm || !confirm("Excluir a categoria, as inscrições e a chave?")) return;
      for (const c of ["matches", "entries"]) for (const x of await db.list(c, [["categoryId", "==", cat.id]])) await db.remove(c, x.id);
      await db.remove("categories", cat.id);
      flash("Categoria excluída.", "success"); go(`/painel/eventos/${ev.id}`);
    });
  });
}, ADMIN);

// ------------------------------------------------------------------ Súmula
route("/painel/partidas/:id", async ({ params }) => {
  const m = await db.get("matches", params.id);
  if (!m) return notFound();
  const cat = await db.get("categories", m.categoryId);
  const engine = S.MOD[cat.modality].scoring;
  const entries = (await Promise.all([m.a, m.b, m.winner].filter(Boolean).map((id) => db.get("entries", id)))).filter(Boolean);
  const names = await S.entryLabels(entries, { full: true });
  const na = names[m.a] || "A definir", nb = names[m.b] || "A definir";
  const { scoring } = await getSettings();
  const tkd = scoring.taekwondo;
  let preview = null, previewError = null;
  try { preview = await S.computeResult(m, cat); } catch (e) { previewError = e.message; }
  const logByIndex = Object.fromEntries((preview?.log || []).map((l) => [l.index, l]));
  const players = { a: [], b: [] };
  const pnames = {};
  if (!["bjj", "taekwondo"].includes(engine)) {
    const users = Object.fromEntries((await db.list("users")).map((u) => [u.id, u.name]));
    for (const side of ["a", "b"]) {
      const e = entries.find((x) => x.id === m[side]);
      const team = e?.teamId ? await db.get("teams", e.teamId) : null;
      players[side] = (team?.members || []).map((mb) => ({ ...mb, name: users[mb.uid] || mb.publicName }));
      for (const p of players[side]) pnames[p.uid] = p.name;
    }
  }
  const team = !["bjj", "taekwondo"].includes(engine);
  const extra = m.extra || {};
  const labels = engine === "bjj" ? BJJ_LABELS : engine === "taekwondo" ? TKD_LABELS : TEAM_LABELS;
  const kinds = engine === "bjj" ? Object.keys(BJJ_LABELS) : engine === "taekwondo" ? Object.keys(TKD_LABELS)
    : Object.keys(TEAM_LABELS).filter((k) => (["goal", "own_goal"].includes(k) && ["futebol", "futsal"].includes(engine)) || (k === "basket" && engine === "basquete") || (k === "point" && engine === "volei") || ["yellow", "red", "note"].includes(k));
  const pick = (name, legend, cur) => html`<fieldset><legend>${legend}</legend>
    <label class="check"><input type="radio" name="${name}" value="" ${raw(!cur ? "checked" : "")}> Não se aplica</label>
    <label class="check"><input type="radio" name="${name}" value="a" ${raw(cur === "a" ? "checked" : "")}> ${na}</label>
    <label class="check"><input type="radio" name="${name}" value="b" ${raw(cur === "b" ? "checked" : "")}> ${nb}</label></fieldset>`;
  const open = m.status !== "encerrada" && m.a && m.b;
  return page("Súmula", "/painel/eventos", html`<p><a href="#/painel/categorias/${cat.id}">← ${cat.name}</a></p><h1>Súmula: ${na} × ${nb}</h1>
    <p>${S.MOD[cat.modality].name} · ${m.stage === "grupo" ? `Grupo ${m.groupLabel}, rodada ${m.round}` : `Mata-mata, fase ${m.round}`} · <strong>${{ pendente: "Em aberto", encerrada: "Encerrada", bye: "BYE" }[m.status] || m.status}</strong></p>
    <section aria-labelledby="placar-h"><h2 id="placar-h">Placar ${m.status !== "encerrada" ? "(parcial, calculado)" : ""}</h2>
      ${previewError ? html`<p class="flash error">${previewError}</p>` : ""}
      ${preview ? html`<div class="score-board" aria-live="polite"><div><div class="name">${na}</div><div class="num">${preview.score_a}</div></div><div aria-hidden="true">×</div>
        <div><div class="name">${nb}</div><div class="num">${preview.score_b}</div></div></div>
        <p>${engine === "bjj" ? `Vantagens: ${preview.advantages.a} × ${preview.advantages.b} · Penalidades: ${preview.penalties.a} × ${preview.penalties.b}`
          : engine === "taekwondo" ? `${preview.rounds_won ? `Rounds vencidos: ${preview.rounds_won.a} × ${preview.rounds_won.b} · Pontos totais: ${preview.points.a} × ${preview.points.b} · ` : ""}Gam-jeom: ${preview.gamjeom.a} × ${preview.gamjeom.b}${preview.golden_points && (preview.golden_points.a || preview.golden_points.b) ? ` · Golden point: ${preview.golden_points.a} × ${preview.golden_points.b}` : ""}`
          : engine === "volei" && (preview.sets || []).length ? `Sets: ${preview.sets.map((s) => s.join("-")).join(", ")}` : ""}</p>
        <p><strong>Situação:</strong> ${preview.winner === "a" ? `vitória de ${na}` : preview.winner === "b" ? `vitória de ${nb}` : preview.winner === "draw" ? "empate" : "sem vencedor definido"}
          ${preview.method ? ` (${METHOD_LABELS[preview.method] || preview.method})` : ""}${preview.pending ? ` — ${preview.pending}` : ""}</p>` : ""}</section>
    <section aria-labelledby="agenda-h"><h2 id="agenda-h">Horário e local</h2><form class="card" id="sched"><div class="row">
      ${C.field("scheduledAt", "Início", { type: "datetime-local", value: m.scheduledAt })}${C.field("durationMin", "Duração (min)", { type: "number", value: m.durationMin })}
      ${C.field("venue", "Quadra / tatame / área", { value: m.venue })}</div><button class="btn" type="submit">Salvar horário</button>
      <p class="hint">O sistema verifica conflito com apresentações e outras partidas de todos os envolvidos.</p></form></section>
    ${open ? html`<section aria-labelledby="lancar-h"><h2 id="lancar-h">Lançar na súmula</h2><form class="card" id="add-ev"><div class="row">
      <fieldset style="flex:1 1 220px"><legend>${team ? "Equipe" : "Atleta"}</legend><label class="check"><input type="radio" name="side" value="a" checked> ${na}</label>
        <label class="check"><input type="radio" name="side" value="b"> ${nb}</label></fieldset>
      ${C.select("kind", "Lance", Object.fromEntries(kinds.map((k) => [k, labels[k] + (engine === "taekwondo" && tkd.points[k] ? ` — ${tkd.points[k]} pt` : "")])), kinds[0])}
      ${engine === "taekwondo" ? C.select("round", "Round", Object.fromEntries([...Array(tkd.rounds)].map((_, i) => [i + 1, `${i + 1}º round`]).concat(tkd.mode === "cumulativo" ? [[tkd.rounds + 1, "Golden point"]] : [])), 1) : ""}
      ${team ? html`<div class="field"><label for="player">Jogador(a)</label><select id="player" name="player_id"><option value="">—</option>
          ${["a", "b"].map((s) => html`<optgroup label="${s === "a" ? na : nb}">${players[s].map((p) => html`<option value="${p.uid}">${p.number ? `${p.number} · ` : ""}${p.name}</option>`)}</optgroup>`)}</select></div>
        ${engine === "basquete" ? C.select("value", "Valor da cesta", { 2: "2", 3: "3", 1: "1" }, 2) : ""}${C.field("minute", "Minuto", { attrs: 'inputmode="numeric" style="max-width:7rem"' })}${C.field("note", "Observação")}` : ""}
      </div><button class="btn" type="submit">Registrar lance</button></form></section>` : ""}
    <section aria-labelledby="sumula"><h2 id="sumula">Súmula (${(m.log || []).length} lances)</h2>
      ${(m.log || []).length ? html`<div class="table-wrap"><table><thead><tr><th scope="col">#</th><th scope="col">Lado</th><th scope="col">Lance</th>${engine === "taekwondo" ? html`<th scope="col">Round</th>` : ""}${team ? html`<th scope="col">Jogador</th>` : ""}<th scope="col">Efeito</th><th scope="col"><span class="visually-hidden">Ações</span></th></tr></thead>
        <tbody>${m.log.map((e, i) => { const lg = logByIndex[i]; const side = e.athlete || e.team; return html`<tr><td>${i + 1}</td><td>${side === "a" ? na : side === "b" ? nb : "—"}</td>
          <td>${labels[e.kind] || e.kind}${e.kind === "basket" ? ` (${e.value})` : ""}${e.note ? ` — ${e.note}` : ""}</td>
          ${engine === "taekwondo" ? html`<td>${tkd.mode === "cumulativo" && e.round === tkd.rounds + 1 ? "GP" : e.round}</td>` : ""}
          ${team ? html`<td>${pnames[e.player_id] || "—"}${e.minute ? ` (${e.minute}')` : ""}</td>` : ""}
          <td>${lg ? `${lg.points ? `+${lg.points} ` : ""}${lg.note}` : ""}</td>
          <td>${m.status !== "encerrada" ? html`<button class="btn small secondary" type="button" data-remove-ev="${i}">Remover<span class="visually-hidden"> lance ${i + 1}</span></button>` : ""}</td></tr>`; })}</tbody></table></div>`
        : html`<p class="muted">Nenhum lance registrado.</p>`}</section>
    ${open ? html`<section aria-labelledby="extra-h"><h2 id="extra-h">Desempate e dados complementares</h2><form class="card" id="extra">
      ${engine === "bjj" ? pick("refereeDecision", "Decisão do árbitro (empate em pontos, vantagens e penalidades)", extra.refereeDecision)
        : engine === "taekwondo" ? (tkd.mode === "cumulativo" ? pick("superiorityDecision", "Decisão de superioridade (golden point sem pontos)", extra.superiorityDecision)
          : html`${[1, 2, 3].map((r) => pick(`round_${r}`, `Decisão do árbitro no ${r}º round (empate total)`, (extra.roundDecisions || {})[r]))}`)
        : engine === "volei" ? C.field("sets", "Placar dos sets", { value: (extra.sets || []).map((s) => `${s.a}-${s.b}`).join(", "), hint: "Ex.: 25-20, 23-25, 15-13 (pontos do primeiro listado primeiro)." })
        : m.stage === "mata" && ["futebol", "futsal"].includes(engine) ? html`<div class="row">${C.field("pen_a", `Pênaltis — ${na}`, { type: "number", value: extra.penalties?.[0] ?? "" })}${C.field("pen_b", `Pênaltis — ${nb}`, { type: "number", value: extra.penalties?.[1] ?? "" })}</div>`
        : html`<p class="muted">Nada adicional para esta modalidade.</p>`}
      <button class="btn secondary" type="submit">Salvar</button></form></section>` : ""}
    <section aria-labelledby="fim-h"><h2 id="fim-h">Encerramento</h2><div class="actions">
      ${m.status === "encerrada" ? html`<button class="btn secondary" type="button" id="reopen">Reabrir para correção</button>`
        : m.a && m.b ? html`<button class="btn" type="button" id="finalize">Encerrar e avançar vencedor</button>
          <button class="btn secondary" type="button" data-wo="a">W.O. — vitória de ${na}</button><button class="btn secondary" type="button" data-wo="b">W.O. — vitória de ${nb}</button>`
        : html`<p class="muted">Aguardando os vencedores das partidas anteriores.</p>`}</div></section>`,
  (root) => {
    const reload = () => go(`/painel/partidas/${m.id}`);
    const validateAndSave = async (patch) => {
      const next = { ...m, ...patch };
      await S.computeResult(next, cat); // lança erro se a súmula ficar inválida
      await db.update("matches", m.id, patch);
    };
    bindForm(root, "#sched", async (d) => {
      const start = d.scheduledAt || null, duration = int(d.durationMin, m.durationMin || 10);
      const es = await Promise.all([m.a, m.b].filter(Boolean).map((id) => db.get("entries", id)));
      const people = (await Promise.all(es.map((e) => S.entryPeople(e)))).flat();
      const { found, block } = await S.checkSchedule("match", m.id, start, duration, people);
      if (found.length) {
        const desc = await S.describeConflicts(found);
        if (block) throw new Error(`Conflito de horário — agendamento bloqueado: ${desc}`);
        flash(`Atenção, conflito de horário: ${desc}`, "warning");
      }
      await db.update("matches", m.id, { scheduledAt: start, durationMin: duration, venue: str(d.venue, 80) });
      flash("Horário salvo.", "success"); reload();
    });
    bindForm(root, "#add-ev", async (d) => {
      let ev;
      if (engine === "bjj") ev = { athlete: d.kind === "reset" ? null : d.side, kind: d.kind };
      else if (engine === "taekwondo") ev = { athlete: d.side, kind: d.kind, round: int(d.round, 1) };
      else ev = { team: d.side, kind: d.kind, player_id: d.player_id || null, value: int(d.value, 2), note: str(d.note, 300), minute: str(d.minute, 10) };
      await validateAndSave({ log: [...(m.log || []), ev] });
      reload();
    });
    root.querySelectorAll("[data-remove-ev]").forEach((b) => b.addEventListener("click", async () => {
      const log = [...m.log]; log.splice(Number(b.dataset.removeEv), 1);
      await db.update("matches", m.id, { log }); reload();
    }));
    bindForm(root, "#extra", async (d) => {
      const ex = { ...extra };
      if ("refereeDecision" in d) ex.refereeDecision = d.refereeDecision || null;
      if ("superiorityDecision" in d) ex.superiorityDecision = d.superiorityDecision || null;
      if ("round_1" in d) ex.roundDecisions = Object.fromEntries([1, 2, 3].filter((r) => d[`round_${r}`]).map((r) => [r, d[`round_${r}`]]));
      if ("pen_a" in d) ex.penalties = d.pen_a !== "" && d.pen_b !== "" ? [int(d.pen_a), int(d.pen_b)] : null;
      if ("sets" in d) {
        ex.sets = str(d.sets).split(/[,;]/).map((x) => x.trim()).filter(Boolean).map((x) => {
          const mm = x.match(/^(\d+)\s*[-x×]\s*(\d+)$/); if (!mm) throw new Error("Use o formato 25-20, 23-25, 15-13");
          return { a: Number(mm[1]), b: Number(mm[2]) };
        });
      }
      await validateAndSave({ extra: ex });
      flash("Dados complementares salvos.", "success"); reload();
    });
    const act = (el, fn) => el?.addEventListener("click", async () => { el.disabled = true; try { await fn(); } catch (e) { flash(e.message, "error"); } reload(); });
    act(root.querySelector("#finalize"), async () => { const r = await S.finalizeMatch(m.id); flash(`Resultado registrado (${METHOD_LABELS[r.method] || r.method}). Vencedor avançou na chave.`, "success"); });
    act(root.querySelector("#reopen"), async () => { await S.reopenMatch(m.id); flash("Partida reaberta para correção.", "info"); });
    root.querySelectorAll("[data-wo]").forEach((b) => act(b, async () => { await S.finalizeMatch(m.id, b.dataset.wo); flash("W.O. registrado.", "success"); }));
  });
}, ADMIN);

// ------------------------------------------------------------------ Equipes
route("/painel/equipes", async () => {
  const [teams, users] = await Promise.all([listSorted("teams", [], "name"), db.list("users")]);
  const teachers = users.filter((u) => u.role === "professor" && u.active !== false);
  const uname = Object.fromEntries(users.map((u) => [u.id, u.name]));
  return page("Equipes", "/painel/equipes", html`<h1>Equipes (esportes coletivos)</h1>
    <div class="table-wrap"><table><thead><tr><th scope="col">Equipe</th><th scope="col">Modalidade</th><th scope="col">Técnico(a)</th><th scope="col">Atletas</th></tr></thead>
      <tbody>${teams.length ? teams.map((t) => html`<tr><th scope="row"><a href="#/painel/equipes/${t.id}">${t.name}</a></th><td>${S.MOD[t.modality].name}</td><td>${uname[t.coachId] || "—"}</td><td>${(t.members || []).length}</td></tr>`)
        : html`<tr><td colspan="4">Nenhuma equipe.</td></tr>`}</tbody></table></div>
    <h2>Nova equipe</h2><form class="card" id="team-form"><div class="row">${C.field("name", "Nome da equipe", { required: true })}
      ${C.select("modality", "Modalidade", Object.fromEntries(S.MODALITIES.filter((m) => m.kind === "coletivo").map((m) => [m.code, m.name])), "futsal")}
      ${C.select("coachId", "Técnico(a)", { "": "—", ...Object.fromEntries(teachers.map((t) => [t.id, t.name])) }, "")}</div><button class="btn" type="submit">Criar equipe</button></form>`,
  (root) => bindForm(root, "#team-form", async (d) => {
    if (!str(d.name) || S.MOD[d.modality]?.kind !== "coletivo") throw new Error("Informe nome e modalidade coletiva.");
    const id = await db.add("teams", { name: str(d.name, 100), modality: d.modality, coachId: d.coachId || null, members: [], memberIds: [] });
    go(`/painel/equipes/${id}`);
  }));
}, ADMIN);

route("/painel/equipes/:id", async ({ params }) => {
  const t = await db.get("teams", params.id);
  if (!t) return notFound();
  const users = await listSorted("users", [], "name");
  const byId = Object.fromEntries(users.map((u) => [u.id, u]));
  const memberIds = new Set(t.memberIds || []);
  const candidates = users.filter((u) => u.active !== false && (u.modalities || {})[t.modality] && !memberIds.has(u.id));
  return page(t.name, "/painel/equipes", html`<p><a href="#/painel/equipes">← Equipes</a></p><h1>${t.name}</h1><p>${S.MOD[t.modality].name}</p>
    <h2>Elenco</h2><div class="table-wrap"><table><thead><tr><th scope="col">Nº</th><th scope="col">Atleta</th><th scope="col">Idade</th><th scope="col"><span class="visually-hidden">Ações</span></th></tr></thead>
      <tbody>${(t.members || []).length ? t.members.map((mb) => html`<tr><td>${mb.number ?? "—"}</td><th scope="row">${byId[mb.uid]?.name || mb.publicName}</th><td>${ageToday(byId[mb.uid]?.birthDate) ?? "—"}</td>
        <td><button class="btn small secondary" type="button" data-remove="${mb.uid}">Remover<span class="visually-hidden"> ${byId[mb.uid]?.name}</span></button></td></tr>`)
        : html`<tr><td colspan="4">Sem atletas.</td></tr>`}</tbody></table></div>
    <h2>Adicionar atleta</h2><form class="card" id="add-member"><div class="row">
      ${C.select("uid", `Atleta (com ${S.MOD[t.modality].name} no perfil)`, Object.fromEntries(candidates.map((u) => [u.id, `${u.name} (${ageToday(u.birthDate) ?? "?"} anos)`])), "")}
      ${C.field("number", "Número da camisa", { type: "number", attrs: 'min="0" max="99"' })}</div><button class="btn" type="submit" ${raw(candidates.length ? "" : "disabled")}>Adicionar</button></form>
    <h2>Excluir equipe</h2><button class="btn danger small" type="button" id="team-del">Excluir equipe</button>`,
  (root) => {
    const save = async (members) => { await db.update("teams", t.id, { members, memberIds: members.map((m) => m.uid) }); go(`/painel/equipes/${t.id}`); };
    bindForm(root, "#add-member", async (d) => {
      const u = byId[d.uid]; if (!u) throw new Error("Escolha um atleta.");
      await save([...(t.members || []), { uid: u.id, number: int(d.number), publicName: S.publicName(u) }]);
    });
    root.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", () => save(t.members.filter((m) => m.uid !== b.dataset.remove))));
    root.querySelector("#team-del").addEventListener("click", async () => {
      if (!confirm("Excluir a equipe?")) return;
      await db.remove("teams", t.id); go("/painel/equipes");
    });
  });
}, ADMIN);

// ------------------------------------------------------------------ Apresentações
function perfForm(p, teachers) {
  return html`${C.field("title", "Título da apresentação", { value: p.title, required: true, id: "perf_title" })}
    <div class="row">${C.select("modality", "Modalidade", { musica: "Música", danca: "Dança" }, p.modality || "danca", { id: "p_modality" })}
      ${C.select("slot", "Momento no evento", S.SLOTS, p.slot || "intervalo")}${C.field("order", "Ordem de entrada", { type: "number", value: p.order ?? 1, attrs: 'min="1"' })}</div>
    <div class="row">${C.field("scheduledAt", "Horário", { type: "datetime-local", value: p.scheduledAt, id: "perf_start", hint: "Usado para detectar conflito com jogos e lutas dos integrantes." })}
      ${C.field("durationMin", "Duração (min)", { type: "number", value: p.durationMin ?? 5, attrs: 'min="1"' })}</div>
    <fieldset><legend>Ficha técnica</legend>${C.field("soundtrack", "Trilha sonora (música, artista, arquivo)", { value: p.soundtrack })}
      ${C.textarea("equipment", "Equipamentos necessários", { value: p.equipment, rows: 2 })}
      ${C.select("teacherId", "Professor(a) responsável", { "": "—", ...Object.fromEntries(teachers.map((t) => [t.id, t.name])) }, p.teacherId || "")}
      ${C.textarea("notes", "Observações de palco", { value: p.notes, rows: 2, id: "p_notes" })}</fieldset>
    <fieldset><legend>Recursos de acessibilidade</legend>${C.checkbox("accLibras", "Intérprete de Libras no palco", !!p.accLibras)}
      ${C.checkbox("accAudiodesc", "Audiodescrição da coreografia", !!p.accAudiodesc)}${C.checkbox("accSeating", "Reserva de espaço acessível na plateia", !!p.accSeating)}
      ${C.field("accNotes", "Detalhes de acessibilidade", { value: p.accNotes })}${C.field("librasVideoUrl", "Vídeo em Libras sobre a apresentação (URL)", { type: "url", value: p.librasVideoUrl, id: "perf_libras" })}</fieldset>`;
}
function perfData(d) {
  if (!str(d.title) || !["musica", "danca"].includes(d.modality)) throw new Error("Informe título e modalidade (música ou dança).");
  return { title: str(d.title, 150), modality: d.modality, slot: S.SLOTS[d.slot] ? d.slot : "intervalo", order: int(d.order, 1), durationMin: int(d.durationMin, 5),
    scheduledAt: d.scheduledAt || null, soundtrack: str(d.soundtrack, 300), equipment: str(d.equipment, 1000), notes: str(d.notes, 1000), teacherId: d.teacherId || null,
    accLibras: !!d.accLibras, accAudiodesc: !!d.accAudiodesc, accSeating: !!d.accSeating, accNotes: str(d.accNotes, 500), librasVideoUrl: str(d.librasVideoUrl, 300) };
}

route("/painel/apresentacoes/:id", async ({ params }) => {
  const p = await db.get("performances", params.id);
  if (!p) return notFound();
  const ev = await db.get("events", p.eventId);
  const users = await listSorted("users", [], "name");
  const byId = Object.fromEntries(users.map((u) => [u.id, u]));
  const memberIds = new Set((p.members || []).map((m) => m.uid));
  const candidates = users.filter((u) => ["artista", "atleta", "lutador"].includes(u.role) && u.active !== false && !memberIds.has(u.id));
  const teachers = users.filter((u) => u.role === "professor" && u.active !== false);
  const checkConflicts = async (start, duration, people) => {
    const { found, block } = await S.checkSchedule("performance", p.id, start, duration, people);
    if (!found.length) return;
    const desc = await S.describeConflicts(found);
    if (block) throw new Error(`Conflito de horário — agendamento bloqueado: ${desc}`);
    flash(`Atenção, conflito de horário: ${desc}`, "warning");
  };
  return page(p.title, "/painel/eventos", html`<p><a href="#/painel/eventos/${ev.id}">← ${ev.name}</a></p><h1>${p.title}</h1>${C.accTags(p)}
    <h2>Integrantes</h2><ul>${(p.members || []).length ? p.members.map((mb) => html`<li>${byId[mb.uid]?.name || mb.publicName}${mb.part ? ` — ${mb.part}` : ""}
      <button class="btn small secondary" type="button" data-remove="${mb.uid}">Remover<span class="visually-hidden"> ${byId[mb.uid]?.name}</span></button></li>`) : html`<li class="muted">Nenhum integrante.</li>`}</ul>
    <form class="card" id="add-member"><div class="row">${C.select("uid", "Aluno(a)", Object.fromEntries(candidates.map((u) => [u.id, u.name])), "", { id: "member" })}
      ${C.field("part", "Função (instrumento, voz, papel)")}</div><button class="btn" type="submit">Adicionar integrante</button>
      <p class="hint">Alunos atletas e lutadores também podem se apresentar; o sistema avisa se houver jogo ou luta no mesmo horário.</p></form>
    <h2>Ficha técnica</h2><form class="card" id="perf-edit">${perfForm(p, teachers)}<button class="btn" type="submit">Salvar</button></form>
    <button class="btn danger small" type="button" id="perf-del" style="margin-top:1rem">Excluir apresentação</button>`,
  (root) => {
    const reload = () => go(`/painel/apresentacoes/${p.id}`);
    bindForm(root, "#add-member", async (d) => {
      const u = byId[d.uid]; if (!u) throw new Error("Escolha um aluno.");
      await checkConflicts(p.scheduledAt, p.durationMin, [u.id]);
      await db.update("performances", p.id, { members: [...(p.members || []), { uid: u.id, publicName: S.publicName(u), part: str(d.part, 80) }] });
      reload();
    });
    root.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", async () => {
      await db.update("performances", p.id, { members: p.members.filter((m) => m.uid !== b.dataset.remove) }); reload();
    }));
    bindForm(root, "#perf-edit", async (d) => {
      const data = perfData(d);
      await checkConflicts(data.scheduledAt, data.durationMin, (p.members || []).map((m) => m.uid));
      await db.update("performances", p.id, data);
      flash("Apresentação atualizada.", "success"); reload();
    });
    root.querySelector("#perf-del").addEventListener("click", async () => {
      if (!confirm("Excluir a apresentação?")) return;
      await db.remove("performances", p.id); go(`/painel/eventos/${ev.id}`);
    });
  });
}, ADMIN);

// ------------------------------------------------------------------ Roteiro de palco
route("/painel/eventos/:id/roteiro", async ({ params }) => {
  const ev = await db.get("events", params.id);
  if (!ev) return notFound();
  const script = await S.stageScript(ev.id, { full: session.isAdmin });
  return page("Roteiro de palco", "/painel", html`<h1>Roteiro de palco</h1><p><strong>${ev.name}</strong> · ${fmtDate(ev.startsOn)}${ev.location ? ` · ${ev.location}` : ""}</p>
    <div class="actions no-print"><button class="btn" type="button" id="print">Imprimir / salvar em PDF</button><button class="btn secondary" type="button" id="csv">Baixar planilha (CSV)</button></div>
    ${Object.entries(S.SLOTS).map(([slot, label]) => { const items = script.filter((p) => p.slot === slot); return items.length ? html`<h2>${label}</h2>${items.map((p) => html`
      <article class="card print-break" style="margin-bottom:1rem"><h3 style="margin-top:0">${p.order}. ${p.title} <span class="muted">(${S.MOD[p.modality]?.name}, ${p.durationMin} min${p.scheduledAt ? `, ${fmtTime(p.scheduledAt)}` : ""})</span></h3>
        <dl><dt>Trilha sonora</dt><dd>${p.soundtrack || "—"}</dd><dt>Equipamentos</dt><dd>${p.equipment || "—"}</dd>
          <dt>Integrantes (${p.members.length})</dt><dd>${p.members.map((mb) => `${mb.name}${mb.part ? ` (${mb.part})` : ""}`).join("; ") || "—"}</dd>
          <dt>Professor(a)</dt><dd>${p.teacherName || "—"}</dd><dt>Acessibilidade</dt><dd>${C.accTags(p)}${p.accNotes ? ` ${p.accNotes}` : ""}${!(p.accLibras || p.accAudiodesc || p.accSeating) ? "—" : ""}</dd>
          ${p.notes ? html`<dt>Observações</dt><dd>${p.notes}</dd>` : ""}</dl></article>`)}` : ""; })}
    ${!script.length ? html`<p class="muted">Nenhuma apresentação cadastrada.</p>` : ""}`,
  (root) => {
    root.querySelector("#print").addEventListener("click", () => window.print());
    root.querySelector("#csv").addEventListener("click", () => {
      const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
      const rows = [["Momento", "Ordem", "Horário", "Título", "Modalidade", "Duração (min)", "Trilha sonora", "Equipamentos", "Integrantes", "Professor(a)", "Libras no palco", "Audiodescrição", "Espaço acessível", "Obs. acessibilidade", "Observações"],
        ...script.map((p) => [S.SLOTS[p.slot], p.order, (p.scheduledAt || "").slice(11, 16), p.title, S.MOD[p.modality]?.name, p.durationMin, p.soundtrack, p.equipment,
          p.members.map((mb) => mb.name + (mb.part ? ` (${mb.part})` : "")).join(", "), p.teacherName, p.accLibras ? "Sim" : "Não", p.accAudiodesc ? "Sim" : "Não", p.accSeating ? "Sim" : "Não", p.accNotes, p.notes])];
      download(`roteiro-palco-${slugify(ev.name)}.csv`, "﻿" + rows.map((r) => r.map(q).join(";")).join("\r\n"), "text/csv;charset=utf-8");
    });
  });
}, STAFF);

// ------------------------------------------------------------------ Calendário unificado
route("/painel/calendario", async ({ query }) => {
  const events = await listSorted("events", [], "startsOn", "desc");
  const eventId = query.evento || null;
  const { general } = await getSettings();
  const items = await S.calendarItems(eventId, { full: session.isAdmin });
  const conflicts = findConflicts(items, general.bufferMin || 0);
  const flagged = new Set(conflicts.flatMap((c) => [`${c.a.kind}:${c.a.id}`, `${c.b.kind}:${c.b.id}`]));
  const names = session.isAdmin ? Object.fromEntries((await db.list("users")).map((u) => [u.id, u.name])) : {};
  const days = {};
  for (const it of items) (days[it.start.slice(0, 10)] ||= []).push(it);
  return page("Calendário unificado", "/painel/calendario", html`<h1>Calendário unificado — palco e quadra</h1>
    <form class="actions" id="cal-filter"><label for="evento" class="visually-hidden">Evento</label><select id="evento" name="evento" style="max-width:24rem"><option value="">Todos os eventos</option>
      ${events.map((e) => html`<option value="${e.id}" ${raw(e.id === eventId ? "selected" : "")}>${e.name}</option>`)}</select><button class="btn secondary" type="submit">Filtrar</button></form>
    <p class="hint">Modo de conflito: <strong>${general.conflictMode === "impedir" ? "impedir agendamento" : "alertar"}</strong> (altere em Pontuação e regras).</p>
    ${conflicts.length ? html`<div class="flash warning" role="alert"><h2 style="margin-top:0;font-size:1.1rem">${conflicts.length} conflito(s)</h2><ul>${conflicts.map((c) => html`<li>
      ${session.isAdmin ? html`<strong>${c.people.map((p) => names[p] || "?").join(", ")}</strong>: ` : ""}“${c.a.label}” (${fmtDate(c.a.start)}, ${c.a.duration_min} min) e “${c.b.label}” (${fmtDate(c.b.start)})</li>`)}</ul></div>` : ""}
    ${Object.keys(days).sort().map((day) => html`<h2>${fmtDate(day)}</h2><div class="table-wrap"><table><thead><tr><th scope="col">Horário</th><th scope="col">Tipo</th><th scope="col">Compromisso</th><th scope="col">Local</th><th scope="col">Situação</th></tr></thead>
      <tbody>${days[day].map((it) => { const bad = flagged.has(`${it.kind}:${it.id}`); return html`<tr class="${bad ? "conflict" : ""}"><td>${fmtTime(it.start)} (${it.duration_min} min)</td>
        <td>${it.kind === "performance" ? "Palco" : "Quadra/tatame"}</td><td>${session.isAdmin ? html`<a href="#/painel/${it.kind === "performance" ? "apresentacoes" : "partidas"}/${it.id}">${it.label}</a>` : it.label}</td>
        <td>${it.venue || "—"}</td><td>${bad ? raw("<strong>Conflito de horário</strong>") : "OK"}</td></tr>`; })}</tbody></table></div>`)}
    ${!items.length ? html`<p class="muted">Nada agendado.</p>` : ""}`,
  (root) => root.querySelector("#cal-filter").addEventListener("submit", (e) => { e.preventDefault(); go(`/painel/calendario${e.target.evento.value ? `?evento=${e.target.evento.value}` : ""}`); }));
}, STAFF);

// ------------------------------------------------------------------ Pessoas
route("/painel/pessoas", async ({ query }) => {
  const role = query.perfil || "", q = (query.q || "").toLowerCase();
  const [users, sensitive] = await Promise.all([listSorted("users", [], "name"), db.list("sensitive")]);
  const has = new Set(sensitive.map((s) => s.id));
  const rows = users.filter((u) => u.active !== false && (!role || u.role === role) && (!q || `${u.name} ${u.email}`.toLowerCase().includes(q)));
  return page("Pessoas", "/painel/pessoas", html`<h1>Pessoas</h1>
    <form class="actions" role="search" id="people-filter"><label for="q" class="visually-hidden">Buscar por nome ou e-mail</label>
      <input id="q" name="q" type="text" value="${query.q || ""}" placeholder="Nome ou e-mail" style="max-width:18rem">
      <label for="perfil" class="visually-hidden">Perfil</label><select id="perfil" name="perfil" style="max-width:14rem"><option value="">Todos os perfis</option>
      ${Object.entries(S.ROLE_LABELS).map(([k, v]) => html`<option value="${k}" ${raw(k === role ? "selected" : "")}>${v}</option>`)}</select>
      <button class="btn secondary" type="submit">Filtrar</button></form>
    <div class="table-wrap"><table><thead><tr><th scope="col">Nome</th><th scope="col">Perfil</th><th scope="col">Idade</th><th scope="col">Responsável</th><th scope="col">Dado sensível</th></tr></thead>
      <tbody>${rows.map((u) => html`<tr><th scope="row"><a href="#/painel/pessoas/${u.id}">${u.name}</a></th><td>${S.ROLE_LABELS[u.role]}</td><td>${ageToday(u.birthDate) ?? "—"}</td>
        <td>${u.guardian?.name || "—"}</td><td>${has.has(u.id) ? "sim" : "—"}</td></tr>`)}</tbody></table></div>`,
  (root) => root.querySelector("#people-filter").addEventListener("submit", (e) => {
    e.preventDefault(); go(`/painel/pessoas?${new URLSearchParams({ q: e.target.q.value, perfil: e.target.perfil.value })}`);
  }));
}, ADMIN);

route("/painel/pessoas/:id", async ({ params, query }) => {
  const u = await db.get("users", params.id);
  if (!u) return notFound();
  const hasSensitive = !!(await db.get("sensitive", u.id).catch(() => null));
  let sensitive = null;
  if (query.ver === "1" && hasSensitive) {
    sensitive = await db.get("sensitive", u.id);
    await S.audit(session.user.uid, u.id, "visualizou dado sensível (deficiência)");
  }
  const [consents, logs, admins] = await Promise.all([db.list("consents", [["userId", "==", u.id]]), db.list("audit", [["subjectId", "==", u.id]]), db.list("admins")]);
  const actorNames = Object.fromEntries((await db.list("users")).map((x) => [x.id, x.name]));
  logs.sort((a, b) => b.at.localeCompare(a.at));
  return page(u.name, "/painel/pessoas", html`<p><a href="#/painel/pessoas">← Pessoas</a></p><h1>${u.name}</h1>
    <dl><dt>Perfil</dt><dd>${S.ROLE_LABELS[u.role]}</dd><dt>E-mail</dt><dd>${u.email}</dd>
      ${u.birthDate ? html`<dt>Nascimento</dt><dd>${fmtDate(u.birthDate)} (${ageToday(u.birthDate)} anos)</dd>` : ""}
      ${u.guardian ? html`<dt>Responsável legal</dt><dd>${u.guardian.name} (${u.guardian.relation}) · ${u.guardian.email} · ${u.guardian.phone || "—"}</dd>` : ""}
      <dt>Modalidades</dt><dd>${Object.entries(u.modalities || {}).map(([k, v]) => `${S.MOD[k]?.name}${v.level ? ` (${v.level})` : ""}${v.weight ? ` ${v.weight} kg` : ""}`).join("; ") || "—"}</dd>
      ${(u.aptitudes || []).length ? html`<dt>Aptidão em inclusão</dt><dd>${u.aptitudes.map((a) => S.DISABILITY_TYPES[a]).join("; ")}</dd>` : ""}
      <dt>Interesse em apoio</dt><dd>${(u.supportInterest || []).map((s) => S.SUPPORT_FUNCTIONS[s]).join(", ") || "—"}</dd>
      <dt>Uso de imagem</dt><dd>${u.imageConsent ? "Autorizado" : "Não autorizado"}</dd></dl>
    <h2>Dado sensível (deficiência)</h2>
    ${sensitive ? html`<div class="card sensitive"><p><strong>Tipos:</strong> ${(sensitive.types || []).map((t) => S.DISABILITY_TYPES[t]).join("; ") || "—"}</p>
      <p><strong>Necessidades de apoio:</strong> ${sensitive.notes || "—"}</p><p class="hint">Este acesso foi registrado na trilha de auditoria.</p></div>`
      : hasSensitive ? html`<a class="btn secondary" href="#/painel/pessoas/${u.id}?ver=1">Ver informação sigilosa (acesso será registrado)</a>` : html`<p class="muted">Não informado.</p>`}
    <h2>Consentimentos</h2><div class="table-wrap"><table><thead><tr><th scope="col">Tipo</th><th scope="col">Concedido por</th><th scope="col">Vínculo</th><th scope="col">Data</th><th scope="col">Termo</th><th scope="col">Revogado</th></tr></thead>
      <tbody>${consents.length ? consents.map((c) => html`<tr><td>${c.kind}</td><td>${c.grantedBy}</td><td>${c.relation}</td><td>${fmtDate(c.grantedAt?.slice(0, 16))}</td><td>${c.termsVersion}</td><td>${c.revokedAt ? fmtDate(c.revokedAt.slice(0, 16)) : "—"}</td></tr>`)
        : html`<tr><td colspan="6">Nenhum.</td></tr>`}</tbody></table></div>
    <h2>Auditoria</h2><ul>${logs.length ? logs.slice(0, 20).map((a) => html`<li>${fmtDate(a.at.slice(0, 16))} — ${actorNames[a.actorId] || "sistema"}: ${a.action}</li>`) : html`<li class="muted">Sem registros.</li>`}</ul>
    ${!admins.some((a) => a.id === u.id) && u.active !== false && dataMode() === "firebase" ? html`<h2>Esqueceu a senha</h2><div class="card">
      <p>O sistema envia para <strong>${u.email}</strong> um e-mail com um link para a pessoa criar uma nova senha.</p>
      <button class="btn secondary" type="button" id="reset-mail">Enviar e-mail para criar nova senha</button><div id="reset-mail-msg" aria-live="polite"></div></div>` : ""}
    ${!admins.some((a) => a.id === u.id) && u.active !== false && dataMode() !== "firebase" ? html`<h2>Senha provisória</h2><div class="card">
      <p>Para quem esqueceu a senha. O sistema gera uma senha provisória; entregue-a pessoalmente ao aluno ou ao responsável. No primeiro acesso, a pessoa cria uma nova senha.</p>
      <button class="btn secondary" type="button" id="reset-pw">Gerar senha provisória</button><div id="new-pw" aria-live="polite"></div></div>` : ""}
    ${!admins.some((a) => a.id === u.id) ? html`<h2>Exclusão (LGPD)</h2><form class="card" id="anon">${C.field("confirm", "Digite EXCLUIR para anonimizar este cadastro a pedido do titular/responsável")}
      <button class="btn danger" type="submit">Anonimizar</button><p class="hint">O cadastro e o login da pessoa são desativados.</p></form>` : ""}`,
  (root) => {
    root.querySelector("#reset-mail")?.addEventListener("click", async (e) => {
      const out = root.querySelector("#reset-mail-msg");
      e.target.disabled = true;
      try {
        await auth.sendPasswordReset(u.email);
        await S.audit(session.user.uid, u.id, "enviou e-mail para nova senha");
        out.innerHTML = html`<p class="flash success" style="margin-top:1rem">E-mail enviado para ${u.email}. Peça para olhar também a caixa de spam.</p>`.s;
      } catch (err) { e.target.disabled = false; out.innerHTML = html`<p class="flash error" style="margin-top:1rem">${err.message}</p>`.s; }
    });
    root.querySelector("#reset-pw")?.addEventListener("click", async (e) => {
      if (!confirm(`Gerar uma senha provisória para ${u.name}? A senha atual deixará de funcionar.`)) return;
      const digits = String(crypto.getRandomValues(new Uint32Array(1))[0] % 10000).padStart(4, "0");
      const letters = "abcdefghjkmnpqrstuvwxyz";
      const pick = () => letters[crypto.getRandomValues(new Uint8Array(1))[0] % letters.length];
      const pw = `oasis${digits}${pick()}${pick()}`;
      await auth.adminSetPassword(u.id, pw);
      await db.update("users", u.id, { mustChangePassword: true });
      await S.audit(session.user.uid, u.id, "gerou senha provisória");
      e.target.disabled = true;
      root.querySelector("#new-pw").innerHTML = html`<p class="flash success" style="margin-top:1rem">Senha provisória de ${u.name}: <strong style="font-size:1.3rem;letter-spacing:.05em">${pw}</strong><br>
        Anote e entregue pessoalmente. Ela não será mostrada de novo. E-mail de acesso: ${u.email}</p>`.s;
    });
    bindForm(root, "#anon", async (d, form) => {
    if (!confirmText(form)) throw new Error("Digite EXCLUIR para confirmar.");
    await anonymizeUser(u.id);
    await auth.disableLogin(u.id);
    await S.audit(session.user.uid, u.id, "anonimizou cadastro");
    flash("Cadastro anonimizado.", "success"); go("/painel/pessoas");
  });
  });
}, ADMIN);

// ------------------------------------------------------------------ Pontuação e regras
route("/painel/regras", async () => {
  const { scoring, general } = await getSettings(true);
  const { bjj, taekwondo: tkd, team } = scoring;
  return page("Pontuação e regras", "/painel/regras", html`<h1>Pontuação e regras</h1>
    <p class="lead">As regras mudam entre temporadas. Os valores abaixo valem para os próximos cálculos; partidas já encerradas mantêm o resultado gravado (reabra uma partida para recalcular).</p>
    <form id="rules">
      <fieldset><legend>Jiu-jitsu</legend><div class="row">${Object.entries(bjj.points).map(([k, v]) => C.field(`bjj_${k}`, BJJ_LABELS[k], { type: "number", value: v, attrs: 'min="1" max="20" style="max-width:8rem"' }))}</div></fieldset>
      <fieldset><legend>Taekwondo</legend><div class="row">${Object.entries(tkd.points).map(([k, v]) => C.field(`tkd_${k}`, TKD_LABELS[k], { type: "number", value: v, attrs: 'min="1" max="20" style="max-width:8rem"', hint: k === "spin_kick_head" ? "Decisão do cliente: 5 ou 6" : "" }))}</div>
        <div class="row">${C.field("tkd_gamjeom_points", "Pontos ao oponente por gam-jeom", { type: "number", value: tkd.gamjeom_points })}
          ${C.field("tkd_max_gamjeom", "Gam-jeom que encerra a luta (0 = sem limite)", { type: "number", value: tkd.max_gamjeom })}
          ${C.field("tkd_point_gap", "Diferença de pontos que encerra (0 = desativado)", { type: "number", value: tkd.point_gap })}</div>
        <div class="row">${C.select("tkd_mode", "Sistema de rounds", { cumulativo: "Soma dos rounds + golden point no empate", melhor_de_3: "Melhor de 3 rounds" }, tkd.mode)}
          ${C.field("tkd_rounds", "Nº de rounds", { type: "number", value: tkd.rounds })}${C.field("tkd_golden_point_target", "Pontos para vencer o golden point", { type: "number", value: tkd.golden_point_target })}</div></fieldset>
      <fieldset><legend>Esportes coletivos — pontos na classificação</legend>
        ${Object.entries(team).map(([sport, cfg]) => html`<div class="row"><strong style="flex:0 0 8rem;align-self:center">${S.MOD[sport].name}</strong>
          ${C.field(`${sport}_win`, "Vitória", { type: "number", value: cfg.win })}${C.field(`${sport}_draw`, "Empate", { type: "number", value: cfg.draw })}${C.field(`${sport}_loss`, "Derrota", { type: "number", value: cfg.loss })}</div>`)}
        ${C.select("volei_best_of", "Vôlei: partidas em", { 3: "Melhor de 3 sets", 5: "Melhor de 5 sets" }, team.volei.best_of)}</fieldset>
      <fieldset id="pesos"><legend>Categorias de peso das lutas</legend>
        <p class="hint">Uma linha por categoria: <code>modalidade;divisão;sexo;categoria;peso máximo</code>. Use <code>livre</code> na última (sem limite de peso).
          Modalidades: jiu_jitsu, taekwondo, para_jiu_jitsu, para_taekwondo — as adaptadas usam a tabela da modalidade de origem quando não têm a própria.
          O limite de baixo de cada categoria é o peso máximo da anterior (ex.: Pluma = acima de 53,5 até 58,5 kg).
          A divisão precisa ter o mesmo nome da lista de divisões.</p>
        ${C.textarea("weight_table", "Tabela de peso", { value: tableToText(general.weightTable), rows: 14 })}
        ${(() => { const have = new Set((general.weightTable || []).map((r) => `${r.modality}|${r.division}`));
          const falta = general.ageBands.filter((b) => !have.has(`jiu_jitsu|${b.name}`)).map((b) => b.name);
          return falta.length ? html`<p class="hint"><strong>Atenção:</strong> jiu-jitsu ainda sem pesos para: ${falta.join(", ")}. Nessas divisões as categorias são criadas sem peso.</p>` : ""; })()}</fieldset>
      <fieldset><legend>Categorias e calendário</legend>
        ${C.textarea("age_bands", "Divisões por idade (uma por linha: Nome;idade mínima;idade máxima)", { value: general.ageBands.map((b) => `${b.name};${b.min};${b.max}`).join("\n"), rows: 10 })}
        <div class="row">${C.select("ageReference", "Idade de referência", { ano: "Idade que completa no ano do evento", data_evento: "Idade exata na data do evento" }, general.ageReference)}
          ${C.select("conflictMode", "Conflito palco × quadra", { alertar: "Alertar e permitir", impedir: "Impedir o agendamento" }, general.conflictMode)}
          ${C.field("bufferMin", "Folga mínima entre compromissos (min)", { type: "number", value: general.bufferMin || 0 })}</div>
        ${C.checkbox("publicNameAbbrev", "Abreviar nomes de alunos na área pública", general.publicNameAbbrev !== false)}</fieldset>
      <button class="btn" type="submit">Salvar configurações</button></form>`,
  (root) => bindForm(root, "#rules", async (d) => {
    const pos = (k, zero = false) => { const v = int(d[k]); if (v == null || v < 0 || (v === 0 && !zero)) throw new Error(`Valor inválido em ${k}`); return v; };
    const nb = structuredClone(bjj), nt = structuredClone(tkd), nteam = structuredClone(team);
    for (const k of Object.keys(nb.points)) nb.points[k] = pos(`bjj_${k}`);
    for (const k of Object.keys(nt.points)) nt.points[k] = pos(`tkd_${k}`);
    for (const k of ["gamjeom_points", "rounds", "max_gamjeom", "point_gap", "golden_point_target"]) nt[k] = pos(`tkd_${k}`, true);
    nt.mode = d.tkd_mode === "melhor_de_3" ? "melhor_de_3" : "cumulativo";
    if (nt.mode === "melhor_de_3") nt.rounds = 3;
    for (const [sport, cfg] of Object.entries(nteam)) for (const k of ["win", "draw", "loss"]) cfg[k] = pos(`${sport}_${k}`, true);
    nteam.volei.best_of = d.volei_best_of === "5" ? 5 : 3;
    const bands = str(d.age_bands, 3000).split("\n").filter((l) => l.trim()).map((l) => {
      const [name, a, b] = l.split(";").map((x) => x.trim());
      const min = int(a), max = int(b);
      if (!name || min == null || max == null || !(min >= 4 && min <= max && max <= 17)) throw new Error(`Divisão inválida (idades de 4 a 17 anos): ${l}`);
      return { name, min, max };
    });
    if (!bands.length) throw new Error("Informe ao menos uma divisão por idade");
    if (new Set(bands.map((b) => b.name)).size !== bands.length) throw new Error("Há divisões com o mesmo nome");
    const weightTable = textToTable(str(d.weight_table, 20000), bands);
    await db.set("settings", "scoring", { bjj: nb, taekwondo: nt, team: nteam });
    await db.set("settings", "general", { ageBands: bands, weightTable, ageReference: d.ageReference === "data_evento" ? "data_evento" : "ano",
      conflictMode: d.conflictMode === "impedir" ? "impedir" : "alertar", bufferMin: pos("bufferMin", true), publicNameAbbrev: !!d.publicNameAbbrev });
    invalidateSettings();
    await S.audit(session.user.uid, null, "alterou configurações de pontuação");
    flash("Configurações salvas. Os novos valores valem para os próximos cálculos de resultado.", "success");
    go("/painel/regras");
  }));
}, ADMIN);

// ------------------------------------------------------------------ Backup dos dados
route("/painel/backup", async () => {
  const online = dataMode() === "firebase";
  const usage = storageUsage();
  const pct = usage ? Math.min(100, Math.round((100 * usage.usedBytes) / usage.limitBytes)) : 0;
  const last = localStorage.getItem("oasis:ultimo-backup");
  return page("Backup dos dados", "/painel/backup", html`<h1>Backup dos dados</h1>
    ${online ? html`<div class="card"><p>Os dados estão <strong>online</strong> (Firebase): todos os computadores e celulares veem as mesmas informações.</p>
      <ul><li>Mesmo assim, baixe um backup depois de cada evento e guarde em local protegido: ele tem dados pessoais de crianças e adolescentes.</li>
        <li>Para trazer os dados que estavam guardados em um computador (modo local), abra o site antigo nesse computador, baixe o backup lá e restaure aqui. Os logins não vão junto: cada pessoa cria a conta de novo com o mesmo e-mail.</li></ul>
      <p><strong>Último backup feito neste computador:</strong> ${last ? fmtDate(last.slice(0, 16)) : "nunca"}</p></div>` : html`<div class="card"><p>Todos os dados do sistema (cadastros, chaves, resultados, notícias, fotos e configurações) ficam guardados <strong>neste navegador, neste computador</strong>.</p>
      <ul><li>Se alguém limpar o histórico ou os dados de navegação, <strong>tudo é apagado</strong>.</li>
        <li>Outros computadores não veem estes dados. Para passar para outro computador, baixe o backup aqui e restaure lá.</li>
        <li>Faça um backup <strong>pelo menos uma vez por semana</strong> e depois de cada evento, e guarde o arquivo em um pendrive ou na nuvem da instituição.</li>
        <li>O arquivo de backup contém dados pessoais de crianças e adolescentes: guarde-o em local protegido.</li></ul>
      <p><strong>Último backup feito neste computador:</strong> ${last ? fmtDate(last.slice(0, 16)) : "nunca"}</p>
      <label for="uso" class="hint">Espaço usado: ${((usage?.usedBytes || 0) / 1048576).toFixed(1)} MB de cerca de 5 MB (${pct}%)</label>
      <progress id="uso" max="100" value="${pct}">${pct}%</progress>
      ${pct > 80 ? html`<p class="flash warning">O espaço está quase cheio. Remova fotos ou notícias antigas.</p>` : ""}</div>`}
    <h2>Baixar backup</h2><p><button class="btn" type="button" id="export-all">Baixar backup agora</button></p>
    <h2>Restaurar backup</h2><form class="card" id="import-form"><p class="flash warning">${online ? raw("Restaurar <strong>grava os registros do arquivo</strong> no banco online, por cima dos que têm o mesmo código.") : raw("Restaurar <strong>substitui todos os dados atuais</strong> deste navegador pelos do arquivo.")}</p>
      <div class="field"><label for="backup_file">Arquivo de backup (.json)</label><input type="file" id="backup_file" accept="application/json,.json" required></div>
      ${C.field("confirm", "Digite RESTAURAR para confirmar", { id: "restore_confirm" })}<button class="btn danger" type="submit">Restaurar</button></form>`,
  (root) => {
    root.querySelector("#export-all").addEventListener("click", async () => {
      const now = new Date().toISOString();
      download(`backup-oasis-${now.slice(0, 10)}.json`, await exportAll(), "application/json");
      localStorage.setItem("oasis:ultimo-backup", now);
      flash("Backup baixado. Guarde o arquivo em local seguro.", "success");
      go("/painel/backup");
    });
    bindForm(root, "#import-form", async (d, form) => {
      if (!confirmText(form, "RESTAURAR")) throw new Error("Digite RESTAURAR para confirmar.");
      const file = form.querySelector("#backup_file").files[0];
      if (!file) throw new Error("Escolha o arquivo de backup.");
      await importAll(await file.text());
      invalidateSettings();
      if (dataMode() === "firebase") { flash("Backup restaurado no banco online.", "success"); return go("/painel"); }
      flash("Backup restaurado. Entre novamente.", "success");
      await auth.signOut();
      go("/entrar");
    });
  });
}, ADMIN);

// ------------------------------------------------------------------ Avisos aos inscritos
function audienceOptions() {
  return { todos: "Todos os inscritos (alunos e professores)", ...Object.fromEntries(Object.entries(S.ROLES).map(([k, v]) => [`perfil:${k}`, `Só perfil ${v}`])),
    ...Object.fromEntries(S.MODALITIES.map((m) => [`modalidade:${m.code}`, `Quem pratica ${m.name}`])) };
}

route("/painel/avisos", async () => {
  const notices = (await db.list("notices")).sort((a, b) => b.date.localeCompare(a.date));
  const aud = audienceOptions();
  return page("Avisos aos inscritos", "/painel/avisos", html`<h1>Avisos aos inscritos</h1>
    <p class="lead">Os avisos aparecem na Área do aluno (e do professor) de quem faz parte do público escolhido, com o selo "novo" até a pessoa ler.</p>
    <h2>Novo aviso</h2><form class="card" id="notice-form">${C.field("title", "Título", { required: true })}
      ${C.textarea("body", "Mensagem", { rows: 6, required: true, hint: "Separe parágrafos com uma linha em branco." })}
      <div class="row">${C.select("audience", "Para quem", aud, "todos")}</div>
      ${C.checkbox("important", "Marcar como importante", false)}${C.checkbox("published", "Publicar agora", true)}
      <button class="btn" type="submit">Salvar aviso</button></form>
    <h2>Avisos enviados</h2>
    ${notices.length ? notices.map((n) => html`<article class="card" style="margin-bottom:.75rem">
      <p class="date" style="margin:0">${fmtDate(n.date.slice(0, 16))} · ${aud[n.audience] || n.audience}${n.important ? html` · <span class="tag">importante</span>` : ""}${!n.published ? html` · <span class="tag accent">rascunho</span>` : ""}</p>
      <h3 style="margin:.2rem 0">${n.title}</h3><p style="white-space:pre-line;margin:0 0 .5rem">${n.body}</p>
      <div class="actions" style="margin:0"><button class="btn small secondary" type="button" data-toggle="${n.id}">${n.published ? "Ocultar" : "Publicar"}</button>
        <button class="btn small danger" type="button" data-del="${n.id}">Excluir<span class="visually-hidden"> aviso ${n.title}</span></button></div></article>`)
      : html`<p class="muted">Nenhum aviso ainda.</p>`}`,
  (root) => {
    bindForm(root, "#notice-form", async (d) => {
      if (!str(d.title) || !str(d.body)) throw new Error("Informe título e mensagem.");
      await db.add("notices", { title: str(d.title, 150), body: str(d.body, 5000), audience: aud[d.audience] ? d.audience : "todos",
        important: !!d.important, published: !!d.published, date: new Date().toISOString(), authorId: session.user.uid });
      flash("Aviso salvo.", "success"); go("/painel/avisos");
    });
    root.querySelectorAll("[data-toggle]").forEach((b) => b.addEventListener("click", async () => {
      const n = notices.find((x) => x.id === b.dataset.toggle);
      await db.update("notices", n.id, { published: !n.published }); go("/painel/avisos");
    }));
    root.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
      if (!confirm("Excluir este aviso?")) return;
      await db.remove("notices", b.dataset.del); go("/painel/avisos");
    }));
  });
}, ADMIN);
