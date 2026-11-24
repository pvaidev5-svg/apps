// Divisões por idade e categorias de peso das lutas.
// As lutas são separadas por divisão de idade + sexo + categoria de peso.
// A tabela de peso fica nas configurações (Painel → Pontuação e regras) e pode
// ser completada pela coordenação para cada divisão e modalidade.

import { MOD, GENDERS } from "./services.js";

export { DIVISIONS_DEFAULT, WEIGHT_TABLE_DEFAULT } from "./divisions-data.js";

// Modalidade adaptada usa a tabela da modalidade de origem, se não tiver a própria.
export function weightClassesFor(table, modality, division, gender) {
  const pick = (m) => (table || []).filter((r) => r.modality === m && r.division === division && r.gender === gender);
  const own = pick(modality);
  const list = own.length ? own : MOD[modality]?.adaptedOf ? pick(MOD[modality].adaptedOf) : [];
  // ordena por peso, "sem limite" por último; o mínimo de cada uma é o máximo da anterior
  const sorted = [...list].sort((a, b) => (a.max ?? Infinity) - (b.max ?? Infinity));
  return sorted.map((r, i) => ({ name: r.name, min: i ? sorted[i - 1].max : null, max: r.max }));
}

const kg = (n) => String(n).replace(".", ",");
export function weightText(min, max) {
  if (min != null && max != null) return `acima de ${kg(min)} até ${kg(max)} kg`;
  if (max != null) return `até ${kg(max)} kg`;
  if (min != null) return `acima de ${kg(min)} kg`;
  return "";
}

// Rótulo curto do peso de qualquer categoria (da tabela ou digitada à mão).
export function catWeightLabel(c) {
  if (c.weightMin == null && c.weightMax == null) return "";
  if (c.weightMinExclusive || c.weightMin == null) return (c.weightClass ? `${c.weightClass}: ` : "") + weightText(c.weightMinExclusive ? c.weightMin : null, c.weightMax);
  return c.weightMax != null ? `${kg(c.weightMin)} a ${kg(c.weightMax)} kg` : `${kg(c.weightMin)} kg ou mais`;
}

// Peso do atleta dentro da categoria. Nas categorias da tabela o limite de baixo é
// exclusivo (quem pesa exatamente 53,5 kg é Galo, não Pluma).
export function weightFits(weight, cat) {
  if (cat.weightMin != null && (cat.weightMinExclusive ? weight <= cat.weightMin : weight < cat.weightMin)) return false;
  if (cat.weightMax != null && weight > cat.weightMax) return false;
  return true;
}

// Monta as categorias de uma ou mais divisões. Lutas: uma categoria por peso.
// Sem tabela de peso para a divisão: cria a categoria da divisão sem peso e avisa.
export function divisionCategories({ modality, divisions, genders, table }) {
  const mod = MOD[modality];
  const cats = [], missing = [];
  for (const dv of divisions) {
    for (const g of genders) {
      const gl = g !== "misto" ? ` ${GENDERS[g]}` : "";
      const base = { modality, division: dv.name, gender: g, ageMin: dv.min, ageMax: dv.max };
      const classes = mod.kind === "luta" && g !== "misto" ? weightClassesFor(table, modality, dv.name, g) : [];
      if (!classes.length) {
        if (mod.kind === "luta") missing.push(`${dv.name}${gl}`);
        cats.push({ ...base, name: `${mod.name} ${dv.name}${gl}`, weightMin: null, weightMax: null });
        continue;
      }
      for (const c of classes) {
        cats.push({ ...base, weightClass: c.name, weightMin: c.min, weightMax: c.max, weightMinExclusive: c.min != null,
          name: `${mod.name} ${dv.name}${gl} – ${c.name} (${weightText(c.min, c.max)})` });
      }
    }
  }
  return { cats, missing };
}

// Texto da tabela para o painel: "Modalidade;Divisão;Sexo;Categoria;Peso máximo"
export function tableToText(table) {
  return (table || []).map((r) => [r.modality, r.division, r.gender, r.name, r.max == null ? "livre" : kg(r.max)].join(";")).join("\n");
}
export function textToTable(text, divisions) {
  const names = new Set(divisions.map((d) => d.name));
  return text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
    const [modality, division, gender, name, max] = l.split(";").map((x) => (x || "").trim());
    if (!MOD[modality] || MOD[modality].kind !== "luta") throw new Error(`Modalidade inválida (use jiu_jitsu, taekwondo, para_jiu_jitsu ou para_taekwondo): ${l}`);
    if (!names.has(division)) throw new Error(`Divisão não cadastrada: ${division}`);
    if (gender !== "masculino" && gender !== "feminino") throw new Error(`Sexo deve ser masculino ou feminino: ${l}`);
    if (!name) throw new Error(`Falta o nome da categoria de peso: ${l}`);
    const free = /^(livre|sem limite|-|—)?$/i.test(max || "");
    const n = free ? null : Number(max.replace(",", "."));
    if (!free && !(n > 0 && n < 300)) throw new Error(`Peso inválido: ${l}`);
    return { modality, division, gender, name, max: n };
  });
}
