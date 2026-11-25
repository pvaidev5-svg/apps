import test from "node:test";
import assert from "node:assert/strict";
import { scoreBjj, BJJ_DEFAULTS } from "../js/logic/scoring.js";

const CFG = BJJ_DEFAULTS;
const ev = (athlete, kind) => ({ athlete, kind });

for (const [kind, pts] of [["takedown", 2], ["sweep", 2], ["knee_on_belly", 2], ["guard_pass", 3], ["mount", 4], ["back_control", 4]]) {
  test(`jiu-jitsu: ${kind} vale ${pts}`, () => {
    const r = scoreBjj([ev("a", kind)], CFG);
    assert.deepEqual(r.points, { a: pts, b: 0 });
    assert.equal(r.winner, "a"); assert.equal(r.method, "pontos");
  });
}
test("sequência crescente soma posições distintas", () => {
  assert.equal(scoreBjj([ev("a", "takedown"), ev("a", "guard_pass"), ev("a", "mount")], CFG).points.a, 9);
});
test("repetir posição na mesma sequência não pontua", () => {
  const r = scoreBjj([ev("a", "mount"), ev("a", "knee_on_belly"), ev("a", "mount")], CFG);
  assert.equal(r.points.a, 6); assert.equal(r.log[2].points, 0); assert.match(r.log[2].note, /repetida/);
});
test("reset permite pontuar de novo", () => {
  assert.equal(scoreBjj([ev("a", "guard_pass"), ev(null, "reset"), ev("a", "guard_pass")], CFG).points.a, 6);
});
test("pontuação do adversário encerra a sequência", () => {
  assert.deepEqual(scoreBjj([ev("a", "guard_pass"), ev("b", "sweep"), ev("a", "guard_pass")], CFG).points, { a: 6, b: 2 });
});
test("finalização vence mesmo perdendo no placar", () => {
  const r = scoreBjj([ev("a", "mount"), ev("a", "back_control"), ev("b", "submission")], CFG);
  assert.equal(r.points.a, 8); assert.equal(r.winner, "b"); assert.equal(r.method, "finalizacao"); assert.ok(r.finished_early);
});
test("eventos após finalização são ignorados", () => {
  const r = scoreBjj([ev("b", "submission"), ev("a", "mount")], CFG);
  assert.equal(r.points.a, 0); assert.match(r.log[1].note, /encerrada/);
});
test("desempate por vantagens", () => {
  const r = scoreBjj([ev("a", "sweep"), ev("b", "sweep"), ev("b", "advantage")], CFG);
  assert.equal(r.winner, "b"); assert.equal(r.method, "vantagens");
});
test("desempate por menos penalidades", () => {
  const r = scoreBjj([ev("a", "advantage"), ev("b", "advantage"), ev("a", "penalty")], CFG);
  assert.equal(r.winner, "b"); assert.equal(r.method, "penalidades");
});
test("empate total exige decisão do árbitro", () => {
  let r = scoreBjj([ev("a", "takedown"), ev("b", "sweep")], CFG);
  assert.equal(r.winner, null); assert.equal(r.method, "decisao_arbitro");
  r = scoreBjj([ev("a", "takedown"), ev("b", "sweep")], CFG, "a");
  assert.equal(r.winner, "a");
});
test("desclassificação dá vitória ao oponente", () => {
  const r = scoreBjj([ev("a", "mount"), ev("a", "disqualification")], CFG);
  assert.equal(r.winner, "b"); assert.equal(r.method, "desclassificacao");
});
test("configuração editável é respeitada", () => {
  const cfg = structuredClone(CFG); cfg.points.guard_pass = 5;
  assert.equal(scoreBjj([ev("a", "guard_pass")], cfg).points.a, 5);
});
test("tipo ou atleta inválido gera erro", () => {
  assert.throws(() => scoreBjj([ev("a", "voadora")], CFG));
  assert.throws(() => scoreBjj([ev("c", "mount")], CFG));
});
