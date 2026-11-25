// Regras de negócio: juntam os dados (db) com os motores puros (pontuação, chaves, calendário).

import { db, listSorted } from "../data/db.js";
import { getSettings } from "../core/session.js";
import * as B from "./brackets.js";
import { abbreviate, ageForEvent, conflictsFor, findConflicts } from "./calendar.js";
import { scoreBjj, scoreTaekwondo, scoreTeamMatch, standings } from "./scoring.js";

// ------------------------------------------------------------------ constantes de domínio
export const MODALITIES = [
  { code: "musica", name: "Música", kind: "arte", scoring: "arte" },
  { code: "danca", name: "Dança", kind: "arte", scoring: "arte" },
  { code: "futebol", name: "Futebol", kind: "coletivo", scoring: "futebol" },
  { code: "futsal", name: "Futsal", kind: "coletivo", scoring: "futsal" },
  { code: "basquete", name: "Basquete", kind: "coletivo", scoring: "basquete" },
  { code: "volei", name: "Vôlei", kind: "coletivo", scoring: "volei" },
  { code: "jiu_jitsu", name: "Jiu-jitsu", kind: "luta", scoring: "bjj" },
  { code: "taekwondo", name: "Taekwondo", kind: "luta", scoring: "taekwondo" },
  { code: "para_jiu_jitsu", name: "Parajiu-jítsu", kind: "luta", scoring: "bjj", adaptedOf: "jiu_jitsu" },
  { code: "para_taekwondo", name: "Parataekwondo", kind: "luta", scoring: "taekwondo", adaptedOf: "taekwondo" },
];
export const MOD = Object.fromEntries(MODALITIES.map((m) => [m.code, m]));
export const ROLES = { professor: "Professor", artista: "Artista (música e dança)", atleta: "Atleta (futebol, futsal, basquete, vôlei)", lutador: "Lutador (jiu-jitsu, taekwondo)" };
export const ROLE_LABELS = { ...ROLES, admin: "Administrador" };
export const ROLE_KINDS = { artista: ["arte"], atleta: ["coletivo"], lutador: ["luta"], professor: ["arte", "coletivo", "luta"] };
export const DISABILITY_TYPES = {
  fisica: "Deficiência física / motora", visual: "Deficiência visual (cegueira ou baixa visão)", auditiva: "Deficiência auditiva / surdez",
  intelectual: "Deficiência intelectual", tea: "Transtorno do Espectro Autista (TEA)", multipla: "Deficiência múltipla", outra: "Outra",
};
export const SUPPORT_FUNCTIONS = { mesario: "Mesário(a) / súmula", cronometrista: "Cronometrista", som_palco: "Controle de som e palco",
  foto: "Registro fotográfico", recepcao: "Recepção e credenciamento" };
export const SLOTS = { abertura: "Show de abertura", intervalo: "Intervalo", encerramento: "Encerramento" };
export const EVENT_KINDS = { campeonato: "Campeonato", festival: "Festival cultural", misto: "Campeonato + festival", institucional: "Evento institucional" };
export const GENDERS = { misto: "Misto", feminino: "Feminino", masculino: "Masculino" };
export const TERMS_VERSION = "2026-11";

export function publicName(user) {
  return abbreviate(user.name) + (user.affiliation ? ` (${user.affiliation})` : "");
}

// ------------------------------------------------------------------ inscrições e elegibilidade
export async function eligibilityProblem(user, cat, event) {
  const { general } = await getSettings();
  const age = ageForEvent(user.birthDate, event.startsOn, general.ageReference);
  if (age == null) return "Data de nascimento não informada";
  if (age < cat.ageMin || age > cat.ageMax) return `Idade de referência ${age} fora da faixa ${cat.ageMin}–${cat.ageMax}`;
  if (cat.gender !== "misto" && user.gender !== cat.gender) return "Categoria de outro sexo";
  const um = (user.modalities || {})[cat.modality];
  if (!um) return "Modalidade não vinculada ao perfil";
  if (cat.weightMin != null || cat.weightMax != null) {
    if (um.weight == null) return "Peso não informado";
    const below = cat.weightMin != null && (cat.weightMinExclusive ? um.weight <= cat.weightMin : um.weight < cat.weightMin);
    if (below || (cat.weightMax != null && um.weight > cat.weightMax)) return `Peso ${um.weight} kg fora da categoria`;
  }
  return null;
}

