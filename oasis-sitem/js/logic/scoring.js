// Motores de pontuação (funções puras, sem acesso a dados).
// Cada motor recebe a súmula (lista de lances) e a configuração vigente,
// e devolve o resultado. Os valores vêm de Painel > Pontuação e regras.

export const BJJ_DEFAULTS = {
  points: { takedown: 2, sweep: 2, knee_on_belly: 2, guard_pass: 3, mount: 4, back_control: 4 },
};

export const TKD_DEFAULTS = {
  points: { punch_trunk: 1, kick_trunk: 2, kick_head: 3, spin_kick_trunk: 4, spin_kick_head: 5 }, // 5 ou 6: decisão do cliente
  gamjeom_points: 1,
  mode: "cumulativo",       // "cumulativo" (soma + golden point) | "melhor_de_3"
  rounds: 3,
  max_gamjeom: 10,
  point_gap: 20,
  golden_point_target: 2,
};

export const TEAM_DEFAULTS = {
  futebol: { win: 3, draw: 1, loss: 0, allow_draw: true },
  futsal: { win: 3, draw: 1, loss: 0, allow_draw: true },
  basquete: { win: 2, draw: 0, loss: 1, allow_draw: false },
  volei: { win: 3, draw: 0, loss: 0, allow_draw: false, best_of: 3, set_points: 25, tiebreak_points: 15, min_lead: 2 },
};

export const BJJ_LABELS = {
  takedown: "Queda", sweep: "Raspagem", knee_on_belly: "Joelho na barriga", guard_pass: "Passagem de guarda",
  mount: "Montada", back_control: "Pegada pelas costas", advantage: "Vantagem", penalty: "Penalidade",
  reset: "Posição desfeita / reinício", submission: "Finalização", disqualification: "Desclassificação",
};

export const TKD_LABELS = {
  punch_trunk: "Soco no tronco", kick_trunk: "Chute no tronco", kick_head: "Chute na cabeça",
  spin_kick_trunk: "Chute giratório no tronco", spin_kick_head: "Chute giratório na cabeça",
  punch_head: "Soco na cabeça (infração)", gamjeom: "Gam-jeom (penalidade)", rsc: "Interrupção pelo árbitro (RSC)",
};

export const TEAM_LABELS = {
  goal: "Gol", own_goal: "Gol contra", basket: "Cesta", point: "Ponto individual (vôlei)",
  yellow: "Cartão amarelo", red: "Cartão vermelho", note: "Observação de súmula",
};

const other = (s) => (s === "a" ? "b" : "a");
const blank = () => ({ a: 0, b: 0 });

// ------------------------------------------------------------------ Jiu-jitsu
// Sequência crescente: enquanto o atleta mantém o domínio, cada posição pontua
// uma vez. A sequência zera com "reset" (posição desfeita) ou quando o
// adversário pontua. Finalização encerra a luta mesmo com placar inferior.
// Desempate: pontos > vantagens > menos penalidades > decisão do árbitro.
const BJJ_SCORING = ["takedown", "sweep", "knee_on_belly", "guard_pass", "mount", "back_control"];
const BJJ_ALL = [...BJJ_SCORING, "advantage", "penalty", "reset", "submission", "disqualification"];

export function scoreBjj(events, config, refereeDecision = null) {
  const res = { points: blank(), advantages: blank(), penalties: blank(), winner: null, method: null, finished_early: false, log: [] };
  const seq = { a: new Set(), b: new Set() };
  events.forEach((ev, idx) => {
    const { athlete: side, kind } = ev;
    if (!BJJ_ALL.includes(kind)) throw new Error(`Evento ${idx}: tipo desconhecido '${kind}'`);
    if (kind !== "reset" && side !== "a" && side !== "b") throw new Error(`Evento ${idx}: atleta deve ser 'a' ou 'b'`);
    const entry = { index: idx, athlete: side, kind, points: 0, note: "" };
    if (res.finished_early) { entry.note = "ignorado: luta já encerrada"; res.log.push(entry); return; }
    if (BJJ_SCORING.includes(kind)) {
      if (seq[side].has(kind)) entry.note = "sem pontos: posição repetida na mesma sequência";
      else { const p = Number(config.points[kind]); res.points[side] += p; entry.points = p; seq[side].add(kind); }
      seq[other(side)].clear();
    } else if (kind === "advantage") res.advantages[side] += 1;
    else if (kind === "penalty") res.penalties[side] += 1;
    else if (kind === "reset") { seq.a.clear(); seq.b.clear(); }
    else if (kind === "submission") Object.assign(res, { winner: side, method: "finalizacao", finished_early: true });
    else if (kind === "disqualification") Object.assign(res, { winner: other(side), method: "desclassificacao", finished_early: true });
    res.log.push(entry);
  });
  if (!res.finished_early) {
    const criteria = [["pontos", res.points, true], ["vantagens", res.advantages, true], ["penalidades", res.penalties, false]];
    let decided = false;
    for (const [name, store, higher] of criteria) {
      if (store.a !== store.b) {
        let aBetter = store.a > store.b;
        if (!higher) aBetter = !aBetter;
        res.winner = aBetter ? "a" : "b"; res.method = name; decided = true; break;
      }
    }
    if (!decided) { res.method = "decisao_arbitro"; if (refereeDecision === "a" || refereeDecision === "b") res.winner = refereeDecision; }
  }
  res.score_a = res.points.a; res.score_b = res.points.b;
  return res;
}

