// Área do aluno (e do professor): portal de quem já está inscrito.
// Início, agenda, competições e resultados, apresentações, avisos da coordenação,
// perfil, acessibilidade, privacidade (LGPD) e comprovante de inscrição.

import { auth, db } from "../data/db.js";
import { route, go } from "../core/router.js";
import { html, raw, flash, renderFlashes, fmtDate, fmtTime, str, num, asList, download, todayISO, paragraphs } from "../core/ui.js";
import { session, refreshSession, getSettings, authFlow } from "../core/session.js";
import { ageToday, findConflicts } from "../logic/calendar.js";
import { roundName } from "../logic/brackets.js";
import { METHOD_LABELS } from "../logic/scoring.js";
import * as C from "./components.js";
import * as S from "../logic/services.js";
import { bindForm, confirmText } from "./helpers.js";

const STATUS = { pendente: "Aguardando confirmação", confirmada: "Confirmada", recusada: "Recusada" };
const USER = { auth: "user" };

// ------------------------------------------------------------------ dados do portal
async function myEntries(uid) {
  const own = await db.list("entries", [["userId", "==", uid]]);
  const teams = await db.list("teams", [["memberIds", "array-contains", uid]]);
  const teamEntries = (await Promise.all(teams.map((t) => db.list("entries", [["teamId", "==", t.id]])))).flat()
    .map((e) => ({ ...e, team: teams.find((t) => t.id === e.teamId) }));
  return [...own, ...teamEntries];
}

export function noticeIsFor(n, u) {
  if (!n.published) return false;
  const a = n.audience || "todos";
  if (a === "todos") return u.role !== "admin";
  if (a.startsWith("perfil:")) return u.role === a.slice(7);
  if (a.startsWith("modalidade:")) return !!(u.modalities || {})[a.slice(11)];
  return false;
}

async function myNotices(u) {
  return (await db.list("notices")).filter((n) => noticeIsFor(n, u)).sort((a, b) => b.date.localeCompare(a.date));
}
const isNew = (n, u) => !u.noticesSeenAt || n.date > u.noticesSeenAt;

async function myPerformances(uid) {
  return (await db.list("performances")).filter((p) => (p.members || []).some((m) => m.uid === uid) || p.teacherId === uid);
}

async function openCategories(u, entries) {
  if (u.role !== "lutador") return [];
  const mine = new Set(entries.map((e) => e.categoryId));
  const out = [];
  for (const ev of (await db.list("events", [["published", "==", true]])).filter((e) => e.registrationsOpen && (e.endsOn || e.startsOn) >= todayISO())) {
    for (const c of await db.list("categories", [["eventId", "==", ev.id]])) {
      if (c.status === "inscricoes" && !mine.has(c.id) && S.MOD[c.modality].kind === "luta" && !(await S.eligibilityProblem(u, c, ev))) out.push({ ...c, ev });
    }
  }
  return out;
}

// ------------------------------------------------------------------ layout da área do inscrito
// A navegação fica no topo do site (menu próprio dos inscritos, em core/shell.js).
export async function unreadCount(u) {
  return (await myNotices(u)).filter((n) => isNew(n, u)).length;
}

async function portal(current, title, content, after, hero = null) {
  const u = session.profile;
  const area = u.role === "professor" ? "Área do professor" : "Área do aluno";
  return { title, hero: hero || C.pageHero(area, title), body: html`<div class="portal-page">${content}</div>`, after };
}

