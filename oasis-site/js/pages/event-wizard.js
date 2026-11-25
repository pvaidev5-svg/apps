// Novo evento passo a passo (#/painel/eventos/novo).
// A primeira etapa escolhe o tipo (jiu-jitsu, taekwondo, esporte coletivo, festival,
// institucional) e as etapas seguintes mostram só o que vale para aquele tipo.

import { route, go } from "../core/router.js";
import { db } from "../data/db.js";
import { getSettings, invalidateSettings } from "../core/session.js";
import { html, raw, flash, str, int } from "../core/ui.js";
import * as C from "./components.js";
import * as S from "../logic/services.js";
import { BJJ_LABELS, TKD_LABELS } from "../logic/scoring.js";
import { divisionCategories, weightClassesFor, weightText } from "../logic/divisions.js";
import { adminLayout, handleImage } from "./admin.js";
import { bindForm } from "./helpers.js";

const TYPES = {
  jiu_jitsu: { title: "Campeonato de jiu-jitsu", text: "Lutas por divisão de idade, sexo e peso. Pontos, vantagens e finalização.", group: "luta" },
  taekwondo: { title: "Campeonato de taekwondo", text: "Lutas por divisão de idade, sexo e peso. Rounds, golden point e gam-jeom.", group: "luta" },
  futebol: { title: "Torneio de futebol", text: "Times por divisão de idade. Eliminatória ou grupos.", group: "coletivo" },
  futsal: { title: "Torneio de futsal", text: "Times por divisão de idade. Eliminatória ou grupos.", group: "coletivo" },
  basquete: { title: "Torneio de basquete", text: "Times por divisão de idade. Sem empate.", group: "coletivo" },
  volei: { title: "Torneio de vôlei", text: "Times por divisão de idade. Jogos em sets.", group: "coletivo" },
  festival: { title: "Festival de música e dança", text: "Apresentações no palco: abertura, intervalo e encerramento.", group: "arte" },
  institucional: { title: "Evento institucional", text: "Reunião, encontro de famílias, palestra. Só data, local e descrição.", group: "institucional" },
};
const ADAPTED = { jiu_jitsu: "para_jiu_jitsu", taekwondo: "para_taekwondo" };
const MINUTES = { jiu_jitsu: 5, taekwondo: 6, futebol: 40, futsal: 30, basquete: 32, volei: 45 };
const STEP_TITLES = { tipo: "Tipo de evento", info: "Informações", categorias: "Categorias", apresentacoes: "Apresentações", publicacao: "Inscrições e publicação", revisao: "Revisão" };

function stepsFor(type, withShows) {
  const g = TYPES[type]?.group;
  if (g === "luta" || g === "coletivo") return ["tipo", "info", "categorias", ...(withShows ? ["apresentacoes"] : []), "publicacao", "revisao"];
  if (g === "arte") return ["tipo", "info", "apresentacoes", "publicacao", "revisao"];
  if (g === "institucional") return ["tipo", "info", "publicacao", "revisao"];
  return ["tipo", "info", "publicacao", "revisao"];
}

const ADMIN = { auth: "admin" };

