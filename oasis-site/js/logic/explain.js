// Explicação automática de uma categoria, montada a partir das características
// escolhidas (modalidade, idade, sexo, peso, formato, duração) e das regras de
// pontuação vigentes. Frases curtas e diretas: facilitam a tradução para Libras
// pelo avatar VLibras e servem de roteiro para um intérprete humano gravar o vídeo.

import { MOD } from "./services.js";
import { TKD_LABELS, BJJ_LABELS } from "./scoring.js";
import { weightText } from "./divisions.js";

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

export function explainCategory(cat, ev, { scoring, general }) {
  const mod = MOD[cat.modality];
  const engine = mod.scoring;
  const team = mod.kind === "coletivo";
  const year = (ev?.startsOn || "").slice(0, 4);
  const who = team ? "as equipes" : "os atletas";
  const p = [];

  // Quem pode participar
  const quem = [`Esta é a categoria ${cat.name}.`, `A modalidade é ${mod.name}.`];
  if (mod.adaptedOf) quem.push(`É uma modalidade adaptada, para pessoas com deficiência.`);
  if (cat.division) quem.push(`A divisão de idade é ${cat.division}.`);
  quem.push(general.ageReference === "ano"
    ? `Podem participar crianças e adolescentes que fazem de ${cat.ageMin} a ${cat.ageMax} anos em ${year || "o ano do evento"}.`
    : `Podem participar crianças e adolescentes de ${cat.ageMin} a ${cat.ageMax} anos na data do evento.`);
  quem.push(cat.gender === "misto" ? "Meninas e meninos participam juntos." : cat.gender === "feminino" ? "Categoria feminina: só meninas." : "Categoria masculina: só meninos.");
  if (cat.weightMin != null || cat.weightMax != null) {
    const faixa = weightText(cat.weightMinExclusive ? cat.weightMin : null, cat.weightMax);
    if (cat.weightClass) quem.push(`A categoria de peso é ${cat.weightClass}: ${faixa.replace("kg", "quilos")}${cat.weightMax == null ? ", sem limite de peso" : ""}.`);
    else quem.push(cat.weightMin != null && cat.weightMax != null ? `O peso precisa estar entre ${cat.weightMin} e ${cat.weightMax} quilos.`
      : cat.weightMin != null ? `O peso mínimo é ${cat.weightMin} quilos.` : `O peso máximo é ${cat.weightMax} quilos.`);
  }
  p.push({ title: "Quem participa", text: quem.join(" ") });

  // Como funciona a chave
  const fmt = [];
  if (cat.format === "grupos") {
    fmt.push(`Primeiro, ${who} ficam em ${plural(cat.groupCount || 2, "grupo", "grupos")}.`);
    fmt.push("No grupo, todos enfrentam todos.");
    fmt.push(`${(cat.qualifiers || 2) === 1 ? "O melhor" : `Os ${cat.qualifiers || 2} melhores`} de cada grupo ${(cat.qualifiers || 2) === 1 ? "passa" : "passam"} para o mata-mata.`);
    fmt.push("No mata-mata, quem vence continua e quem perde sai. A final decide o campeão.");
  } else {
    fmt.push("A chave é eliminatória: quem vence continua, quem perde sai.");
    fmt.push("Se o número de inscritos não fechar a chave, alguns passam direto para a fase seguinte.");
    fmt.push("A final decide o campeão.");
  }
  fmt.push(`Cada ${team ? "partida" : "luta"} dura ${plural(cat.matchMinutes || 10, "minuto", "minutos")}.`);
  p.push({ title: "Como funciona a chave", text: fmt.join(" ") });

  // Como se ganha (regras vigentes)
  const r = [];
  if (engine === "bjj") {
    const pts = scoring.bjj.points;
    r.push("Ganha pontos quem faz:");
    r.push(Object.entries(pts).map(([k, v]) => `${BJJ_LABELS[k].toLowerCase()}, ${plural(v, "ponto", "pontos")}`).join("; ") + ".");
    r.push("A finalização termina a luta na hora e dá a vitória, mesmo para quem está perdendo nos pontos.");
    r.push("Repetir a mesma posição sem perder o domínio não dá pontos de novo.");
    r.push("Se empatar nos pontos, ganha quem tiver mais vantagens. Se empatar de novo, ganha quem tiver menos penalidades. Se ainda empatar, o árbitro decide.");
  } else if (engine === "taekwondo") {
    const t = scoring.taekwondo;
    r.push("Ganha pontos quem acerta o colete ou a cabeça com golpe válido:");
    r.push(Object.entries(t.points).map(([k, v]) => `${TKD_LABELS[k].toLowerCase()}, ${plural(v, "ponto", "pontos")}`).join("; ") + ".");
    r.push("Soco na cabeça é proibido: não vale ponto e é falta.");
    r.push(`Cada falta, chamada gam-jeom, dá ${plural(t.gamjeom_points, "ponto", "pontos")} para o adversário.`);
    if (t.mode === "melhor_de_3") {
      r.push("A luta tem 3 rounds. Ganha cada round quem fizer mais pontos nele. Vence a luta quem ganhar 2 rounds.");
    } else {
      r.push(`A luta tem ${plural(t.rounds, "round", "rounds")} e os pontos são somados.`);
      r.push(`Se terminar empatada, tem um round extra, o golden point: vence quem fizer ${plural(t.golden_point_target, "ponto", "pontos")} primeiro.`);
    }
    if (t.point_gap) r.push(`Se a diferença chegar a ${t.point_gap} pontos, a luta acaba.`);
    if (t.max_gamjeom) r.push(`Quem fizer ${t.max_gamjeom} faltas perde a luta.`);
  } else if (engine === "futebol" || engine === "futsal") {
    const c = scoring.team[engine];
    r.push("Vence quem fizer mais gols.");
    if (cat.format === "grupos") r.push(`Nos grupos, vitória vale ${plural(c.win, "ponto", "pontos")} e empate vale ${plural(c.draw, "ponto", "pontos")}.`);
    r.push("No mata-mata não pode empatar: se empatar, a decisão é nos pênaltis.");
  } else if (engine === "basquete") {
    const c = scoring.team.basquete;
    r.push("Cada cesta vale 1, 2 ou 3 pontos. Vence quem fizer mais pontos.");
    r.push("Não existe empate: se empatar, tem prorrogação.");
    if (cat.format === "grupos") r.push(`Nos grupos, vitória vale ${plural(c.win, "ponto", "pontos")} e derrota vale ${plural(c.loss, "ponto", "pontos")}.`);
  } else if (engine === "volei") {
    const c = scoring.team.volei;
    r.push(`A partida é em melhor de ${c.best_of} sets: vence quem ganhar ${Math.floor(c.best_of / 2) + 1} sets.`);
    r.push(`Cada set vai até ${c.set_points} pontos, com 2 pontos de diferença. O último set, se precisar, vai até ${c.tiebreak_points}.`);
  }
  p.push({ title: team ? "Como se ganha a partida" : "Como se ganha a luta", text: r.join(" ") });

  // Inscrição e convivência
  p.push({ title: "Inscrição", text: team
    ? "A inscrição é feita pela equipe, com o professor responsável. Fale com seu professor."
    : "A inscrição é feita pela Área do aluno, com acompanhamento do responsável. A organização confirma a inscrição." });
  p.push({ title: "Respeito", text: "Respeite o adversário, o árbitro e a equipe de apoio. Em caso de dúvida, procure a organização do evento." });
  return { title: `Como funciona: ${cat.name}`, sections: p };
}

export function explanationText(ex) {
  return `${ex.title}\n\n` + ex.sections.map((s) => `${s.title}\n${s.text}`).join("\n\n");
}
