import test from "node:test";
import assert from "node:assert/strict";
import { explainCategory, explanationText } from "../js/logic/explain.js";
import { BJJ_DEFAULTS, TKD_DEFAULTS, TEAM_DEFAULTS } from "../js/logic/scoring.js";

const settings = (over = {}) => ({ scoring: { bjj: BJJ_DEFAULTS, taekwondo: { ...TKD_DEFAULTS, ...over }, team: TEAM_DEFAULTS }, general: { ageReference: "ano" } });
const ev = { startsOn: "2026-12-19" };
const base = { name: "Taekwondo 12–13 anos", modality: "taekwondo", ageMin: 12, ageMax: 13, gender: "misto", format: "eliminatoria", matchMinutes: 6 };

test("explicação usa as características escolhidas", () => {
  const t = explanationText(explainCategory(base, ev, settings()));
  for (const s of ["Taekwondo 12–13 anos", "de 12 a 13 anos em 2026", "Meninas e meninos participam juntos", "eliminatória", "dura 6 minutos"]) assert.ok(t.includes(s), s);
});
test("explicação acompanha as regras em vigor (giratório na cabeça = 6)", () => {
  const cfg = settings(); cfg.scoring.taekwondo = { ...TKD_DEFAULTS, points: { ...TKD_DEFAULTS.points, spin_kick_head: 6 } };
  assert.ok(explanationText(explainCategory(base, ev, cfg)).includes("chute giratório na cabeça, 6 pontos"));
  assert.ok(explanationText(explainCategory(base, ev, settings())).includes("golden point"));
  assert.ok(explanationText(explainCategory(base, ev, settings({ mode: "melhor_de_3" }))).includes("Vence a luta quem ganhar 2 rounds"));
});
test("sexo, peso, adaptada e grupos", () => {
  const t = explanationText(explainCategory({ ...base, modality: "para_jiu_jitsu", gender: "feminino", weightMin: 30, weightMax: 40, format: "grupos", groupCount: 2, qualifiers: 2 }, ev, settings()));
  for (const s of ["modalidade adaptada", "só meninas", "entre 30 e 40 quilos", "2 grupos", "Os 2 melhores", "finalização termina a luta"]) assert.ok(t.includes(s), s);
});
test("coletivos: futsal, basquete e vôlei", () => {
  const fut = explanationText(explainCategory({ ...base, modality: "futsal", format: "grupos", groupCount: 2, qualifiers: 2 }, ev, settings()));
  assert.ok(fut.includes("pênaltis") && fut.includes("vitória vale 3 pontos") && fut.includes("pela equipe"));
  assert.ok(explanationText(explainCategory({ ...base, modality: "basquete" }, ev, settings())).includes("prorrogação"));
  assert.ok(explanationText(explainCategory({ ...base, modality: "volei" }, ev, settings())).includes("melhor de 3 sets"));
});
test("explicação mostra divisão e categoria de peso", () => {
  const cat = { name: "Jiu-jitsu Juvenil Masculino – Pluma (acima de 53,5 até 58,5 kg)", modality: "jiu_jitsu", division: "Juvenil", ageMin: 16, ageMax: 17, gender: "masculino",
    weightClass: "Pluma", weightMin: 53.5, weightMax: 58.5, weightMinExclusive: true, format: "eliminatoria", matchMinutes: 5 };
  const t = explanationText(explainCategory(cat, ev, settings()));
  for (const s of ["A divisão de idade é Juvenil.", "A categoria de peso é Pluma: acima de 53,5 até 58,5 quilos.", "Categoria masculina"]) assert.ok(t.includes(s), s);
});