// ------------------------------------------------------------------ Início
route("/conta", async () => {
  if (session.isAdmin) { go("/painel"); return null; }
  const u = session.profile, uid = session.user.uid;
  if (!u) return { title: "Área do aluno", body: html`<h1>Área do aluno</h1><p>Perfil não encontrado. <a href="#/contato">Fale com a equipe</a>.</p>` };
  const student = u.role !== "professor";
  const [entries, agenda, perfs, notices] = await Promise.all([myEntries(uid), S.calendarItems(null, { userId: uid }), myPerformances(uid), myNotices(u)]);
  const conflicts = findConflicts(agenda);
  const now = new Date().toISOString().slice(0, 16);
  const next = agenda.find((i) => i.start >= now && i.status !== "encerrada");
  const open = await openCategories(u, entries);
  const fresh = notices.filter((n) => isNew(n, u));
  const confirmed = entries.filter((e) => e.status === "confirmada").length, pending = entries.filter((e) => e.status === "pendente").length;
  const projects = (await db.list("projects", [["published", "==", true]])).filter((p) => (p.modalities || []).some((m) => (u.modalities || {})[m]));
  const photo = projects.find((p) => p.image);
  const first = u.name.split(" ")[0];
  const age = ageToday(u.birthDate);
  const hero = html`<section class="member-hero" aria-labelledby="member-title"><div class="wrap">
    <div><p class="eyebrow">${student ? "Área do aluno" : "Área do professor"}</p>
      <h1 id="member-title">Olá, ${first}!</h1>
      <p class="lead">${S.ROLE_LABELS[u.role]}${age != null && student ? ` · ${age} anos` : ""}${u.affiliation ? ` · ${u.affiliation}` : ""}</p>
      <div class="actions">${student ? html`<a class="btn" href="#/conta/competicoes">Competições e resultados</a>` : html`<a class="btn" href="#/painel">Central do evento</a>`}
        <a class="btn secondary" href="#/conta/agenda">Minha agenda</a>${fresh.length ? html`<a class="btn secondary" href="#/conta/avisos">${fresh.length} ${fresh.length === 1 ? "aviso novo" : "avisos novos"}</a>` : ""}</div></div>
    ${photo ? html`<div class="member-photo">${C.img(photo.image, photo.imageAlt)}<p class="muted">${photo.name}</p></div>` : ""}</div></section>`;
  return portal("/conta", student ? "Área do aluno" : "Área do professor", html`
    ${u.mustChangePassword ? html`<div class="flash warning" role="alert">Você entrou com uma senha provisória. <a href="#/senha">Crie sua nova senha agora</a>.</div>` : ""}
    ${conflicts.length ? html`<div class="flash warning" role="alert"><strong>Conflito na sua agenda:</strong><ul>${conflicts.map((c) => html`<li>“${c.a.label}” (${fmtDate(c.a.start)}) e “${c.b.label}” (${fmtDate(c.b.start)})</li>`)}</ul>Fale com a organização para ajustar os horários.</div>` : ""}
    <ul class="kpis" aria-label="Resumo">
      <li class="card portal-next"><span class="kpi-label">Próximo compromisso</span>${next ? html`<strong>${fmtDate(next.start)}</strong><span>${next.kind === "performance" ? `🎭 ${next.title}` : `🏅 ${next.category}`}</span>${next.venue ? html`<span class="muted">${next.venue}</span>` : ""}`
        : html`<span class="muted">Nada agendado ainda.</span>`}<a href="#/conta/agenda">Ver agenda</a></li>
      ${student ? html`<li class="card"><span class="stat">${confirmed}</span>inscrições confirmadas${pending ? html`<br><span class="muted">${pending} aguardando</span>` : ""}<br><a href="#/conta/competicoes">Competições</a></li>` : ""}
      <li class="card"><span class="stat">${perfs.length}</span>${perfs.length === 1 ? "apresentação" : "apresentações"}<br><a href="#/conta/apresentacoes">Ver</a></li>
      <li class="card ${fresh.length ? "kpi-alert" : ""}"><span class="stat">${fresh.length}</span>${fresh.length === 1 ? "aviso novo" : "avisos novos"}<br><a href="#/conta/avisos">Ler avisos</a></li>
    </ul>
    <section aria-labelledby="av-h"><h2 id="av-h">Avisos recentes</h2>
      ${notices.length ? html`<div class="grid" style="grid-template-columns:1fr">${notices.slice(0, 3).map((n) => noticeCard(n, u, true))}</div>` : html`<p class="muted">Nenhum aviso por enquanto.</p>`}</section>
    ${open.length ? html`<section aria-labelledby="open-h"><h2 id="open-h">Competições abertas para você</h2><ul class="compact">${open.map((c) => html`<li>${c.ev.name} — ${c.name}
      <button class="btn small" type="button" data-enroll="${c.id}" data-event="${c.ev.id}">Inscrever-me<span class="visually-hidden"> em ${c.name}</span></button></li>`)}</ul></section>` : ""}
    <section aria-labelledby="mod-h"><h2 id="mod-h">Minhas modalidades</h2>
      ${Object.keys(u.modalities || {}).length ? html`<p>${Object.entries(u.modalities).map(([k, v]) => html`<span class="tag">${S.MOD[k]?.name}${v.level ? ` · ${v.level}` : ""}${v.weight ? ` · ${v.weight} kg` : ""}</span>`)}</p>`
        : html`<p class="muted">Nenhuma modalidade. <a href="#/conta/perfil">Escolher modalidades</a>.</p>`}
      ${projects.length ? html`<p>Projeto${projects.length > 1 ? "s" : ""}: ${projects.map((p, i) => html`${i ? ", " : ""}<a href="#/projetos/${p.id}">${p.name}</a>`)}</p>` : ""}</section>
    ${!student ? html`<section><h2>Ferramentas do professor</h2><p><a class="btn" href="#/painel">Central do evento, calendário e roteiros de palco</a></p></section>` : ""}`,
  (root) => bindEnroll(root, u, uid), hero);
}, USER);

