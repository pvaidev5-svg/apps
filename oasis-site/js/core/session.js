// Sessão: usuário logado, perfil e permissões. Configurações do site em cache.

import { auth, db } from "../data/db.js";
import { SITE_DEFAULTS, GENERAL_DEFAULTS, SCORING_DEFAULTS } from "../data/seed.js";
import { flash } from "./ui.js";

export const session = { user: null, profile: null, isAdmin: false };
// Enquanto um formulário de entrar/cadastrar/sair cuida da troca de página,
// o aviso automático de "mudou o usuário" não redesenha a tela (evita piscar e perder mensagens).
export const authFlow = { active: false };
let cache = {};

export async function refreshSession() {
  const user = auth.current();
  session.user = user;
  session.profile = null;
  session.isAdmin = false;
  if (user) {
    const [profile, admin] = await Promise.all([db.get("users", user.uid).catch(() => null), db.get("admins", user.uid).catch(() => null)]);
    session.profile = profile;
    session.isAdmin = !!admin;
    if (profile && profile.active === false && !admin) {
      await auth.signOut();
      session.user = null; session.profile = null;
      flash("Este acesso foi desativado pela coordenação.", "error");
    }
  }
  return session;
}

export const isStaff = () => session.isAdmin || session.profile?.role === "professor";

function merge(base, over) {
  const out = structuredClone(base);
  for (const [k, v] of Object.entries(over || {})) {
    out[k] = v && typeof v === "object" && !Array.isArray(v) && typeof out[k] === "object" && !Array.isArray(out[k]) ? merge(out[k], v) : v;
  }
  return out;
}

export async function getSettings(force = false) {
  if (force || !cache.loaded) {
    const [site, general, scoring] = await Promise.all(["site", "general", "scoring"].map((k) => db.get("settings", k).catch(() => null)));
    cache = { loaded: true, site: merge(SITE_DEFAULTS, site), general: merge(GENERAL_DEFAULTS, general), scoring: merge(SCORING_DEFAULTS, scoring) };
    for (const s of [cache.site, cache.general, cache.scoring]) delete s.id;
  }
  return cache;
}
export const invalidateSettings = () => { cache = {}; };
