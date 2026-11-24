// Ponto de entrada: inicia os dados (guardados no navegador), a sessão e as páginas.

import { initData, auth } from "./data/db.js";
import { currentPath, resolve, go } from "./core/router.js";
import { session, refreshSession, getSettings, isStaff, authFlow } from "./core/session.js";
import { renderHeader, renderFooter, initA11yBar, closeMenus, announce } from "./core/shell.js";
import { renderFlashes, flash, html } from "./core/ui.js";
import { hydrateImages } from "./core/media.js";
import { bindLibras } from "./core/libras.js";
import { db } from "./data/db.js";
import { notFound, denied } from "./pages/helpers.js";

import "./pages/public.js";
import "./pages/auth.js";
import { unreadCount } from "./pages/account.js";
import "./pages/admin.js";
import "./pages/site-admin.js";

let firstRender = true;
let rendering = Promise.resolve();

// Página inicial de cada público: visitante vê o site institucional ("/"),
// inscrito vê a área dele ("/conta"), coordenação vê a Central do evento ("/painel").
export const homeFor = () => (!session.user ? "/" : session.isAdmin ? "/painel" : "/conta");

async function render() {
  let { path, query } = currentPath();
  if (session.user) {
    if (path === "/") path = homeFor();
    else if (path === "/entrar" || path === "/cadastro") {
      flash("Você já está conectado(a). Esta é a sua página inicial.", "info");
      go(homeFor());
      return;
    }
  }
  const settings = await getSettings();
  const projects = (await db.list("projects", [["published", "==", true]]).catch(() => [])).sort((a, b) => (a.order || 0) - (b.order || 0));
  const unread = session.user && !session.isAdmin && session.profile ? await unreadCount(session.profile).catch(() => 0) : 0;
  renderHeader(settings.site, projects, path, { unread });
  renderFooter(settings.site, projects);

  const r = resolve(path);
  let view;
  try {
    if (!r) view = notFound();
    else if (r.opts.auth && !session.user) { go(`/entrar?next=${encodeURIComponent(path)}`); return; }
    else if (r.opts.auth === "admin" && !session.isAdmin) view = denied();
    else if (r.opts.auth === "staff" && !isStaff()) view = denied();
    else view = await r.handler({ params: r.params, query, settings });
  } catch (err) {
    console.error(err);
    view = { title: "Erro", body: html`<h1>Não foi possível carregar a página</h1><p class="lead">${err.message || "Tente novamente."}</p><p><a class="btn" href="#/">Voltar ao início</a></p>` };
  }
  if (!view) return;
  const pageEl = document.getElementById("page"), heroEl = document.getElementById("hero");
  heroEl.innerHTML = view.hero ? String(view.hero) : "";
  pageEl.innerHTML = String(view.body || "");
  document.title = `${view.title || settings.site.tagline} · ${settings.site.name}`;
  renderFlashes();
  closeMenus();
  view.after?.(pageEl);
  bindLibras(pageEl);
  hydrateImages(document.getElementById("conteudo"));
  if (!firstRender) {
    window.scrollTo(0, 0);
    const h1 = document.querySelector("#conteudo h1");
    if (h1) { h1.setAttribute("tabindex", "-1"); h1.focus({ preventScroll: true }); }
    announce(`Página: ${view.title || ""}`);
  }
  firstRender = false;
}

const queueRender = () => { rendering = rendering.then(render).catch(console.error); return rendering; };

async function main() {
  initA11yBar();
  await initData();
  await refreshSession();
  let lastUid = session.user?.uid ?? null;
  auth.onChange(async (u) => {
    if ((u?.uid ?? null) === lastUid) return;
    lastUid = u?.uid ?? null;
    if (authFlow.active) return;
    await refreshSession();
    queueRender();
  });
  document.addEventListener("click", async (e) => {
    if (e.target.closest("[data-action=logout]")) {
      authFlow.active = true;
      try {
        await auth.signOut();
        await refreshSession();
      } finally { authFlow.active = false; }
      flash("Você saiu da sua conta.", "info");
      go("/");
    }
  });
  window.addEventListener("hashchange", queueRender);
  queueRender();
}

main().catch((err) => {
  console.error(err);
  document.getElementById("page").innerHTML = `<h1>O site não pôde ser iniciado</h1><p>${String(err.message || err).replace(/</g, "&lt;")}</p>
    <p>Abra o site pelo Live Server do VS Code ou pelo arquivo Iniciar (veja o README).</p>`;
});