function bindEnroll(root, u, uid) {
  root.querySelectorAll("[data-enroll]").forEach((b) => b.addEventListener("click", async () => {
    b.disabled = true;
    try {
      await db.add("entries", { categoryId: b.dataset.enroll, eventId: b.dataset.event, userId: uid, teamId: null, publicName: S.publicName(u), status: "pendente", seed: null });
      flash("Inscrição enviada! Ela será confirmada pela organização.", "success");
      go("/conta/competicoes");
    } catch (e) { flash(e.message, "error"); renderFlashes(); b.disabled = false; }
  }));
}

function noticeCard(n, u, short = false) {
  return html`<article class="card notice ${n.important ? "notice-important" : ""}">
    <p class="date" style="margin:0">${fmtDate(n.date.slice(0, 10))}${isNew(n, u) ? html` <span class="tag accent">novo</span>` : ""}${n.important ? html` <span class="tag">importante</span>` : ""}</p>
    <h3 style="margin:.2rem 0">${n.title}</h3>${short ? html`<p style="margin:0">${String(n.body || "").slice(0, 180)}${String(n.body || "").length > 180 ? "…" : ""}</p>` : paragraphs(n.body)}</article>`;
}

// ------------------------------------------------------------------ Agenda
route("/conta/agenda", async () => {
  const uid = session.user.uid;
  const agenda = await S.calendarItems(null, { userId: uid });
  const conflicts = findConflicts(agenda);
  const flagged = new Set(conflicts.flatMap((c) => [`${c.a.kind}:${c.a.id}`, `${c.b.kind}:${c.b.id}`]));
  const events = Object.fromEntries((await db.list("events", [["published", "==", true]])).map((e) => [e.id, e]));
  const days = {};
  for (const it of agenda) (days[it.start.slice(0, 10)] ||= []).push(it);
  return portal("/conta/agenda", "Minha agenda", html`<p class="hint">Lutas, jogos e apresentações em que você está escalado(a). Os horários podem mudar: confira antes de cada evento.</p>
    <div class="actions no-print"><button class="btn secondary small" type="button" id="print">Imprimir agenda</button></div>
    ${conflicts.length ? html`<div class="flash warning" role="alert"><strong>${conflicts.length} conflito(s) de horário.</strong> Fale com a organização.</div>` : ""}
    ${Object.keys(days).sort().map((day) => html`<h3>${fmtDate(day)}${events[days[day][0].eventId] ? ` · ${events[days[day][0].eventId].name}` : ""}</h3>
      <div class="table-wrap"><table><thead><tr><th scope="col">Horário</th><th scope="col">O quê</th><th scope="col">Onde</th><th scope="col">Situação</th></tr></thead>
      <tbody>${days[day].map((i) => { const bad = flagged.has(`${i.kind}:${i.id}`); return html`<tr class="${bad ? "conflict" : ""}"><td>${fmtTime(i.start)} (${i.duration_min} min)</td>
        <td>${i.kind === "performance" ? `🎭 ${i.title}` : `🏅 ${i.category}: ${i.a} × ${i.b}`}</td><td>${i.venue || "—"}</td>
        <td>${bad ? raw("<strong>⚠ Conflito</strong>") : i.status === "encerrada" ? `Encerrada: ${i.scoreA} × ${i.scoreB}` : "Agendado"}</td></tr>`; })}</tbody></table></div>`)}
    ${!agenda.length ? html`<p class="muted">Nenhum compromisso agendado ainda. Quando a organização definir os horários, eles aparecem aqui.</p>` : ""}`,
  (root) => root.querySelector("#print").addEventListener("click", () => window.print()));
}, USER);