// Rótulos dos competidores. Público: nome abreviado salvo na inscrição. Admin: nome completo.
export async function entryLabels(entries, { full = false } = {}) {
  const out = {};
  const users = full ? Object.fromEntries((await db.list("users")).map((u) => [u.id, u])) : {};
  for (const e of entries) {
    if (e.teamId) out[e.id] = e.publicName;
    else if (full && users[e.userId]) out[e.id] = users[e.userId].name + (users[e.userId].affiliation ? ` (${users[e.userId].affiliation})` : "");
    else out[e.id] = e.publicName;
  }
  return out;
}

export async function entryPeople(entry, teamsById) {
  if (!entry) return [];
  if (entry.userId) return [entry.userId];
  const team = teamsById?.[entry.teamId] || (await db.get("teams", entry.teamId));
  return (team?.members || []).map((m) => m.uid);
}

// ------------------------------------------------------------------ chaves
export async function generateBracket(categoryId) {
  const cat = await db.get("categories", categoryId);
  const entries = (await db.list("entries", [["categoryId", "==", categoryId]])).filter((e) => e.status === "confirmada")
    .sort((a, b) => (a.seed ?? 9999) - (b.seed ?? 9999) || String(a.createdAt).localeCompare(String(b.createdAt)));
  const ids = entries.map((e) => e.id);
  for (const m of await db.list("matches", [["categoryId", "==", categoryId]])) await db.remove("matches", m.id);
  const base = { categoryId, eventId: cat.eventId, durationMin: cat.matchMinutes || 10, log: [], extra: {} };
  if (cat.format === "grupos") {
    const groups = B.splitGroups(ids, cat.groupCount || 2);
    const labels = B.groupLabels(groups.length);
    for (const [gi, members] of groups.entries()) {
      for (const m of B.roundRobin(members)) {
        await db.add("matches", { ...base, stage: "grupo", groupLabel: labels[gi], round: m.round, position: m.position, a: m.a, b: m.b, status: "pendente" });
      }
    }
  } else {
    await insertKnockout(base, B.singleElimination(ids));
  }
  await db.update("categories", categoryId, { status: "chave_gerada" });
}

async function insertKnockout(base, ms) {
  const idByKey = {};
  for (const m of [...ms].sort((x, y) => y.round - x.round)) {
    const nextId = m.next ? idByKey[`${m.next[0]}-${m.next[1]}`] : null;
    idByKey[`${m.round}-${m.position}`] = await db.add("matches", {
      ...base, stage: "mata", round: m.round, position: m.position, a: m.a, b: m.b, winner: m.winner, status: m.status,
      nextId: nextId || null, nextSlot: m.next_slot, method: m.status === "bye" ? "bye" : null,
    });
  }
}

export async function groupTables(categoryId, labels) {
  const cat = await db.get("categories", categoryId);
  const ms = (await db.list("matches", [["categoryId", "==", categoryId]])).filter((m) => m.stage === "grupo");
  const cfg = await pointsConfig(cat);
  const byGroup = {};
  for (const m of ms) (byGroup[m.groupLabel] ||= []).push(m);
  return Object.keys(byGroup).sort().map((label) => {
    const list = byGroup[label].sort((x, y) => x.round - y.round || x.position - y.position);
    const teams = [...new Set(list.flatMap((m) => [m.a, m.b]).filter(Boolean))];
    const results = list.filter((m) => m.status === "encerrada").map((m) => ({ a: m.a, b: m.b, score_a: m.scoreA || 0, score_b: m.scoreB || 0,
      winner: m.isDraw ? "draw" : m.winner === m.a ? "a" : "b" }));
    const table = standings(teams, results, cfg).map((r) => ({ ...r, name: labels[r.team] || "?" }));
    return { label, table, matches: list, done: list.every((m) => m.status === "encerrada") };
  });
}

