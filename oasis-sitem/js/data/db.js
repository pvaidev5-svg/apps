// Camada de dados: o resto do sistema só conversa com este arquivo.
// Dois modos:
//  - online (js/data/firebase.js): quando js/firebase-config.js está preenchido — todos
//    acessam o mesmo banco de dados;
//  - local (js/data/local.js): sem configuração — os dados ficam só neste navegador.
// Comandos disponíveis:
//
//   db.get(colecao, id)                    -> documento {id, ...} ou null
//   db.list(colecao, [[campo, op, valor]]) -> lista (op: "==", "in", "array-contains")
//   db.add(colecao, dados)                 -> id novo
//   db.set(colecao, id, dados, {merge})    -> grava com id escolhido
//   db.update(colecao, id, dados)          -> altera campos
//   db.remove(colecao, id)
//   auth.signIn / signUp / signOut / changePassword / deleteMe / onChange / current

import * as local from "./local.js";
import * as online from "./firebase.js";

let impl = null;

export async function initData() {
  const cfg = typeof window !== "undefined" ? window.OASIS_FIREBASE : null;
  impl = cfg && cfg.apiKey && cfg.projectId ? online : local;
  await impl.init();
  return impl.mode;
}

// Backup: exportar e restaurar todos os dados (ver Painel > Backup dos dados)
export const exportAll = () => impl.exportAll();
export const importAll = (json) => impl.importAll(json);
export const storageUsage = () => impl.storageUsage();

export const dataMode = () => (impl ? impl.mode : null);

export const db = {
  get: (c, id) => impl.get(c, id),
  list: (c, filters = []) => impl.list(c, filters),
  add: (c, data) => impl.add(c, stamp(data)),
  set: (c, id, data, opts = {}) => impl.set(c, id, stamp(data), opts),
  update: (c, id, data) => impl.update(c, id, stamp(data)),
  remove: (c, id) => impl.remove(c, id),
};

export const auth = {
  current: () => impl.authCurrent(),
  onChange: (cb) => impl.authOnChange(cb),
  signIn: (email, pw) => impl.signIn(email.trim().toLowerCase(), pw),
  signUp: (email, pw) => impl.signUp(email.trim().toLowerCase(), pw),
  signOut: () => impl.signOut(),
  changePassword: (current, next) => impl.changePassword(current, next),
  deleteMe: (current) => impl.deleteMe(current),
  disableLogin: (uid) => impl.disableLogin(uid),
  adminSetPassword: (uid, pw) => impl.adminSetPassword(uid, pw),
  checkPassword: (pw) => impl.checkPassword(pw),
  sendPasswordReset: (email) => impl.sendPasswordReset(email.trim().toLowerCase()),
};

function stamp(data) {
  return { ...data, updatedAt: new Date().toISOString() };
}

// Lista + ordenação no navegador (evita índices compostos no Firestore).
export async function listSorted(c, filters, key, dir = "asc") {
  const rows = await db.list(c, filters);
  const k = typeof key === "function" ? key : (r) => r[key] ?? "";
  rows.sort((x, y) => {
    const a = k(x), b = k(y);
    const cmp = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "pt-BR");
    return dir === "desc" ? -cmp : cmp;
  });
  return rows;
}