// ------------------------------------------------------------------ Competições e resultados
route("/conta/competicoes", async () => {
  const u = session.profile, uid = session.user.uid;
  const entries = await myEntries(uid);
  const cards = [];
  for (const e of entries) {
    const cat = await db.get("categories", e.categoryId);
    if (!cat) continue;
    const ev = await db.get("events", cat.eventId).catch(() => null);
    const ms = await db.list("matches", [["categoryId", "==", cat.id]]);
    const allEntries = await db.list("entries", [["categoryId", "==", cat.id]]);
    const names = await S.entryLabels(allEntries);
    const ko = ms.filter((m) => m.stage === "mata");
    const totalRounds = ko.length ? Math.max(...ko.map((m) => m.round)) : 0;
    const mine = ms.filter((m) => (m.a === e.id || m.b === e.id) && m.status !== "bye")
      .sort((x, y) => (x.stage === y.stage ? 0 : x.stage === "grupo" ? -1 : 1) || x.round - y.round);
    const final = ko.find((m) => !m.nextId);
    let placement;
    if (e.status !== "confirmada") placement = STATUS[e.status];
    else if (final?.status === "encerrada" && final.winner === e.id) placement = "🏆 Campeão(ã)";
    else if (final?.status === "encerrada" && (final.a === e.id || final.b === e.id)) placement = "🥈 Vice-campeão(ã)";
    else {
      const lost = mine.find((m) => m.stage === "mata" && m.status === "encerrada" && m.winner && m.winner !== e.id);
      placement = lost ? `Eliminado(a) na ${roundName(lost.round, totalRounds).toLowerCase()}` : cat.status === "inscricoes" ? "Aguardando a chave" : "Em disputa";
    }
    cards.push({ e, cat, ev, mine, names, placement, totalRounds });
  }
  const open = await openCategories(u, entries);
  const res = (m, e) => {
    if (m.status !== "encerrada") return ["A disputar", ""];
    if (m.isDraw) return ["Empate", "draw"];
    return m.winner === e.id ? ["Vitória", "win"] : ["Derrota", "loss"];
  };
  return portal("/conta/competicoes", "Competições e resultados", html`${cards.length ? cards.map(({ e, cat, ev, mine, names, placement, totalRounds }) => html`<article class="card" style="margin-bottom:1rem">
      <p class="eyebrow" style="margin:0">${ev?.name || "Evento"}${ev ? ` · ${fmtDate(ev.startsOn)}` : ""}</p>
      <h3 style="margin:.2rem 0">${cat.name}${e.team ? html` <span class="muted">· equipe ${e.team.name}</span>` : ""}</h3>
      <p><span class="placement">${placement}</span>${e.status === "confirmada" && cat.status !== "inscricoes" ? html` · <a href="#/chaves/${cat.id}">ver chave completa</a>` : ""}</p>
      ${mine.length ? html`<div class="table-wrap"><table><caption class="visually-hidden">Minhas disputas em ${cat.name}</caption>
        <thead><tr><th scope="col">Fase</th><th scope="col">Adversário</th><th scope="col">Quando</th><th scope="col">Resultado</th><th scope="col">Placar</th></tr></thead>
        <tbody>${mine.map((m) => { const meA = m.a === e.id; const opp = names[meA ? m.b : m.a] || "a definir"; const [r, cls] = res(m, e);
          return html`<tr><td>${m.stage === "grupo" ? `Grupo ${m.groupLabel}, rodada ${m.round}` : roundName(m.round, totalRounds)}</td><td>${opp}</td>
            <td>${m.scheduledAt ? `${fmtDate(m.scheduledAt)}${m.venue ? ` · ${m.venue}` : ""}` : "a definir"}</td>
            <td><span class="result ${cls}">${r}</span>${m.status === "encerrada" && m.method ? html`<br><span class="muted">${METHOD_LABELS[m.method] || m.method}</span>` : ""}</td>
            <td>${m.status === "encerrada" ? `${meA ? m.scoreA : m.scoreB} × ${meA ? m.scoreB : m.scoreA}` : "—"}</td></tr>`; })}</tbody></table></div>`
        : html`<p class="muted">${cat.status === "inscricoes" ? "A chave ainda não foi gerada." : "Nenhuma disputa definida ainda."}</p>`}</article>`)
      : html`<p class="muted">Você ainda não está inscrito(a) em nenhuma competição.</p>`}
    ${open.length ? html`<h2>Competições abertas para você</h2><ul class="compact">${open.map((c) => html`<li>${c.ev.name} — ${c.name}
      <button class="btn small" type="button" data-enroll="${c.id}" data-event="${c.ev.id}">Inscrever-me<span class="visually-hidden"> em ${c.name}</span></button></li>`)}</ul>` : ""}
    ${u.role === "atleta" ? html`<p class="hint">Nos esportes coletivos, a inscrição é feita pela equipe, com o professor responsável.</p>` : ""}
    ${u.role === "artista" ? html`<p class="hint">Artistas participam dos eventos pelas apresentações. Veja em <a href="#/conta/apresentacoes">Apresentações</a>.</p>` : ""}`,
  (root) => bindEnroll(root, u, uid));
}, USER);

