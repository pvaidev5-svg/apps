// Cabeçalho (menu com submenus acessíveis), rodapé e barra de acessibilidade.

import { html, raw } from "./ui.js";
import { session } from "./session.js";

const NAV = [
  ["A Oásis", "oasis", [["/quem-somos", "Quem somos"], ["/historia", "Nossa história"], ["/missao-visao-valores", "Missão, visão e valores"], ["/transparencia", "Transparência"]]],
  ["Projetos", "projetos", null], // preenchido com os projetos publicados
  ["Esportes", "esportes", [["/modalidades", "Modalidades"], ["/calendario", "Calendário esportivo"], ["/professores", "Professores"]]],
  ["Conteúdo", "conteudo", [["/noticias", "Notícias"], ["/eventos", "Eventos"]]],
  ["Participe", "participe", [["/inscricoes", "Inscrições"], ["/entrar", "Já sou inscrito (entrar)"], ["/como-ajudar", "Como ajudar"], ["/doacoes", "Doações"], ["/contato", "Contato"]]],
];

const isCurrent = (path, current) => current === path || (path !== "/" && current.startsWith(path + "/"));

// Três cabeçalhos diferentes, conforme quem está usando:
//  - visitante (não inscrito): site institucional, Entrar e Inscreva-se;
//  - inscrito (aluno ou professor): menu da área do inscrito, sem cadastro/entrar;
//  - coordenação: atalhos do painel.
export function renderHeader(site, projects, currentPath, { unread = 0 } = {}) {
  const audience = !session.user ? "visitante" : session.isAdmin ? "coordenacao" : "inscrito";
  const cur = (href) => raw(currentPath === href ? 'aria-current="page"' : "");
  const link = (href, label) => html`<li><a href="#${href}" ${cur(href)}>${label}</a></li>`;
  const sub = (label, key, list) => html`<li class="has-sub"><button type="button" aria-expanded="false" aria-controls="sub-${key}"
      ${raw(list.some(([h]) => h === currentPath) ? 'class="has-current"' : "")}>${label}</button>
    <ul id="sub-${key}" class="sub">${list.map(([href, text]) => html`<li><a href="#${href}" ${cur(href)}>${text}</a></li>`)}</ul></li>`;
  const siteMenu = (label) => sub(label, "site", [["/site", "Página inicial do site"], ["/noticias", "Notícias"], ["/eventos", "Eventos"],
    ["/calendario", "Calendário esportivo"], ["/projetos", "Projetos"], ["/contato", "Contato"]]);
  let main, actions, homeLabel, areaLabel;

  if (audience === "visitante") {
    homeLabel = "Início";
    main = html`${link("/", "Início")}${NAV.map(([label, key, items]) => sub(label, key,
      items || [["/projetos", "Todos os projetos"], ...projects.map((x) => [`/projetos/${x.id}`, x.name]), ["/esporte-inclusivo", "Esporte inclusivo"]]))}`;
    actions = html`<li><a href="#/entrar" ${cur("/entrar")}>Já sou inscrito</a></li><li><a class="btn btn-cta" href="#/cadastro">Inscreva-se</a></li>`;
  } else if (audience === "inscrito") {
    const prof = session.profile?.role === "professor";
    areaLabel = prof ? "Área do professor" : "Área do aluno";
    const badge = unread ? html` <span class="badge" aria-label="${unread} ${unread === 1 ? "aviso novo" : "avisos novos"}">${unread}</span>` : "";
    main = html`${link("/conta", "Início")}${link("/conta/agenda", "Minha agenda")}
      ${!prof ? link("/conta/competicoes", "Competições") : ""}${link("/conta/apresentacoes", "Apresentações")}
      <li><a href="#/conta/avisos" ${cur("/conta/avisos")}>Avisos${badge}</a></li>
      ${prof ? link("/painel", "Central do evento") : ""}
      ${sub("Meus dados", "dados", [["/conta/perfil", "Perfil e modalidades"], ...(!prof ? [["/conta/acessibilidade", "Acessibilidade"]] : []),
        ["/conta/privacidade", "Privacidade e autorizações"], ...(!prof ? [["/conta/comprovante", "Comprovante de inscrição"]] : []), ["/senha", "Trocar senha"]])}
      ${siteMenu("Site da Oásis")}`;
    actions = html`<li class="who" aria-label="Conectado como ${session.profile?.name || ""}">${(session.profile?.name || "").split(" ")[0]}</li>
      <li><button type="button" class="link-btn" data-action="logout">Sair</button></li>`;
  } else {
    areaLabel = "Coordenação";
    main = html`${link("/painel", "Central do evento")}${link("/painel/eventos", "Eventos")}${link("/painel/pessoas", "Pessoas")}${link("/painel/avisos", "Avisos")}
      ${sub("Site", "siteadm", [["/painel/site", "Textos e contatos"], ["/painel/site/noticias", "Notícias"], ["/painel/site/projetos", "Projetos"],
        ["/painel/site/patrocinadores", "Patrocinadores"], ["/painel/site/mensagens", "Mensagens"], ["/site", "Ver o site público"]])}
      ${link("/painel/backup", "Backup")}`;
    actions = html`<li class="who">Coordenação</li><li><button type="button" class="link-btn" data-action="logout">Sair</button></li>`;
  }

  const header = document.getElementById("site-header");
  header.dataset.audience = audience;
  header.innerHTML = html`
    <div class="wrap header-row">
      <a class="logo" href="#/"><span class="logo-mark">${site.shortName || "OÁSIS"}</span>
        <span class="logo-name">${areaLabel ? html`<strong class="area-label">${areaLabel}</strong>` : site.name}</span></a>
      <button type="button" class="menu-toggle" aria-expanded="false" aria-controls="menu-principal">Menu</button>
      <nav class="main" id="menu-principal" aria-label="${audience === "visitante" ? "Navegação principal" : areaLabel}">
        <ul class="menu">${main}</ul>
        <ul class="menu menu-actions">${actions}</ul>
      </nav>
    </div>
    <div class="stripe" aria-hidden="true"><span></span><span></span><span></span></div>`.s;
  bindMenu();
}