route("/painel/eventos/novo", async () => {
  const { general, scoring } = await getSettings();
  const typeCard = ([k, t]) => html`<label class="type-card"><input type="radio" name="type" value="${k}"><span class="tc-title">${t.title}</span><span class="tc-text">${t.text}</span></label>`;
  const body = html`<p><a href="#/painel/eventos">← Eventos</a></p><h1>Novo evento</h1>
    <ol class="wizard-steps" id="wz-steps" aria-label="Etapas"></ol>
    <form id="wizard" novalidate>
      <div id="wz-error" role="alert"></div>

      <section data-step="tipo" aria-labelledby="h-tipo"><h2 id="h-tipo" tabindex="-1">1. Que tipo de evento é?</h2>
        <fieldset class="type-grid"><legend class="visually-hidden">Tipo de evento</legend>
          <p class="type-group">Lutas</p>${Object.entries(TYPES).filter(([, t]) => t.group === "luta").map(typeCard)}
          <p class="type-group">Esportes coletivos</p>${Object.entries(TYPES).filter(([, t]) => t.group === "coletivo").map(typeCard)}
          <p class="type-group">Outros</p>${Object.entries(TYPES).filter(([, t]) => ["arte", "institucional"].includes(t.group)).map(typeCard)}
        </fieldset>
        <div id="wz-shows" hidden>${C.checkbox("withShows", "Este campeonato também terá apresentações culturais (abertura, intervalo ou encerramento)", false)}</div>
        <p class="hint">Quer juntar modalidades diferentes no mesmo evento? Crie com a principal; na página do evento dá para acrescentar categorias de outras modalidades.</p>
      </section>

      <section data-step="info" aria-labelledby="h-info" hidden><h2 id="h-info" tabindex="-1">Informações do evento</h2>
        ${C.field("name", "Nome do evento", { required: true, id: "wz_name" })}
        <div class="row">${C.field("startsOn", "Data de início", { type: "date", required: true, id: "wz_start" })}${C.field("endsOn", "Data de fim", { type: "date", id: "wz_end", hint: "Deixe em branco se for um dia só." })}
          ${C.field("timeLabel", "Horário", { id: "wz_time", hint: "Ex.: 8h às 17h" })}</div>
        ${C.field("location", "Local", { id: "wz_loc", hint: "Ex.: Ginásio Municipal de Pompéia" })}
        ${C.textarea("description", "Descrição para o público", { id: "wz_desc", rows: 4 })}
        <fieldset><legend>Imagem de capa (opcional)</legend>
          <div class="field"><label for="wz_image">Enviar imagem</label><input type="file" id="wz_image" name="image_file" accept="image/*"></div>
          ${C.field("imageAlt", "Descrição da imagem (para leitores de tela)", { id: "wz_alt", hint: "Obrigatória se enviar imagem. Ex.: Crianças de quimono se cumprimentando no tatame." })}</fieldset>
      </section>

      <section data-step="categorias" aria-labelledby="h-cat" hidden><h2 id="h-cat" tabindex="-1">Categorias</h2>
        <div id="cat-intro"></div>
        <fieldset><legend>Divisões por idade</legend>
          <p class="hint">Marque as divisões que vão competir. A idade usada é a ${general.ageReference === "ano" ? "que a criança completa no ano do evento" : "do dia do evento"}.</p>
          <div class="checks">${general.ageBands.map((b, i) => C.checkbox(`div_${i}`, `${b.name} (${b.min}–${b.max} anos)`, false))}</div>
          <p><button type="button" class="btn small secondary" id="wz-all">Marcar todas</button></p></fieldset>
        <div class="row">${C.select("gender", "Sexo", {}, "", { id: "wz_gender" })}
          ${C.field("matchMinutes", "Tempo reservado para cada luta/partida (min)", { type: "number", id: "wz_minutes", attrs: 'min="1" max="180"', hint: "Usado na agenda e no aviso de conflito de horário." })}</div>
        <div id="wz-format">
          ${C.select("format", "Formato da chave", { eliminatoria: "Eliminatória simples (mata-mata)", grupos: "Fase de grupos + mata-mata" }, "eliminatoria", { id: "wz_format" })}
          <div class="row" id="wz-groups" hidden>${C.field("groupCount", "Número de grupos", { type: "number", value: 2, id: "wz_gc", attrs: 'min="2" max="8"' })}
            ${C.field("qualifiers", "Classificados por grupo", { type: "number", value: 2, id: "wz_q", attrs: 'min="1" max="4"' })}</div></div>
        <div id="wz-adapted"></div>
        <div id="wz-weights" aria-live="polite"></div>
        <details class="card" id="wz-rules"><summary>Regras de pontuação que serão usadas</summary><div id="wz-rules-body"></div>
          <p><a href="#/painel/regras" target="_blank" rel="noopener">Editar pontuação e tabela de peso (abre em nova aba)</a>
          <button type="button" class="btn small secondary" id="wz-reload">Atualizar depois de editar</button></p></details>
      </section>

      <section data-step="apresentacoes" aria-labelledby="h-ap" hidden><h2 id="h-ap" tabindex="-1">Apresentações</h2>
        <p class="hint">Cadastre as apresentações que já estão definidas. Integrantes, trilha sonora e ficha técnica são adicionados depois, na página de cada apresentação. Pode deixar em branco e cadastrar mais tarde.</p>
        <div id="wz-shows-list"></div>
        <p><button type="button" class="btn secondary" id="wz-add-show">+ Adicionar apresentação</button></p>
      </section>

      <section data-step="publicacao" aria-labelledby="h-pub" hidden><h2 id="h-pub" tabindex="-1">Inscrições e publicação</h2>
        <div id="wz-reg">${C.checkbox("registrationsOpen", "Inscrições abertas: os alunos já podem se inscrever pela área do inscrito", true)}</div>
        ${C.checkbox("published", "Publicar no site agora (aparece em Eventos e na agenda pública)", true)}
        <p class="hint">Desmarcado, o evento fica como rascunho e só a coordenação vê.</p>
        <fieldset><legend>Libras</legend>
          <div id="wz-libras-auto">${C.checkbox("librasAuto", "Gerar a explicação de cada categoria em Libras (avatar VLibras), a partir das regras escolhidas", true)}</div>
          ${C.field("librasVideoUrl", "Vídeo de apresentação do evento em Libras (URL, opcional)", { type: "url", id: "wz_libras", hint: "Vídeo gravado por intérprete. Links do YouTube aparecem dentro da página." })}</fieldset>
      </section>

      <section data-step="revisao" aria-labelledby="h-rev" hidden><h2 id="h-rev" tabindex="-1">Revisão</h2>
        <p>Confira antes de criar. Para mudar algo, use <strong>Voltar</strong>.</p><div id="wz-review"></div>
      </section>

      <div class="wizard-nav">
        <button type="button" class="btn secondary" id="wz-back">← Voltar</button>
        <button type="button" class="btn" id="wz-next">Próximo →</button>
        <button type="submit" class="btn" id="wz-create" hidden>Criar evento</button>
      </div>
    </form>`;

  return { title: "Novo evento", body: adminLayout("/painel/eventos", body), after(root) { wizard(root, { general, scoring }); } };
}, ADMIN);

