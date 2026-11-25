import test from "node:test";
import assert from "node:assert/strict";
import { scoreTeamMatch, standings, validateVolleyballSets, TEAM_DEFAULTS } from "../js/logic/scoring.js";
import { seedOrder, singleElimination, splitGroups, roundRobin, knockoutFromGroups } from "../js/logic/brackets.js";
import { findConflicts, conflictsFor, ageForEvent, abbreviate } from "../js/logic/calendar.js";

test("futebol: gols e artilharia (gol contra fora)", () => {
  const r = scoreTeamMatch("futebol", [{ team: "a", kind: "goal", player_id: "p7" }, { team: "a", kind: "goal", player_id: "p7" },
    { team: "b", kind: "goal", player_id: "p9" }, { team: "b", kind: "own_goal", player_id: "p3" }], TEAM_DEFAULTS.futebol);
  assert.deepEqual([r.score_a, r.score_b], [3, 1]); assert.deepEqual(r.scorers, { p7: 2, p9: 1 }); assert.equal(r.winner, "a");
});
test("futsal: empate no grupo, pênaltis no mata-mata", () => {
  const ev = [{ team: "a", kind: "goal" }, { team: "b", kind: "goal" }];
  assert.equal(scoreTeamMatch("futsal", ev, TEAM_DEFAULTS.futsal).winner, "draw");
  assert.match(scoreTeamMatch("futsal", ev, TEAM_DEFAULTS.futsal, { knockout: true }).pending, /pênaltis/);
  const r = scoreTeamMatch("futsal", ev, TEAM_DEFAULTS.futsal, { knockout: true, penalties: [4, 3] });
  assert.equal(r.winner, "a"); assert.equal(r.method, "penaltis");
});
test("basquete: cestas de 1, 2 e 3", () => {
  const r = scoreTeamMatch("basquete", [{ team: "a", kind: "basket", value: 3 }, { team: "b", kind: "basket", value: 2 }, { team: "b", kind: "basket", value: 1 }], TEAM_DEFAULTS.basquete);
  assert.deepEqual([r.score_a, r.score_b], [3, 3]); assert.equal(r.winner, null);
  assert.throws(() => scoreTeamMatch("basquete", [{ team: "a", kind: "basket", value: 4 }], TEAM_DEFAULTS.basquete));
});
test("vôlei: sets válidos", () => {
  const r = scoreTeamMatch("volei", [], TEAM_DEFAULTS.volei, { sets: [[25, 20], [23, 25], [15, 13]] });
  assert.deepEqual([r.score_a, r.score_b], [2, 1]); assert.equal(r.winner, "a");
  assert.deepEqual(validateVolleyballSets([[27, 25], [25, 10]], TEAM_DEFAULTS.volei), [2, 0]);
});
for (const sets of [[[24, 20]], [[25, 24]], [[30, 25]], [[25, 20], [25, 20], [25, 20]]]) {
  test(`vôlei: set inválido ${JSON.stringify(sets)}`, () => assert.throws(() => validateVolleyballSets(sets, TEAM_DEFAULTS.volei)));
}
test("classificação do grupo", () => {
  const rows = standings([1, 2, 3], [{ a: 1, b: 2, score_a: 2, score_b: 0, winner: "a" }, { a: 1, b: 3, score_a: 1, score_b: 1, winner: "draw" },
    { a: 2, b: 3, score_a: 3, score_b: 0, winner: "a" }], TEAM_DEFAULTS.futebol);
  assert.deepEqual(rows.map((r) => r.team), [1, 2, 3]); assert.deepEqual(rows.map((r) => r.points), [4, 3, 1]);
});
test("ordem de cabeças de chave", () => assert.deepEqual(seedOrder(8), [1, 8, 4, 5, 2, 7, 3, 6]));
test("eliminatória com 8", () => {
  const ms = singleElimination([..."ABCDEFGH"]);
  assert.equal(ms.length, 7); assert.deepEqual([ms[0].a, ms[0].b], ["A", "H"]);
});
test("BYEs avançam os cabeças de chave", () => {
  const ms = singleElimination([..."ABCDE"]);
  const byes = ms.filter((m) => m.status === "bye");
  assert.equal(byes.length, 3); assert.deepEqual(byes.map((m) => m.winner).sort(), ["A", "B", "C"]);
  assert.deepEqual(ms.filter((m) => m.round === 2).flatMap((m) => [m.a, m.b]).filter(Boolean).sort(), ["A", "B", "C"]);
});
test("eliminatória exige 2 inscritos", () => assert.throws(() => singleElimination(["A"])));
test("grupos em serpentina e todos contra todos", () => {
  const g = splitGroups([1, 2, 3, 4, 5, 6, 7, 8], 2);
  assert.deepEqual(g, [[1, 4, 5, 8], [2, 3, 6, 7]]);
  const games = roundRobin(g[0]);
  assert.equal(games.length, 6); assert.equal(new Set(games.map((x) => [x.a, x.b].sort().join())).size, 6);
  assert.equal(roundRobin([1, 2, 3]).length, 3);
});
test("mata-mata cruzado a partir dos grupos", () => {
  const ms = singleElimination(knockoutFromGroups([["A1", "A2"], ["B1", "B2"]], 2)).filter((m) => m.round === 1);
  const pairs = ms.map((m) => [m.a, m.b].sort().join());
  assert.ok(pairs.includes("A1,B2") && pairs.includes("A2,B1"));
});
const item = (kind, id, start, dur, people) => ({ kind, id, start, duration_min: dur, people });
test("conflito palco × quadra", () => {
  const c = findConflicts([item("match", 1, "2026-12-05T10:00", 40, ["u10", "u11"]), item("performance", 1, "2026-12-05T10:30", 10, ["u11", "u12"]),
    item("performance", 2, "2026-12-05T10:30", 10, ["u99"])]);
  assert.equal(c.length, 1); assert.deepEqual(c[0].people, ["u11"]);
});
test("sem conflito quando não há sobreposição; folga mínima cria conflito", () => {
  const a = item("match", 1, "2026-12-05T10:00", 30, ["u10"]), b = item("performance", 1, "2026-12-05T10:30", 10, ["u10"]);
  assert.equal(findConflicts([a, b]).length, 0); assert.equal(findConflicts([a, b], 15).length, 1);
  assert.equal(conflictsFor(item("performance", 5, "2026-12-05T10:15", 5, ["u10"]), [a]).length, 1);
});
test("idade de referência e abreviação de nome", () => {
  assert.equal(ageForEvent("2015-12-31", "2026-03-01", "ano"), 11);
  assert.equal(ageForEvent("2015-12-31", "2026-03-01", "data_evento"), 10);
  assert.equal(abbreviate("Ana Clara Souza"), "Ana C. S.");
});