// ------------------------------------------------------------------ Apresentações
route("/conta/apresentacoes", async () => {
  const uid = session.user.uid;
  const perfs = await myPerformances(uid);
  const events = Object.fromEntries((await db.list("events")).map((e) => [e.id, e]));
  const teachers = Object.fromEntries((await db.list("teachersPublic")).map((t) => [t.id, t.name]));
  const staff = await db.list("staff", [["uid", "==", uid]]);
  perfs.sort((a, b) => String(a.scheduledAt || "9").localeCompare(String(b.scheduledAt || "9")));
  return portal("/conta/apresentacoes", "Apresentações", html`${perfs.length ? perfs.map((p) => { const me = (p.members || []).find((m) => m.uid === uid); return html`<article class="card" style="margin-bottom:1rem">
      <p class="eyebrow" style="margin:0">${events[p.eventId]?.name || "Evento"} · ${S.SLOTS[p.slot]}</p>
      <h3 style="margin:.2rem 0">${p.title}</h3>
      <dl class="facts"><dt>Quando</dt><dd>${p.scheduledAt ? fmtDate(p.scheduledAt) : "horário a definir"} · ${p.durationMin} min · ordem de entrada ${p.order}</dd>
        ${me ? html`<dt>Minha função</dt><dd>${me.part || "integrante"}</dd>` : html`<dt>Minha função</dt><dd>Professor(a) responsável</dd>`}
        <dt>Modalidade</dt><dd>${S.MOD[p.modality]?.name}</dd>
        ${p.soundtrack ? html`<dt>Trilha sonora</dt><dd>${p.soundtrack}</dd>` : ""}
        ${p.teacherId && teachers[p.teacherId] ? html`<dt>Professor(a)</dt><dd>${teachers[p.teacherId]}</dd>` : ""}
        <dt>Integrantes</dt><dd>${(p.members || []).map((m) => m.uid === uid ? "você" : m.publicName).join(", ") || "—"}</dd></dl>
      ${C.accTags(p)}</article>`; }) : html`<p class="muted">Você ainda não está escalado(a) em nenhuma apresentação.</p>`}
    ${staff.length ? html`<h2>Equipe de apoio</h2><ul>${staff.map((s) => html`<li>${events[s.eventId]?.name || "Evento"}: ${S.SUPPORT_FUNCTIONS[s.function]}${s.notes ? ` (${s.notes})` : ""}</li>`)}</ul>` : ""}`);
}, USER);

// ------------------------------------------------------------------ Avisos
route("/conta/avisos", async () => {
  const u = session.profile;
  const notices = await myNotices(u);
  const view = portal("/conta/avisos", "Avisos", html`${notices.length ? html`<div class="grid" style="grid-template-columns:1fr">${notices.map((n) => noticeCard(n, u))}</div>` : html`<p class="muted">Nenhum aviso por enquanto.</p>`}`);
  const result = await view;
  // marca como lidos depois de montar a página (os "novo" desta visita continuam visíveis)
  await db.update("users", session.user.uid, { noticesSeenAt: new Date().toISOString() });
  session.profile = { ...u, noticesSeenAt: new Date().toISOString() };
  return result;
}, USER);

// ------------------------------------------------------------------ Privacidade e autorizações
route("/conta/privacidade", async () => {
  const u = session.profile, uid = session.user.uid;
  const consents = (await db.list("consents", [["userId", "==", uid]])).sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));
  const minor = (ageToday(u.birthDate) ?? 99) < 18;
  const KIND = { cadastro: "Cadastro e participação", imagem: "Uso de imagem (fotos e vídeos)", dados_sensiveis: "Informação sobre deficiência" };
  return portal("/conta/privacidade", "Privacidade e autorizações", html`<p class="hint">Seus direitos pela LGPD: ver, corrigir, baixar e apagar seus dados, e retirar autorizações a qualquer momento.</p>
    <section class="card"><h3 style="margin-top:0">Uso de imagem</h3>
      <p>Situação: <strong>${u.imageConsent ? "autorizado" : "não autorizado"}</strong>. ${u.imageConsent ? "Fotos e vídeos de eventos em que você aparece podem ser publicados nos canais da Oásis." : "Fotos em que você aparece não serão publicadas."}</p>
      <form id="img-form">${minor && !u.imageConsent ? C.field("granted_by", "Nome do responsável legal que autoriza", { value: u.guardian?.name }) : ""}
        <button class="btn ${u.imageConsent ? "secondary" : ""} small" type="submit">${u.imageConsent ? "Retirar autorização de uso de imagem" : "Autorizar uso de imagem"}</button></form></section>
    <h3>Histórico de autorizações</h3>
    <div class="table-wrap"><table><thead><tr><th scope="col">Autorização</th><th scope="col">Concedida por</th><th scope="col">Data</th><th scope="col">Situação</th></tr></thead>
      <tbody>${consents.map((c) => html`<tr><td>${KIND[c.kind] || c.kind}</td><td>${c.grantedBy}${c.relation && c.relation !== "titular" ? ` (${c.relation})` : ""}</td>
        <td>${fmtDate(c.grantedAt.slice(0, 16))}</td><td>${c.revokedAt ? `Retirada em ${fmtDate(c.revokedAt.slice(0, 10))}` : "Válida"}</td></tr>`)}</tbody></table></div>
    <h3>Meus dados</h3><div class="actions"><button class="btn secondary small" type="button" id="export">Baixar todos os meus dados</button>
      ${u.role !== "professor" ? html`<a class="btn secondary small" href="#/conta/acessibilidade">Informação de acessibilidade</a>` : ""}
      <a class="btn secondary small" href="#/privacidade">Política de privacidade</a></div>
    <h3>Excluir conta</h3><p><a href="#/conta/excluir">Excluir minha conta e meus dados pessoais</a></p>`,
  (root) => {
    bindForm(root, "#img-form", async (d) => {
      if (u.imageConsent) {
        for (const c of consents.filter((c) => c.kind === "imagem" && !c.revokedAt)) await db.update("consents", c.id, { revokedAt: new Date().toISOString() });
        await db.update("users", uid, { imageConsent: false });
        flash("Autorização de uso de imagem retirada.", "success");
      } else {
        await db.add("consents", { userId: uid, kind: "imagem", grantedBy: minor ? str(d.granted_by, 120) || u.guardian?.name : u.name,
          grantedEmail: minor ? u.guardian?.email : u.email, relation: minor ? u.guardian?.relation : "titular", termsVersion: S.TERMS_VERSION, grantedAt: new Date().toISOString(), revokedAt: null });
        await db.update("users", uid, { imageConsent: true });
        flash("Uso de imagem autorizado.", "success");
      }
      await refreshSession();
      go("/conta/privacidade");
    });
    root.querySelector("#export").addEventListener("click", async () => {
      const [sensitive, entries, perfs] = await Promise.all([db.get("sensitive", uid).catch(() => null), myEntries(uid), myPerformances(uid)]);
      const data = { usuario: { ...u, id: uid }, dados_sensiveis: sensitive, consentimentos: consents,
        inscricoes: entries.map(({ team, ...e }) => e), apresentacoes: perfs.map((p) => p.title) };
      download("meus-dados.json", JSON.stringify(data, null, 2), "application/json");
      await S.audit(uid, uid, "exportou os próprios dados");
    });
  });
}, USER);