// ------------------------------------------------------------------ Taekwondo
const TKD_TECH = ["punch_trunk", "kick_trunk", "kick_head", "spin_kick_trunk", "spin_kick_head"];
const TKD_ALL = [...TKD_TECH, "punch_head", "gamjeom", "rsc"];

function tkdApply(ev, config, points, gamjeom, breakdown) {
  const { athlete: side, kind } = ev;
  if (TKD_TECH.includes(kind)) {
    const p = Number(config.points[kind]);
    points[side] += p; breakdown[side][kind] = (breakdown[side][kind] || 0) + p;
    return [p, ""];
  }
  gamjeom[side] += 1;
  const gp = Number(config.gamjeom_points);
  points[other(side)] += gp;
  breakdown[other(side)].gamjeom = (breakdown[other(side)].gamjeom || 0) + gp;
  return [0, kind === "punch_head" ? "soco na cabeça: sem pontos, gam-jeom" : "gam-jeom"];
}

export function scoreTaekwondo(events, config, superiorityDecision = null, roundDecisions = {}) {
  const maxRound = config.rounds + (config.mode === "cumulativo" ? 1 : 0);
  events.forEach((ev, i) => {
    if (!TKD_ALL.includes(ev.kind)) throw new Error(`Evento ${i}: tipo desconhecido '${ev.kind}'`);
    if (ev.athlete !== "a" && ev.athlete !== "b") throw new Error(`Evento ${i}: atleta deve ser 'a' ou 'b'`);
    const r = ev.round ?? 1;
    if (!Number.isInteger(r) || r < 1 || r > maxRound) throw new Error(`Evento ${i}: round inválido (${r})`);
  });
  return config.mode === "melhor_de_3" ? tkdBestOf3(events, config, roundDecisions || {}) : tkdCumulative(events, config, superiorityDecision);
}

function tkdCumulative(events, config, superiority) {
  const golden = config.rounds + 1;
  const points = blank(), gamjeom = blank(), gp = blank(), gpGam = blank();
  const breakdown = { a: {}, b: {} };
  const log = [];
  const result = { winner: null, method: null, finished_early: false };
  const ordered = events.map((ev, idx) => [idx, ev]).sort((x, y) => ((x[1].round ?? 1) - (y[1].round ?? 1)) || (x[0] - y[0]));
  for (const [idx, ev] of ordered) {
    const entry = { index: idx, athlete: ev.athlete, kind: ev.kind, round: ev.round ?? 1, points: 0, note: "" };
    if (result.winner) { entry.note = "ignorado: luta já encerrada"; log.push(entry); continue; }
    if (ev.kind === "rsc") { Object.assign(result, { winner: ev.athlete, method: "rsc", finished_early: true }); log.push(entry); continue; }
    const isGolden = (ev.round ?? 1) === golden;
    if (isGolden) {
      if (points.a !== points.b) { entry.note = "ignorado: golden point só ocorre com empate"; log.push(entry); continue; }
      [entry.points, entry.note] = tkdApply(ev, config, gp, gpGam, breakdown);
      if (ev.kind === "gamjeom" || ev.kind === "punch_head") gamjeom[ev.athlete] += 1;
    } else {
      [entry.points, entry.note] = tkdApply(ev, config, points, gamjeom, breakdown);
    }
    log.push(entry);
    const loser = ["a", "b"].find((s) => config.max_gamjeom && gamjeom[s] >= config.max_gamjeom);
    if (loser) Object.assign(result, { winner: other(loser), method: "punicao", finished_early: true });
    else if (isGolden) {
      const leader = ["a", "b"].find((s) => gp[s] >= config.golden_point_target);
      if (leader) Object.assign(result, { winner: leader, method: "golden_point", finished_early: true });
    } else if (config.point_gap && Math.abs(points.a - points.b) >= config.point_gap) {
      Object.assign(result, { winner: points.a > points.b ? "a" : "b", method: "diferenca_de_pontos", finished_early: true });
    }
  }
  if (!result.winner) {
    if (points.a !== points.b) Object.assign(result, { winner: points.a > points.b ? "a" : "b", method: "pontos" });
    else if (events.some((e) => e.round === golden) && gp.a !== gp.b) Object.assign(result, { winner: gp.a > gp.b ? "a" : "b", method: "golden_point" });
    else { result.method = "superioridade"; if (superiority === "a" || superiority === "b") result.winner = superiority; }
  }
  return { ...result, points, gamjeom, golden_points: gp, breakdown, log, score_a: points.a, score_b: points.b };
}

