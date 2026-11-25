// Painel > Site: textos institucionais, notícias, projetos, patrocinadores e mensagens.

import { db, listSorted } from "../data/db.js";
import { route, go } from "../core/router.js";
import { html, raw, flash, fmtDate, str, int, asList, slugify } from "../core/ui.js";
import { session, getSettings, invalidateSettings } from "../core/session.js";
import { uploadImage, removeImage, forgetImage } from "../core/media.js";
import * as C from "./components.js";
import * as S from "../logic/services.js";
import { bindForm, notFound } from "./helpers.js";
import { adminLayout, handleImage } from "./admin.js";

const ADMIN = { auth: "admin" };
const page = (title, current, content, after) => ({ title, body: adminLayout(current, content), after });

// campos de "Textos e contatos": [chave, rótulo, tipo, dica]
const GROUPS = [
  ["Identidade", [["name", "Nome da instituição"], ["shortName", "Nome curto (logotipo)"], ["tagline", "Frase principal (destaque da página inicial)"],
    ["heroSubtitle", "Texto abaixo da frase principal", "textarea"], ["photosNote", "Aviso sobre fotos (deixe vazio quando publicar fotos)"]]],
  ["A Oásis", [["aboutShort", "Quem somos — resumo (página inicial)", "textarea"], ["aboutFull", "Quem somos — texto completo", "textarea", "Separe parágrafos com uma linha em branco."],
    ["stats", "Números em destaque", "pairs:value:label", "Uma linha por número: valor | descrição"], ["commitments", "Como atuamos", "pairs:title:text", "Uma linha por compromisso: título | descrição"],
    ["history", "Nossa história", "textarea", "Um marco por parágrafo."], ["mission", "Missão", "textarea"], ["vision", "Visão", "textarea"], ["values", "Valores", "textarea", "Um valor por linha."],
    ["transparency", "Transparência — texto", "textarea"], ["transparencyLinks", "Transparência — documentos", "pairs:title:url", "Uma linha por documento: título | link"]]],
  ["Esporte inclusivo", [["inclusiveText", "Esporte para todos — texto", "textarea"],
    ["showAdaptedPublic", "Publicar as modalidades adaptadas (parajiu-jítsu, parataekwondo) no site", "bool"],
    ["adaptedPendingNote", "Aviso exibido enquanto as adaptadas não forem publicadas", "textarea"]]],
  ["Participe", [["participeText", "Texto de inscrições", "textarea"], ["helpDonation", "Como ajudar — doações", "textarea"], ["helpPartnership", "Como ajudar — parcerias", "textarea"],
    ["helpVolunteer", "Como ajudar — voluntariado", "textarea"], ["donationInfo", "Canais oficiais de doação (PIX, banco)", "textarea"],
    ["faq", "Perguntas frequentes", "textarea", "Blocos separados por linha em branco: 1ª linha é a pergunta, as seguintes a resposta."], ["terms", "Termos de uso", "textarea"]]],
  ["Contato e redes", [["email", "E-mail"], ["phone1", "Telefone 1"], ["phone2", "Telefone 2"], ["address", "Endereço"], ["hours", "Horário de atendimento"],
    ["facebook", "Facebook (link)"], ["instagram", "Instagram (link)"], ["youtube", "YouTube (link)"]]],
];

route("/painel/site", async () => {
  const { site } = await getSettings(true);
  const fieldFor = ([key, label, type = "text", hint = ""]) => {
    if (type === "bool") return C.checkbox(key, label, !!site[key]);
    if (type.startsWith("pairs")) {
      const [, a, b] = type.split(":");
      return C.textarea(key, label, { value: (site[key] || []).map((x) => `${x[a]} | ${x[b]}`).join("\n"), hint, rows: 5 });
    }
    if (type === "textarea") return C.textarea(key, label, { value: site[key], hint, rows: String(site[key] || "").length > 300 ? 7 : 3 });
    return C.field(key, label, { value: site[key], hint });
  };
  return page("Textos e contatos", "/painel/site", html`<h1>Textos e contatos do site</h1><p class="lead">Tudo o que aparece nas páginas públicas institucionais. As alterações valem na hora.</p>
    <form id="site-form"><fieldset><legend>Foto principal da página inicial</legend>
      ${site.heroImage ? html`${C.img(site.heroImage, site.heroImageAlt, "thumb")}${C.checkbox("remove_image", "Remover a foto", false)}` : ""}
      <div class="field"><label for="hero_file">Enviar foto (JPG, PNG ou WebP)</label><input type="file" id="hero_file" name="hero_file" accept="image/*"></div>
      ${C.field("imageAlt", "Descrição da foto (texto alternativo)", { value: site.heroImageAlt, hint: "Ex.: Crianças se apresentando no Festival de Artes, com intérprete de Libras ao lado do palco." })}</fieldset>
      ${GROUPS.map(([title, fields]) => html`<fieldset><legend>${title}</legend>${fields.map(fieldFor)}</fieldset>`)}
      <button class="btn" type="submit">Salvar conteúdo</button></form>`,
  (root) => bindForm(root, "#site-form", async (d, form) => {
    const next = { ...site };
    for (const [, fields] of GROUPS) for (const [key, , type = "text"] of fields) {
      if (type === "bool") next[key] = !!d[key];
      else if (type.startsWith("pairs")) {
        const [, a, b] = type.split(":");
        next[key] = str(d[key], 6000).split("\n").filter((l) => l.trim()).map((l) => { const [x, ...rest] = l.split("|"); return { [a]: x.trim(), [b]: rest.join("|").trim() }; });
      } else next[key] = str(d[key], 6000);
    }
    const { image, imageAlt } = await handleImage(form, d, { image: site.heroImage });
    next.heroImage = image; next.heroImageAlt = imageAlt;
    await db.set("settings", "site", next);
    invalidateSettings();
    await S.audit(session.user.uid, null, "editou o conteúdo do site");
    flash("Conteúdo do site salvo.", "success"); go("/painel/site");
  }));
}, ADMIN);