// ------------------------------------------------------------------ Comprovante de inscrição
route("/conta/comprovante", async () => {
  const u = session.profile, uid = session.user.uid;
  const { site } = await getSettings();
  const entries = (await myEntries(uid)).filter((e) => e.status === "confirmada");
  const cats = (await Promise.all(entries.map((e) => db.get("categories", e.categoryId)))).filter(Boolean);
  const events = Object.fromEntries((await db.list("events")).map((e) => [e.id, e]));
  const reg = (await db.list("consents", [["userId", "==", uid]])).find((c) => c.kind === "cadastro");
  return portal("/conta/comprovante", "Comprovante de inscrição", html`
    <div class="actions no-print"><button class="btn" type="button" id="print">Imprimir / salvar em PDF</button></div>
    <article class="card receipt"><header><p class="logo-mark" style="margin:0">${site.shortName}</p><p style="margin:0"><strong>${site.name}</strong><br>${site.address}</p></header>
      <h2>Comprovante de inscrição</h2>
      <dl class="facts"><dt>Participante</dt><dd>${u.name}</dd>
        ${u.birthDate ? html`<dt>Nascimento</dt><dd>${fmtDate(u.birthDate)} (${ageToday(u.birthDate)} anos)</dd>` : ""}
        <dt>Perfil</dt><dd>${S.ROLE_LABELS[u.role]}</dd>
        <dt>Modalidades</dt><dd>${Object.entries(u.modalities || {}).map(([k, v]) => `${S.MOD[k]?.name}${v.level ? ` (${v.level})` : ""}`).join(", ") || "—"}</dd>
        ${u.guardian ? html`<dt>Responsável legal</dt><dd>${u.guardian.name} (${u.guardian.relation}) · ${u.guardian.phone || u.guardian.email}</dd>` : ""}
        <dt>Inscrição desde</dt><dd>${reg ? fmtDate(reg.grantedAt.slice(0, 10)) : "—"}</dd>
        <dt>Competições confirmadas</dt><dd>${cats.length ? cats.map((c) => `${events[c.eventId]?.name || ""} — ${c.name}`).join("; ") : "nenhuma"}</dd>
        <dt>Uso de imagem</dt><dd>${u.imageConsent ? "autorizado" : "não autorizado"}</dd></dl>
      <p class="hint">Atividades gratuitas. Emitido em ${fmtDate(todayISO())}. Em caso de dúvida: ${site.email} · ${site.phone1}.</p></article>`,
  (root) => root.querySelector("#print").addEventListener("click", () => window.print()));
}, USER);

