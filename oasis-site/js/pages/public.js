// Área pública: Início · A Oásis · Projetos · Esportes · Conteúdo · Participe.

import { db, listSorted } from "../data/db.js";
import { route, go } from "../core/router.js";
import { html, raw, paragraphs, lines, faqItems, fmtDate, fmtTime, todayISO, dateParts, flash, formData, str } from "../core/ui.js";
import * as C from "./components.js";
import * as S from "../logic/services.js";
import { bindForm, notFound } from "./helpers.js";
import { explainCategory } from "../logic/explain.js";

const published = (c) => db.list(c, [["published", "==", true]]);
const projectsList = async () => (await published("projects")).sort((a, b) => (a.order || 0) - (b.order || 0));
const upcoming = async (kinds = null) => (await published("events"))
  .filter((e) => (e.endsOn || e.startsOn) >= todayISO() && (!kinds || kinds.includes(e.kind)))
  .sort((a, b) => a.startsOn.localeCompare(b.startsOn));
const visibleModalities = (site) => S.MODALITIES.filter((m) => site.showAdaptedPublic || !m.adaptedOf);

// ------------------------------------------------------------------ Início
const publicHome = async ({ settings: { site } }) => {
  const [projects, news, events, sponsors] = await Promise.all([projectsList(),
    published("news").then((n) => n.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)),
    upcoming().then((e) => e.slice(0, 4)), listSorted("sponsors", [], "order")]);
  const hero = html`<section class="home-hero" aria-labelledby="hero-title"><span class="hero-sun" aria-hidden="true"></span>
    <div class="wrap"><div><p class="eyebrow" style="color:#fff">${site.name}</p><h1 id="hero-title">${site.tagline}</h1><p>${site.heroSubtitle}</p>
      <div class="actions"><a class="btn" href="#/quem-somos">Conheça a Oásis</a><a class="btn ghost" href="#/modalidades">Conheça nossos esportes</a></div></div>
      <div class="hero-media">${site.heroImage ? C.img(site.heroImage, site.heroImageAlt)
        : html`<div class="hero-placeholder"><span class="big" aria-hidden="true">${site.shortName}</span>${site.photosNote ? html`<span>${site.photosNote}</span>` : ""}</div>`}</div></div></section>
    ${sponsors.length ? html`<section class="sponsors" aria-labelledby="sp-h"><div class="wrap"><h2 id="sp-h">Patrocinadores e apoiadores</h2>
      <ul>${sponsors.map((s) => html`<li>${s.url ? raw(`<a href="${C.h(s.url)}" rel="noopener" target="_blank">`) : ""}${s.logo ? C.img(s.logo, s.name) : s.name}${s.url ? raw("</a>") : ""}</li>`)}</ul></div></section>` : ""}`;
  const body = html`
    <section class="section two-col" aria-labelledby="quem-h"><div><p class="eyebrow">Quem somos</p>
      <h2 id="quem-h" style="margin-top:0;font-size:1.7rem">Arte e esporte para desenvolver pessoas</h2>
      <div class="prose">${paragraphs(site.aboutShort)}</div><a class="btn secondary" href="#/quem-somos">Saiba mais sobre a Oásis</a></div>
      <ul class="stats" aria-label="A Oásis em números">${(site.stats || []).map((s) => html`<li><strong>${s.value}</strong>${s.label}</li>`)}</ul></section>
    <section class="section" aria-labelledby="proj-h"><div class="section-head"><div><p class="eyebrow">Projetos</p><h2 id="proj-h">Nossos projetos</h2></div>
      <a href="#/projetos">Ver todos os projetos →</a></div><div class="grid">${projects.map(C.projectCard)}</div></section>
    <section class="section" aria-labelledby="incl-h"><div class="inclusive-band"><div>
      <p class="eyebrow" style="color:var(--sun)">Esporte inclusivo</p><h2 id="incl-h">Esporte para todos</h2><p>${site.inclusiveText}</p>
      ${!site.showAdaptedPublic && site.adaptedPendingNote ? html`<p class="note">${site.adaptedPendingNote}</p>` : ""}</div>
      <ul class="compact"><li>Vídeos e intérpretes de Libras</li><li>Espaço acessível nos eventos</li>
        <li><a href="#/professores">Professores preparados para a inclusão</a></li><li><a href="#/esporte-inclusivo">Conheça o esporte inclusivo</a></li></ul></div></section>
    <section class="section two-col" aria-label="Notícias e agenda">
      <div><div class="section-head"><div><p class="eyebrow">Conteúdo</p><h2>Últimas notícias</h2></div><a href="#/noticias">Todas as notícias →</a></div>
        ${news.length ? html`<div class="grid" style="grid-template-columns:1fr">${news.map((n) => html`<article class="card news-card">
          <p class="date" style="margin:0">${fmtDate(n.date)}${n.category ? ` · ${n.category}` : ""}</p>
          <h3 style="margin:.2rem 0"><a href="#/noticias/${n.id}">${n.title}</a></h3>${n.summary ? html`<p style="margin:0">${n.summary}</p>` : ""}</article>`)}</div>`
          : html`<p class="muted">Em breve.</p>`}</div>
      <div><div class="section-head"><div><p class="eyebrow">Agenda</p><h2>Próximos eventos</h2></div><a href="#/eventos">Agenda completa →</a></div>
        ${events.length ? html`<div class="grid" style="grid-template-columns:1fr">${events.map(C.eventCard)}</div>` : html`<p class="muted">Nenhum evento agendado no momento.</p>`}</div></section>
    <section class="section" aria-labelledby="part-h"><div class="cta-band two-col"><div><p class="eyebrow">Participe</p>
      <h2 id="part-h" style="margin-top:0">Inscrições gratuitas</h2><p>${site.participeText}</p>
      <div class="actions"><a class="btn" href="#/inscricoes">Quero me inscrever</a><a class="btn secondary" href="#/cadastro">Fazer cadastro</a></div>
      <p style="margin:.25rem 0 0"><strong>Já é inscrito?</strong> <a href="#/entrar">Acesse a Área do aluno</a> para ver agenda, resultados e avisos.</p></div>
      <div><h3 style="margin-top:0">Como ajudar</h3><ul class="compact"><li><strong>Doações:</strong> ${site.helpDonation}</li>
        <li><strong>Parcerias:</strong> ${site.helpPartnership}</li><li><strong>Voluntariado:</strong> ${site.helpVolunteer}</li></ul>
        <div class="actions"><a class="btn secondary small" href="#/doacoes">Ver canais oficiais</a><a class="btn secondary small" href="#/como-ajudar">Conhecer formas de apoio</a>
          <a class="btn secondary small" href="#/contato">Falar com a equipe</a></div></div></div></section>`;
  return { title: "Início", hero, body };
};
// Visitantes veem o site em "/"; inscritos e coordenação acessam o site institucional por "/site".
route("/", publicHome);
route("/site", publicHome);