// ------------------------------------------------------------------ Notícias
route("/painel/site/noticias", async () => {
  const rows = await listSorted("news", [], "date", "desc");
  return page("Notícias", "/painel/site/noticias", html`<h1>Notícias</h1><div class="actions"><a class="btn" href="#/painel/site/noticias/nova">Nova notícia</a></div>
    <div class="table-wrap"><table><thead><tr><th scope="col">Título</th><th scope="col">Data</th><th scope="col">Categoria</th><th scope="col">Situação</th></tr></thead>
      <tbody>${rows.length ? rows.map((n) => html`<tr><th scope="row"><a href="#/painel/site/noticias/${n.id}">${n.title}</a></th><td>${fmtDate(n.date)}</td><td>${n.category || "—"}</td><td>${n.published ? "Publicada" : "Rascunho"}</td></tr>`)
        : html`<tr><td colspan="4">Nenhuma notícia.</td></tr>`}</tbody></table></div>`);
}, ADMIN);

route("/painel/site/noticias/:id", async ({ params }) => {
  const isNew = params.id === "nova";
  const n = isNew ? {} : await db.get("news", params.id);
  if (!n) return notFound();
  return page(isNew ? "Nova notícia" : "Editar notícia", "/painel/site/noticias", html`<p><a href="#/painel/site/noticias">← Notícias</a></p><h1>${isNew ? "Nova notícia" : "Editar notícia"}</h1>
    <form class="card" id="news-form">${C.field("title", "Título", { value: n.title, required: true })}
      <div class="row">${C.field("date", "Data", { type: "date", value: n.date, required: true })}${C.field("category", "Categoria", { value: n.category, hint: "Ex.: Cultura, Esporte, Capacitação" })}</div>
      ${C.textarea("summary", "Resumo", { value: n.summary, rows: 2 })}${C.textarea("body", "Texto", { value: n.body, rows: 12, hint: "Separe parágrafos com uma linha em branco." })}
      <fieldset><legend>Imagem</legend>${n.image ? html`${C.img(n.image, n.imageAlt, "thumb")}${C.checkbox("remove_image", "Remover imagem", false)}` : ""}
        <div class="field"><label for="news_file">Enviar imagem</label><input type="file" id="news_file" name="image_file" accept="image/*"></div>
        ${C.field("imageAlt", "Descrição da imagem (obrigatória se houver imagem)", { value: n.imageAlt })}</fieldset>
      ${C.field("librasVideoUrl", "Vídeo em Libras (URL, opcional)", { type: "url", value: n.librasVideoUrl })}${C.checkbox("published", "Publicada no site", !!n.published)}
      <div class="actions"><button class="btn" type="submit">Salvar</button>${!isNew ? html`<a class="btn secondary" href="#/noticias/${n.id}">Ver no site</a>` : ""}</div></form>
    ${!isNew ? html`<button class="btn danger small" type="button" id="news-del" style="margin-top:1rem">Excluir notícia</button>` : ""}`,
  (root) => {
    bindForm(root, "#news-form", async (d, form) => {
      if (!str(d.title) || !d.date) throw new Error("Título e data são obrigatórios.");
      const img = await handleImage(form, d, n);
      const data = { title: str(d.title, 200), date: d.date, category: str(d.category, 60), summary: str(d.summary, 500), body: str(d.body, 20000),
        librasVideoUrl: str(d.librasVideoUrl, 300), published: !!d.published, ...img };
      let id = n.id;
      if (isNew) {
        id = slugify(data.title);
        if (await db.get("news", id).catch(() => null)) id = `${id}-${data.date}`;
        await db.set("news", id, data);
      } else await db.update("news", id, data);
      flash("Notícia salva.", "success"); go(`/painel/site/noticias/${id}`);
    });
    root.querySelector("#news-del")?.addEventListener("click", async () => {
      if (!confirm("Excluir esta notícia?")) return;
      await removeImage(n.image); await db.remove("news", n.id); go("/painel/site/noticias");
    });
  });
}, ADMIN);

