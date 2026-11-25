// ARMAZENAMENTO ONLINE (Firebase): todos acessam o mesmo banco de dados.
// Usado quando js/firebase-config.js tem a configuração do projeto preenchida.
//  - logins e senhas ficam no Firebase Authentication (senhas guardadas com hash pelo Google);
//  - os dados ficam no Cloud Firestore, protegidos pelas regras do arquivo firestore.rules;
//  - o administrador é a conta adm@gmail.com criada no console do Firebase.

import { seedInitialContent } from "./seed.js";

export const mode = "firebase";
export const ADMIN_EMAIL = "adm@gmail.com";
const SDK_VERSION = "12.10.0";

let A, F, app, authApi, fs;
let current = null;
const listeners = new Set();

const clean = (x) => JSON.parse(JSON.stringify(x)); // o Firestore não aceita "undefined"

export async function init() {
  const base = window.OASIS_FIREBASE_SDK || `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;
  let appMod;
  try {
    [appMod, A, F] = await Promise.all([import(`${base}/firebase-app.js`), import(`${base}/firebase-auth.js`), import(`${base}/firebase-firestore.js`)]);
  } catch (e) {
    console.error(e);
    throw new Error("Não foi possível conectar ao banco de dados online. Verifique a internet e recarregue a página.");
  }
  app = appMod.initializeApp(window.OASIS_FIREBASE);
  authApi = A.getAuth(app);
  fs = F.getFirestore(app);
  // espera o Firebase dizer se já há alguém conectado
  await new Promise((resolve) => {
    let first = true;
    A.onAuthStateChanged(authApi, async (u) => {
      current = u ? { uid: u.uid, email: (u.email || "").toLowerCase() } : null;
      if (u) await ensureAdmin(u).catch((e) => console.warn(e));
      if (first) { first = false; resolve(); } else listeners.forEach((cb) => cb(current));
    });
  });
}

// Primeiro acesso do administrador: registra a conta como administradora e grava o conteúdo inicial.
async function ensureAdmin(u) {
  if ((u.email || "").toLowerCase() !== ADMIN_EMAIL) return;
  if (!(await get("admins", u.uid))) await set("admins", u.uid, { email: ADMIN_EMAIL, createdAt: new Date().toISOString() });
  if (!(await get("users", u.uid))) await set("users", u.uid, { name: "Administração", email: ADMIN_EMAIL, role: "admin", defaultCredential: true });
  if (!(await get("settings", "site"))) await seedInitialContent({ get, set, add });
}

// ------------------------------------------------------------------ dados
const ref = (c, id) => F.doc(fs, c, id);

export async function get(c, id) {
  const s = await F.getDoc(ref(c, id));
  return s.exists() ? { id: s.id, ...s.data() } : null;
}

export async function list(c, filters = []) {
  // "in" do Firestore aceita até 30 valores: divide em partes
  const inF = filters.find(([, op, v]) => op === "in" && v.length > 30);
  if (inF) {
    const out = new Map();
    for (let i = 0; i < inF[2].length; i += 30) {
      for (const r of await list(c, filters.map((f) => (f === inF ? [f[0], "in", inF[2].slice(i, i + 30)] : f)))) out.set(r.id, r);
    }
    return [...out.values()];
  }
  if (filters.some(([, op, v]) => op === "in" && !v.length)) return [];
  const q = F.query(F.collection(fs, c), ...filters.map(([f, op, v]) => F.where(f, op, v)));
  const snap = await F.getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

export async function add(c, data) {
  const r = await F.addDoc(F.collection(fs, c), clean({ ...data, createdAt: data.createdAt || new Date().toISOString() }));
  return r.id;
}

// merge = substitui só os campos enviados (como no modo local)
export async function set(c, id, data, { merge = false } = {}) {
  if (merge && (await get(c, id))) await F.updateDoc(ref(c, id), clean(data));
  else await F.setDoc(ref(c, id), clean(data));
  return id;
}

export async function update(c, id, data) {
  await F.updateDoc(ref(c, id), clean(data));
}

export async function remove(c, id) {
  await F.deleteDoc(ref(c, id));
}

// ------------------------------------------------------------------ autenticação
const MSG = {
  "auth/invalid-credential": "E-mail ou senha incorretos.",
  "auth/wrong-password": "E-mail ou senha incorretos.",
  "auth/user-not-found": "E-mail ou senha incorretos.",
  "auth/invalid-email": "E-mail inválido.",
  "auth/email-already-in-use": "Este e-mail já está cadastrado.",
  "auth/weak-password": "Senha fraca: use pelo menos 8 caracteres.",
  "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
  "auth/user-disabled": "Este acesso foi desativado pela coordenação.",
  "auth/network-request-failed": "Sem conexão com a internet.",
  "auth/requires-recent-login": "Por segurança, saia e entre de novo antes de fazer isso.",
};
const friendly = (e) => new Error(MSG[e?.code] || e?.message || "Erro ao acessar a conta.");
const wrap = async (fn) => { try { return await fn(); } catch (e) { throw friendly(e); } };

export const authCurrent = () => current;
export function authOnChange(cb) { listeners.add(cb); cb(current); return () => listeners.delete(cb); }

export const signIn = (email, password) => wrap(async () => {
  const r = await A.signInWithEmailAndPassword(authApi, email, password);
  current = { uid: r.user.uid, email: (r.user.email || "").toLowerCase() };
  await ensureAdmin(r.user);
  return current;
});

export const signUp = (email, password) => wrap(async () => {
  const r = await A.createUserWithEmailAndPassword(authApi, email, password);
  current = { uid: r.user.uid, email: (r.user.email || "").toLowerCase() };
  return current;
});

export async function signOut() { await A.signOut(authApi); current = null; }

async function reauth(password) {
  const u = authApi.currentUser;
  if (!u) throw new Error("Entre de novo na sua conta.");
  try { await A.reauthenticateWithCredential(u, A.EmailAuthProvider.credential(u.email, password)); }
  catch (e) { throw new Error(e?.code === "auth/too-many-requests" ? MSG[e.code] : "Senha incorreta."); }
  return u;
}

export async function checkPassword(password) { await reauth(password); }

export async function changePassword(currentPw, next) {
  const u = await reauth(currentPw);
  await wrap(() => A.updatePassword(u, next));
}

export async function deleteMe(password) {
  const u = await reauth(password);
  await wrap(() => A.deleteUser(u));
  current = null;
  listeners.forEach((cb) => cb(null));
}

// Quem esqueceu a senha recebe um e-mail do Firebase com um link para criar outra.
export const sendPasswordReset = (email) => wrap(() => A.sendPasswordResetEmail(authApi, email));

export async function adminSetPassword() {
  throw new Error("No modo online, use o botão de enviar e-mail para criar nova senha.");
}

// No modo online o login não pode ser apagado pelo site: o cadastro fica inativo
// (active: false) e o sistema recusa a entrada. Para apagar de vez o login, use o
// console do Firebase > Authentication.
export async function disableLogin(uid) {
  await update("users", uid, { active: false }).catch(() => {});
}

// ------------------------------------------------------------------ backup
const COLLECTIONS = ["settings", "admins", "users", "sensitive", "consents", "teachersPublic", "projects", "sponsors", "news", "events",
  "categories", "entries", "matches", "teams", "performances", "staff", "notices", "messages", "audit", "media"];

export async function exportAll() {
  const collections = {};
  for (const c of COLLECTIONS) {
    collections[c] = {};
    for (const d of await list(c).catch(() => [])) { const { id, ...rest } = d; collections[c][id] = rest; }
  }
  return JSON.stringify({ app: "oasis-site", version: 1, mode, exportedAt: new Date().toISOString(), data: { collections } }, null, 1);
}

// Restaura documentos do backup (inclusive um backup feito no modo local).
// Logins não são copiados: cada pessoa precisa ter conta no Firebase.
export async function importAll(json) {
  let parsed;
  try { parsed = JSON.parse(json); } catch { throw new Error("Arquivo inválido: não é um backup do sistema."); }
  if (parsed?.app !== "oasis-site" || !parsed.data?.collections) throw new Error("Arquivo inválido: não é um backup do sistema.");
  for (const [c, docs] of Object.entries(parsed.data.collections)) {
    if (c === "admins") continue;
    for (const [id, d] of Object.entries(docs)) {
      if (c === "users" && d.role === "admin") continue;
      await set(c, id, d);
    }
  }
}

export const storageUsage = () => null;