// ------------------------------------------------------------------ A Oásis
const INST = [["/quem-somos", "Quem somos"], ["/historia", "Nossa história"], ["/missao-visao-valores", "Missão, visão e valores"], ["/transparencia", "Transparência"]];
function institutional(path, title, contentFn) {
  route(path, async (ctx) => {
    const content = await contentFn(ctx);
    return { title, hero: C.pageHero("A Oásis", title, ctx.settings.site.tagline),
      body: html`<div class="content-layout"><nav aria-label="A Oásis"><ul class="sidenav">${INST.map(([p, l]) => html`<li><a href="#${p}" ${raw(p === path ? 'aria-current="page"' : "")}>${l}</a></li>`)}</ul></nav><div>${content}</div></div>` };
  });
}
institutional("/quem-somos", "Quem somos", async ({ settings: { site } }) => {
  const projects = await projectsList();
  return html`<div class="prose">${paragraphs(site.aboutFull)}</div>
    <ul class="stats" aria-label="A Oásis em números" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin:1.5rem 0">${(site.stats || []).map((s) => html`<li><strong>${s.value}</strong>${s.label}</li>`)}</ul>
    <h2>Como atuamos</h2><div class="grid">${(site.commitments || []).map((c) => html`<div class="card"><h3>${c.title}</h3><p style="margin:0">${c.text}</p></div>`)}</div>
    <h2>Nossos projetos</h2><div class="grid">${projects.map(C.projectCard)}</div>`;
});
institutional("/historia", "Nossa história", async ({ settings: { site } }) =>
  html`<ol class="timeline-hist prose">${String(site.history || "").split(/\n\s*\n/).filter((b) => b.trim()).map((b) => html`<li>${paragraphs(b)}</li>`)}</ol>`);
institutional("/missao-visao-valores", "Missão, visão e valores", async ({ settings: { site } }) =>
  html`<div class="grid"><div class="card"><h2 style="margin-top:0">Missão</h2>${paragraphs(site.mission)}</div>
    <div class="card"><h2 style="margin-top:0">Visão</h2>${paragraphs(site.vision)}</div>
    <div class="card"><h2 style="margin-top:0">Valores</h2><ul>${lines(site.values).map((v) => html`<li>${v}</li>`)}</ul></div></div>`);
institutional("/transparencia", "Transparência", async ({ settings: { site } }) =>
  html`<div class="prose">${paragraphs(site.transparency)}</div><h2>Documentos e relatórios</h2>
    ${(site.transparencyLinks || []).length ? html`<ul>${site.transparencyLinks.map((d) => html`<li><a href="${d.url}" target="_blank" rel="noopener">${d.title}</a></li>`)}</ul>`
      : html`<p class="muted">Os documentos serão publicados em breve.</p>`}`);

