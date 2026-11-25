// ARMAZENAMENTO LOCAL: guarda todos os dados no localStorage deste navegador.
// Importante:
//  - os dados existem só neste computador e neste navegador;
//  - limpar o histórico/dados de navegação apaga tudo: faça backups em Painel > Backup dos dados;
//  - quem usa este computador com acesso ao navegador consegue ler os dados:
//    use uma conta de usuário do computador protegida por senha.

import { seedInitialContent, applySeedImages, applyDivisions } from "./seed.js";

export const mode = "local";
const KEY = "oasis:dados:v1";
const SESSION = "oasis:sessao:v1";
const ITER = 150000;

// Administrador inicial: adm@gmail.com. Só o hash PBKDF2 da senha fica no código.
const ADMIN = { uid: "admin-local", email: "adm@gmail.com",
  salt: "cb3628d7a19a805f6ab9da11446b5709",
  hash: "78609302ea9acb404a4d971e1bd5d324668a939fef2ff0fa989b0619aa1721ca" };

let state = null;
const listeners = new Set();
const attempts = new Map();

function load() {
  try { return JSON.parse(localStorage.getItem(KEY)); } catch { return null; }
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); }
  catch (e) { throw new Error("O espaço de armazenamento do navegador está cheio. Faça um backup e remova imagens ou notícias antigas."); }
}
const col = (c) => (state.collections[c] ||= {});
const newId = () => crypto.getRandomValues(new Uint32Array(3)).reduce((s, n) => s + n.toString(36), "").slice(0, 20);
const clone = (x) => (x == null ? x : JSON.parse(JSON.stringify(x)));

export async function init() {
  state = load();
  if (!state) {
    state = { collections: {}, auth: { [ADMIN.email]: { uid: ADMIN.uid, salt: ADMIN.salt, hash: ADMIN.hash } } };
    col("admins")[ADMIN.uid] = { email: ADMIN.email, createdAt: new Date().toISOString() };
    col("users")[ADMIN.uid] = { name: "Administração", email: ADMIN.email, role: "admin", defaultCredential: true };
    save();
    await seedInitialContent({ get, set, add });
    state.contentVersion = 5;
    save();
  }
  if ((state.contentVersion || 1) < 3) {
    await applySeedImages({ get, list, update, set });
    state.contentVersion = 3;
    save();
  }
  if (state.contentVersion < 5) {
    await applyDivisions({ get, set });
    state.contentVersion = 5;
    save();
  }
}

// ------------------------------------------------------------------ dados
export async function get(c, id) {
  const d = col(c)[id];
  return d ? { id, ...clone(d) } : null;
}

function match(doc, [field, op, value]) {
  const v = field.split(".").reduce((o, k) => (o == null ? undefined : o[k]), doc);
  if (op === "==") return v === value;
  if (op === "!=") return v !== value;
  if (op === "in") return value.includes(v);
  if (op === "array-contains") return Array.isArray(v) && v.includes(value);
  throw new Error(`Operador não suportado: ${op}`);
}

export async function list(c, filters = []) {
  return Object.entries(col(c)).filter(([, d]) => filters.every((f) => match(d, f))).map(([id, d]) => ({ id, ...clone(d) }));
}

export async function add(c, data) {
  const id = newId();
  col(c)[id] = clone({ ...data, createdAt: data.createdAt || new Date().toISOString() });
  save();
  return id;
}

export async function set(c, id, data, { merge = false } = {}) {
  col(c)[id] = clone(merge ? { ...(col(c)[id] || {}), ...data } : data);
  save();
  return id;
}

export async function update(c, id, data) {
  if (!col(c)[id]) throw new Error("Registro não encontrado.");
  col(c)[id] = clone({ ...col(c)[id], ...data });
  save();
}

export async function remove(c, id) {
  delete col(c)[id];
  save();
}

