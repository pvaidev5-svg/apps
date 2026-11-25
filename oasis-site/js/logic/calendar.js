// Calendário unificado palco + quadra: conflito = mesmo horário + pessoa em comum.

function interval(item, buffer = 0) {
  const start = new Date(item.start).getTime();
  return [start, start + (Number(item.duration_min || 0) + buffer) * 60000];
}

export function overlaps(x, y, buffer = 0) {
  const [xs, xe] = interval(x, buffer), [ys, ye] = interval(y, buffer);
  return xs < ye && ys < xe;
}

export function findConflicts(items, buffer = 0) {
  const timed = items.filter((i) => i.start).sort((a, b) => interval(a)[0] - interval(b)[0]);
  const out = [];
  timed.forEach((x, i) => {
    for (const y of timed.slice(i + 1)) {
      if (interval(y)[0] >= interval(x, buffer)[1]) break;
      const shared = x.people.filter((p) => y.people.includes(p));
      if (shared.length && overlaps(x, y, buffer)) out.push({ a: x, b: y, people: [...new Set(shared)].sort() });
    }
  });
  return out;
}

export function conflictsFor(candidate, items, buffer = 0) {
  if (!candidate.start) return [];
  return items.filter((y) => y.start && !(y.kind === candidate.kind && y.id === candidate.id))
    .map((y) => ({ y, shared: candidate.people.filter((p) => y.people.includes(p)) }))
    .filter(({ y, shared }) => shared.length && overlaps(candidate, y, buffer))
    .map(({ y, shared }) => ({ a: candidate, b: y, people: [...new Set(shared)].sort() }));
}

// Idade de referência para categorias: "ano" (idade que completa no ano do evento) ou "data_evento".
export function ageForEvent(birthDate, eventStart, mode = "ano") {
  if (!birthDate) return null;
  const [by, bm, bd] = birthDate.slice(0, 10).split("-").map(Number);
  const [ey, em, ed] = eventStart.slice(0, 10).split("-").map(Number);
  if (mode === "ano") return ey - by;
  return ey - by - ((em < bm || (em === bm && ed < bd)) ? 1 : 0);
}

export const ageToday = (birthDate) => ageForEvent(birthDate, new Date().toISOString().slice(0, 10), "data_evento");

// "Ana Beatriz Souza" -> "Ana B. S." (proteção de menores na área pública)
export function abbreviate(name) {
  const parts = String(name || "").trim().split(/\s+/);
  if (parts.length <= 1) return name || "";
  return parts[0] + " " + parts.slice(1).map((p) => p[0] + ".").join(" ");
}