// ------------------------------------------------------------------ Projetos
route("/projetos", async () => ({ title: "Projetos",
  hero: C.pageHero("Projetos", "Nossos projetos", "Cursos e atividades gratuitas de artes e esportes para crianças e adolescentes de 4 a 17 anos."),
  body: html`<div class="grid">${(await projectsList()).map(C.projectCard)}</div><p style="margin-top:1.5rem"><a href="#/esporte-inclusivo">Conheça também o esporte inclusivo →</a></p>` }));

route("/projetos/:id", async ({ params, settings: { site } }) => {
  const p = await db.get("projects", params.id).catch(() => null);
  if (!p || !p.published) return notFound();
  const codes = p.modalities || [];
  const mods = visibleModalities(site).filter((m) => codes.includes(m.code));
  const teachers = (await db.list("teachersPublic")).filter((t) => (t.modalities || []).some((m) => codes.includes(m)));
  const events = await upcoming();
  const cats = [];
  for (const ev of events) for (const c of await db.list("categories", [["eventId", "==", ev.id]])) if (codes.includes(c.modality)) cats.push({ ...c, ev });
  const others = (await projectsList()).filter((x) => x.id !== p.id);
  return { title: p.name, hero: C.pageHero(p.area || "Projeto", p.name, p.summary),
    body: html`<div class="two-col"><div>${p.image ? C.img(p.image, p.imageAlt, "article-cover") : ""}<div class="prose">${paragraphs(p.body)}</div>
        <div class="actions"><a class="btn" href="#/inscricoes">Quero participar</a></div></div>
      <div>${p.participants ? html`<ul class="stats" style="grid-template-columns:1fr"><li><strong>${p.participants}</strong>participantes</li></ul>` : ""}
        ${mods.length ? html`<h2>Modalidades</h2><p>${mods.map((m) => html`<span class="tag">${m.name}</span>`)}</p>` : ""}
        ${teachers.length ? html`<h2>Professores</h2><ul class="compact">${teachers.map((t) => html`<li>${t.name}</li>`)}</ul><p><a href="#/professores">Buscar professores por modalidade e inclusão →</a></p>` : ""}
        ${cats.length ? html`<h2>Próximas competições</h2><ul class="compact">${cats.map((c) => html`<li><a href="#/eventos/${c.ev.id}">${c.ev.name}</a> — ${c.name}${c.status !== "inscricoes" ? html` · <a href="#/chaves/${c.id}">ver chave</a>` : ""}</li>`)}</ul>` : ""}</div></div>
      ${others.length ? html`<h2>Outros projetos</h2><div class="grid">${others.map(C.projectCard)}</div>` : ""}` };
});

route("/esporte-inclusivo", async ({ settings: { site } }) => {
  const teachers = await db.list("teachersPublic");
  const count = (d) => teachers.filter((t) => (t.aptitudes || []).includes(d)).length;
  return { title: "Esporte inclusivo", hero: C.pageHero("Projetos", "Esporte inclusivo", "O esporte é um direito de todos."),
    body: html`<div class="two-col"><div class="prose">${paragraphs(site.inclusiveText)}
      ${site.showAdaptedPublic ? html`<h2>Modalidades adaptadas</h2><ul>${S.MODALITIES.filter((m) => m.adaptedOf).map((m) => html`<li>${m.name}</li>`)}</ul>`
        : site.adaptedPendingNote ? html`<p class="flash info">${site.adaptedPendingNote}</p>` : ""}
      <h2>O que já oferecemos</h2><ul>
        <li><strong>Libras:</strong> vídeos com intérprete nas chaves e na programação, e intérprete no palco quando indicado.</li>
        <li><strong>Eventos acessíveis:</strong> cada apresentação informa audiodescrição e reserva de espaço acessível na plateia.</li>
        <li><strong>Equipe de apoio:</strong> alunos com deficiência podem atuar como mesários, cronometristas, no som e palco ou na fotografia.</li>
        <li><strong>Cadastro sigiloso:</strong> a família pode informar a deficiência (opcional), protegida pela LGPD, para que a equipe prepare o acolhimento.</li></ul></div>
      <div><h2 style="margin-top:0">Professores preparados</h2><p>Encontre professores com experiência em cada tipo de deficiência:</p>
        <ul class="compact">${Object.entries(S.DISABILITY_TYPES).map(([k, v]) => html`<li><a href="#/professores?deficiencia=${k}">${v}</a> <span class="muted">(${count(k)})</span></li>`)}</ul>
        <div class="actions"><a class="btn" href="#/cadastro">Fazer cadastro</a><a class="btn secondary" href="#/contato">Falar com a equipe</a></div></div></div>` };
});