route("/conta/perfil", async () => {
  const u = session.profile;
  const available = S.MODALITIES.filter((m) => (S.ROLE_KINDS[u.role] || []).includes(m.kind));
  const support = new Set(u.supportInterest || []), apts = new Set(u.aptitudes || []);
  return portal("/conta/perfil", "Perfil e modalidades", html`<form id="profile-form"><fieldset><legend>Dados</legend>
      ${C.field("name", "Nome completo", { value: u.name, required: true })}
      <div class="row">${C.field("phone", "Telefone", { type: "tel", value: u.phone })}${C.field("affiliation", "Escola, academia ou turma", { value: u.affiliation })}</div>
      ${u.guardian ? html`<p>Responsável: <strong>${u.guardian.name}</strong> (${u.guardian.relation}, ${u.guardian.email})</p>${C.field("guardian_phone", "Telefone do responsável", { type: "tel", value: u.guardian.phone })}` : ""}</fieldset>
      <fieldset><legend>Modalidades</legend><p class="hint">Nas lutas, informe faixa/graduação e peso — usados para montar as categorias.</p>
        ${available.map((m) => { const cur = (u.modalities || {})[m.code]; return html`<div class="card" style="margin-bottom:.5rem">
          ${C.checkbox(`mod_${m.code}`, m.name + (m.adaptedOf ? " (adaptada)" : ""), !!cur)}
          <div class="row">${C.field(`level_${m.code}`, "Nível, faixa ou instrumento", { value: cur?.level || "" })}
          ${m.kind === "luta" ? C.field(`weight_${m.code}`, "Peso (kg)", { type: "number", value: cur?.weight ?? "", attrs: 'step="0.1" min="10" max="150"' }) : ""}</div></div>`; })}</fieldset>
      ${u.role === "professor" ? html`<fieldset><legend>Inclusão e perfil público</legend>
        <div class="checks">${Object.entries(S.DISABILITY_TYPES).map(([k, v]) => html`<label class="check"><input type="checkbox" name="aptitude" value="${k}" ${raw(apts.has(k) ? "checked" : "")}> ${v}</label>`)}</div>
        ${C.textarea("bio", "Apresentação", { value: u.bio })}${C.checkbox("public_listing", "Aparecer na busca pública de professores", !!u.publicListing)}</fieldset>` : ""}
      <fieldset><legend>Equipe de apoio dos eventos</legend><div class="checks">${Object.entries(S.SUPPORT_FUNCTIONS).map(([k, v]) => html`<label class="check"><input type="checkbox" name="support" value="${k}" ${raw(support.has(k) ? "checked" : "")}> ${v}</label>`)}</div></fieldset>
      <button class="btn" type="submit">Salvar</button></form>`,
    (root) => {
      bindForm(root, "#profile-form", async (d) => {
        const modalities = { ...(u.modalities || {}) };
        for (const m of available) {
          if (d[`mod_${m.code}`]) modalities[m.code] = { level: str(d[`level_${m.code}`], 60), weight: num(d[`weight_${m.code}`]) };
          else delete modalities[m.code];
        }
        const patch = { name: str(d.name, 120) || u.name, phone: str(d.phone, 30), affiliation: str(d.affiliation, 120), modalities,
          supportInterest: asList(d.support).filter((s) => S.SUPPORT_FUNCTIONS[s]) };
        if (u.guardian) patch.guardian = { ...u.guardian, phone: str(d.guardian_phone, 30) };
        if (u.role === "professor") {
          Object.assign(patch, { bio: str(d.bio, 1000), aptitudes: asList(d.aptitude).filter((x) => S.DISABILITY_TYPES[x]), publicListing: !!d.public_listing });
          if (patch.publicListing) await db.set("teachersPublic", session.user.uid, { name: patch.name, bio: patch.bio, affiliation: patch.affiliation, modalities: Object.keys(modalities), aptitudes: patch.aptitudes });
          else await db.remove("teachersPublic", session.user.uid).catch(() => {});
        }
        await db.update("users", session.user.uid, patch);
        await refreshSession();
        flash("Perfil atualizado.", "success");
        go("/conta/perfil");
      });
    });
}, USER);