// ------------------------------------------------------------------ Projetos
route("/painel/site/projetos", async () => {
  const rows = await listSorted("projects", [], "order");
  return page("Projetos", "/painel/site/projetos", html`<h1>Projetos</h1><div class="actions"><a class="btn" href="#/painel/site/projetos/novo">Novo projeto</a></div>
    <div class="table-wrap"><table><thead><tr><th scope="col">Ordem</th><th scope="col">Projeto</th><th scope="col">Área</th><th scope="col">Participantes</th><th scope="col">Situação</th></tr></thead>
      <tbody>${rows.map((p) => html`<tr><td>${p.order}</td><th scope="row"><a href="#/painel/site/projetos/${p.id}">${p.name}</a></th><td>${p.area || "—"}</td><td>${p.participants || "—"}</td><td>${p.published ? "Publicado" : "Oculto"}</td></tr>`)}</tbody></table></div>`);
}, ADMIN);

route("/painel/site/projetos/:id", async ({ params }) => {
  const isNew = params.id === "novo";
  const p = isNew ? { published: true, modalities: [] } : await db.get("projects", params.id);
  if (!p) return notFound();
  const chosen = new Set(p.modalities || []);
  return page(p.name || "Novo projeto", "/painel/site/projetos", html`<p><a href="#/painel/site/projetos">← Projetos</a></p><h1>${p.name || "Novo projeto"}</h1>
    <form class="card" id="proj-form">${C.field("name", "Nome", { value: p.name, required: true })}
      <div class="row">${C.field("area", "Área", { value: p.area, hint: "Cultura ou Esporte" })}${C.field("participants", "Nº de participantes", { value: p.participants })}
        ${C.field("order", "Ordem no site", { type: "number", value: p.order ?? 0 })}</div>
      ${C.textarea("summary", "Resumo", { value: p.summary, rows: 2 })}${C.textarea("body", "Texto completo", { value: p.body, rows: 8 })}
      <fieldset><legend>Modalidades do projeto</legend><p class="hint">A página do projeto mostra os professores e as próximas chaves dessas modalidades.</p>
        <div class="checks">${S.MODALITIES.map((m) => html`<label class="check"><input type="checkbox" name="modalities" value="${m.code}" ${raw(chosen.has(m.code) ? "checked" : "")}> ${m.name}</label>`)}</div></fieldset>
      <fieldset><legend>Imagem</legend>${p.image ? html`${C.img(p.image, p.imageAlt, "thumb")}${C.checkbox("remove_image", "Remover imagem", false)}` : ""}
        <div class="field"><label for="proj_file">Enviar imagem</label><input type="file" id="proj_file" name="image_file" accept="image/*"></div>
        ${C.field("imageAlt", "Descrição da imagem", { value: p.imageAlt })}</fieldset>
      ${C.checkbox("published", "Publicado no site", !!p.published)}
      <div class="actions"><button class="btn" type="submit">Salvar</button>${!isNew ? html`<a class="btn secondary" href="#/projetos/${p.id}">Ver no site</a>` : ""}</div></form>
    ${!isNew ? html`<button class="btn danger small" type="button" id="proj-del" style="margin-top:1rem">Excluir projeto</button>` : ""}`,
  (root) => {
    bindForm(root, "#proj-form", async (d, form) => {
      if (!str(d.name)) throw new Error("Informe o nome do projeto.");
      const data = { name: str(d.name, 150), area: str(d.area, 40), participants: str(d.participants, 20), order: int(d.order, 0), summary: str(d.summary, 500),
        body: str(d.body, 20000), modalities: asList(d.modalities).filter((m) => S.MOD[m]), published: !!d.published, ...(await handleImage(form, d, p)) };
      let id = p.id;
      if (isNew) {
        id = slugify(data.name);
        if (await db.get("projects", id).catch(() => null)) throw new Error("Já existe um projeto com esse nome.");
        await db.set("projects", id, data);
      } else await db.update("projects", id, data);
      flash("Projeto salvo.", "success"); go(`/painel/site/projetos/${id}`);
    });
    root.querySelector("#proj-del")?.addEventListener("click", async () => {
      if (!confirm("Excluir este projeto?")) return;
      await removeImage(p.image); await db.remove("projects", p.id); go("/painel/site/projetos");
    });
  });
}, ADMIN);