// ------------------------------------------------------------------ Esportes
route("/modalidades", async ({ settings: { site } }) => {
  const projects = await projectsList();
  const byProject = {};
  for (const p of projects) for (const c of p.modalities || []) byProject[c] ||= p;
  const mods = visibleModalities(site);
  return { title: "Modalidades", hero: C.pageHero("Esportes e artes", "Modalidades", "Todas as atividades são gratuitas, para crianças e adolescentes de 4 a 17 anos."),
    body: html`${[["arte", "Artes"], ["coletivo", "Esportes coletivos"], ["luta", "Artes marciais"]].map(([k, t]) => {
      const photo = projects.find((p) => p.image && (p.modalities || []).some((c) => S.MOD[c]?.kind === k));
      return html`<h2>${t}</h2><div class="kind-row ${photo ? "" : "no-photo"}">${photo ? C.img(photo.image, photo.imageAlt, "kind-photo") : ""}<div class="grid">
      ${mods.filter((m) => m.kind === k).map((m) => html`<div class="card"><h3>${m.name}${m.adaptedOf ? html` <span class="tag accent">adaptada</span>` : ""}</h3>
        ${byProject[m.code] ? html`<p style="margin:0">Projeto <a href="#/projetos/${byProject[m.code].id}">${byProject[m.code].name}</a></p>` : ""}
        <p style="margin:.4rem 0 0"><a href="#/professores?modalidade=${m.code}">Professores de ${m.name}</a></p></div>`)}</div></div>`; })}
      ${!site.showAdaptedPublic && site.adaptedPendingNote ? html`<p class="flash info" style="margin-top:1.5rem">${site.adaptedPendingNote}</p>` : ""}
      <div class="actions"><a class="btn" href="#/inscricoes">Fazer inscrição</a><a class="btn secondary" href="#/calendario">Calendário esportivo</a></div>` };
});

route("/calendario", async ({ settings: { site } }) => {
  const events = await upcoming(["campeonato", "misto", "festival"]);
  const items = [];
  for (const ev of events) {
    const cats = (await db.list("categories", [["eventId", "==", ev.id]])).filter((c) => site.showAdaptedPublic || !S.MOD[c.modality].adaptedOf);
    items.push({ ev, cats, timeline: await S.calendarItems(ev.id) });
  }
  return { title: "Calendário esportivo", hero: C.pageHero("Esportes", "Calendário esportivo", "Competições, festivais, chaves e programação de palco e quadra."),
    body: items.length ? html`${items.map(({ ev, cats, timeline }) => { const dp = dateParts(ev.startsOn); return html`
      <section class="card" style="margin-bottom:1.25rem" aria-labelledby="ev-${ev.id}"><div class="event-row">
        <span class="date-badge" aria-hidden="true"><span class="d">${dp.day}</span><span class="m">${dp.month}</span></span><div>
        <h2 id="ev-${ev.id}" style="margin:0"><a href="#/eventos/${ev.id}">${ev.name}</a></h2>
        <p class="muted" style="margin:.2rem 0">${fmtDate(ev.startsOn)}${ev.timeLabel ? `, ${ev.timeLabel}` : ""}${ev.location ? ` · ${ev.location}` : ""} · ${S.EVENT_KINDS[ev.kind]}</p>
        ${cats.length ? html`<p style="margin:.4rem 0 0"><strong>Chaves:</strong> ${cats.map((c, i) => html`${i ? " · " : ""}${c.status !== "inscricoes" ? html`<a href="#/chaves/${c.id}">${c.name}</a>` : html`${c.name} <span class="muted">(inscrições)</span>`}`)}</p>` : ""}
        ${timeline.length ? html`<details><summary>Programação (${timeline.length} itens)</summary><ul class="compact">${timeline.map((t) => html`<li><strong>${fmtTime(t.start)}</strong> ${t.kind === "performance" ? `Apresentação: ${t.title}` : `${t.category}: ${t.a} × ${t.b}`}</li>`)}</ul></details>` : ""}
      </div></div></section>`; })}` : html`<p class="muted">Nenhuma competição agendada no momento.</p>` };
});

route("/professores", async ({ query, settings: { site } }) => {
  const mods = visibleModalities(site);
  const modality = query.modalidade || "", disability = query.deficiencia || "";
  const rows = (await listSorted("teachersPublic", [], "name"))
    .filter((t) => (!modality || (t.modalities || []).includes(modality)) && (!disability || (t.aptitudes || []).includes(disability)));
  return { title: "Professores", hero: C.pageHero("Esportes", "Professores e profissionais de inclusão", "Encontre professores por modalidade e pelo público com deficiência para o qual têm formação ou experiência."),
    body: html`<form class="card" role="search" aria-label="Buscar professores" id="teacher-search"><div class="row">
        ${C.select("modalidade", "Modalidade", { "": "Todas", ...Object.fromEntries(mods.map((m) => [m.code, m.name])) }, modality)}
        ${C.select("deficiencia", "Aptidão para ensinar pessoas com", { "": "Qualquer", ...S.DISABILITY_TYPES }, disability)}</div>
        <button class="btn" type="submit">Buscar</button></form>
      <h2 aria-live="polite">${rows.length} ${rows.length === 1 ? "professor encontrado" : "professores encontrados"}</h2>
      <div class="grid">${rows.map((t) => html`<article class="card"><h3>${t.name}</h3>${t.affiliation ? html`<p class="muted">${t.affiliation}</p>` : ""}
        <p><strong>Modalidades:</strong> ${(t.modalities || []).filter((m) => mods.some((x) => x.code === m)).map((m) => S.MOD[m].name).join(", ") || "—"}</p>
        ${(t.aptitudes || []).length ? html`<p><strong>Inclusão:</strong></p><ul>${t.aptitudes.map((a) => html`<li>${S.DISABILITY_TYPES[a]}</li>`)}</ul>` : ""}
        ${t.bio ? html`<p>${t.bio}</p>` : ""}</article>`)}</div>`,
    after(root) {
      root.querySelector("#teacher-search").addEventListener("submit", (e) => {
        e.preventDefault();
        const d = formData(e.target);
        go(`/professores?${new URLSearchParams(Object.entries(d).filter(([, v]) => v))}`);
      });
    } };
});