// Desempate de round (melhor de 3): giratórios > cabeça > chute no tronco > soco > menos gam-jeom > árbitro
const ROUND_TIEBREAK = [["spin", ["spin_kick_trunk", "spin_kick_head"]], ["head", ["kick_head", "spin_kick_head"]],
  ["trunk", ["kick_trunk"]], ["punch", ["punch_trunk"]]];

function tkdBestOf3(events, config, roundDecisions) {
  const roundsWon = blank(), total = blank(), gamTotal = blank();
  const rounds = [], log = [];
  let winner = null, method = null, finished = false;
  for (let rnd = 1; rnd <= config.rounds; rnd++) {
    const points = blank(), gamjeom = blank(), breakdown = { a: {}, b: {} };
    let rw = null, rm = null;
    events.forEach((ev, idx) => {
      if ((ev.round ?? 1) !== rnd) return;
      const entry = { index: idx, athlete: ev.athlete, kind: ev.kind, round: rnd, points: 0, note: "" };
      if (winner || rw) { entry.note = "ignorado: round/luta já encerrado"; log.push(entry); return; }
      if (ev.kind === "rsc") { winner = ev.athlete; method = "rsc"; finished = true; log.push(entry); return; }
      [entry.points, entry.note] = tkdApply(ev, config, points, gamjeom, breakdown);
      log.push(entry);
      const loser = ["a", "b"].find((s) => config.max_gamjeom && gamjeom[s] >= config.max_gamjeom);
      if (loser) { rw = other(loser); rm = "punicao"; }
      else if (config.point_gap && Math.abs(points.a - points.b) >= config.point_gap) { rw = points.a > points.b ? "a" : "b"; rm = "diferenca_de_pontos"; }
    });
    for (const s of ["a", "b"]) { total[s] += points[s]; gamTotal[s] += gamjeom[s]; }
    if (winner) break;
    if (!rw) {
      if (points.a !== points.b) { rw = points.a > points.b ? "a" : "b"; rm = "pontos"; }
      else {
        for (const [name, kinds] of ROUND_TIEBREAK) {
          const va = kinds.reduce((t, k) => t + (breakdown.a[k] || 0), 0), vb = kinds.reduce((t, k) => t + (breakdown.b[k] || 0), 0);
          if (va !== vb) { rw = va > vb ? "a" : "b"; rm = `desempate_${name}`; break; }
        }
        if (!rw) {
          if (gamjeom.a !== gamjeom.b) { rw = gamjeom.a < gamjeom.b ? "a" : "b"; rm = "desempate_gamjeom"; }
          else { rm = "decisao_arbitro"; const d = roundDecisions[rnd] ?? roundDecisions[String(rnd)]; if (d === "a" || d === "b") rw = d; }
        }
      }
    }
    rounds.push({ round: rnd, points, gamjeom, winner: rw, method: rm });
    if (rw) { roundsWon[rw] += 1; if (roundsWon[rw] === 2) { winner = rw; method = "rounds"; break; } }
    else if (!events.some((e) => (e.round ?? 1) > rnd)) break;
  }
  return { winner, method, finished_early: finished, rounds_won: roundsWon, rounds, points: total, gamjeom: gamTotal, log,
    score_a: roundsWon.a, score_b: roundsWon.b };
}

// ------------------------------------------------------------------ Coletivos
const TEAM_KINDS = ["goal", "own_goal", "basket", "point", "yellow", "red", "note"];

export function validateVolleyballSets(sets, config) {
  const need = Math.floor(config.best_of / 2) + 1;
  const won = blank();
  sets.forEach((s, i0) => {
    const i = i0 + 1;
    if (won.a === need || won.b === need) throw new Error(`Set ${i}: a partida já estava decidida`);
    const a = Number(s[0]), b = Number(s[1]);
    const target = i === config.best_of ? config.tiebreak_points : config.set_points;
    const hi = Math.max(a, b), lo = Math.min(a, b);
    if (hi < target) throw new Error(`Set ${i}: o vencedor precisa de ao menos ${target} pontos`);
    if (hi - lo < config.min_lead) throw new Error(`Set ${i}: vantagem mínima de ${config.min_lead} pontos`);
    if (hi > target && hi - lo !== config.min_lead) throw new Error(`Set ${i}: após ${target} pontos o set termina com diferença de exatamente ${config.min_lead}`);
    won[a > b ? "a" : "b"] += 1;
  });
  return [won.a, won.b];
}

