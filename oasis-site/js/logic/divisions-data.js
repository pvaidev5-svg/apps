// Dados padrão das divisões por idade e da tabela de peso (sem dependências,
// para poder ser usado pelo conteúdo inicial).

export const DIVISIONS_DEFAULT = [
  { name: "Pré-Mirim", min: 4, max: 5 },
  { name: "Mirim", min: 6, max: 7 },
  { name: "Infantil A", min: 8, max: 9 },
  { name: "Infantil B", min: 10, max: 11 },
  { name: "Infanto-Juvenil A", min: 12, max: 13 },
  { name: "Infanto-Juvenil B", min: 14, max: 15 },
  { name: "Juvenil", min: 16, max: 17 },
];

// max = null → sem limite de peso (última categoria).
const row = (division, gender, list) => list.map(([name, max]) => ({ modality: "jiu_jitsu", division, gender, name, max }));
export const WEIGHT_TABLE_DEFAULT = [
  ...row("Juvenil", "masculino", [["Galo", 53.5], ["Pluma", 58.5], ["Pena", 64], ["Leve", 69], ["Médio", 74],
    ["Meio-Pesado", 79.3], ["Pesado", 84.3], ["Super-Pesado", 89.3], ["Pesadíssimo", null]]),
  ...row("Juvenil", "feminino", [["Galo", 44.3], ["Pluma", 48.3], ["Pena", 52.5], ["Leve", 56.5], ["Médio", 60.5],
    ["Meio-Pesado", 65], ["Pesado", 69], ["Super-Pesado", null]]),
];