export function renderFooter(site, projects) {
  const tel = (t) => String(t).replace(/\D/g, "");
  document.getElementById("site-footer").innerHTML = html`
    <div class="wrap footer-grid">
      <div class="footer-about"><p class="logo-mark">${site.shortName || "OÁSIS"}</p><p><strong>${site.name}</strong><br>${site.tagline}</p>
        <ul class="social" aria-label="Redes sociais">
          ${site.facebook ? html`<li><a href="${site.facebook}" rel="noopener" target="_blank">Facebook</a></li>` : ""}
          ${site.instagram ? html`<li><a href="${site.instagram}" rel="noopener" target="_blank">Instagram</a></li>` : ""}
          ${site.youtube ? html`<li><a href="${site.youtube}" rel="noopener" target="_blank">YouTube</a></li>` : ""}</ul></div>
      <nav aria-labelledby="ft-inst"><h2 id="ft-inst">Institucional</h2><ul>
        <li><a href="#/quem-somos">Quem somos</a></li><li><a href="#/historia">Nossa história</a></li>
        <li><a href="#/missao-visao-valores">Missão, visão e valores</a></li><li><a href="#/transparencia">Transparência</a></li>
        <li><a href="#/noticias">Notícias</a></li><li><a href="#/eventos">Eventos</a></li></ul></nav>
      <nav aria-labelledby="ft-proj"><h2 id="ft-proj">Projetos</h2><ul>
        ${projects.map((p) => html`<li><a href="#/projetos/${p.id}">${p.name}</a></li>`)}<li><a href="#/esporte-inclusivo">Esporte inclusivo</a></li></ul></nav>
      <nav aria-labelledby="ft-part"><h2 id="ft-part">Participe</h2><ul>
        <li><a href="#/inscricoes">Inscrições</a></li><li><a href="#/modalidades">Modalidades</a></li><li><a href="#/calendario">Calendário esportivo</a></li>
        <li><a href="#/como-ajudar">Como ajudar</a></li><li><a href="#/doacoes">Doações</a></li><li><a href="#/contato">Contato</a></li></ul></nav>
      <div><h2>Contato</h2><address>
        ${site.email ? html`<a href="mailto:${site.email}">${site.email}</a><br>` : ""}
        ${site.phone1 ? html`<a href="tel:${tel(site.phone1)}">${site.phone1}</a><br>` : ""}
        ${site.phone2 ? html`<a href="tel:${tel(site.phone2)}">${site.phone2}</a><br>` : ""}
        ${site.address || ""}${site.hours ? html`<br>${site.hours}` : ""}</address></div>
    </div>
    <div class="wrap footer-legal"><p>© ${new Date().getFullYear()} ${site.name}</p>
      <ul><li><a href="#/privacidade">Política de privacidade</a></li><li><a href="#/termos">Termos de uso</a></li>
        <li><a href="#/transparencia">Transparência</a></li><li><a href="#/faq">Perguntas frequentes</a></li><li><a href="#/acessibilidade">Acessibilidade</a></li></ul></div>`.s;
}