async function pointsConfig(cat) {
  const scoring = MOD[cat.modality].scoring;
  if (scoring === "bjj" || scoring === "taekwondo") return { win: 3, draw: 1, loss: 0 };
  return (await getSettings()).scoring.team[scoring];
}

export async function generateKnockoutFromGroups(categoryId) {
  const cat = await db.get("categories", categoryId);
  const tables = await groupTables(categoryId, {});
  if (!tables.length || !tables.every((t) => t.done)) throw new Error("Conclua todas as partidas dos grupos antes de gerar o mata-mata");
  for (const m of (await db.list("matches", [["categoryId", "==", categoryId]])).filter((m) => m.stage === "mata")) await db.remove("matches", m.id);
  const seeds = B.knockoutFromGroups(tables.map((t) => t.table.map((r) => r.team)), cat.qualifiers || 2);
  await insertKnockout({ categoryId, eventId: cat.eventId, durationMin: cat.matchMinutes || 10, log: [], extra: {} }, B.singleElimination(seeds));
}

export async function knockoutRounds(categoryId) {
  const ms = (await db.list("matches", [["categoryId", "==", categoryId]])).filter((m) => m.stage === "mata")
    .sort((x, y) => x.round - y.round || x.position - y.position);
  if (!ms.length) return [];
  const total = Math.max(...ms.map((m) => m.round));
  return Array.from({ length: total }, (_, i) => ({ round: i + 1, name: B.roundName(i + 1, total), matches: ms.filter((m) => m.round === i + 1) }));
}

// ------------------------------------------------------------------ súmula e resultado
export async function computeResult(match, cat) {
  const { scoring: cfg } = await getSettings();
  const engine = MOD[cat.modality].scoring;
  const log = match.log || [];
  const extra = match.extra || {};
  if (engine === "bjj") return scoreBjj(log, cfg.bjj, extra.refereeDecision || null);
  if (engine === "taekwondo") return scoreTaekwondo(log, cfg.taekwondo, extra.superiorityDecision || null, extra.roundDecisions || {});
  const sets = (extra.sets || []).map((s) => [s.a, s.b]);
  return scoreTeamMatch(engine, log, cfg.team[engine], { sets, penalties: extra.penalties || null, knockout: match.stage === "mata" });
}

export async function finalizeMatch(matchId, woWinner = null) {
  const m = await db.get("matches", matchId);
  const cat = await db.get("categories", m.categoryId);
  const r = woWinner ? { winner: woWinner, method: "wo", score_a: 0, score_b: 0 } : await computeResult(m, cat);
  if (!["a", "b", "draw"].includes(r.winner)) throw new Error(r.pending || "Resultado ainda sem vencedor (falta decisão do árbitro/desempate)");
  if (r.winner === "draw" && m.stage === "mata") throw new Error("Mata-mata não pode terminar empatado");
  const winEntry = r.winner === "draw" ? null : r.winner === "a" ? m.a : m.b;
  await db.update("matches", matchId, { status: "encerrada", winner: winEntry, isDraw: r.winner === "draw", scoreA: r.score_a ?? 0,
    scoreB: r.score_b ?? 0, method: r.method, result: { scorers: r.scorers || {}, method: r.method } });
  if (m.nextId && winEntry) await db.update("matches", m.nextId, { [m.nextSlot]: winEntry });
  return r;
}

export async function reopenMatch(matchId) {
  const m = await db.get("matches", matchId);
  if (m.nextId) {
    const next = await db.get("matches", m.nextId);
    if (next?.status === "encerrada") throw new Error("A partida seguinte já foi encerrada; reabra-a primeiro");
    await db.update("matches", m.nextId, { [m.nextSlot]: null });
  }
  await db.update("matches", matchId, { status: "pendente", winner: null, isDraw: false, method: null });
}

export async function topScorers(categoryId, { full = false } = {}) {
  const ms = (await db.list("matches", [["categoryId", "==", categoryId]])).filter((m) => m.status === "encerrada");
  const totals = {};
  for (const m of ms) for (const [pid, v] of Object.entries(m.result?.scorers || {})) totals[pid] = (totals[pid] || 0) + v;
  if (!Object.keys(totals).length) return [];
  const teams = await db.list("teams");
  const names = {};
  for (const t of teams) for (const mb of t.members || []) names[mb.uid] = mb.publicName;
  if (full) for (const u of await db.list("users")) names[u.id] = u.name;
  return Object.entries(totals).map(([pid, total]) => ({ name: names[pid] || "?", total })).sort((x, y) => y.total - x.total);
}