// ------------------------------------------------------------------ Conteúdo
route("/noticias", async () => ({ title: "Notícias", hero: C.pageHero("Conteúdo", "Notícias"),
  body: html`<div class="grid">${(await published("news")).sort((a, b) => b.date.localeCompare(a.date)).map(C.newsCard)}</div>` }));

route("/noticias/:id", async ({ params }) => {
  const n = await db.get("news", params.id).catch(() => null);
  if (!n || !n.published) return notFound();
  const more = (await published("news")).filter((x) => x.id !== n.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
  return { title: n.title, hero: C.pageHero(`${n.category || "Notícia"} · ${fmtDate(n.date)}`, n.title, n.summary),
    body: html`<article class="prose" style="max-width:780px">${n.image ? C.img(n.image, n.imageAlt, "article-cover") : ""}${C.libras(n.librasVideoUrl, n.title)}${paragraphs(n.body)}</article>
      <p><a href="#/noticias">← Todas as notícias</a></p>${more.length ? html`<h2>Leia também</h2><div class="grid">${more.map(C.newsCard)}</div>` : ""}` };
});

route("/eventos", async () => {
  const all = (await published("events")).sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  const next = all.filter((e) => (e.endsOn || e.startsOn) >= todayISO()), past = all.filter((e) => (e.endsOn || e.startsOn) < todayISO()).reverse();
  return { title: "Eventos", hero: C.pageHero("Conteúdo", "Eventos", "Festivais, competições e encontros da Oásis."),
    body: html`<h2>Próximos eventos</h2>${next.length ? html`<div class="grid">${next.map(C.eventCard)}</div>` : html`<p class="muted">Nenhum evento agendado.</p>`}
      ${past.length ? html`<h2>Eventos anteriores</h2><div class="grid">${past.slice(0, 20).map(C.eventCard)}</div>` : ""}` };
});

route("/eventos/:id", async ({ params, settings: { site } }) => {
  const ev = await db.get("events", params.id).catch(() => null);
  if (!ev || !ev.published) return notFound();
  const cats = (await db.list("categories", [["eventId", "==", ev.id]])).filter((c) => site.showAdaptedPublic || !S.MOD[c.modality].adaptedOf)
    .sort((a, b) => S.MOD[a.modality].name.localeCompare(S.MOD[b.modality].name) || a.ageMin - b.ageMin || (a.gender || "").localeCompare(b.gender || "") || (a.weightMax ?? 999) - (b.weightMax ?? 999));
  const entries = await db.list("entries", [["eventId", "==", ev.id]]);
  const [timeline, script] = await Promise.all([S.calendarItems(ev.id), S.stageScript(ev.id)]);
  return { title: ev.name, body: html`<p><a href="#/eventos">← Eventos</a></p><h1>${ev.name}</h1>
    <p><span class="tag">${S.EVENT_KINDS[ev.kind]}</span> ${fmtDate(ev.startsOn)}${ev.endsOn && ev.endsOn !== ev.startsOn ? ` a ${fmtDate(ev.endsOn)}` : ""}${ev.timeLabel ? `, ${ev.timeLabel}` : ""}${ev.location ? ` · ${ev.location}` : ""}</p>
    ${ev.image ? C.img(ev.image, ev.imageAlt, "article-cover") : ""}${ev.description ? html`<p class="lead">${ev.description}</p>` : ""}${C.libras(ev.librasVideoUrl, "apresentação do evento")}
    ${timeline.length ? html`<h2>Programação completa — palco e quadra</h2><ol class="timeline card">${timeline.map((it) => html`
      <li class="tl-item tl-${it.kind} ${it.status === "encerrada" ? "is-done" : ""}"><span class="tl-time">${fmtTime(it.start)}</span>
        <div class="tl-body">
        ${it.kind === "match" ? html`<span class="tl-cat">${it.category}${it.venue ? ` · ${it.venue}` : ""}</span>
          <span class="tl-title"><a href="#/chaves/${it.categoryId}">${it.a} × ${it.b}</a></span>
          ${it.status === "encerrada" ? html`<span class="tl-result">Resultado: ${it.scoreA} × ${it.scoreB} — ${it.winner === "Empate" ? "empate" : `vitória de ${it.winner}`}</span>` : ""}`
        : html`<span class="tl-cat">${S.SLOTS[it.slot]} · Palco</span><span class="tl-title">${it.title}</span>${C.accTags(it)}`}</div></li>`)}</ol>` : ""}
    ${cats.length ? html`<h2>Chaves e categorias</h2><div class="table-wrap"><table><caption class="visually-hidden">Categorias do evento</caption>
      <thead><tr><th scope="col">Categoria</th><th scope="col">Modalidade</th><th scope="col">Idade</th><th scope="col">Inscritos</th><th scope="col">Chave</th></tr></thead>
      <tbody>${cats.map((c) => html`<tr><th scope="row">${c.name}${S.MOD[c.modality].adaptedOf ? html` <span class="tag accent">adaptada</span>` : ""}${c.librasVideoUrl || c.librasAuto !== false ? html` <span class="tag">Libras</span>` : ""}</th>
        <td>${S.MOD[c.modality].name}${c.gender !== "misto" ? ` · ${S.GENDERS[c.gender]}` : ""}</td><td>${c.ageMin}–${c.ageMax} anos</td>
        <td>${entries.filter((e) => e.categoryId === c.id && e.status === "confirmada").length}</td>
        <td>${c.status !== "inscricoes" ? html`<a href="#/chaves/${c.id}">Ver chave<span class="visually-hidden"> de ${c.name}</span></a>` : "Inscrições abertas"}</td></tr>`)}</tbody></table></div>` : ""}
    ${script.length ? html`<h2>Programação cultural</h2>${Object.entries(S.SLOTS).map(([slot, label]) => { const items = script.filter((p) => p.slot === slot); return items.length ? html`
      <h3>${label}</h3><ol class="grid" style="list-style:none;padding:0">${items.map((p) => html`<li class="card"><h4 style="margin:0 0 .25rem;font-size:1.05rem">${p.title}</h4>
        <p class="muted" style="margin:0">${S.MOD[p.modality]?.name} · ${p.durationMin} min${p.scheduledAt ? ` · ${fmtTime(p.scheduledAt)}` : ""}</p>${C.accTags(p)}${C.libras(p.librasVideoUrl, p.title)}</li>`)}</ol>` : ""; })}` : ""}` };
});

route("/chaves/:id", async ({ params, settings }) => {
  const cat = await db.get("categories", params.id).catch(() => null);
  const ev = cat && (await db.get("events", cat.eventId).catch(() => null));
  if (!cat || !ev || !ev.published) return notFound();
  const entries = await db.list("entries", [["categoryId", "==", cat.id]]);
  const names = await S.entryLabels(entries);
  const [rounds, groups] = await Promise.all([S.knockoutRounds(cat.id), S.groupTables(cat.id, names)]);
  const scorers = S.MOD[cat.modality].kind === "coletivo" ? await S.topScorers(cat.id) : [];
  return { title: cat.name, body: html`<p><a href="#/eventos/${ev.id}">← ${ev.name}</a></p><h1>${cat.name}</h1>
    <p>${S.MOD[cat.modality].name} · ${cat.ageMin}–${cat.ageMax} anos${cat.gender !== "misto" ? ` · ${S.GENDERS[cat.gender]}` : ""}${S.MOD[cat.modality].adaptedOf ? html` · <span class="tag accent">modalidade adaptada</span>` : ""}</p>
    <p class="hint">Para proteger crianças e adolescentes, os nomes aparecem abreviados.</p>
    ${groups.length ? html`<h2>Fase de grupos</h2>${C.groupView(groups, names)}` : ""}
    ${rounds.length ? html`<h2>${groups.length ? "Mata-mata" : "Chave"}</h2>${C.bracketView(rounds, names, false, { title: ev.name, subtitle: cat.name, gender: cat.gender })}` : ""}
    ${!rounds.length && !groups.length ? html`<p class="muted">A chave ainda não foi gerada.</p>` : ""}
    ${cat.librasAuto !== false || cat.librasVideoUrl ? C.librasBlock(cat.id, explainCategory(cat, ev, settings), cat.librasVideoUrl) : ""}
    ${scorers.length ? html`<h2>Artilharia / pontuação individual</h2><div class="table-wrap"><table style="max-width:32rem"><thead><tr><th scope="col">Atleta</th><th scope="col">Total</th></tr></thead>
      <tbody>${scorers.map((s) => html`<tr><th scope="row">${s.name}</th><td>${s.total}</td></tr>`)}</tbody></table></div>` : ""}` };
});

// ------------------------------------------------------------------ Participe
route("/inscricoes", async ({ settings: { site } }) => {
  const projects = await projectsList();
  const open = [];
  for (const ev of (await upcoming()).filter((e) => e.registrationsOpen)) {
    for (const c of await db.list("categories", [["eventId", "==", ev.id]])) {
      if (c.status === "inscricoes" && (site.showAdaptedPublic || !S.MOD[c.modality].adaptedOf)) open.push({ ...c, ev });
    }
  }
  return { title: "Inscrições", hero: C.pageHero("Participe", "Inscrições", site.participeText),
    body: html`<ol class="grid" style="list-style:none;padding:0">
      <li class="card"><p class="eyebrow">Passo 1</p><h3>Cadastro com o responsável</h3><p>Crie a conta do participante junto com o responsável legal (menores de 18 anos).</p></li>
      <li class="card"><p class="eyebrow">Passo 2</p><h3>Escolha as modalidades</h3><p>Música, dança, esportes coletivos ou artes marciais. Atividades gratuitas, de 4 a 17 anos.</p></li>
      <li class="card"><p class="eyebrow">Passo 3</p><h3>Acompanhe pela conta</h3><p>Veja inscrições em competições, agenda de jogos e apresentações.</p></li></ol>
      <div class="actions"><a class="btn" href="#/cadastro">Fazer cadastro</a><a class="btn secondary" href="#/entrar">Já sou inscrito: Área do aluno</a></div>
      <h2>Projetos</h2><div class="grid">${projects.map(C.projectCard)}</div>
      ${open.length ? html`<h2>Competições com inscrições abertas</h2><div class="table-wrap"><table><thead><tr><th scope="col">Evento</th><th scope="col">Categoria</th><th scope="col">Idade</th></tr></thead>
        <tbody>${open.map((c) => html`<tr><td><a href="#/eventos/${c.ev.id}">${c.ev.name}</a></td><th scope="row">${c.name}</th><td>${c.ageMin}–${c.ageMax} anos</td></tr>`)}</tbody></table></div>
        <p class="hint">Alunos já cadastrados se inscrevem pela <a href="#/entrar">Área do aluno</a>.</p>` : ""}` };
});

route("/como-ajudar", async ({ settings: { site } }) => {
  const sponsors = await listSorted("sponsors", [], "order");
  return { title: "Como ajudar", hero: C.pageHero("Participe", "Como ajudar", "Sua contribuição mantém as atividades gratuitas para centenas de crianças e adolescentes."),
    body: html`<div class="grid help-grid">
      <div class="card"><h2 style="margin-top:0;font-size:1.25rem">Doações</h2><p>${site.helpDonation}</p><a class="btn small" href="#/doacoes">Ver canais oficiais</a></div>
      <div class="card"><h2 style="margin-top:0;font-size:1.25rem">Parcerias</h2><p>${site.helpPartnership}</p><a class="btn small secondary" href="#/contato">Falar com a equipe</a></div>
      <div class="card"><h2 style="margin-top:0;font-size:1.25rem">Voluntariado</h2><p>${site.helpVolunteer}</p><a class="btn small secondary" href="#/contato">Quero ser voluntário</a></div></div>
      ${sponsors.length ? html`<h2>Quem já apoia</h2><p>${sponsors.map((s) => html`<span class="tag">${s.name}</span>`)}</p>` : ""}` };
});

route("/doacoes", async ({ settings: { site } }) => ({ title: "Doações", hero: C.pageHero("Participe", "Doações", site.helpDonation),
  body: html`<div class="card prose"><h2 style="margin-top:0">Canais oficiais</h2>${paragraphs(site.donationInfo)}</div>
    <p class="hint">Doe apenas pelos canais oficiais publicados nesta página. Em caso de dúvida, <a href="#/contato">fale com a equipe</a>.</p>` }));

route("/contato", async ({ settings: { site } }) => ({ title: "Contato", hero: C.pageHero("Participe", "Contato", "Tire dúvidas sobre aulas, inscrições, parcerias e voluntariado."),
  body: html`<div class="two-col"><form class="card" id="contact-form" novalidate><div id="contact-errors"></div>
      ${C.field("name", "Nome", { required: true, attrs: 'autocomplete="name"' })}${C.field("email", "E-mail", { type: "email", required: true, attrs: 'autocomplete="email"' })}
      ${C.field("phone", "Telefone (opcional)", { type: "tel", attrs: 'autocomplete="tel"' })}${C.field("subject", "Assunto")}
      ${C.textarea("message", "Mensagem", { rows: 6, required: true })}
      <div class="visually-hidden" aria-hidden="true"><label for="website">Não preencha</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div>
      <p class="hint">Seus dados serão usados apenas para responder a esta mensagem.</p><button class="btn" type="submit">Enviar mensagem</button></form>
    <div><h2 style="margin-top:0">Fale com a Oásis</h2><address class="prose" style="font-style:normal;line-height:1.9">
      ${site.email ? html`E-mail: <a href="mailto:${site.email}">${site.email}</a><br>` : ""}${site.phone1 ? html`Telefone: ${site.phone1}<br>` : ""}
      ${site.phone2 ? html`WhatsApp / celular: ${site.phone2}<br>` : ""}${site.address ? html`${site.address}<br>` : ""}${site.hours || ""}</address></div></div>`,
  after(root) {
    bindForm(root, "#contact-form", async (d, form) => {
      if (d.website) return;
      const errors = {};
      if (str(d.name).length < 2) errors.name = "Informe seu nome.";
      if (!str(d.email).includes("@")) errors.email = "Informe um e-mail válido.";
      if (str(d.message, 4000).length < 5) errors.message = "Escreva sua mensagem.";
      if (Object.keys(errors).length) { root.querySelector("#contact-errors").innerHTML = C.errorSummary(errors).s; root.querySelector(".error-summary").focus(); return; }
      await db.add("messages", { name: str(d.name, 120), email: str(d.email, 160), phone: str(d.phone, 30), subject: str(d.subject, 150), message: str(d.message, 4000) });
      form.reset();
      flash("Mensagem enviada! A equipe da Oásis vai responder pelo e-mail informado.", "success");
      go("/contato");
    });
  } }));

route("/faq", async ({ settings: { site } }) => ({ title: "Perguntas frequentes", hero: C.pageHero("Ajuda", "Perguntas frequentes"),
  body: html`<div class="faq grid" style="grid-template-columns:1fr;max-width:800px">${faqItems(site.faq).map(([q, a]) => html`<details><summary>${q}</summary>${paragraphs(a)}</details>`)}</div>
    <p>Não encontrou a resposta? <a href="#/contato">Fale com a equipe</a>.</p>` }));

route("/termos", async ({ settings: { site } }) => ({ title: "Termos de uso", hero: C.pageHero("Legal", "Termos de uso"), body: html`<div class="prose">${paragraphs(site.terms)}</div>` }));

route("/privacidade", async ({ settings: { site } }) => ({ title: "Privacidade", hero: C.pageHero("Legal", "Política de privacidade", "LGPD e Estatuto da Criança e do Adolescente"),
  body: html`<div class="prose"><p class="hint">Versão do termo: ${S.TERMS_VERSION}. Texto-base a ser revisado pelo jurídico da instituição.</p>
    <h2>Quem trata os dados</h2><p>${site.name}, para inscrição e participação de crianças e adolescentes em atividades de artes e esportes.</p>
    <h2>Crianças e adolescentes (LGPD art. 14 e ECA)</h2><ul>
      <li>Os dados de menores de 18 anos são tratados no melhor interesse da criança e do adolescente, com consentimento específico de pelo menos um dos pais ou responsável legal, registrado com nome, vínculo, data e versão do termo.</li>
      <li>Coletamos apenas o necessário: nome, data de nascimento (para categorias por idade), modalidades e contato do responsável. Não pedimos documentos.</li>
      <li>Na área pública, os nomes dos alunos aparecem abreviados nas chaves e programações.</li>
      <li>O uso de imagem depende de autorização separada e pode ser revogado.</li></ul>
    <h2>Dados sensíveis: deficiência</h2><p>O informe de deficiência é opcional e depende de consentimento específico. Ele fica separado do restante do cadastro, é visível apenas ao titular e à coordenação, e cada consulta da coordenação é registrada. Nunca aparece na área pública.</p>
    <h2>Seus direitos</h2><p>Em "Minha conta" é possível baixar os dados, corrigir o cadastro, remover a informação de deficiência (revogando o consentimento) e excluir a conta.</p>
    <h2>Segurança</h2><p>As senhas são guardadas apenas como hash (PBKDF2), cada perfil só acessa as próprias páginas e a consulta a dados sensíveis pela coordenação fica registrada. Os dados ficam armazenados no computador da instituição.</p></div>` }));

route("/acessibilidade", async () => ({ title: "Acessibilidade", hero: C.pageHero("Ajuda", "Declaração de acessibilidade", "Este site busca atender às WCAG 2.1, nível AA, e à Lei Brasileira de Inclusão."),
  body: html`<div class="prose"><h2>Recursos</h2><ul>
    <li><strong>Teclado:</strong> o site funciona sem mouse. Tab avança, Shift+Tab volta, Enter ativa e Esc fecha os menus. O primeiro link leva direto ao conteúdo.</li>
    <li><strong>Leitores de tela:</strong> cabeçalhos, regiões, tabelas com cabeçalhos, textos alternativos e mensagens anunciadas automaticamente.</li>
    <li><strong>Alto contraste e tamanho do texto:</strong> na barra no topo de todas as páginas.</li>
    <li><strong>Libras:</strong> eventos, chaves, notícias e apresentações podem ter vídeos com intérprete, indicados pela etiqueta "Libras".</li>
    <li><strong>Eventos:</strong> cada apresentação indica intérprete de Libras no palco, audiodescrição e espaço acessível na plateia.</li></ul>
    <h2>Encontrou uma barreira?</h2><p><a href="#/contato">Avise a equipe</a>. Respondemos e corrigimos o quanto antes.</p></div>` }));