function wizard(root, settings) {
  const form = root.querySelector("#wizard");
  const $ = (s) => root.querySelector(s);
  const val = (n) => form.elements[n]?.value ?? "";
  const checked = (n) => !!form.elements[n]?.checked;
  let step = "tipo", shows = 0;

  const type = () => form.querySelector("input[name=type]:checked")?.value || "";
  const group = () => TYPES[type()]?.group;
  const steps = () => stepsFor(type(), checked("withShows"));
  const divisions = () => settings.general.ageBands.filter((_, i) => checked(`div_${i}`));
  const genders = () => (val("gender") === "ambos" ? ["feminino", "masculino"] : [val("gender") || "misto"]);

  function renderSteps() {
    const list = steps();
    $("#wz-steps").innerHTML = list.map((s, i) => html`<li ${raw(s === step ? 'aria-current="step"' : "")} class="${list.indexOf(step) > i ? "done" : ""}">
      <span class="ws-n" aria-hidden="true">${list.indexOf(step) > i ? "✓" : i + 1}</span> ${STEP_TITLES[s]}${list.indexOf(step) > i ? raw('<span class="visually-hidden"> (concluída)</span>') : ""}</li>`.s).join("");
    form.querySelectorAll("section[data-step]").forEach((sec) => { sec.hidden = sec.dataset.step !== step; });
    const last = list.indexOf(step) === list.length - 1;
    $("#wz-back").hidden = step === "tipo";
    $("#wz-next").hidden = last;
    $("#wz-create").hidden = !last;
  }

  // ----- etapa de categorias: muda conforme a modalidade
  function setupCategories() {
    const t = type(), g = group();
    if (g !== "luta" && g !== "coletivo") return;
    const mod = S.MOD[t];
    $("#cat-intro").innerHTML = (g === "luta"
      ? html`<p>Em ${mod.name.toLowerCase()} as lutas são separadas por <strong>divisão de idade, sexo e peso</strong>. Para cada divisão e sexo, o sistema cria uma categoria para cada peso da tabela.</p>`
      : html`<p>No ${mod.name.toLowerCase()} os times são separados por <strong>divisão de idade</strong> e, se quiser, por sexo. Os times são montados depois, em <strong>Equipes</strong>.</p>`).s;
    const gSel = $("#wz_gender"), prev = gSel.value;
    const opts = g === "luta" ? { ambos: "Feminino e masculino (separados)", feminino: "Só feminino", masculino: "Só masculino" }
      : { misto: "Misto (meninas e meninos juntos)", ambos: "Feminino e masculino (separados)", feminino: "Só feminino", masculino: "Só masculino" };
    gSel.innerHTML = Object.entries(opts).map(([k, v]) => html`<option value="${k}">${v}</option>`.s).join("");
    if (opts[prev]) gSel.value = prev;
    if (!$("#wz_minutes").dataset.touched) $("#wz_minutes").value = MINUTES[t] || 10;
    $("#wz-format").hidden = g === "luta"; // luta é sempre eliminatória
    $("#wz-adapted").innerHTML = ADAPTED[t] ? html`<fieldset><legend>Categorias adaptadas</legend>
      ${C.checkbox("withAdapted", `Criar também categorias de ${S.MOD[ADAPTED[t]].name.toLowerCase()} (atletas com deficiência)`, false)}
      ${C.select("adaptedWeights", "Peso nas adaptadas", { sem: "Sem divisão de peso (uma categoria por divisão e sexo)", tabela: "Usar a mesma tabela de peso" }, "sem", { id: "wz_adw" })}
      <p class="hint">Com poucos atletas por categoria, costuma funcionar melhor sem divisão de peso.</p></fieldset>`.s : "";
    renderRules();
    renderWeights();
  }

  function renderRules() {
    const t = type(), sc = settings.scoring;
    let body = "";
    if (t === "jiu_jitsu") {
      body = html`<ul>${Object.entries(sc.bjj.points).map(([k, v]) => html`<li>${BJJ_LABELS[k]}: ${v} ponto${v > 1 ? "s" : ""}</li>`)}</ul>
        <p>Finalização encerra a luta na hora. Empate em pontos: vence quem tem mais vantagens; depois, quem tem menos punições. Repetir uma posição já pontuada não pontua de novo.</p>`.s;
    } else if (t === "taekwondo") {
      const k = sc.taekwondo;
      body = html`<ul>${Object.entries(k.points).map(([p, v]) => html`<li>${TKD_LABELS[p]}: ${v} ponto${v > 1 ? "s" : ""}</li>`)}
        <li>Gam-jeom (falta): +${k.gamjeom_points} para o adversário; ${k.max_gamjeom} gam-jeons desclassificam</li>
        <li>${k.mode === "melhor_de_3" ? `Melhor de 3 rounds` : `${k.rounds} rounds com pontos somados; empate vai para o golden point`}</li>
        ${k.point_gap ? html`<li>Diferença de ${k.point_gap} pontos encerra a luta</li>` : ""}</ul>`.s;
    } else if (S.MOD[t]) {
      const r = sc.team[t];
      body = html`<ul><li>Vitória: ${r.win} ponto(s) na tabela${r.allow_draw ? `; empate: ${r.draw}` : "; não há empate"}</li>
        ${t === "volei" ? html`<li>Melhor de ${r.best_of} sets de ${r.set_points} pontos (tie-break de ${r.tiebreak_points}), vantagem mínima de ${r.min_lead}</li>` : ""}</ul>`.s;
    }
    $("#wz-rules-body").innerHTML = body;
  }

  function renderWeights() {
    if (group() !== "luta") { $("#wz-weights").innerHTML = ""; return; }
    const dv = divisions(), gs = genders();
    if (!dv.length) { $("#wz-weights").innerHTML = ""; return; }
    const rows = [], missing = [];
    for (const d of dv) for (const g of gs) {
      const cl = weightClassesFor(settings.general.weightTable, type(), d.name, g);
      if (!cl.length) missing.push(`${d.name} ${S.GENDERS[g]}`);
      rows.push(html`<tr><th scope="row">${d.name} ${S.GENDERS[g]}</th><td>${cl.length ? cl.map((c) => `${c.name} (${weightText(c.min, c.max)})`).join(" · ") : raw('<span class="warn-text">sem tabela de peso: será criada uma categoria só, sem peso</span>')}</td></tr>`);
    }
    $("#wz-weights").innerHTML = html`<h3>Pesos de cada divisão</h3>
      ${missing.length ? html`<p class="flash warning">Faltam os pesos de: ${missing.join(", ")}. Você pode criar assim mesmo (uma categoria sem peso) ou cadastrar a tabela em <a href="#/painel/regras" target="_blank" rel="noopener">Pontuação e regras (nova aba)</a> e clicar em "Atualizar".</p>` : ""}
      <div class="table-wrap"><table><thead><tr><th scope="col">Divisão</th><th scope="col">Categorias de peso</th></tr></thead><tbody>${rows}</tbody></table></div>`.s;
  }

  // ----- apresentações (linhas dinâmicas)
  function addShow() {
    const i = shows++;
    const div = document.createElement("div");
    div.className = "card show-row";
    div.innerHTML = html`<fieldset><legend>Apresentação ${i + 1}</legend>
      <div class="row">${C.field(`s${i}_title`, "Título", { id: `s${i}_title` })}${C.select(`s${i}_modality`, "Modalidade", { danca: "Dança", musica: "Música" }, "danca", { id: `s${i}_mod` })}
        ${C.select(`s${i}_slot`, "Momento", S.SLOTS, i === 0 ? "abertura" : "intervalo", { id: `s${i}_slot` })}</div>
      <div class="row">${C.field(`s${i}_time`, "Horário", { type: "time", id: `s${i}_time` })}${C.field(`s${i}_dur`, "Duração (min)", { type: "number", value: 5, id: `s${i}_dur`, attrs: 'min="1"' })}</div>
      <div class="checks">${C.checkbox(`s${i}_libras`, "Intérprete de Libras no palco", false)}${C.checkbox(`s${i}_ad`, "Audiodescrição", false)}${C.checkbox(`s${i}_seat`, "Espaço acessível na plateia", false)}</div>
      <button type="button" class="btn small secondary" data-remove-show>Remover esta apresentação</button></fieldset>`.s;
    div.querySelector("[data-remove-show]").addEventListener("click", () => { div.remove(); $("#wz-add-show").focus(); });
    $("#wz-shows-list").append(div);
    div.querySelector("input").focus();
  }
  const showRows = () => [...form.querySelectorAll(".show-row")].map((row) => {
    const i = row.querySelector("[name$=_title]").name.split("_")[0];
    return { title: str(val(`${i}_title`), 150), modality: val(`${i}_modality`), slot: val(`${i}_slot`), time: val(`${i}_time`), durationMin: int(val(`${i}_dur`), 5),
      accLibras: checked(`${i}_libras`), accAudiodesc: checked(`${i}_ad`), accSeating: checked(`${i}_seat`) };
  });

  // ----- categorias que serão criadas
  function plannedCategories() {
    const t = type();
    if (!["luta", "coletivo"].includes(group())) return { cats: [], missing: [] };
    const dv = divisions(), gs = genders();
    const main = divisionCategories({ modality: t, divisions: dv, genders: gs, table: settings.general.weightTable });
    let cats = main.cats.map((c) => ({ ...c }));
    if (ADAPTED[t] && checked("withAdapted")) {
      const ad = divisionCategories({ modality: ADAPTED[t], divisions: dv, genders: gs, table: val("adaptedWeights") === "tabela" ? settings.general.weightTable : [] });
      cats = cats.concat(ad.cats);
    }
    return { cats, missing: main.missing };
  }

  // ----- validação de cada etapa
  function problems(s) {
    if (s === "tipo" && !type()) return [["Escolha o tipo de evento.", "input[name=type]"]];
    if (s === "info") {
      const out = [];
      if (!str(val("name"))) out.push(["Informe o nome do evento.", "#wz_name"]);
      if (!val("startsOn")) out.push(["Informe a data de início.", "#wz_start"]);
      if (val("endsOn") && val("startsOn") && val("endsOn") < val("startsOn")) out.push(["A data de fim é antes do início.", "#wz_end"]);
      if ($("#wz_image").files?.length && !str(val("imageAlt"))) out.push(["Descreva a imagem de capa para quem usa leitor de tela.", "#wz_alt"]);
      return out;
    }
    if (s === "categorias") {
      const out = [];
      if (!divisions().length) out.push(["Marque ao menos uma divisão por idade.", "input[name=div_0]"]);
      const m = int(val("matchMinutes"));
      if (!(m >= 1 && m <= 180)) out.push(["Informe o tempo de cada luta/partida (1 a 180 minutos).", "#wz_minutes"]);
      if (group() === "coletivo" && val("format") === "grupos") {
        const gc = int(val("groupCount")), q = int(val("qualifiers"));
        if (!(gc >= 2 && gc <= 8)) out.push(["Número de grupos: de 2 a 8.", "#wz_gc"]);
        if (!(q >= 1 && q <= 4) || ((gc * q) & (gc * q - 1)) !== 0) out.push(["Grupos × classificados precisa dar 2, 4, 8 ou 16 times no mata-mata.", "#wz_q"]);
      }
      return out;
    }
    if (s === "apresentacoes") {
      const rows = showRows();
      const i = rows.findIndex((r) => !r.title);
      if (i >= 0) return [[`Dê um título para a apresentação ${i + 1} ou remova ela.`, `.show-row:nth-of-type(${i + 1}) input`]];
    }
    return [];
  }

  function showProblems(list) {
    $("#wz-error").innerHTML = list.length ? html`<div class="flash error"><strong>Antes de continuar:</strong><ul>${list.map(([m]) => html`<li>${m}</li>`)}</ul></div>`.s : "";
    if (list.length) form.querySelector(list[0][1])?.focus();
  }

  function goStep(s) {
    step = s;
    showProblems([]);
    if (s === "categorias") setupCategories();
    if (s === "revisao") renderReview();
    if (s === "publicacao") {
      const sport = ["luta", "coletivo"].includes(group());
      $("#wz-reg").hidden = !sport; $("#wz-libras-auto").hidden = !sport;
    }
    renderSteps();
    form.querySelector(`section[data-step="${s}"] h2`).focus();
    window.scrollTo({ top: 0 });
  }

  function next() {
    const p = problems(step);
    if (p.length) return showProblems(p);
    const list = steps();
    goStep(list[list.indexOf(step) + 1]);
  }

  function renderReview() {
    const t = type(), { cats, missing } = plannedCategories(), rows = showRows();
    const dates = val("endsOn") && val("endsOn") !== val("startsOn") ? `${C_date(val("startsOn"))} a ${C_date(val("endsOn"))}` : C_date(val("startsOn"));
    $("#wz-review").innerHTML = html`<dl class="review">
      <dt>Tipo</dt><dd>${TYPES[t].title}${checked("withShows") && group() !== "arte" ? " + apresentações culturais" : ""}</dd>
      <dt>Nome</dt><dd>${val("name")}</dd><dt>Data</dt><dd>${dates}${val("timeLabel") ? ` · ${val("timeLabel")}` : ""}</dd>
      ${val("location") ? html`<dt>Local</dt><dd>${val("location")}</dd>` : ""}
      <dt>Situação</dt><dd>${checked("published") ? "Publicado no site" : "Rascunho (só a coordenação vê)"}${["luta", "coletivo"].includes(group()) ? (checked("registrationsOpen") ? " · inscrições abertas" : " · inscrições fechadas") : ""}</dd></dl>
      ${cats.length ? html`<h3>${cats.length > 1 ? `${cats.length} categorias que serão criadas` : "1 categoria que será criada"}</h3>
        ${missing.length ? html`<p class="flash warning">Sem tabela de peso (categoria única, sem peso): ${missing.join(", ")}.</p>` : ""}
        <details ${raw(cats.length <= 12 ? "open" : "")}><summary>Ver a lista</summary><ul class="cat-list">${cats.map((c) => html`<li>${c.name}</li>`)}</ul></details>
        <p class="hint">Tempo por ${group() === "luta" ? "luta" : "partida"}: ${val("matchMinutes")} min${group() === "coletivo" ? ` · ${val("format") === "grupos" ? `${val("groupCount")} grupos, ${val("qualifiers")} classificados por grupo` : "eliminatória simples"}` : " · eliminatória simples"}</p>` : ""}
      ${steps().includes("apresentacoes") ? html`<h3>Apresentações</h3>${rows.length ? html`<ul>${rows.map((r) => html`<li>${r.title} — ${S.SLOTS[r.slot]}${r.time ? ` às ${r.time}` : ""} (${r.modality === "musica" ? "música" : "dança"})</li>`)}</ul>` : html`<p class="muted">Nenhuma por enquanto.</p>`}` : ""}`.s;
  }
  const C_date = (iso) => iso ? iso.split("-").reverse().join("/") : "";

  // ----- eventos da tela
  form.addEventListener("change", (e) => {
    if ($("#wz-error").innerHTML && !problems(step).length) showProblems([]); // some o aviso quando o problema foi resolvido
    if (e.target.name === "type") {
      $("#wz-shows").hidden = !["luta", "coletivo"].includes(group());
      const name = $("#wz_name");
      if (!name.value || name.dataset.auto) { name.value = `${TYPES[type()].title} ${new Date().getFullYear()}`; name.dataset.auto = "1"; }
      renderSteps();
    }
    if (e.target.name === "withShows") renderSteps();
    if (e.target.id === "wz_name") delete e.target.dataset.auto;
    if (e.target.id === "wz_minutes") e.target.dataset.touched = "1";
    if (e.target.id === "wz_format") $("#wz-groups").hidden = e.target.value !== "grupos";
    if (step === "categorias" && (e.target.name?.startsWith("div_") || e.target.id === "wz_gender")) renderWeights();
  });
  $("#wz-all").addEventListener("click", () => { form.querySelectorAll("[name^=div_]").forEach((c) => { c.checked = true; }); renderWeights(); });
  $("#wz-reload").addEventListener("click", async () => {
    invalidateSettings();
    const s = await getSettings(); settings.general = s.general; settings.scoring = s.scoring;
    renderRules(); renderWeights();
    flash("Regras e tabela de peso atualizadas.", "success");
  });
  $("#wz-add-show").addEventListener("click", addShow);
  $("#wz-next").addEventListener("click", next);
  $("#wz-back").addEventListener("click", () => { const l = steps(); goStep(l[Math.max(0, l.indexOf(step) - 1)]); });

  bindForm(root, "#wizard", async (d) => {
    if (step !== "revisao") return next(); // Enter num campo: só avança
    for (const s of steps()) { const p = problems(s); if (p.length) { goStep(s); return showProblems(p); } }
    const t = type(), g = group(), withShows = g === "arte" || checked("withShows");
    const kind = g === "arte" ? "festival" : g === "institucional" ? "institucional" : withShows ? "misto" : "campeonato";
    const startsOn = d.startsOn;
    const image = await handleImage(form, d, null);
    const evId = await db.add("events", { name: str(d.name, 150), kind, modality: S.MOD[t] ? t : null, startsOn, endsOn: d.endsOn || startsOn,
      timeLabel: str(d.timeLabel, 30), location: str(d.location, 200), description: str(d.description, 3000), librasVideoUrl: str(d.librasVideoUrl, 300),
      published: !!d.published, registrationsOpen: ["luta", "coletivo"].includes(g) ? !!d.registrationsOpen : false, ...image });
    const { cats } = plannedCategories();
    const common = { eventId: evId, format: g === "coletivo" && d.format === "grupos" ? "grupos" : "eliminatoria", groupCount: int(d.groupCount, 2),
      qualifiers: int(d.qualifiers, 2), matchMinutes: int(d.matchMinutes, 10), librasAuto: !!d.librasAuto, librasVideoUrl: "", status: "inscricoes" };
    for (const c of cats) await db.add("categories", { ...common, ...c });
    let order = { abertura: 0, intervalo: 0, encerramento: 0 };
    for (const r of withShows ? showRows() : []) {
      await db.add("performances", { eventId: evId, title: r.title, modality: r.modality === "musica" ? "musica" : "danca", slot: S.SLOTS[r.slot] ? r.slot : "intervalo",
        order: ++order[r.slot], durationMin: r.durationMin, scheduledAt: r.time ? `${startsOn}T${r.time}` : null, soundtrack: "", equipment: "", notes: "", teacherId: null,
        accLibras: r.accLibras, accAudiodesc: r.accAudiodesc, accSeating: r.accSeating, accNotes: "", librasVideoUrl: "", members: [] });
    }
    flash(`Evento criado${cats.length ? ` com ${cats.length} categoria${cats.length > 1 ? "s" : ""}` : ""}.`, "success");
    go(`/painel/eventos/${evId}`);
  });

  renderSteps();
}