// ------------------------------------------------------------------ calendário unificado
export async function calendarItems(eventId, { full = false, userId = null } = {}) {
  const filt = eventId ? [["eventId", "==", eventId]] : [];
  const [matches, perfs, cats, teams] = await Promise.all([db.list("matches", filt), db.list("performances", filt),
    db.list("categories", filt), db.list("teams")]);
  const catById = Object.fromEntries(cats.map((c) => [c.id, c]));
  const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]));
  const entryIds = [...new Set(matches.flatMap((m) => [m.a, m.b, m.winner]).filter(Boolean))];
  const entries = (await Promise.all(entryIds.map((id) => db.get("entries", id).catch(() => null)))).filter(Boolean);
  const entryById = Object.fromEntries(entries.map((e) => [e.id, e]));
  const labels = await entryLabels(entries, { full });
  const items = [];
  for (const m of matches) {
    if (!m.scheduledAt || m.status === "bye") continue;
    const people = [...(await entryPeople(entryById[m.a], teamsById)), ...(await entryPeople(entryById[m.b], teamsById))];
    const a = labels[m.a] || "a definir", b = labels[m.b] || "a definir";
    const cname = catById[m.categoryId]?.name || "";
    items.push({ kind: "match", id: m.id, eventId: m.eventId, start: m.scheduledAt, duration_min: m.durationMin || 10, people,
      label: `${cname}: ${a} × ${b}`, venue: m.venue, status: m.status, category: cname, categoryId: m.categoryId, a, b,
      scoreA: m.scoreA, scoreB: m.scoreB, method: m.method, winner: m.status === "encerrada" ? (m.isDraw ? "Empate" : labels[m.winner]) : null });
  }
  for (const p of perfs) {
    if (!p.scheduledAt) continue;
    items.push({ kind: "performance", id: p.id, eventId: p.eventId, start: p.scheduledAt, duration_min: p.durationMin || 5,
      people: (p.members || []).map((x) => x.uid), label: `Apresentação: ${p.title}`, venue: "Palco", title: p.title, slot: p.slot,
      accLibras: p.accLibras, accAudiodesc: p.accAudiodesc, accSeating: p.accSeating });
  }
  return (userId ? items.filter((i) => i.people.includes(userId)) : items).sort((x, y) => x.start.localeCompare(y.start));
}

export async function eventConflicts(eventId) {
  const { general } = await getSettings();
  return findConflicts(await calendarItems(eventId, { full: true }), general.bufferMin || 0);
}

export async function checkSchedule(kind, id, start, duration, people) {
  const { general } = await getSettings();
  const found = conflictsFor({ kind, id, start, duration_min: duration, people }, await calendarItems(null, { full: true }), general.bufferMin || 0);
  return { found, block: general.conflictMode === "impedir" };
}

export async function describeConflicts(found) {
  const users = Object.fromEntries((await db.list("users")).map((u) => [u.id, u.name]));
  return found.map((c) => `${c.people.map((p) => users[p] || "?").join(", ")} em “${c.b.label}” (${c.b.start.slice(11, 16)})`).join("; ");
}

// ------------------------------------------------------------------ roteiro de palco
const SLOT_ORDER = { abertura: 0, intervalo: 1, encerramento: 2 };
export async function stageScript(eventId, { full = false } = {}) {
  const perfs = await db.list("performances", [["eventId", "==", eventId]]);
  let names = {};
  if (full) names = Object.fromEntries((await db.list("users")).map((u) => [u.id, u.name]));
  return perfs.sort((x, y) => SLOT_ORDER[x.slot] - SLOT_ORDER[y.slot] || (x.order || 0) - (y.order || 0))
    .map((p) => ({ ...p, members: (p.members || []).map((m) => ({ ...m, name: names[m.uid] || m.publicName })),
      teacherName: names[p.teacherId] || "" }));
}

