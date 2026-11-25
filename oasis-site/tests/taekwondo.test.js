import test from "node:test";
import assert from "node:assert/strict";
import { scoreTaekwondo, TKD_DEFAULTS } from "../js/logic/scoring.js";

const cfg = (over = {}) => ({ ...structuredClone(TKD_DEFAULTS), ...over });
const ev = (athlete, kind, round = 1) => ({ athlete, kind, round });

for (const [kind, pts] of [["punch_trunk", 1], ["kick_trunk", 2], ["kick_head", 3], ["spin_kick_trunk", 4], ["spin_kick_head", 5]]) {
  test(`taekwondo: ${kind} vale ${pts}`, () => assert.deepEqual(scoreTaekwondo([ev("a", kind)], cfg()).points, { a: pts, b: 0 }));
}
test("giratório na cabeça configurável para 6", () => {
  const c = cfg(); c.points.spin_kick_head = 6;
  assert.equal(scoreTaekwondo([ev("a", "spin_kick_head")], c).points.a, 6);
});
test("soco na cabeça não pontua e gera gam-jeom", () => {
  const r = scoreTaekwondo([ev("a", "punch_head")], cfg());
  assert.deepEqual(r.points, { a: 0, b: 1 }); assert.deepEqual(r.gamjeom, { a: 1, b: 0 }); assert.equal(r.winner, "b");
});
test("gam-jeom dá ponto ao oponente", () => assert.equal(scoreTaekwondo([ev("b", "gamjeom"), ev("b", "gamjeom")], cfg()).points.a, 2));
test("soma dos rounds", () => {
  const r = scoreTaekwondo([ev("a", "kick_trunk", 1), ev("b", "kick_head", 2), ev("a", "punch_trunk", 3), ev("a", "punch_trunk", 3)], cfg());
  assert.deepEqual(r.points, { a: 4, b: 3 }); assert.equal(r.method, "pontos");
});
test("empate leva ao golden point", () => {
  const r = scoreTaekwondo([ev("a", "kick_trunk", 1), ev("b", "kick_trunk", 2), ev("b", "kick_trunk", 4)], cfg());
  assert.equal(r.winner, "b"); assert.equal(r.method, "golden_point");
});
test("golden point por gam-jeom do adversário", () => {
  const r = scoreTaekwondo([ev("a", "gamjeom", 4), ev("a", "gamjeom", 4)], cfg());
  assert.equal(r.winner, "b"); assert.equal(r.method, "golden_point");
});
test("golden point ignorado sem empate", () => {
  const r = scoreTaekwondo([ev("a", "kick_trunk", 1), ev("b", "kick_head", 4)], cfg());
  assert.equal(r.winner, "a"); assert.match(r.log[1].note, /golden/);
});
test("sem pontos no golden point exige superioridade", () => {
  assert.equal(scoreTaekwondo([], cfg()).method, "superioridade");
  assert.equal(scoreTaekwondo([], cfg(), "b").winner, "b");
});
test("diferença de pontos encerra a luta", () => {
  const r = scoreTaekwondo([...Array(4).fill(ev("a", "spin_kick_head")), ev("b", "kick_trunk")], cfg());
  assert.equal(r.method, "diferenca_de_pontos"); assert.match(r.log.at(-1).note, /encerrada/);
});
test("limite de gam-jeom encerra a luta", () => {
  const r = scoreTaekwondo([ev("a", "kick_head"), ...Array(10).fill(ev("a", "gamjeom"))], cfg({ point_gap: 0 }));
  assert.equal(r.winner, "b"); assert.equal(r.method, "punicao");
});
test("RSC encerra imediatamente", () => {
  const r = scoreTaekwondo([ev("b", "kick_head"), ev("a", "rsc")], cfg());
  assert.equal(r.winner, "a"); assert.equal(r.method, "rsc");
});
test("round inválido", () => assert.throws(() => scoreTaekwondo([ev("a", "kick_head", 9)], cfg())));
test("melhor de 3: vence quem ganha dois rounds", () => {
  const r = scoreTaekwondo([ev("a", "kick_head", 1), ev("b", "kick_head", 2), ev("b", "kick_trunk", 2), ev("a", "kick_trunk", 3)], cfg({ mode: "melhor_de_3" }));
  assert.deepEqual(r.rounds_won, { a: 2, b: 1 }); assert.equal(r.winner, "a");
});
test("melhor de 3: desempate do round por giratório", () => {
  const r = scoreTaekwondo([ev("a", "spin_kick_trunk", 1), ev("b", "kick_trunk", 1), ev("b", "kick_trunk", 1), ev("a", "kick_head", 2)], cfg({ mode: "melhor_de_3" }));
  assert.equal(r.rounds[0].method, "desempate_spin"); assert.equal(r.winner, "a");
});
test("melhor de 3: round empatado aguarda árbitro", () => {
  const c = cfg({ mode: "melhor_de_3" });
  let r = scoreTaekwondo([ev("a", "kick_trunk", 1), ev("b", "kick_trunk", 1)], c);
  assert.equal(r.rounds[0].method, "decisao_arbitro"); assert.equal(r.winner, null);
  r = scoreTaekwondo([ev("a", "kick_trunk", 1), ev("b", "kick_trunk", 1), ev("b", "kick_head", 2), ev("b", "kick_head", 3)], c, null, { 1: "a" });
  assert.deepEqual(r.rounds_won, { a: 1, b: 2 }); assert.equal(r.winner, "b");
});