export function scoreTeamMatch(sport, events, config, { sets = null, penalties = null, knockout = false } = {}) {
  let score = blank();
  const scorers = {}, cards = [], notes = [];
  events.forEach((ev, i) => {
    const { kind, team } = ev;
    if (!TEAM_KINDS.includes(kind)) throw new Error(`Evento ${i}: tipo desconhecido '${kind}'`);
    if (team !== "a" && team !== "b") throw new Error(`Evento ${i}: time deve ser 'a' ou 'b'`);
    const pid = ev.player_id || null;
    if (kind === "goal") {
      if (sport !== "futebol" && sport !== "futsal") throw new Error(`Evento ${i}: gol não se aplica a ${sport}`);
      score[team] += 1; if (pid) scorers[pid] = (scorers[pid] || 0) + 1;
    } else if (kind === "own_goal") score[other(team)] += 1;
    else if (kind === "basket") {
      if (sport !== "basquete") throw new Error(`Evento ${i}: cesta só se aplica ao basquete`);
      const v = Number(ev.value ?? 2);
      if (![1, 2, 3].includes(v)) throw new Error(`Evento ${i}: cesta vale 1, 2 ou 3 pontos`);
      score[team] += v; if (pid) scorers[pid] = (scorers[pid] || 0) + v;
    } else if (kind === "point") { if (pid) scorers[pid] = (scorers[pid] || 0) + 1; }
    else if (kind === "yellow" || kind === "red") cards.push({ team, player_id: pid, kind });
    else notes.push(ev.note || "");
  });
  const result = { winner: null, method: null, sets: null, penalties: null, pending: null };
  if (sport === "volei") {
    let sa = 0, sb = 0;
    if (!sets || !sets.length) result.pending = "Informe o placar de cada set";
    else {
      [sa, sb] = validateVolleyballSets(sets, config);
      const need = Math.floor(config.best_of / 2) + 1;
      if (Math.max(sa, sb) === need) Object.assign(result, { winner: sa > sb ? "a" : "b", method: "sets" });
      else result.pending = "Partida ainda não decidida (sets insuficientes)";
    }
    result.sets = sets || [];
    score = { a: sa, b: sb };
  } else if (score.a !== score.b) Object.assign(result, { winner: score.a > score.b ? "a" : "b", method: "placar" });
  else if (sport === "basquete") result.pending = "Empate no basquete: registre a prorrogação";
  else if (knockout || !config.allow_draw) {
    if (penalties && penalties[0] != null && penalties[1] != null && Number(penalties[0]) !== Number(penalties[1])) {
      const pa = Number(penalties[0]), pb = Number(penalties[1]);
      Object.assign(result, { winner: pa > pb ? "a" : "b", method: "penaltis", penalties: [pa, pb] });
    } else result.pending = "Empate em mata-mata: informe a disputa de pênaltis";
  } else Object.assign(result, { winner: "draw", method: "empate" });
  return { ...result, score_a: score.a, score_b: score.b, scorers, cards, notes };
}

export function standings(teamIds, results, config) {
  const table = new Map(teamIds.map((t) => [t, { team: t, played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, points: 0 }]));
  for (const r of results) {
    if (r.winner == null) continue;
    const a = table.get(r.a), b = table.get(r.b);
    if (!a || !b) continue;
    for (const [row, gf, ga] of [[a, r.score_a, r.score_b], [b, r.score_b, r.score_a]]) { row.played++; row.for += gf; row.against += ga; }
    if (r.winner === "draw") for (const row of [a, b]) { row.drawn++; row.points += config.draw; }
    else { const [w, l] = r.winner === "a" ? [a, b] : [b, a]; w.won++; w.points += config.win; l.lost++; l.points += config.loss; }
  }
  const rows = [...table.values()].map((r) => ({ ...r, diff: r.for - r.against }));
  rows.sort((x, y) => (y.points - x.points) || (y.won - x.won) || (y.diff - x.diff) || (y.for - x.for) || String(x.team).localeCompare(String(y.team)));
  return rows;
}

export const METHOD_LABELS = {
  finalizacao: "Finalização", desclassificacao: "Desclassificação", pontos: "Pontos", vantagens: "Vantagens",
  penalidades: "Menos penalidades", decisao_arbitro: "Decisão do árbitro", golden_point: "Golden point",
  superioridade: "Superioridade", diferenca_de_pontos: "Diferença de pontos", punicao: "Punição (gam-jeom)",
  rsc: "Interrupção do árbitro", rounds: "Rounds", placar: "Placar", penaltis: "Pênaltis", sets: "Sets",
  empate: "Empate", bye: "Sem adversário (BYE)", wo: "W.O.",
};
