import { test } from "node:test";
import assert from "node:assert/strict";
import { DIVISIONS_DEFAULT, WEIGHT_TABLE_DEFAULT, weightClassesFor, divisionCategories, weightFits,
  tableToText, textToTable, weightText, catWeightLabel } from "../js/logic/divisions.js";

const juvenil = DIVISIONS_DEFAULT.find((d) => d.name === "Juvenil");

test("divisões por idade seguem a tabela", () => {
  const byName = Object.fromEntries(DIVISIONS_DEFAULT.map((d) => [d.name, [d.min, d.max]]));
  assert.deepEqual(byName["Pré-Mirim"], [4, 5]);
  assert.deepEqual(byName["Mirim"], [6, 7]);
  assert.deepEqual(byName["Infantil A"], [8, 9]);
  assert.deepEqual(byName["Infantil B"], [10, 11]);
  assert.deepEqual(byName["Infanto-Juvenil A"], [12, 13]);
  assert.deepEqual(byName["Infanto-Juvenil B"], [14, 15]);
  assert.deepEqual(byName["Juvenil"], [16, 17]);
  assert.equal(DIVISIONS_DEFAULT.length, 7);
  assert.equal(Math.max(...DIVISIONS_DEFAULT.map((d) => d.max)), 17);
  // sem buracos nem sobreposição
  for (let i = 1; i < DIVISIONS_DEFAULT.length; i++) assert.equal(DIVISIONS_DEFAULT[i].min, DIVISIONS_DEFAULT[i - 1].max + 1);
});

test("juvenil masculino: 9 pesos, do Galo ao Pesadíssimo", () => {
  const c = weightClassesFor(WEIGHT_TABLE_DEFAULT, "jiu_jitsu", "Juvenil", "masculino");
  assert.deepEqual(c.map((x) => x.name), ["Galo", "Pluma", "Pena", "Leve", "Médio", "Meio-Pesado", "Pesado", "Super-Pesado", "Pesadíssimo"]);
  assert.deepEqual(c[0], { name: "Galo", min: null, max: 53.5 });
  assert.deepEqual(c[1], { name: "Pluma", min: 53.5, max: 58.5 });
  assert.deepEqual(c[8], { name: "Pesadíssimo", min: 89.3, max: null });
});

test("juvenil feminino: 8 pesos, Super-Pesado sem limite", () => {
  const c = weightClassesFor(WEIGHT_TABLE_DEFAULT, "jiu_jitsu", "Juvenil", "feminino");
  assert.equal(c.length, 8);
  assert.deepEqual(c.at(-1), { name: "Super-Pesado", min: 69, max: null });
  assert.deepEqual(c[4], { name: "Médio", min: 56.5, max: 60.5 });
});

test("parajiu-jítsu usa a tabela do jiu-jitsu", () => {
  assert.equal(weightClassesFor(WEIGHT_TABLE_DEFAULT, "para_jiu_jitsu", "Juvenil", "feminino").length, 8);
  assert.equal(weightClassesFor(WEIGHT_TABLE_DEFAULT, "taekwondo", "Juvenil", "feminino").length, 0);
});

test("limite exato fica na categoria de baixo", () => {
  const { cats } = divisionCategories({ modality: "jiu_jitsu", divisions: [juvenil], genders: ["masculino"], table: WEIGHT_TABLE_DEFAULT });
  const galo = cats.find((c) => c.weightClass === "Galo"), pluma = cats.find((c) => c.weightClass === "Pluma"), top = cats.at(-1);
  assert.ok(weightFits(53.5, galo)); assert.ok(!weightFits(53.5, pluma));
  assert.ok(weightFits(53.6, pluma)); assert.ok(!weightFits(53.6, galo));
  assert.ok(weightFits(120, top)); assert.ok(!weightFits(89.3, top));
  assert.equal(galo.name, "Jiu-jitsu Juvenil Masculino – Galo (até 53,5 kg)");
  assert.equal(pluma.name, "Jiu-jitsu Juvenil Masculino – Pluma (acima de 53,5 até 58,5 kg)");
  assert.equal(galo.ageMin, 16); assert.equal(galo.ageMax, 17); assert.equal(galo.division, "Juvenil");
});

test("feminino + masculino cria 17 categorias; divisão sem tabela é avisada", () => {
  const mirim = DIVISIONS_DEFAULT.find((d) => d.name === "Mirim");
  const { cats, missing } = divisionCategories({ modality: "jiu_jitsu", divisions: [mirim, juvenil], genders: ["feminino", "masculino"], table: WEIGHT_TABLE_DEFAULT });
  assert.equal(cats.length, 2 + 17);
  assert.deepEqual(missing, ["Mirim Feminino", "Mirim Masculino"]);
  const futsal = divisionCategories({ modality: "futsal", divisions: [juvenil], genders: ["misto"], table: WEIGHT_TABLE_DEFAULT });
  assert.equal(futsal.cats.length, 1); assert.deepEqual(futsal.missing, []);
});

test("tabela vai e volta do texto do painel", () => {
  const txt = tableToText(WEIGHT_TABLE_DEFAULT);
  assert.match(txt, /^jiu_jitsu;Juvenil;masculino;Galo;53,5$/m);
  assert.match(txt, /^jiu_jitsu;Juvenil;masculino;Pesadíssimo;livre$/m);
  assert.deepEqual(textToTable(txt, DIVISIONS_DEFAULT), WEIGHT_TABLE_DEFAULT);
  assert.throws(() => textToTable("jiu_jitsu;Sub-18;masculino;Galo;50", DIVISIONS_DEFAULT), /Divisão não cadastrada/);
  assert.throws(() => textToTable("futsal;Juvenil;masculino;Galo;50", DIVISIONS_DEFAULT), /Modalidade inválida/);
  assert.throws(() => textToTable("jiu_jitsu;Juvenil;misto;Galo;50", DIVISIONS_DEFAULT), /Sexo/);
});

test("rótulos de peso", () => {
  assert.equal(weightText(null, 44.3), "até 44,3 kg");
  assert.equal(catWeightLabel({ weightMin: 30, weightMax: 35 }), "30 a 35 kg");
  assert.equal(catWeightLabel({ weightClass: "Galo", weightMin: null, weightMax: 53.5 }), "Galo: até 53,5 kg");
});