function bindMenu() {
  const buttons = [...document.querySelectorAll(".has-sub > button")];
  const closeAll = (except) => buttons.forEach((b) => b !== except && b.setAttribute("aria-expanded", "false"));
  for (const btn of buttons) {
    btn.addEventListener("click", (e) => {
      e.stopPropagation();
      const open = btn.getAttribute("aria-expanded") === "true";
      closeAll(btn);
      btn.setAttribute("aria-expanded", open ? "false" : "true");
    });
    const li = btn.parentElement;
    li.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") { btn.setAttribute("aria-expanded", "false"); btn.focus(); }
    });
    li.addEventListener("focusout", (e) => { if (!li.contains(e.relatedTarget)) btn.setAttribute("aria-expanded", "false"); });
  }
  const toggle = document.querySelector(".menu-toggle");
  toggle?.addEventListener("click", () => toggle.setAttribute("aria-expanded", toggle.getAttribute("aria-expanded") === "true" ? "false" : "true"));
}

export function closeMenus() {
  document.querySelectorAll(".has-sub > button, .menu-toggle").forEach((b) => b.setAttribute("aria-expanded", "false"));
}

// ---------- barra de acessibilidade ----------
export function initA11yBar() {
  const root = document.documentElement;
  root.classList.add("js");
  const load = (k) => { try { return localStorage.getItem(k); } catch { return null; } };
  const store = (k, v) => { try { localStorage.setItem(k, v); } catch { /* sem armazenamento */ } };
  let contrast = load("a11y-contrast"), scale = parseFloat(load("a11y-scale") || "1");
  const live = document.getElementById("a11y-live");
  const say = (msg) => { live.textContent = ""; setTimeout(() => { live.textContent = msg; }, 50); };
  const apply = () => {
    if (contrast === "high") root.setAttribute("data-contrast", "high"); else root.removeAttribute("data-contrast");
    root.style.setProperty("--font-scale", scale);
    document.getElementById("toggle-contrast").setAttribute("aria-pressed", contrast === "high" ? "true" : "false");
  };
  apply();
  document.getElementById("toggle-contrast").addEventListener("click", () => {
    contrast = contrast === "high" ? "normal" : "high"; store("a11y-contrast", contrast); apply();
    say(contrast === "high" ? "Alto contraste ativado" : "Alto contraste desativado");
  });
  const setScale = (s) => { scale = Math.min(1.6, Math.max(0.9, Math.round(s * 10) / 10)); store("a11y-scale", scale); apply(); say(`Tamanho do texto ${Math.round(scale * 100)}%`); };
  document.getElementById("font-inc").addEventListener("click", () => setScale(scale + 0.1));
  document.getElementById("font-dec").addEventListener("click", () => setScale(scale - 0.1));
  document.getElementById("font-reset").addEventListener("click", () => setScale(1));

  // Links internos (pular para o conteúdo, resumo de erros) sem mexer na rota
  document.addEventListener("click", (e) => {
    const skip = e.target.closest(".skip-link, [data-focus]");
    if (!skip) return;
    e.preventDefault();
    const target = skip.classList.contains("skip-link") ? document.getElementById("conteudo") : document.getElementById(skip.dataset.focus);
    if (target) { if (!target.hasAttribute("tabindex") && !/^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(target.tagName)) target.setAttribute("tabindex", "-1"); target.focus(); target.scrollIntoView({ block: "center" }); }
  });
}

export function announce(msg) {
  const live = document.getElementById("a11y-live");
  if (live) { live.textContent = ""; setTimeout(() => { live.textContent = msg; }, 50); }
}