// ------------------------------------------------------------------ autenticação
async function pbkdf2(password, saltHex) {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  const salt = new Uint8Array(saltHex.match(/.{2}/g).map((h) => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITER }, key, 256);
  return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
const randomHex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");

function sessionUser() {
  const uid = sessionStorage.getItem(SESSION) || localStorage.getItem(SESSION);
  if (!uid) return null;
  const email = Object.keys(state.auth).find((e) => state.auth[e].uid === uid);
  return email ? { uid, email } : null;
}
function emit() { const u = sessionUser(); listeners.forEach((cb) => cb(u)); }

export const authCurrent = () => sessionUser();
export function authOnChange(cb) { listeners.add(cb); cb(sessionUser()); return () => listeners.delete(cb); }

export async function signIn(email, password) {
  const now = Date.now();
  const recent = (attempts.get(email) || []).filter((t) => now - t < 15 * 60000);
  if (recent.length >= 5) throw new Error("Muitas tentativas. Aguarde 15 minutos e tente novamente.");
  const rec = state.auth[email];
  if (!rec || (await pbkdf2(password, rec.salt)) !== rec.hash) {
    attempts.set(email, [...recent, now]);
    throw new Error("E-mail ou senha incorretos.");
  }
  attempts.delete(email);
  localStorage.setItem(SESSION, rec.uid);
  emit();
  return { uid: rec.uid, email };
}

export async function signUp(email, password) {
  if (state.auth[email]) throw new Error("Este e-mail já está cadastrado.");
  const salt = randomHex(16);
  const uid = newId();
  state.auth[email] = { uid, salt, hash: await pbkdf2(password, salt) };
  save();
  localStorage.setItem(SESSION, uid);
  emit();
  return { uid, email };
}

export async function signOut() {
  localStorage.removeItem(SESSION);
  sessionStorage.removeItem(SESSION);
  emit();
}

export async function changePassword(current, next) {
  const u = sessionUser();
  const rec = u && state.auth[u.email];
  if (!rec || (await pbkdf2(current, rec.salt)) !== rec.hash) throw new Error("Senha atual incorreta.");
  rec.salt = randomHex(16);
  rec.hash = await pbkdf2(next, rec.salt);
  save();
}

export async function deleteMe(current) {
  const u = sessionUser();
  const rec = u && state.auth[u.email];
  if (!rec || (await pbkdf2(current, rec.salt)) !== rec.hash) throw new Error("Senha incorreta.");
  delete state.auth[u.email];
  save();
  await signOut();
}

export async function checkPassword(password) {
  const u = sessionUser();
  const rec = u && state.auth[u.email];
  if (!rec || (await pbkdf2(password, rec.salt)) !== rec.hash) throw new Error("Senha incorreta.");
}

export async function sendPasswordReset() {
  throw new Error("Envio de e-mail só funciona no modo online. Use a senha provisória.");
}

// Senha provisória definida pela administração (quem esqueceu a senha)
export async function adminSetPassword(uid, password) {
  const email = Object.keys(state.auth).find((e) => state.auth[e].uid === uid);
  if (!email) throw new Error("Esta pessoa não tem login ativo.");
  const rec = state.auth[email];
  rec.salt = randomHex(16);
  rec.hash = await pbkdf2(password, rec.salt);
  save();
}

// Desativa o login de uma pessoa (exclusão de cadastro pela administração)
export async function disableLogin(uid) {
  const email = Object.keys(state.auth).find((e) => state.auth[e].uid === uid);
  if (email && uid !== ADMIN.uid) { delete state.auth[email]; save(); }
}

// ------------------------------------------------------------------ backup
export function exportAll() {
  return JSON.stringify({ app: "oasis-site", version: 1, exportedAt: new Date().toISOString(), data: state }, null, 1);
}

export async function importAll(json) {
  let parsed;
  try { parsed = JSON.parse(json); } catch { throw new Error("Arquivo inválido: não é um backup do sistema."); }
  if (parsed?.app !== "oasis-site" || !parsed.data?.collections || !parsed.data?.auth) throw new Error("Arquivo inválido: não é um backup do sistema.");
  const previous = state;
  state = parsed.data;
  try { save(); } catch (e) { state = previous; throw e; }
}

export function storageUsage() {
  const used = (localStorage.getItem(KEY) || "").length * 2; // UTF-16
  return { usedBytes: used, limitBytes: 5 * 1024 * 1024 };
}
