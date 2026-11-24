// Geração de chaves (funções puras).
// - Eliminatória simples com cabeças de chave e BYEs (os melhores cabeças avançam direto).
// - Grupos "todos contra todos" (método do círculo) com distribuição em serpentina.
// - Mata-mata cruzado a partir dos classificados dos grupos.

export function seedOrder(size) {
  if (size < 1 || (size & (size - 1)) !== 0) throw new Error("size deve ser potência de 2");
  let order = [1];
  while (order.length < size) {
    const n = order.length * 2;
    order = order.flatMap((s) => [s, n + 1 - s]);
  }
  return order;
}

export function singleElimination(entries) {
  const n = entries.length;
  if (n < 2) throw new Error("São necessários pelo menos 2 inscritos para gerar a chave");
  const size = 2 ** Math.ceil(Math.log2(n));
  const rounds = Math.log2(size);
  const slots = seedOrder(size).map((s) => (s <= n ? entries[s - 1] : null));
  const matches = [];
  for (let r = 1; r <= rounds; r++) {
    const count = size >> r;
    for (let p = 0; p < count; p++) {
      const m = { round: r, position: p, a: null, b: null, winner: null, status: "pendente",
        next: r < rounds ? [r + 1, Math.floor(p / 2)] : null, next_slot: r < rounds ? (p % 2 === 0 ? "a" : "b") : null };
      if (r === 1) { m.a = slots[2 * p]; m.b = slots[2 * p + 1]; }
      matches.push(m);
    }
  }
  const index = new Map(matches.map((m) => [`${m.round}-${m.position}`, m]));
  for (const m of matches.filter((m) => m.round === 1)) {
    if (m.a === null || m.b === null) {
      m.winner = m.a !== null ? m.a : m.b;
      m.status = "bye";
      if (m.next && m.winner !== null) index.get(`${m.next[0]}-${m.next[1]}`)[m.next_slot] = m.winner;
    }
  }
  return matches;
}

export function roundName(round, total) {
  const remaining = total - round;
  return { 0: "Final", 1: "Semifinal", 2: "Quartas de final", 3: "Oitavas de final" }[remaining] || `${round}ª fase`;
}

export function splitGroups(entries, count) {
  if (count < 1) throw new Error("Número de grupos deve ser >= 1");
  if (entries.length < 2 * count) throw new Error("Cada grupo precisa de pelo menos 2 inscritos");
  const groups = Array.from({ length: count }, () => []);
  entries.forEach((e, i) => {
    const cycle = Math.floor(i / count), pos = i % count;
    groups[cycle % 2 === 0 ? pos : count - 1 - pos].push(e);
  });
  return groups;
}

export function roundRobin(members) {
  let players = [...members];
  if (players.length % 2) players.push(null);
  const n = players.length, out = [];
  for (let r = 0; r < n - 1; r++) {
    let pos = 0;
    for (let i = 0; i < n / 2; i++) {
      const a = players[i], b = players[n - 1 - i];
      if (a !== null && b !== null) out.push({ round: r + 1, position: pos++, a, b });
    }
    players = [players[0], players[n - 1], ...players.slice(1, n - 1)];
  }
  return out;
}

export const groupLabels = (count) => Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));

export function knockoutFromGroups(rankedGroups, qualifiers) {
  const seeds = [];
  for (let place = 0; place < qualifiers; place++) for (const g of rankedGroups) if (place < g.length) seeds.push(g[place]);
  return seeds;
}