route("/conta/acessibilidade", async () => {
  const u = session.profile, uid = session.user.uid;
  const minor = (ageToday(u.birthDate) ?? 99) < 18;
  const data = await db.get("sensitive", uid).catch(() => null);
  const types = new Set(data?.types || []);
  const adapted = S.MODALITIES.filter((m) => m.adaptedOf);
  return portal("/conta/acessibilidade", "Acessibilidade e deficiência", html`<p class="hint">Informação opcional e sigilosa. Serve para vincular o perfil às modalidades adaptadas e preparar apoio nos eventos. Só a coordenação vê, e cada acesso é registrado.</p>
    <form id="dis-form"><fieldset class="sensitive"><legend>Tipo de deficiência</legend>
      <div class="checks">${Object.entries(S.DISABILITY_TYPES).map(([k, v]) => html`<label class="check"><input type="checkbox" name="disability" value="${k}" ${raw(types.has(k) ? "checked" : "")}> ${v}</label>`)}</div>
      ${C.textarea("notes", "Necessidades de apoio", { value: data?.notes || "", rows: 3 })}</fieldset>
    ${u.role === "lutador" ? html`<fieldset><legend>Modalidades adaptadas</legend><div class="checks">${adapted.map((m) => html`<label class="check"><input type="checkbox" name="adapted" value="${m.code}" ${raw((u.modalities || {})[m.code] ? "checked" : "")}> ${m.name}</label>`)}</div></fieldset>` : ""}
    <fieldset><legend>Consentimento</legend>${minor ? C.field("granted_by", "Nome do responsável legal que autoriza", { value: u.guardian?.name, required: true }) : ""}
      <label class="check"><input type="checkbox" name="consent_sensitive" value="1" required> Autorizo, de forma específica e destacada, o tratamento desta informação para as finalidades descritas${minor ? ", na condição de responsável legal" : ""}.</label></fieldset>
    <button class="btn" type="submit" name="action" value="save">Salvar</button>
    ${data ? html` <button class="btn danger" type="submit" name="action" value="remove" formnovalidate>Remover informação e revogar consentimento</button>` : ""}</form>`,
  (root) => {
    bindForm(root, "#dis-form", async (d) => {
      const myConsents = await db.list("consents", [["userId", "==", uid]]);
      if (d.action === "remove") {
        await db.remove("sensitive", uid);
        for (const c of myConsents.filter((c) => c.kind === "dados_sensiveis" && !c.revokedAt)) await db.update("consents", c.id, { revokedAt: new Date().toISOString() });
        flash("Informação removida e consentimento revogado.", "success");
        return go("/conta/acessibilidade");
      }
      if (!d.consent_sensitive) throw new Error("Marque o consentimento específico para salvar.");
      const consentId = await db.add("consents", { userId: uid, kind: "dados_sensiveis", grantedBy: minor ? str(d.granted_by, 120) || u.guardian?.name : u.name,
        grantedEmail: minor ? u.guardian?.email : u.email, relation: minor ? u.guardian?.relation : "titular", termsVersion: S.TERMS_VERSION, grantedAt: new Date().toISOString(), revokedAt: null });
      await db.set("sensitive", uid, { types: asList(d.disability).filter((x) => S.DISABILITY_TYPES[x]), notes: str(d.notes, 500), consentId });
      if (u.role === "lutador") {
        const modalities = { ...(u.modalities || {}) };
        for (const m of adapted) { if (asList(d.adapted).includes(m.code)) modalities[m.code] ||= { level: "", weight: null }; else delete modalities[m.code]; }
        await db.update("users", uid, { modalities });
        await refreshSession();
      }
      flash("Informação salva com sigilo.", "success");
      go("/conta/acessibilidade");
    });
  });
}, USER);

route("/conta/excluir", async () => portal("/conta/privacidade", "Excluir conta", html`<p>Seus dados pessoais, de responsável e a informação de deficiência serão apagados. Resultados de lutas e partidas já disputadas ficam como “Participante removido”, para não alterar as chaves dos demais.</p>
    <form class="card" style="max-width:34rem" id="del-form">${C.field("confirm", "Digite EXCLUIR para confirmar", { required: true })}
      ${C.field("password", "Sua senha", { type: "password", required: true, attrs: 'autocomplete="current-password"' })}
      <button class="btn danger" type="submit">Excluir definitivamente</button></form>`,
  (root) => {
    bindForm(root, "#del-form", async (d, form) => {
      if (!confirmText(form)) throw new Error("Digite EXCLUIR para confirmar.");
      const uid = session.user.uid;
      await auth.checkPassword(d.password);
      authFlow.active = true;
      try {
        await anonymizeUser(uid);
        await auth.deleteMe(d.password);
        await refreshSession();
      } finally { authFlow.active = false; }
      flash("Sua conta e seus dados pessoais foram excluídos.", "info");
      go("/");
    });
  }), USER);

// Usado também pelo painel (exclusão a pedido do titular/responsável)
export async function anonymizeUser(uid) {
  await db.remove("sensitive", uid).catch(() => {});
  await db.remove("teachersPublic", uid).catch(() => {});
  for (const c of await db.list("consents", [["userId", "==", uid]])) {
    await db.update("consents", c.id, { revokedAt: c.revokedAt || new Date().toISOString(), grantedBy: "removido", grantedEmail: null });
  }
  // renomeia as inscrições (só a administração tem permissão; para o próprio aluno, o nome abreviado permanece)
  for (const e of await db.list("entries", [["userId", "==", uid]])) await db.update("entries", e.id, { publicName: "Participante removido" }).catch(() => {});
  await db.set("users", uid, { name: "Participante removido", email: "", role: (await db.get("users", uid))?.role || "atleta", active: false, removedAt: new Date().toISOString() });
}