// ------------------------------------------------------------------ Central do evento
export async function defaultEventId() {
  const evs = await listSorted("events", [], "startsOn");
  const today = new Date().toISOString().slice(0, 10);
  return (evs.find((e) => (e.endsOn || e.startsOn) >= today) || evs.at(-1))?.id || null;
}

export async function eventHub(eventId, { full = true } = {}) {
  const ev = await db.get("events", eventId);
  if (!ev) return null;
  const { general } = await getSettings();
  const timeline = await calendarItems(eventId, { full });
  const conflicts = findConflicts(timeline, general.bufferMin || 0);
  const flagged = new Set(conflicts.flatMap((c) => [`${c.a.kind}:${c.a.id}`, `${c.b.kind}:${c.b.id}`]));
  timeline.forEach((it) => { it.conflict = flagged.has(`${it.kind}:${it.id}`); });

  const [cats, allMatches, allEntries] = await Promise.all([db.list("categories", [["eventId", "==", eventId]]),
    db.list("matches", [["eventId", "==", eventId]]), db.list("entries", [["eventId", "==", eventId]])]);
  const labels = await entryLabels(allEntries, { full });
  const categories = cats.sort((x, y) => MOD[x.modality].name.localeCompare(MOD[y.modality].name) || x.ageMin - y.ageMin || (x.gender || "").localeCompare(y.gender || "") || (x.weightMax ?? 999) - (y.weightMax ?? 999)).map((c) => {
    const ms = allMatches.filter((m) => m.categoryId === c.id && m.status !== "bye");
    const done = ms.filter((m) => m.status === "encerrada");
    const final = ms.find((m) => m.stage === "mata" && !m.nextId && m.status === "encerrada");
    const ready = ms.filter((m) => m.status !== "encerrada" && m.a && m.b)
      .sort((x, y) => (x.scheduledAt || "9999").localeCompare(y.scheduledAt || "9999") || x.round - y.round);
    const ents = allEntries.filter((e) => e.categoryId === c.id);
    return { ...c, modalityName: MOD[c.modality].name, adapted: !!MOD[c.modality].adaptedOf, total: ms.length, done: done.length,
      pendingEntries: ents.filter((e) => e.status === "pendente").length, confirmed: ents.filter((e) => e.status === "confirmada").length,
      champion: final ? labels[final.winner] : null,
      next: ready.slice(0, 3).map((m) => ({ id: m.id, a: labels[m.a], b: labels[m.b], at: m.scheduledAt })) };
  });
  const script = await stageScript(eventId, { full });
  const staff = full ? await db.list("staff", [["eventId", "==", eventId]]) : [];
  const todo = [];
  for (const c of categories) {
    if (c.pendingEntries) todo.push(["category", c.id, `${c.name}: ${c.pendingEntries} inscrição(ões) aguardando confirmação`]);
    if (c.status === "inscricoes") todo.push(["category", c.id, `${c.name}: chave ainda não gerada (${c.confirmed} confirmados)`]);
  }
  for (const m of allMatches) if (m.status === "pendente" && m.a && m.b && !m.scheduledAt) {
    todo.push(["match", m.id, `${cats.find((c) => c.id === m.categoryId)?.name}: partida pronta sem horário`]);
  }
  for (const p of script) {
    if (!p.members.length) todo.push(["performance", p.id, `Apresentação “${p.title}” sem integrantes`]);
    if (!p.scheduledAt) todo.push(["performance", p.id, `Apresentação “${p.title}” sem horário`]);
  }
  const total = categories.reduce((s, c) => s + c.total, 0), doneN = categories.reduce((s, c) => s + c.done, 0);
  return { ev, timeline, conflicts, categories, script, staff, todo, multiDay: new Set(timeline.map((i) => i.start.slice(0, 10))).size > 1,
    progress: { matches: total, done: doneN, performances: script.length, percent: total ? Math.round((100 * doneN) / total) : 0 } };
}

export async function audit(actorId, subjectId, action) {
  await db.add("audit", { actorId, subjectId, action, at: new Date().toISOString() }).catch(() => {});
}