// ------------------------------------------------------------------ Patrocinadores
route("/painel/site/patrocinadores", async () => {
  const rows = await listSorted("sponsors", [], "order");
  return page("Patrocinadores", "/painel/site/patrocinadores", html`<h1>Patrocinadores e apoiadores</h1>
    ${rows.map((s) => html`<form class="card sponsor-form" style="margin-bottom:.75rem" data-id="${s.id}"><div class="row" style="align-items:flex-end">
      ${s.logo ? C.img(s.logo, `Logo ${s.name}`, "thumb") : ""}${C.field("name", "Nome", { value: s.name, id: `sp_name_${s.id}` })}${C.field("url", "Site", { type: "url", value: s.url, id: `sp_url_${s.id}` })}
      ${C.field("order", "Ordem", { type: "number", value: s.order, id: `sp_ord_${s.id}` })}
      <div class="field"><label for="sp_logo_${s.id}">Trocar logo</label><input type="file" id="sp_logo_${s.id}" name="logo_file" accept="image/*"></div></div>
      <button class="btn small" type="submit" name="action" value="update">Salvar<span class="visually-hidden"> ${s.name}</span></button>
      <button class="btn small danger" type="submit" name="action" value="delete">Excluir<span class="visually-hidden"> ${s.name}</span></button></form>`)}
    <h2>Adicionar</h2><form class="card" id="sp-add"><div class="row">${C.field("name", "Nome", { required: true })}${C.field("url", "Site", { type: "url" })}${C.field("order", "Ordem", { type: "number", value: rows.length })}
      <div class="field"><label for="logo">Logo</label><input type="file" id="logo" name="logo_file" accept="image/*"></div></div><button class="btn" type="submit">Adicionar</button></form>`,
  (root) => {
    bindForm(root, ".sponsor-form", async (d, form) => {
      const s = rows.find((x) => x.id === form.dataset.id);
      if (d.action === "delete") { await removeImage(s.logo); await db.remove("sponsors", s.id); }
      else {
        const file = form.querySelector("input[type=file]").files[0];
        const logo = file ? await uploadImage(file, 600) : s.logo;
        if (file) { await removeImage(s.logo); forgetImage(s.logo); }
        await db.update("sponsors", s.id, { name: str(d.name, 120) || s.name, url: str(d.url, 300), order: int(d.order, 0), logo });
      }
      flash("Patrocinadores atualizados.", "success"); go("/painel/site/patrocinadores");
    });
    bindForm(root, "#sp-add", async (d, form) => {
      if (!str(d.name)) throw new Error("Informe o nome.");
      const file = form.querySelector("input[type=file]").files[0];
      await db.add("sponsors", { name: str(d.name, 120), url: str(d.url, 300), order: int(d.order, 0), logo: file ? await uploadImage(file, 600) : "" });
      flash("Patrocinador adicionado.", "success"); go("/painel/site/patrocinadores");
    });
  });
}, ADMIN);

// ------------------------------------------------------------------ Mensagens
route("/painel/site/mensagens", async () => {
  const rows = (await db.list("messages")).sort((a, b) => (!!a.readAt - !!b.readAt) || b.createdAt.localeCompare(a.createdAt));
  return page("Mensagens", "/painel/site/mensagens", html`<h1>Mensagens do formulário de contato</h1>
    ${rows.length ? rows.map((m) => html`<article class="card" style="margin-bottom:.75rem${m.readAt ? "" : ";border-top-color:var(--brand)"}">
      <h2 style="margin:0;font-size:1.05rem">${!m.readAt ? html`<span class="tag accent">nova</span> ` : ""}${m.subject || "Sem assunto"}</h2>
      <p class="muted" style="margin:.25rem 0">${m.name} · <a href="mailto:${m.email}">${m.email}</a>${m.phone ? ` · ${m.phone}` : ""} · ${fmtDate(m.createdAt.slice(0, 16))}</p>
      <p style="white-space:pre-line">${m.message}</p><div class="actions" style="margin:0">
        ${!m.readAt ? html`<button class="btn small secondary" type="button" data-read="${m.id}">Marcar como lida</button>` : ""}
        <button class="btn small danger" type="button" data-del="${m.id}">Excluir</button></div></article>`) : html`<p class="muted">Nenhuma mensagem.</p>`}`,
  (root) => {
    root.querySelectorAll("[data-read]").forEach((b) => b.addEventListener("click", async () => { await db.update("messages", b.dataset.read, { readAt: new Date().toISOString() }); go("/painel/site/mensagens"); }));
    root.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => { await db.remove("messages", b.dataset.del); go("/painel/site/mensagens"); }));
  });
}, ADMIN);
