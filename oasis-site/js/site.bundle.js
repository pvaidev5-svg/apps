(() => {
  var __defProp = Object.defineProperty;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };

  // js/data/local.js
  var local_exports = {};
  __export(local_exports, {
    add: () => add,
    adminSetPassword: () => adminSetPassword,
    authCurrent: () => authCurrent,
    authOnChange: () => authOnChange,
    changePassword: () => changePassword,
    checkPassword: () => checkPassword,
    deleteMe: () => deleteMe,
    disableLogin: () => disableLogin,
    exportAll: () => exportAll,
    get: () => get,
    importAll: () => importAll,
    init: () => init,
    list: () => list,
    mode: () => mode,
    remove: () => remove,
    sendPasswordReset: () => sendPasswordReset,
    set: () => set,
    signIn: () => signIn,
    signOut: () => signOut,
    signUp: () => signUp,
    storageUsage: () => storageUsage,
    update: () => update
  });

  // js/logic/divisions-data.js
  var DIVISIONS_DEFAULT = [
    { name: "Pr\xE9-Mirim", min: 4, max: 5 },
    { name: "Mirim", min: 6, max: 7 },
    { name: "Infantil A", min: 8, max: 9 },
    { name: "Infantil B", min: 10, max: 11 },
    { name: "Infanto-Juvenil A", min: 12, max: 13 },
    { name: "Infanto-Juvenil B", min: 14, max: 15 },
    { name: "Juvenil", min: 16, max: 17 }
  ];
  var row = (division, gender, list3) => list3.map(([name, max]) => ({ modality: "jiu_jitsu", division, gender, name, max }));
  var WEIGHT_TABLE_DEFAULT = [
    ...row("Juvenil", "masculino", [
      ["Galo", 53.5],
      ["Pluma", 58.5],
      ["Pena", 64],
      ["Leve", 69],
      ["M\xE9dio", 74],
      ["Meio-Pesado", 79.3],
      ["Pesado", 84.3],
      ["Super-Pesado", 89.3],
      ["Pesad\xEDssimo", null]
    ]),
    ...row("Juvenil", "feminino", [
      ["Galo", 44.3],
      ["Pluma", 48.3],
      ["Pena", 52.5],
      ["Leve", 56.5],
      ["M\xE9dio", 60.5],
      ["Meio-Pesado", 65],
      ["Pesado", 69],
      ["Super-Pesado", null]
    ])
  ];

  // js/logic/scoring.js
  var BJJ_DEFAULTS = {
    points: { takedown: 2, sweep: 2, knee_on_belly: 2, guard_pass: 3, mount: 4, back_control: 4 }
  };
  var TKD_DEFAULTS = {
    points: { punch_trunk: 1, kick_trunk: 2, kick_head: 3, spin_kick_trunk: 4, spin_kick_head: 5 },
    // 5 ou 6: decisão do cliente
    gamjeom_points: 1,
    mode: "cumulativo",
    // "cumulativo" (soma + golden point) | "melhor_de_3"
    rounds: 3,
    max_gamjeom: 10,
    point_gap: 20,
    golden_point_target: 2
  };
  var TEAM_DEFAULTS = {
    futebol: { win: 3, draw: 1, loss: 0, allow_draw: true },
    futsal: { win: 3, draw: 1, loss: 0, allow_draw: true },
    basquete: { win: 2, draw: 0, loss: 1, allow_draw: false },
    volei: { win: 3, draw: 0, loss: 0, allow_draw: false, best_of: 3, set_points: 25, tiebreak_points: 15, min_lead: 2 }
  };
  var BJJ_LABELS = {
    takedown: "Queda",
    sweep: "Raspagem",
    knee_on_belly: "Joelho na barriga",
    guard_pass: "Passagem de guarda",
    mount: "Montada",
    back_control: "Pegada pelas costas",
    advantage: "Vantagem",
    penalty: "Penalidade",
    reset: "Posi\xE7\xE3o desfeita / rein\xEDcio",
    submission: "Finaliza\xE7\xE3o",
    disqualification: "Desclassifica\xE7\xE3o"
  };
  var TKD_LABELS = {
    punch_trunk: "Soco no tronco",
    kick_trunk: "Chute no tronco",
    kick_head: "Chute na cabe\xE7a",
    spin_kick_trunk: "Chute girat\xF3rio no tronco",
    spin_kick_head: "Chute girat\xF3rio na cabe\xE7a",
    punch_head: "Soco na cabe\xE7a (infra\xE7\xE3o)",
    gamjeom: "Gam-jeom (penalidade)",
    rsc: "Interrup\xE7\xE3o pelo \xE1rbitro (RSC)"
  };
  var TEAM_LABELS = {
    goal: "Gol",
    own_goal: "Gol contra",
    basket: "Cesta",
    point: "Ponto individual (v\xF4lei)",
    yellow: "Cart\xE3o amarelo",
    red: "Cart\xE3o vermelho",
    note: "Observa\xE7\xE3o de s\xFAmula"
  };
  var other = (s) => s === "a" ? "b" : "a";
  var blank = () => ({ a: 0, b: 0 });
  var BJJ_SCORING = ["takedown", "sweep", "knee_on_belly", "guard_pass", "mount", "back_control"];
  var BJJ_ALL = [...BJJ_SCORING, "advantage", "penalty", "reset", "submission", "disqualification"];
  function scoreBjj(events, config, refereeDecision = null) {
    const res = { points: blank(), advantages: blank(), penalties: blank(), winner: null, method: null, finished_early: false, log: [] };
    const seq = { a: /* @__PURE__ */ new Set(), b: /* @__PURE__ */ new Set() };
    events.forEach((ev, idx) => {
      const { athlete: side, kind } = ev;
      if (!BJJ_ALL.includes(kind)) throw new Error(`Evento ${idx}: tipo desconhecido '${kind}'`);
      if (kind !== "reset" && side !== "a" && side !== "b") throw new Error(`Evento ${idx}: atleta deve ser 'a' ou 'b'`);
      const entry = { index: idx, athlete: side, kind, points: 0, note: "" };
      if (res.finished_early) {
        entry.note = "ignorado: luta j\xE1 encerrada";
        res.log.push(entry);
        return;
      }
      if (BJJ_SCORING.includes(kind)) {
        if (seq[side].has(kind)) entry.note = "sem pontos: posi\xE7\xE3o repetida na mesma sequ\xEAncia";
        else {
          const p = Number(config.points[kind]);
          res.points[side] += p;
          entry.points = p;
          seq[side].add(kind);
        }
        seq[other(side)].clear();
      } else if (kind === "advantage") res.advantages[side] += 1;
      else if (kind === "penalty") res.penalties[side] += 1;
      else if (kind === "reset") {
        seq.a.clear();
        seq.b.clear();
      } else if (kind === "submission") Object.assign(res, { winner: side, method: "finalizacao", finished_early: true });
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
          res.winner = aBetter ? "a" : "b";
          res.method = name;
          decided = true;
          break;
        }
      }
      if (!decided) {
        res.method = "decisao_arbitro";
        if (refereeDecision === "a" || refereeDecision === "b") res.winner = refereeDecision;
      }
    }
    res.score_a = res.points.a;
    res.score_b = res.points.b;
    return res;
  }
  var TKD_TECH = ["punch_trunk", "kick_trunk", "kick_head", "spin_kick_trunk", "spin_kick_head"];
  var TKD_ALL = [...TKD_TECH, "punch_head", "gamjeom", "rsc"];
  function tkdApply(ev, config, points, gamjeom, breakdown) {
    const { athlete: side, kind } = ev;
    if (TKD_TECH.includes(kind)) {
      const p = Number(config.points[kind]);
      points[side] += p;
      breakdown[side][kind] = (breakdown[side][kind] || 0) + p;
      return [p, ""];
    }
    gamjeom[side] += 1;
    const gp = Number(config.gamjeom_points);
    points[other(side)] += gp;
    breakdown[other(side)].gamjeom = (breakdown[other(side)].gamjeom || 0) + gp;
    return [0, kind === "punch_head" ? "soco na cabe\xE7a: sem pontos, gam-jeom" : "gam-jeom"];
  }
  function scoreTaekwondo(events, config, superiorityDecision = null, roundDecisions = {}) {
    const maxRound = config.rounds + (config.mode === "cumulativo" ? 1 : 0);
    events.forEach((ev, i) => {
      if (!TKD_ALL.includes(ev.kind)) throw new Error(`Evento ${i}: tipo desconhecido '${ev.kind}'`);
      if (ev.athlete !== "a" && ev.athlete !== "b") throw new Error(`Evento ${i}: atleta deve ser 'a' ou 'b'`);
      const r = ev.round ?? 1;
      if (!Number.isInteger(r) || r < 1 || r > maxRound) throw new Error(`Evento ${i}: round inv\xE1lido (${r})`);
    });
    return config.mode === "melhor_de_3" ? tkdBestOf3(events, config, roundDecisions || {}) : tkdCumulative(events, config, superiorityDecision);
  }
  function tkdCumulative(events, config, superiority) {
    const golden = config.rounds + 1;
    const points = blank(), gamjeom = blank(), gp = blank(), gpGam = blank();
    const breakdown = { a: {}, b: {} };
    const log = [];
    const result = { winner: null, method: null, finished_early: false };
    const ordered = events.map((ev, idx) => [idx, ev]).sort((x, y) => (x[1].round ?? 1) - (y[1].round ?? 1) || x[0] - y[0]);
    for (const [idx, ev] of ordered) {
      const entry = { index: idx, athlete: ev.athlete, kind: ev.kind, round: ev.round ?? 1, points: 0, note: "" };
      if (result.winner) {
        entry.note = "ignorado: luta j\xE1 encerrada";
        log.push(entry);
        continue;
      }
      if (ev.kind === "rsc") {
        Object.assign(result, { winner: ev.athlete, method: "rsc", finished_early: true });
        log.push(entry);
        continue;
      }
      const isGolden = (ev.round ?? 1) === golden;
      if (isGolden) {
        if (points.a !== points.b) {
          entry.note = "ignorado: golden point s\xF3 ocorre com empate";
          log.push(entry);
          continue;
        }
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
      else {
        result.method = "superioridade";
        if (superiority === "a" || superiority === "b") result.winner = superiority;
      }
    }
    return { ...result, points, gamjeom, golden_points: gp, breakdown, log, score_a: points.a, score_b: points.b };
  }
  var ROUND_TIEBREAK = [
    ["spin", ["spin_kick_trunk", "spin_kick_head"]],
    ["head", ["kick_head", "spin_kick_head"]],
    ["trunk", ["kick_trunk"]],
    ["punch", ["punch_trunk"]]
  ];
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
        if (winner || rw) {
          entry.note = "ignorado: round/luta j\xE1 encerrado";
          log.push(entry);
          return;
        }
        if (ev.kind === "rsc") {
          winner = ev.athlete;
          method = "rsc";
          finished = true;
          log.push(entry);
          return;
        }
        [entry.points, entry.note] = tkdApply(ev, config, points, gamjeom, breakdown);
        log.push(entry);
        const loser = ["a", "b"].find((s) => config.max_gamjeom && gamjeom[s] >= config.max_gamjeom);
        if (loser) {
          rw = other(loser);
          rm = "punicao";
        } else if (config.point_gap && Math.abs(points.a - points.b) >= config.point_gap) {
          rw = points.a > points.b ? "a" : "b";
          rm = "diferenca_de_pontos";
        }
      });
      for (const s of ["a", "b"]) {
        total[s] += points[s];
        gamTotal[s] += gamjeom[s];
      }
      if (winner) break;
      if (!rw) {
        if (points.a !== points.b) {
          rw = points.a > points.b ? "a" : "b";
          rm = "pontos";
        } else {
          for (const [name, kinds] of ROUND_TIEBREAK) {
            const va = kinds.reduce((t, k) => t + (breakdown.a[k] || 0), 0), vb = kinds.reduce((t, k) => t + (breakdown.b[k] || 0), 0);
            if (va !== vb) {
              rw = va > vb ? "a" : "b";
              rm = `desempate_${name}`;
              break;
            }
          }
          if (!rw) {
            if (gamjeom.a !== gamjeom.b) {
              rw = gamjeom.a < gamjeom.b ? "a" : "b";
              rm = "desempate_gamjeom";
            } else {
              rm = "decisao_arbitro";
              const d = roundDecisions[rnd] ?? roundDecisions[String(rnd)];
              if (d === "a" || d === "b") rw = d;
            }
          }
        }
      }
      rounds.push({ round: rnd, points, gamjeom, winner: rw, method: rm });
      if (rw) {
        roundsWon[rw] += 1;
        if (roundsWon[rw] === 2) {
          winner = rw;
          method = "rounds";
          break;
        }
      } else if (!events.some((e) => (e.round ?? 1) > rnd)) break;
    }
    return {
      winner,
      method,
      finished_early: finished,
      rounds_won: roundsWon,
      rounds,
      points: total,
      gamjeom: gamTotal,
      log,
      score_a: roundsWon.a,
      score_b: roundsWon.b
    };
  }
  var TEAM_KINDS = ["goal", "own_goal", "basket", "point", "yellow", "red", "note"];
  function validateVolleyballSets(sets, config) {
    const need = Math.floor(config.best_of / 2) + 1;
    const won = blank();
    sets.forEach((s, i0) => {
      const i = i0 + 1;
      if (won.a === need || won.b === need) throw new Error(`Set ${i}: a partida j\xE1 estava decidida`);
      const a = Number(s[0]), b = Number(s[1]);
      const target = i === config.best_of ? config.tiebreak_points : config.set_points;
      const hi = Math.max(a, b), lo = Math.min(a, b);
      if (hi < target) throw new Error(`Set ${i}: o vencedor precisa de ao menos ${target} pontos`);
      if (hi - lo < config.min_lead) throw new Error(`Set ${i}: vantagem m\xEDnima de ${config.min_lead} pontos`);
      if (hi > target && hi - lo !== config.min_lead) throw new Error(`Set ${i}: ap\xF3s ${target} pontos o set termina com diferen\xE7a de exatamente ${config.min_lead}`);
      won[a > b ? "a" : "b"] += 1;
    });
    return [won.a, won.b];
  }
  function scoreTeamMatch(sport, events, config, { sets = null, penalties = null, knockout = false } = {}) {
    let score = blank();
    const scorers = {}, cards = [], notes = [];
    events.forEach((ev, i) => {
      const { kind, team } = ev;
      if (!TEAM_KINDS.includes(kind)) throw new Error(`Evento ${i}: tipo desconhecido '${kind}'`);
      if (team !== "a" && team !== "b") throw new Error(`Evento ${i}: time deve ser 'a' ou 'b'`);
      const pid = ev.player_id || null;
      if (kind === "goal") {
        if (sport !== "futebol" && sport !== "futsal") throw new Error(`Evento ${i}: gol n\xE3o se aplica a ${sport}`);
        score[team] += 1;
        if (pid) scorers[pid] = (scorers[pid] || 0) + 1;
      } else if (kind === "own_goal") score[other(team)] += 1;
      else if (kind === "basket") {
        if (sport !== "basquete") throw new Error(`Evento ${i}: cesta s\xF3 se aplica ao basquete`);
        const v = Number(ev.value ?? 2);
        if (![1, 2, 3].includes(v)) throw new Error(`Evento ${i}: cesta vale 1, 2 ou 3 pontos`);
        score[team] += v;
        if (pid) scorers[pid] = (scorers[pid] || 0) + v;
      } else if (kind === "point") {
        if (pid) scorers[pid] = (scorers[pid] || 0) + 1;
      } else if (kind === "yellow" || kind === "red") cards.push({ team, player_id: pid, kind });
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
        else result.pending = "Partida ainda n\xE3o decidida (sets insuficientes)";
      }
      result.sets = sets || [];
      score = { a: sa, b: sb };
    } else if (score.a !== score.b) Object.assign(result, { winner: score.a > score.b ? "a" : "b", method: "placar" });
    else if (sport === "basquete") result.pending = "Empate no basquete: registre a prorroga\xE7\xE3o";
    else if (knockout || !config.allow_draw) {
      if (penalties && penalties[0] != null && penalties[1] != null && Number(penalties[0]) !== Number(penalties[1])) {
        const pa = Number(penalties[0]), pb = Number(penalties[1]);
        Object.assign(result, { winner: pa > pb ? "a" : "b", method: "penaltis", penalties: [pa, pb] });
      } else result.pending = "Empate em mata-mata: informe a disputa de p\xEAnaltis";
    } else Object.assign(result, { winner: "draw", method: "empate" });
    return { ...result, score_a: score.a, score_b: score.b, scorers, cards, notes };
  }
  function standings(teamIds, results, config) {
    const table = new Map(teamIds.map((t) => [t, { team: t, played: 0, won: 0, drawn: 0, lost: 0, for: 0, against: 0, points: 0 }]));
    for (const r of results) {
      if (r.winner == null) continue;
      const a = table.get(r.a), b = table.get(r.b);
      if (!a || !b) continue;
      for (const [row2, gf, ga] of [[a, r.score_a, r.score_b], [b, r.score_b, r.score_a]]) {
        row2.played++;
        row2.for += gf;
        row2.against += ga;
      }
      if (r.winner === "draw") for (const row2 of [a, b]) {
        row2.drawn++;
        row2.points += config.draw;
      }
      else {
        const [w, l] = r.winner === "a" ? [a, b] : [b, a];
        w.won++;
        w.points += config.win;
        l.lost++;
        l.points += config.loss;
      }
    }
    const rows = [...table.values()].map((r) => ({ ...r, diff: r.for - r.against }));
    rows.sort((x, y) => y.points - x.points || y.won - x.won || y.diff - x.diff || y.for - x.for || String(x.team).localeCompare(String(y.team)));
    return rows;
  }
  var METHOD_LABELS = {
    finalizacao: "Finaliza\xE7\xE3o",
    desclassificacao: "Desclassifica\xE7\xE3o",
    pontos: "Pontos",
    vantagens: "Vantagens",
    penalidades: "Menos penalidades",
    decisao_arbitro: "Decis\xE3o do \xE1rbitro",
    golden_point: "Golden point",
    superioridade: "Superioridade",
    diferenca_de_pontos: "Diferen\xE7a de pontos",
    punicao: "Puni\xE7\xE3o (gam-jeom)",
    rsc: "Interrup\xE7\xE3o do \xE1rbitro",
    rounds: "Rounds",
    placar: "Placar",
    penaltis: "P\xEAnaltis",
    sets: "Sets",
    empate: "Empate",
    bye: "Sem advers\xE1rio (BYE)",
    wo: "W.O."
  };

  // js/data/seed.js
  var SITE_DEFAULTS = {
    name: "Associa\xE7\xE3o O\xE1sis de Pomp\xE9ia",
    shortName: "O\xC1SIS",
    tagline: "Desenvolvendo pessoas. Transformando vidas.",
    heroSubtitle: "Arte, esporte, inclus\xE3o e oportunidades para crian\xE7as e adolescentes constru\xEDrem um futuro melhor.",
    heroImage: "img/apresentacao-danca-palco.jpg",
    heroImageAlt: "Alunas de dan\xE7a se apresentando em um palco iluminado, com a banda ao fundo e tel\xF5es coloridos.",
    photosNote: "",
    aboutShort: "A O\xE1sis \xE9 uma associa\xE7\xE3o sem fins lucrativos que desenvolve projetos sociais de artes e esportes em Pomp\xE9ia, no interior de S\xE3o Paulo. Oferecemos cursos, capacita\xE7\xF5es e eventos gratuitos para crian\xE7as e adolescentes de 4 a 17 anos.",
    aboutFull: "A O\xE1sis \xE9 uma associa\xE7\xE3o sem fins lucrativos que desenvolve projetos sociais de artes e esportes em Pomp\xE9ia, no interior de S\xE3o Paulo, com cursos, capacita\xE7\xF5es e eventos gratuitos.\n\nAtendemos crian\xE7as e adolescentes de 4 a 17 anos, buscando o desenvolvimento integral (f\xEDsico, social, emocional, cognitivo e sensorial) e a preven\xE7\xE3o de situa\xE7\xF5es de risco e vulnerabilidade, em um ambiente seguro e acolhedor.\n\nNossos projetos s\xE3o viabilizados por meio das leis de incentivo \xE0 cultura e ao esporte.",
    stats: [
      { value: "1.200+", label: "crian\xE7as e adolescentes atendidos por ano" },
      { value: "1987", label: "ano de funda\xE7\xE3o" },
      { value: "3", label: "projetos ativos" },
      { value: "4 a 17", label: "anos de idade" }
    ],
    commitments: [
      { title: "Arte que desperta", text: "M\xFAsica e dan\xE7a para a express\xE3o, a autoestima e a descoberta de talentos." },
      { title: "Esporte que forma", text: "Basquete, futebol, futsal, v\xF4lei e artes marciais como escola de conviv\xEAncia." },
      { title: "Prote\xE7\xE3o e cuidado", text: "Ambiente seguro, com estrutura adequada e equipe preparada." },
      { title: "Gest\xE3o transparente", text: "Presta\xE7\xE3o de contas p\xFAblica e relat\xF3rios publicados." }
    ],
    history: "15 de mar\xE7o de 1987 \u2014 funda\xE7\xE3o, com o nome de Associa\xE7\xE3o Holiness de Pomp\xE9ia.\n\n2005 \u2014 ap\xF3s a compra do terreno da sede e a atualiza\xE7\xE3o do estatuto, passa a se chamar Associa\xE7\xE3o O\xE1sis de Pomp\xE9ia.\n\n2017 \u2014 recebe a qualifica\xE7\xE3o de OSCIP (Organiza\xE7\xE3o da Sociedade Civil de Interesse P\xFAblico).\n\nHoje \u2014 mais de 1.200 crian\xE7as e adolescentes atendidos por ano em tr\xEAs projetos de artes e esportes.",
    mission: "Desenvolver pessoas por meio da arte e do esporte, oferecendo oportunidades gratuitas a crian\xE7as e adolescentes de Pomp\xE9ia e regi\xE3o.",
    vision: "Ser refer\xEAncia regional em projetos sociais de artes e esportes que transformam vidas.",
    values: "Respeito\nInclus\xE3o\nTranspar\xEAncia\nCuidado e prote\xE7\xE3o\nDisciplina e conviv\xEAncia\nCompromisso com a comunidade",
    transparency: "A O\xE1sis presta contas publicamente de seus projetos e recursos. Aqui ficam os documentos e relat\xF3rios: estatuto, balan\xE7os, relat\xF3rios de atividades e presta\xE7\xF5es de contas dos projetos incentivados.",
    transparencyLinks: [],
    inclusiveText: "O esporte \xE9 um direito de todos. Queremos que cada crian\xE7a e adolescente possa participar de acordo com as suas necessidades, com acolhimento, adapta\xE7\xE3o e professores preparados.",
    showAdaptedPublic: false,
    adaptedPendingNote: "As modalidades adaptadas est\xE3o em fase de planejamento e ser\xE3o publicadas somente ap\xF3s confirma\xE7\xE3o institucional.",
    participeText: "As inscri\xE7\xF5es s\xE3o gratuitas. A fam\xEDlia cadastra o participante, escolhe a modalidade e acompanha a inscri\xE7\xE3o pela pr\xF3pria conta.",
    helpDonation: "Doa\xE7\xF5es \xFAnicas ou mensais, de pessoas f\xEDsicas ou empresas.",
    helpPartnership: "Empresas podem patrocinar diretamente ou por meio das leis de incentivo \xE0 cultura e ao esporte.",
    helpVolunteer: "Profissionais e pessoas da comunidade podem contribuir com oficinas, eventos e apoio.",
    donationInfo: "Informe aqui os canais oficiais de doa\xE7\xE3o (chave PIX, dados banc\xE1rios da associa\xE7\xE3o).",
    email: "contato@aop.org.br",
    phone1: "(14) 3535-0855",
    phone2: "(14) 99751-2730",
    address: "Av. Jo\xE3o Batista Lima, 1800 \u2014 Jardim Jos\xE9 Janu\xE1rio, Pomp\xE9ia/SP",
    hours: "",
    facebook: "https://www.facebook.com/aopompeia",
    instagram: "https://www.instagram.com/oasispompeia",
    youtube: "https://www.youtube.com/@oasispompeia",
    terms: "Ao usar este site e o sistema de inscri\xE7\xF5es, voc\xEA concorda em fornecer informa\xE7\xF5es verdadeiras e em usar a conta apenas para acompanhar as atividades do participante.\n\nTexto a ser revisado pelo jur\xEDdico da associa\xE7\xE3o.",
    faq: "As atividades s\xE3o gratuitas?\nSim. Todos os projetos da O\xE1sis s\xE3o gratuitos para as fam\xEDlias.\n\nQual \xE9 a idade para participar?\nDe 4 a 17 anos.\n\nComo fa\xE7o a inscri\xE7\xE3o?\nCrie a conta em Inscreva-se junto com o respons\xE1vel legal e escolha as modalidades.\n\nPessoas com defici\xEAncia podem participar?\nSim. Informe as necessidades no cadastro (de forma sigilosa) para que a equipe prepare o acolhimento."
  };
  var GENERAL_DEFAULTS = {
    ageReference: "ano",
    // "ano" | "data_evento"
    conflictMode: "alertar",
    // "alertar" | "impedir"
    bufferMin: 0,
    publicNameAbbrev: true,
    ageBands: DIVISIONS_DEFAULT,
    // divisões por idade (Pré-Mirim … Juvenil, 4 a 17 anos)
    weightTable: WEIGHT_TABLE_DEFAULT
    // categorias de peso das lutas
  };
  var SCORING_DEFAULTS = { bjj: BJJ_DEFAULTS, taekwondo: TKD_DEFAULTS, team: TEAM_DEFAULTS };
  var PROJECTS = [
    {
      id: "artes-em-pompeia",
      name: "Artes em Pomp\xE9ia",
      area: "Cultura",
      order: 1,
      modalities: ["musica", "danca"],
      participants: "429",
      summary: "Aulas gratuitas de m\xFAsica e dan\xE7a, com apresenta\xE7\xF5es abertas \xE0 comunidade.",
      body: "O projeto Artes em Pomp\xE9ia oferece aulas gratuitas de m\xFAsica e dan\xE7a para crian\xE7as e adolescentes, estimulando a express\xE3o, a autoestima e a descoberta de talentos.\n\nAo longo do ano, os alunos se apresentam em eventos abertos \xE0 comunidade, como o Festival de Artes."
    },
    {
      id: "educacao-atraves-do-esporte",
      name: "Educa\xE7\xE3o atrav\xE9s do Esporte",
      area: "Esporte",
      order: 2,
      modalities: ["basquete", "futebol", "futsal", "volei"],
      participants: "671",
      summary: "Basquete, futebol, futsal e v\xF4lei como ferramentas de desenvolvimento integral.",
      body: "O projeto usa o basquete, o futebol, o futsal e o v\xF4lei como ferramentas de desenvolvimento integral: trabalho em equipe, respeito \xE0s regras, sa\xFAde e conviv\xEAncia."
    },
    {
      id: "artes-marciais-construindo-cidadania",
      name: "Artes Marciais Construindo Cidadania",
      area: "Esporte",
      order: 3,
      modalities: ["jiu_jitsu", "taekwondo"],
      participants: "141",
      summary: "Jiu-jitsu e taekwondo com foco em disciplina, respeito, autocontrole e conviv\xEAncia.",
      body: "Jiu-jitsu e taekwondo ensinados com foco em disciplina, respeito, autocontrole e conviv\xEAncia, valores que os alunos levam para a escola, a fam\xEDlia e a comunidade."
    }
  ];
  var NEWS = [
    {
      id: "festival-de-artes",
      title: "Festival de Artes re\xFAne fam\xEDlias e alunos",
      category: "Cultura",
      date: "2025-11-08",
      summary: "Apresenta\xE7\xF5es de m\xFAsica e dan\xE7a dos alunos do projeto Artes em Pomp\xE9ia.",
      body: "Alunos do projeto Artes em Pomp\xE9ia apresentaram n\xFAmeros de m\xFAsica e dan\xE7a para as fam\xEDlias e a comunidade."
    },
    {
      id: "compreendendo-o-autismo",
      title: "Compreendendo o autismo: prepara\xE7\xE3o da equipe da O\xE1sis",
      category: "Capacita\xE7\xE3o",
      date: "2025-03-17",
      summary: "Capacita\xE7\xE3o da equipe sobre o Transtorno do Espectro Autista.",
      body: "A equipe da O\xE1sis participou de uma capacita\xE7\xE3o sobre o Transtorno do Espectro Autista (TEA), para acolher melhor cada aluno."
    },
    {
      id: "treinamento-primeiros-socorros",
      title: "A import\xE2ncia do treinamento em primeiros socorros",
      category: "Seguran\xE7a",
      date: "2025-03-10",
      summary: "Professores e equipe passaram por treinamento de primeiros socorros.",
      body: "Professores e colaboradores da O\xE1sis passaram por treinamento de primeiros socorros, refor\xE7ando a seguran\xE7a nas atividades."
    }
  ];
  var EVENTS = [
    {
      name: "Festival de Artes 2026",
      kind: "festival",
      startsOn: "2026-12-05",
      timeLabel: "19h",
      location: "Espa\xE7o de Artes Lincoln Nishimura",
      description: "Apresenta\xE7\xF5es de m\xFAsica e dan\xE7a dos alunos do projeto Artes em Pomp\xE9ia."
    },
    {
      name: "Encontro de fam\xEDlias dos projetos",
      kind: "institucional",
      startsOn: "2026-12-12",
      timeLabel: "9h",
      location: "Sede da O\xE1sis",
      description: "Roda de conversa com os respons\xE1veis e apresenta\xE7\xE3o do calend\xE1rio de atividades."
    }
  ];
  async function seedInitialContent({ set: set3, add: add3 }) {
    await set3("settings", "site", SITE_DEFAULTS);
    await set3("settings", "general", GENERAL_DEFAULTS);
    await set3("settings", "scoring", SCORING_DEFAULTS);
    for (const p of PROJECTS) {
      const { id, ...data } = p;
      await set3("projects", id, { ...data, published: true, ...SEED_IMAGES.projects[id] || { image: "", imageAlt: "" } });
    }
    for (const [i, name] of ["Jacto", "Unipac", "Mapfre", "Sicoob", "Brudden"].entries()) {
      await add3("sponsors", { name, url: "", logo: "", order: i });
    }
    for (const n of NEWS) {
      const { id, ...data } = n;
      await set3("news", id, { ...data, published: true, librasVideoUrl: "", ...SEED_IMAGES.news[id] || { image: "", imageAlt: "" } });
    }
    for (const e of EVENTS) {
      await add3("events", { ...e, endsOn: e.startsOn, published: true, registrationsOpen: false, librasVideoUrl: "", ...SEED_IMAGES.events[e.name] || { image: "", imageAlt: "" } });
    }
  }
  var SEED_IMAGES = {
    site: {
      heroImage: "img/apresentacao-danca-palco.jpg",
      heroImageAlt: "Alunas de dan\xE7a se apresentando em um palco iluminado, com a banda ao fundo e tel\xF5es coloridos."
    },
    projects: {
      "artes-em-pompeia": {
        image: "img/alunos-musica-flauta.jpg",
        imageAlt: "Crian\xE7as e adolescentes tocando flauta transversal e flauta doce em uma apresenta\xE7\xE3o de m\xFAsica."
      },
      "educacao-atraves-do-esporte": {
        image: "img/criancas-basquete.jpg",
        imageAlt: "Crian\xE7as de uniforme sentadas em roda na quadra, uma delas segurando uma bola de basquete, ouvindo a explica\xE7\xE3o."
      },
      "artes-marciais-construindo-cidadania": {
        image: "img/jiu-jitsu-luta.jpg",
        imageAlt: "Duas atletas de quimono azul em uma luta de jiu-jitsu no tatame, acompanhadas pelo \xE1rbitro."
      }
    },
    news: { "festival-de-artes": {
      image: "img/criancas-danca.jpg",
      imageAlt: "Foto em preto e branco de crian\xE7as pequenas com perucas cacheadas e vestidos de bolinhas dan\xE7ando no palco."
    } },
    events: { "Festival de Artes 2026": {
      image: "img/apresentacao-danca-palco.jpg",
      imageAlt: "Alunas de dan\xE7a se apresentando em um palco iluminado, com a banda ao fundo."
    } }
  };
  async function applySeedImages({ get: get3, list: list3, update: update3, set: set3 }) {
    const site = await get3("settings", "site");
    if (site && !site.heroImage) await set3("settings", "site", { ...site, ...SEED_IMAGES.site, photosNote: "" }, { merge: true });
    for (const [id, img2] of Object.entries(SEED_IMAGES.projects)) {
      const p = await get3("projects", id);
      if (p && !p.image) await update3("projects", id, img2);
    }
    for (const [id, img2] of Object.entries(SEED_IMAGES.news)) {
      const n = await get3("news", id);
      if (n && !n.image) await update3("news", id, img2);
    }
    for (const ev of await list3("events")) {
      const img2 = SEED_IMAGES.events[ev.name];
      if (img2 && !ev.image) await update3("events", ev.id, img2);
    }
  }
  async function applyDivisions({ get: get3, set: set3 }) {
    const g = await get3("settings", "general");
    if (!g || !Array.isArray(g.ageBands)) return;
    const { id, ...rest } = g;
    let bands = g.ageBands.every((b) => /^Sub-\d+ \(/.test(b.name)) ? DIVISIONS_DEFAULT : g.ageBands.filter((b) => b.max <= 17);
    if (!bands.length) bands = DIVISIONS_DEFAULT;
    const names = new Set(bands.map((b) => b.name));
    await set3("settings", "general", { ...rest, ageBands: bands, ...Array.isArray(g.weightTable) ? { weightTable: g.weightTable.filter((r) => names.has(r.division)) } : {} });
  }

  // js/data/local.js
  var mode = "local";
  var KEY = "oasis:dados:v1";
  var SESSION = "oasis:sessao:v1";
  var ITER = 15e4;
  var ADMIN = {
    uid: "admin-local",
    email: "adm@gmail.com",
    salt: "cb3628d7a19a805f6ab9da11446b5709",
    hash: "78609302ea9acb404a4d971e1bd5d324668a939fef2ff0fa989b0619aa1721ca"
  };
  var state = null;
  var listeners = /* @__PURE__ */ new Set();
  var attempts = /* @__PURE__ */ new Map();
  function load() {
    try {
      return JSON.parse(localStorage.getItem(KEY));
    } catch {
      return null;
    }
  }
  function save() {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
    } catch (e) {
      throw new Error("O espa\xE7o de armazenamento do navegador est\xE1 cheio. Fa\xE7a um backup e remova imagens ou not\xEDcias antigas.");
    }
  }
  var col = (c) => {
    var _a;
    return (_a = state.collections)[c] || (_a[c] = {});
  };
  var newId = () => crypto.getRandomValues(new Uint32Array(3)).reduce((s, n) => s + n.toString(36), "").slice(0, 20);
  var clone = (x) => x == null ? x : JSON.parse(JSON.stringify(x));
  async function init() {
    state = load();
    if (!state) {
      state = { collections: {}, auth: { [ADMIN.email]: { uid: ADMIN.uid, salt: ADMIN.salt, hash: ADMIN.hash } } };
      col("admins")[ADMIN.uid] = { email: ADMIN.email, createdAt: (/* @__PURE__ */ new Date()).toISOString() };
      col("users")[ADMIN.uid] = { name: "Administra\xE7\xE3o", email: ADMIN.email, role: "admin", defaultCredential: true };
      save();
      await seedInitialContent({ get, set, add });
      state.contentVersion = 5;
      save();
    }
    if ((state.contentVersion || 1) < 3) {
      await applySeedImages({ get, list, update, set });
      state.contentVersion = 3;
      save();
    }
    if (state.contentVersion < 5) {
      await applyDivisions({ get, set });
      state.contentVersion = 5;
      save();
    }
  }
  async function get(c, id) {
    const d = col(c)[id];
    return d ? { id, ...clone(d) } : null;
  }
  function match(doc, [field2, op, value]) {
    const v = field2.split(".").reduce((o, k) => o == null ? void 0 : o[k], doc);
    if (op === "==") return v === value;
    if (op === "!=") return v !== value;
    if (op === "in") return value.includes(v);
    if (op === "array-contains") return Array.isArray(v) && v.includes(value);
    throw new Error(`Operador n\xE3o suportado: ${op}`);
  }
  async function list(c, filters = []) {
    return Object.entries(col(c)).filter(([, d]) => filters.every((f) => match(d, f))).map(([id, d]) => ({ id, ...clone(d) }));
  }
  async function add(c, data) {
    const id = newId();
    col(c)[id] = clone({ ...data, createdAt: data.createdAt || (/* @__PURE__ */ new Date()).toISOString() });
    save();
    return id;
  }
  async function set(c, id, data, { merge: merge2 = false } = {}) {
    col(c)[id] = clone(merge2 ? { ...col(c)[id] || {}, ...data } : data);
    save();
    return id;
  }
  async function update(c, id, data) {
    if (!col(c)[id]) throw new Error("Registro n\xE3o encontrado.");
    col(c)[id] = clone({ ...col(c)[id], ...data });
    save();
  }
  async function remove(c, id) {
    delete col(c)[id];
    save();
  }
  async function pbkdf2(password, saltHex) {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
    const salt = new Uint8Array(saltHex.match(/.{2}/g).map((h2) => parseInt(h2, 16)));
    const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: ITER }, key, 256);
    return [...new Uint8Array(bits)].map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  var randomHex = (n) => [...crypto.getRandomValues(new Uint8Array(n))].map((b) => b.toString(16).padStart(2, "0")).join("");
  function sessionUser() {
    const uid2 = sessionStorage.getItem(SESSION) || localStorage.getItem(SESSION);
    if (!uid2) return null;
    const email = Object.keys(state.auth).find((e) => state.auth[e].uid === uid2);
    return email ? { uid: uid2, email } : null;
  }
  function emit() {
    const u = sessionUser();
    listeners.forEach((cb) => cb(u));
  }
  var authCurrent = () => sessionUser();
  function authOnChange(cb) {
    listeners.add(cb);
    cb(sessionUser());
    return () => listeners.delete(cb);
  }
  async function signIn(email, password) {
    const now = Date.now();
    const recent = (attempts.get(email) || []).filter((t) => now - t < 15 * 6e4);
    if (recent.length >= 5) throw new Error("Muitas tentativas. Aguarde 15 minutos e tente novamente.");
    const rec = state.auth[email];
    if (!rec || await pbkdf2(password, rec.salt) !== rec.hash) {
      attempts.set(email, [...recent, now]);
      throw new Error("E-mail ou senha incorretos.");
    }
    attempts.delete(email);
    localStorage.setItem(SESSION, rec.uid);
    emit();
    return { uid: rec.uid, email };
  }
  async function signUp(email, password) {
    if (state.auth[email]) throw new Error("Este e-mail j\xE1 est\xE1 cadastrado.");
    const salt = randomHex(16);
    const uid2 = newId();
    state.auth[email] = { uid: uid2, salt, hash: await pbkdf2(password, salt) };
    save();
    localStorage.setItem(SESSION, uid2);
    emit();
    return { uid: uid2, email };
  }
  async function signOut() {
    localStorage.removeItem(SESSION);
    sessionStorage.removeItem(SESSION);
    emit();
  }
  async function changePassword(current2, next) {
    const u = sessionUser();
    const rec = u && state.auth[u.email];
    if (!rec || await pbkdf2(current2, rec.salt) !== rec.hash) throw new Error("Senha atual incorreta.");
    rec.salt = randomHex(16);
    rec.hash = await pbkdf2(next, rec.salt);
    save();
  }
  async function deleteMe(current2) {
    const u = sessionUser();
    const rec = u && state.auth[u.email];
    if (!rec || await pbkdf2(current2, rec.salt) !== rec.hash) throw new Error("Senha incorreta.");
    delete state.auth[u.email];
    save();
    await signOut();
  }
  async function checkPassword(password) {
    const u = sessionUser();
    const rec = u && state.auth[u.email];
    if (!rec || await pbkdf2(password, rec.salt) !== rec.hash) throw new Error("Senha incorreta.");
  }
  async function sendPasswordReset() {
    throw new Error("Envio de e-mail s\xF3 funciona no modo online. Use a senha provis\xF3ria.");
  }
  async function adminSetPassword(uid2, password) {
    const email = Object.keys(state.auth).find((e) => state.auth[e].uid === uid2);
    if (!email) throw new Error("Esta pessoa n\xE3o tem login ativo.");
    const rec = state.auth[email];
    rec.salt = randomHex(16);
    rec.hash = await pbkdf2(password, rec.salt);
    save();
  }
  async function disableLogin(uid2) {
    const email = Object.keys(state.auth).find((e) => state.auth[e].uid === uid2);
    if (email && uid2 !== ADMIN.uid) {
      delete state.auth[email];
      save();
    }
  }
  function exportAll() {
    return JSON.stringify({ app: "oasis-site", version: 1, exportedAt: (/* @__PURE__ */ new Date()).toISOString(), data: state }, null, 1);
  }
  async function importAll(json) {
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error("Arquivo inv\xE1lido: n\xE3o \xE9 um backup do sistema.");
    }
    if (parsed?.app !== "oasis-site" || !parsed.data?.collections || !parsed.data?.auth) throw new Error("Arquivo inv\xE1lido: n\xE3o \xE9 um backup do sistema.");
    const previous = state;
    state = parsed.data;
    try {
      save();
    } catch (e) {
      state = previous;
      throw e;
    }
  }
  function storageUsage() {
    const used = (localStorage.getItem(KEY) || "").length * 2;
    return { usedBytes: used, limitBytes: 5 * 1024 * 1024 };
  }

  // js/data/firebase.js
  var firebase_exports = {};
  __export(firebase_exports, {
    ADMIN_EMAIL: () => ADMIN_EMAIL,
    add: () => add2,
    adminSetPassword: () => adminSetPassword2,
    authCurrent: () => authCurrent2,
    authOnChange: () => authOnChange2,
    changePassword: () => changePassword2,
    checkPassword: () => checkPassword2,
    deleteMe: () => deleteMe2,
    disableLogin: () => disableLogin2,
    exportAll: () => exportAll2,
    get: () => get2,
    importAll: () => importAll2,
    init: () => init2,
    list: () => list2,
    mode: () => mode2,
    remove: () => remove2,
    sendPasswordReset: () => sendPasswordReset2,
    set: () => set2,
    signIn: () => signIn2,
    signOut: () => signOut2,
    signUp: () => signUp2,
    storageUsage: () => storageUsage2,
    update: () => update2
  });
  var mode2 = "firebase";
  var ADMIN_EMAIL = "adm@gmail.com";
  var SDK_VERSION = "12.10.0";
  var A;
  var F;
  var app;
  var authApi;
  var fs;
  var current = null;
  var listeners2 = /* @__PURE__ */ new Set();
  var clean = (x) => JSON.parse(JSON.stringify(x));
  async function init2() {
    const base = window.OASIS_FIREBASE_SDK || `https://www.gstatic.com/firebasejs/${SDK_VERSION}`;
    let appMod;
    try {
      [appMod, A, F] = await Promise.all([import(`${base}/firebase-app.js`), import(`${base}/firebase-auth.js`), import(`${base}/firebase-firestore.js`)]);
    } catch (e) {
      console.error(e);
      throw new Error("N\xE3o foi poss\xEDvel conectar ao banco de dados online. Verifique a internet e recarregue a p\xE1gina.");
    }
    app = appMod.initializeApp(window.OASIS_FIREBASE);
    authApi = A.getAuth(app);
    fs = F.getFirestore(app);
    await new Promise((resolve2) => {
      let first = true;
      A.onAuthStateChanged(authApi, async (u) => {
        current = u ? { uid: u.uid, email: (u.email || "").toLowerCase() } : null;
        if (u) await ensureAdmin(u).catch((e) => console.warn(e));
        if (first) {
          first = false;
          resolve2();
        } else listeners2.forEach((cb) => cb(current));
      });
    });
  }
  async function ensureAdmin(u) {
    if ((u.email || "").toLowerCase() !== ADMIN_EMAIL) return;
    if (!await get2("admins", u.uid)) await set2("admins", u.uid, { email: ADMIN_EMAIL, createdAt: (/* @__PURE__ */ new Date()).toISOString() });
    if (!await get2("users", u.uid)) await set2("users", u.uid, { name: "Administra\xE7\xE3o", email: ADMIN_EMAIL, role: "admin", defaultCredential: true });
    if (!await get2("settings", "site")) await seedInitialContent({ get: get2, set: set2, add: add2 });
  }
  var ref = (c, id) => F.doc(fs, c, id);
  async function get2(c, id) {
    const s = await F.getDoc(ref(c, id));
    return s.exists() ? { id: s.id, ...s.data() } : null;
  }
  async function list2(c, filters = []) {
    const inF = filters.find(([, op, v]) => op === "in" && v.length > 30);
    if (inF) {
      const out = /* @__PURE__ */ new Map();
      for (let i = 0; i < inF[2].length; i += 30) {
        for (const r of await list2(c, filters.map((f) => f === inF ? [f[0], "in", inF[2].slice(i, i + 30)] : f))) out.set(r.id, r);
      }
      return [...out.values()];
    }
    if (filters.some(([, op, v]) => op === "in" && !v.length)) return [];
    const q = F.query(F.collection(fs, c), ...filters.map(([f, op, v]) => F.where(f, op, v)));
    const snap = await F.getDocs(q);
    return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  }
  async function add2(c, data) {
    const r = await F.addDoc(F.collection(fs, c), clean({ ...data, createdAt: data.createdAt || (/* @__PURE__ */ new Date()).toISOString() }));
    return r.id;
  }
  async function set2(c, id, data, { merge: merge2 = false } = {}) {
    if (merge2 && await get2(c, id)) await F.updateDoc(ref(c, id), clean(data));
    else await F.setDoc(ref(c, id), clean(data));
    return id;
  }
  async function update2(c, id, data) {
    await F.updateDoc(ref(c, id), clean(data));
  }
  async function remove2(c, id) {
    await F.deleteDoc(ref(c, id));
  }
  var MSG = {
    "auth/invalid-credential": "E-mail ou senha incorretos.",
    "auth/wrong-password": "E-mail ou senha incorretos.",
    "auth/user-not-found": "E-mail ou senha incorretos.",
    "auth/invalid-email": "E-mail inv\xE1lido.",
    "auth/email-already-in-use": "Este e-mail j\xE1 est\xE1 cadastrado.",
    "auth/weak-password": "Senha fraca: use pelo menos 8 caracteres.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde alguns minutos e tente novamente.",
    "auth/user-disabled": "Este acesso foi desativado pela coordena\xE7\xE3o.",
    "auth/network-request-failed": "Sem conex\xE3o com a internet.",
    "auth/requires-recent-login": "Por seguran\xE7a, saia e entre de novo antes de fazer isso."
  };
  var friendly = (e) => new Error(MSG[e?.code] || e?.message || "Erro ao acessar a conta.");
  var wrap = async (fn) => {
    try {
      return await fn();
    } catch (e) {
      throw friendly(e);
    }
  };
  var authCurrent2 = () => current;
  function authOnChange2(cb) {
    listeners2.add(cb);
    cb(current);
    return () => listeners2.delete(cb);
  }
  var signIn2 = (email, password) => wrap(async () => {
    const r = await A.signInWithEmailAndPassword(authApi, email, password);
    current = { uid: r.user.uid, email: (r.user.email || "").toLowerCase() };
    await ensureAdmin(r.user);
    return current;
  });
  var signUp2 = (email, password) => wrap(async () => {
    const r = await A.createUserWithEmailAndPassword(authApi, email, password);
    current = { uid: r.user.uid, email: (r.user.email || "").toLowerCase() };
    return current;
  });
  async function signOut2() {
    await A.signOut(authApi);
    current = null;
  }
  async function reauth(password) {
    const u = authApi.currentUser;
    if (!u) throw new Error("Entre de novo na sua conta.");
    try {
      await A.reauthenticateWithCredential(u, A.EmailAuthProvider.credential(u.email, password));
    } catch (e) {
      throw new Error(e?.code === "auth/too-many-requests" ? MSG[e.code] : "Senha incorreta.");
    }
    return u;
  }
  async function checkPassword2(password) {
    await reauth(password);
  }
  async function changePassword2(currentPw, next) {
    const u = await reauth(currentPw);
    await wrap(() => A.updatePassword(u, next));
  }
  async function deleteMe2(password) {
    const u = await reauth(password);
    await wrap(() => A.deleteUser(u));
    current = null;
    listeners2.forEach((cb) => cb(null));
  }
  var sendPasswordReset2 = (email) => wrap(() => A.sendPasswordResetEmail(authApi, email));
  async function adminSetPassword2() {
    throw new Error("No modo online, use o bot\xE3o de enviar e-mail para criar nova senha.");
  }
  async function disableLogin2(uid2) {
    await update2("users", uid2, { active: false }).catch(() => {
    });
  }
  var COLLECTIONS = [
    "settings",
    "admins",
    "users",
    "sensitive",
    "consents",
    "teachersPublic",
    "projects",
    "sponsors",
    "news",
    "events",
    "categories",
    "entries",
    "matches",
    "teams",
    "performances",
    "staff",
    "notices",
    "messages",
    "audit",
    "media"
  ];
  async function exportAll2() {
    const collections = {};
    for (const c of COLLECTIONS) {
      collections[c] = {};
      for (const d of await list2(c).catch(() => [])) {
        const { id, ...rest } = d;
        collections[c][id] = rest;
      }
    }
    return JSON.stringify({ app: "oasis-site", version: 1, mode: mode2, exportedAt: (/* @__PURE__ */ new Date()).toISOString(), data: { collections } }, null, 1);
  }
  async function importAll2(json) {
    let parsed;
    try {
      parsed = JSON.parse(json);
    } catch {
      throw new Error("Arquivo inv\xE1lido: n\xE3o \xE9 um backup do sistema.");
    }
    if (parsed?.app !== "oasis-site" || !parsed.data?.collections) throw new Error("Arquivo inv\xE1lido: n\xE3o \xE9 um backup do sistema.");
    for (const [c, docs] of Object.entries(parsed.data.collections)) {
      if (c === "admins") continue;
      for (const [id, d] of Object.entries(docs)) {
        if (c === "users" && d.role === "admin") continue;
        await set2(c, id, d);
      }
    }
  }
  var storageUsage2 = () => null;

  // js/data/db.js
  var impl = null;
  async function initData() {
    const cfg = typeof window !== "undefined" ? window.OASIS_FIREBASE : null;
    impl = cfg && cfg.apiKey && cfg.projectId ? firebase_exports : local_exports;
    await impl.init();
    return impl.mode;
  }
  var exportAll3 = () => impl.exportAll();
  var importAll3 = (json) => impl.importAll(json);
  var storageUsage3 = () => impl.storageUsage();
  var dataMode = () => impl ? impl.mode : null;
  var db = {
    get: (c, id) => impl.get(c, id),
    list: (c, filters = []) => impl.list(c, filters),
    add: (c, data) => impl.add(c, stamp(data)),
    set: (c, id, data, opts = {}) => impl.set(c, id, stamp(data), opts),
    update: (c, id, data) => impl.update(c, id, stamp(data)),
    remove: (c, id) => impl.remove(c, id)
  };
  var auth = {
    current: () => impl.authCurrent(),
    onChange: (cb) => impl.authOnChange(cb),
    signIn: (email, pw) => impl.signIn(email.trim().toLowerCase(), pw),
    signUp: (email, pw) => impl.signUp(email.trim().toLowerCase(), pw),
    signOut: () => impl.signOut(),
    changePassword: (current2, next) => impl.changePassword(current2, next),
    deleteMe: (current2) => impl.deleteMe(current2),
    disableLogin: (uid2) => impl.disableLogin(uid2),
    adminSetPassword: (uid2, pw) => impl.adminSetPassword(uid2, pw),
    checkPassword: (pw) => impl.checkPassword(pw),
    sendPasswordReset: (email) => impl.sendPasswordReset(email.trim().toLowerCase())
  };
  function stamp(data) {
    return { ...data, updatedAt: (/* @__PURE__ */ new Date()).toISOString() };
  }
  async function listSorted(c, filters, key, dir = "asc") {
    const rows = await db.list(c, filters);
    const k = typeof key === "function" ? key : (r) => r[key] ?? "";
    rows.sort((x, y) => {
      const a = k(x), b = k(y);
      const cmp = typeof a === "number" && typeof b === "number" ? a - b : String(a).localeCompare(String(b), "pt-BR");
      return dir === "desc" ? -cmp : cmp;
    });
    return rows;
  }

  // js/core/router.js
  var routes = [];
  function route(pattern, handler, opts = {}) {
    const keys = [];
    const re = new RegExp("^" + pattern.replace(/:(\w+)/g, (_, k) => {
      keys.push(k);
      return "([^/]+)";
    }) + "/?$");
    routes.push({ re, keys, handler, opts });
  }
  function currentPath() {
    const hash = location.hash.replace(/^#/, "") || "/";
    const [path, qs = ""] = hash.split("?");
    return { path: path || "/", query: Object.fromEntries(new URLSearchParams(qs)) };
  }
  function resolve(path) {
    for (const r of [...routes.filter((x) => !x.keys.length), ...routes.filter((x) => x.keys.length)]) {
      const m = path.match(r.re);
      if (m) return { ...r, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
    }
    return null;
  }
  function go(path) {
    if (location.hash === "#" + path) window.dispatchEvent(new HashChangeEvent("hashchange"));
    else location.hash = path;
  }

  // js/core/ui.js
  function h(value) {
    return String(value ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
  }
  var Raw = class {
    constructor(s) {
      this.s = s;
    }
    toString() {
      return this.s;
    }
  };
  var raw = (s) => new Raw(String(s ?? ""));
  function html(strings, ...values) {
    return raw(strings.reduce((out, str2, i) => {
      if (i === 0) return str2;
      const v = values[i - 1];
      const piece = Array.isArray(v) ? v.map((x) => x instanceof Raw ? x.s : h(x)).join("") : v instanceof Raw ? v.s : v === false || v == null ? "" : h(v);
      return out + piece + str2;
    }, ""));
  }
  var MONTHS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  function fmtDate(iso) {
    if (!iso) return "\u2014";
    const [y, m, d] = iso.slice(0, 10).split("-");
    const date = `${d}/${m}/${y}`;
    return iso.length > 10 ? `${date} ${iso.slice(11, 16)}` : date;
  }
  var fmtTime = (iso) => iso && iso.length > 10 ? iso.slice(11, 16) : "\u2014";
  function dateParts(iso) {
    if (!iso) return { day: "", month: "" };
    const [, m, d] = iso.slice(0, 10).split("-");
    return { day: d, month: MONTHS[Number(m) - 1] };
  }
  var todayISO = () => (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
  function paragraphs(text) {
    return raw(String(text || "").split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean).map((b) => `<p>${b.split("\n").map(h).join("<br>")}</p>`).join(""));
  }
  var lines = (text) => String(text || "").split("\n").map((l) => l.trim()).filter(Boolean);
  function faqItems(text) {
    return String(text || "").split(/\n\s*\n/).map((b) => lines(b)).filter((ls) => ls.length).map((ls) => [ls[0], ls.slice(1).join("\n")]);
  }
  function slugify(text) {
    return String(text || "").normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 80) || "item";
  }
  function truncate(text, n) {
    const s = String(text || "");
    return s.length > n ? s.slice(0, n - 1).trimEnd() + "\u2026" : s;
  }
  function youtubeEmbed(url) {
    if (!url) return null;
    const m = String(url).match(/(?:watch\?v=|youtu\.be\/|embed\/)([\w-]{6,})/);
    return m ? `https://www.youtube-nocookie.com/embed/${m[1]}` : null;
  }
  var pending = [];
  function flash(message, kind = "info") {
    pending.push({ message, kind });
  }
  function renderFlashes() {
    const box = document.getElementById("flashes");
    if (!box) return;
    box.innerHTML = pending.map((f) => `<p class="flash ${h(f.kind)}" ${f.kind === "error" ? 'role="alert"' : ""}>${h(f.message)}</p>`).join("");
    pending = [];
  }
  function formData(form) {
    const fd = new FormData(form);
    const out = {};
    for (const [k, v] of fd.entries()) {
      if (v instanceof File) continue;
      if (k in out) out[k] = [].concat(out[k], v);
      else out[k] = v;
    }
    return out;
  }
  var asList = (v) => v == null ? [] : Array.isArray(v) ? v : [v];
  var str = (v, max = 500) => String(v ?? "").trim().slice(0, max);
  var int = (v, dflt = null) => {
    const n = parseInt(v, 10);
    return Number.isFinite(n) ? n : dflt;
  };
  var num = (v) => {
    const n = parseFloat(String(v ?? "").replace(",", "."));
    return Number.isFinite(n) ? n : null;
  };
  function download(filename, content, type = "text/plain") {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const a = Object.assign(document.createElement("a"), { href: url, download: filename });
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1e3);
  }

  // js/core/session.js
  var session = { user: null, profile: null, isAdmin: false };
  var authFlow = { active: false };
  var cache = {};
  async function refreshSession() {
    const user = auth.current();
    session.user = user;
    session.profile = null;
    session.isAdmin = false;
    if (user) {
      const [profile, admin] = await Promise.all([db.get("users", user.uid).catch(() => null), db.get("admins", user.uid).catch(() => null)]);
      session.profile = profile;
      session.isAdmin = !!admin;
      if (profile && profile.active === false && !admin) {
        await auth.signOut();
        session.user = null;
        session.profile = null;
        flash("Este acesso foi desativado pela coordena\xE7\xE3o.", "error");
      }
    }
    return session;
  }
  var isStaff = () => session.isAdmin || session.profile?.role === "professor";
  function merge(base, over) {
    const out = structuredClone(base);
    for (const [k, v] of Object.entries(over || {})) {
      out[k] = v && typeof v === "object" && !Array.isArray(v) && typeof out[k] === "object" && !Array.isArray(out[k]) ? merge(out[k], v) : v;
    }
    return out;
  }
  async function getSettings(force = false) {
    if (force || !cache.loaded) {
      const [site, general, scoring] = await Promise.all(["site", "general", "scoring"].map((k) => db.get("settings", k).catch(() => null)));
      cache = { loaded: true, site: merge(SITE_DEFAULTS, site), general: merge(GENERAL_DEFAULTS, general), scoring: merge(SCORING_DEFAULTS, scoring) };
      for (const s of [cache.site, cache.general, cache.scoring]) delete s.id;
    }
    return cache;
  }
  var invalidateSettings = () => {
    cache = {};
  };

  // js/core/shell.js
  var NAV = [
    ["A O\xE1sis", "oasis", [["/quem-somos", "Quem somos"], ["/historia", "Nossa hist\xF3ria"], ["/missao-visao-valores", "Miss\xE3o, vis\xE3o e valores"], ["/transparencia", "Transpar\xEAncia"]]],
    ["Projetos", "projetos", null],
    // preenchido com os projetos publicados
    ["Esportes", "esportes", [["/modalidades", "Modalidades"], ["/calendario", "Calend\xE1rio esportivo"], ["/professores", "Professores"]]],
    ["Conte\xFAdo", "conteudo", [["/noticias", "Not\xEDcias"], ["/eventos", "Eventos"]]],
    ["Participe", "participe", [["/inscricoes", "Inscri\xE7\xF5es"], ["/entrar", "J\xE1 sou inscrito (entrar)"], ["/como-ajudar", "Como ajudar"], ["/doacoes", "Doa\xE7\xF5es"], ["/contato", "Contato"]]]
  ];
  function renderHeader(site, projects, currentPath2, { unread = 0 } = {}) {
    const audience = !session.user ? "visitante" : session.isAdmin ? "coordenacao" : "inscrito";
    const cur = (href) => raw(currentPath2 === href ? 'aria-current="page"' : "");
    const link = (href, label) => html`<li><a href="#${href}" ${cur(href)}>${label}</a></li>`;
    const sub = (label, key, list3) => html`<li class="has-sub"><button type="button" aria-expanded="false" aria-controls="sub-${key}"
      ${raw(list3.some(([h2]) => h2 === currentPath2) ? 'class="has-current"' : "")}>${label}</button>
    <ul id="sub-${key}" class="sub">${list3.map(([href, text]) => html`<li><a href="#${href}" ${cur(href)}>${text}</a></li>`)}</ul></li>`;
    const siteMenu = (label) => sub(label, "site", [
      ["/site", "P\xE1gina inicial do site"],
      ["/noticias", "Not\xEDcias"],
      ["/eventos", "Eventos"],
      ["/calendario", "Calend\xE1rio esportivo"],
      ["/projetos", "Projetos"],
      ["/contato", "Contato"]
    ]);
    let main2, actions, homeLabel, areaLabel;
    if (audience === "visitante") {
      homeLabel = "In\xEDcio";
      main2 = html`${link("/", "In\xEDcio")}${NAV.map(([label, key, items]) => sub(
        label,
        key,
        items || [["/projetos", "Todos os projetos"], ...projects.map((x) => [`/projetos/${x.id}`, x.name]), ["/esporte-inclusivo", "Esporte inclusivo"]]
      ))}`;
      actions = html`<li><a href="#/entrar" ${cur("/entrar")}>Já sou inscrito</a></li><li><a class="btn btn-cta" href="#/cadastro">Inscreva-se</a></li>`;
    } else if (audience === "inscrito") {
      const prof = session.profile?.role === "professor";
      areaLabel = prof ? "\xC1rea do professor" : "\xC1rea do aluno";
      const badge = unread ? html` <span class="badge" aria-label="${unread} ${unread === 1 ? "aviso novo" : "avisos novos"}">${unread}</span>` : "";
      main2 = html`${link("/conta", "In\xEDcio")}${link("/conta/agenda", "Minha agenda")}
      ${!prof ? link("/conta/competicoes", "Competi\xE7\xF5es") : ""}${link("/conta/apresentacoes", "Apresenta\xE7\xF5es")}
      <li><a href="#/conta/avisos" ${cur("/conta/avisos")}>Avisos${badge}</a></li>
      ${prof ? link("/painel", "Central do evento") : ""}
      ${sub("Meus dados", "dados", [
        ["/conta/perfil", "Perfil e modalidades"],
        ...!prof ? [["/conta/acessibilidade", "Acessibilidade"]] : [],
        ["/conta/privacidade", "Privacidade e autoriza\xE7\xF5es"],
        ...!prof ? [["/conta/comprovante", "Comprovante de inscri\xE7\xE3o"]] : [],
        ["/senha", "Trocar senha"]
      ])}
      ${siteMenu("Site da O\xE1sis")}`;
      actions = html`<li class="who" aria-label="Conectado como ${session.profile?.name || ""}">${(session.profile?.name || "").split(" ")[0]}</li>
      <li><button type="button" class="link-btn" data-action="logout">Sair</button></li>`;
    } else {
      areaLabel = "Coordena\xE7\xE3o";
      main2 = html`${link("/painel", "Central do evento")}${link("/painel/eventos", "Eventos")}${link("/painel/pessoas", "Pessoas")}${link("/painel/avisos", "Avisos")}
      ${sub("Site", "siteadm", [
        ["/painel/site", "Textos e contatos"],
        ["/painel/site/noticias", "Not\xEDcias"],
        ["/painel/site/projetos", "Projetos"],
        ["/painel/site/patrocinadores", "Patrocinadores"],
        ["/painel/site/mensagens", "Mensagens"],
        ["/site", "Ver o site p\xFAblico"]
      ])}
      ${link("/painel/backup", "Backup")}`;
      actions = html`<li class="who">Coordenação</li><li><button type="button" class="link-btn" data-action="logout">Sair</button></li>`;
    }
    const header = document.getElementById("site-header");
    header.dataset.audience = audience;
    header.innerHTML = html`
    <div class="wrap header-row">
      <a class="logo" href="#/"><span class="logo-mark">${site.shortName || "O\xC1SIS"}</span>
        <span class="logo-name">${areaLabel ? html`<strong class="area-label">${areaLabel}</strong>` : site.name}</span></a>
      <button type="button" class="menu-toggle" aria-expanded="false" aria-controls="menu-principal">Menu</button>
      <nav class="main" id="menu-principal" aria-label="${audience === "visitante" ? "Navega\xE7\xE3o principal" : areaLabel}">
        <ul class="menu">${main2}</ul>
        <ul class="menu menu-actions">${actions}</ul>
      </nav>
    </div>
    <div class="stripe" aria-hidden="true"><span></span><span></span><span></span></div>`.s;
    bindMenu();
  }
  function renderFooter(site, projects) {
    const tel = (t) => String(t).replace(/\D/g, "");
    document.getElementById("site-footer").innerHTML = html`
    <div class="wrap footer-grid">
      <div class="footer-about"><p class="logo-mark">${site.shortName || "O\xC1SIS"}</p><p><strong>${site.name}</strong><br>${site.tagline}</p>
        <ul class="social" aria-label="Redes sociais">
          ${site.facebook ? html`<li><a href="${site.facebook}" rel="noopener" target="_blank">Facebook</a></li>` : ""}
          ${site.instagram ? html`<li><a href="${site.instagram}" rel="noopener" target="_blank">Instagram</a></li>` : ""}
          ${site.youtube ? html`<li><a href="${site.youtube}" rel="noopener" target="_blank">YouTube</a></li>` : ""}</ul></div>
      <nav aria-labelledby="ft-inst"><h2 id="ft-inst">Institucional</h2><ul>
        <li><a href="#/quem-somos">Quem somos</a></li><li><a href="#/historia">Nossa história</a></li>
        <li><a href="#/missao-visao-valores">Missão, visão e valores</a></li><li><a href="#/transparencia">Transparência</a></li>
        <li><a href="#/noticias">Notícias</a></li><li><a href="#/eventos">Eventos</a></li></ul></nav>
      <nav aria-labelledby="ft-proj"><h2 id="ft-proj">Projetos</h2><ul>
        ${projects.map((p) => html`<li><a href="#/projetos/${p.id}">${p.name}</a></li>`)}<li><a href="#/esporte-inclusivo">Esporte inclusivo</a></li></ul></nav>
      <nav aria-labelledby="ft-part"><h2 id="ft-part">Participe</h2><ul>
        <li><a href="#/inscricoes">Inscrições</a></li><li><a href="#/modalidades">Modalidades</a></li><li><a href="#/calendario">Calendário esportivo</a></li>
        <li><a href="#/como-ajudar">Como ajudar</a></li><li><a href="#/doacoes">Doações</a></li><li><a href="#/contato">Contato</a></li></ul></nav>
      <div><h2>Contato</h2><address>
        ${site.email ? html`<a href="mailto:${site.email}">${site.email}</a><br>` : ""}
        ${site.phone1 ? html`<a href="tel:${tel(site.phone1)}">${site.phone1}</a><br>` : ""}
        ${site.phone2 ? html`<a href="tel:${tel(site.phone2)}">${site.phone2}</a><br>` : ""}
        ${site.address || ""}${site.hours ? html`<br>${site.hours}` : ""}</address></div>
    </div>
    <div class="wrap footer-legal"><p>© ${(/* @__PURE__ */ new Date()).getFullYear()} ${site.name}</p>
      <ul><li><a href="#/privacidade">Política de privacidade</a></li><li><a href="#/termos">Termos de uso</a></li>
        <li><a href="#/transparencia">Transparência</a></li><li><a href="#/faq">Perguntas frequentes</a></li><li><a href="#/acessibilidade">Acessibilidade</a></li></ul></div>`.s;
  }
  function bindMenu() {
    const buttons = [...document.querySelectorAll(".has-sub > button")];
    const closeAll = (except) => buttons.forEach((b) => b !== except && b.setAttribute("aria-expanded", "false"));
    for (const btn of buttons) {
      btn.addEventListener("click", (e) => {
        e.stopPropagation();
        const open = btn.getAttribute("aria-expanded") === "true";
        closeAll(btn);
        btn.setAttribute("aria-expanded", open ? "false" : "true");
      });
      const li = btn.parentElement;
      li.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && btn.getAttribute("aria-expanded") === "true") {
          btn.setAttribute("aria-expanded", "false");
          btn.focus();
        }
      });
      li.addEventListener("focusout", (e) => {
        if (!li.contains(e.relatedTarget)) btn.setAttribute("aria-expanded", "false");
      });
    }
    const toggle = document.querySelector(".menu-toggle");
    toggle?.addEventListener("click", () => toggle.setAttribute("aria-expanded", toggle.getAttribute("aria-expanded") === "true" ? "false" : "true"));
  }
  function closeMenus() {
    document.querySelectorAll(".has-sub > button, .menu-toggle").forEach((b) => b.setAttribute("aria-expanded", "false"));
  }
  function initA11yBar() {
    const root = document.documentElement;
    root.classList.add("js");
    const load2 = (k) => {
      try {
        return localStorage.getItem(k);
      } catch {
        return null;
      }
    };
    const store = (k, v) => {
      try {
        localStorage.setItem(k, v);
      } catch {
      }
    };
    let contrast = load2("a11y-contrast"), scale = parseFloat(load2("a11y-scale") || "1");
    const live = document.getElementById("a11y-live");
    const say = (msg) => {
      live.textContent = "";
      setTimeout(() => {
        live.textContent = msg;
      }, 50);
    };
    const apply = () => {
      if (contrast === "high") root.setAttribute("data-contrast", "high");
      else root.removeAttribute("data-contrast");
      root.style.setProperty("--font-scale", scale);
      document.getElementById("toggle-contrast").setAttribute("aria-pressed", contrast === "high" ? "true" : "false");
    };
    apply();
    document.getElementById("toggle-contrast").addEventListener("click", () => {
      contrast = contrast === "high" ? "normal" : "high";
      store("a11y-contrast", contrast);
      apply();
      say(contrast === "high" ? "Alto contraste ativado" : "Alto contraste desativado");
    });
    const setScale = (s) => {
      scale = Math.min(1.6, Math.max(0.9, Math.round(s * 10) / 10));
      store("a11y-scale", scale);
      apply();
      say(`Tamanho do texto ${Math.round(scale * 100)}%`);
    };
    document.getElementById("font-inc").addEventListener("click", () => setScale(scale + 0.1));
    document.getElementById("font-dec").addEventListener("click", () => setScale(scale - 0.1));
    document.getElementById("font-reset").addEventListener("click", () => setScale(1));
    document.addEventListener("click", (e) => {
      const skip = e.target.closest(".skip-link, [data-focus]");
      if (!skip) return;
      e.preventDefault();
      const target = skip.classList.contains("skip-link") ? document.getElementById("conteudo") : document.getElementById(skip.dataset.focus);
      if (target) {
        if (!target.hasAttribute("tabindex") && !/^(INPUT|SELECT|TEXTAREA|BUTTON|A)$/.test(target.tagName)) target.setAttribute("tabindex", "-1");
        target.focus();
        target.scrollIntoView({ block: "center" });
      }
    });
  }
  function announce(msg) {
    const live = document.getElementById("a11y-live");
    if (live) {
      live.textContent = "";
      setTimeout(() => {
        live.textContent = msg;
      }, 50);
    }
  }

  // js/core/media.js
  var SIGNATURES = [[[255, 216, 255], "image/jpeg"], [[137, 80, 78, 71], "image/png"], [[71, 73, 70, 56], "image/gif"]];
  var MAX_INPUT = 8 * 1024 * 1024;
  async function sniff(file) {
    const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
    for (const [sig, type] of SIGNATURES) if (sig.every((b, i) => head[i] === b)) return type;
    if (String.fromCharCode(...head.slice(0, 4)) === "RIFF" && String.fromCharCode(...head.slice(8, 12)) === "WEBP") return "image/webp";
    return null;
  }
  async function uploadImage(file, maxSide = 1200) {
    if (!file || !file.size) return null;
    if (file.size > MAX_INPUT) throw new Error("Imagem maior que 8 MB.");
    if (!await sniff(file)) throw new Error("Envie uma imagem JPG, PNG, WebP ou GIF.");
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const canvas = Object.assign(document.createElement("canvas"), {
      width: Math.round(bitmap.width * scale),
      height: Math.round(bitmap.height * scale)
    });
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#fff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    let quality = 0.82, data = canvas.toDataURL("image/jpeg", quality);
    while (data.length > 35e4 && quality > 0.4) {
      quality -= 0.1;
      data = canvas.toDataURL("image/jpeg", quality);
    }
    if (data.length > 45e4) throw new Error("N\xE3o foi poss\xEDvel reduzir a imagem o suficiente. Use uma foto menor.");
    return db.add("media", { data, width: canvas.width, height: canvas.height });
  }
  var removeImage = async (id) => {
    if (id && !id.startsWith("img/")) await db.remove("media", id).catch(() => {
    });
  };
  var cache2 = /* @__PURE__ */ new Map();
  async function hydrateImages(root = document) {
    const imgs = [...root.querySelectorAll("img[data-media]")];
    await Promise.all(imgs.map(async (img2) => {
      const id = img2.dataset.media;
      if (!cache2.has(id)) cache2.set(id, db.get("media", id).then((m) => m?.data || "").catch(() => ""));
      const src = await cache2.get(id);
      if (src) img2.src = src;
      else img2.remove();
    }));
  }
  var forgetImage = (id) => cache2.delete(id);

  // js/core/libras.js
  var wait = (ms) => new Promise((r) => setTimeout(r, ms));
  async function vlibrasPlayer() {
    if (!window.VLibras) return null;
    if (!window.plugin) document.querySelector("[vw-access-button]")?.click();
    for (let i = 0; i < 40; i++) {
      const player = window.plugin?.player;
      if (player && typeof player.translate === "function") return player;
      await wait(250);
    }
    return null;
  }
  async function showInLibras(text, button) {
    button?.setAttribute("aria-busy", "true");
    try {
      const player = await vlibrasPlayer();
      if (player) {
        player.translate(text);
        return;
      }
      const msg = window.VLibras ? "Abra o VLibras (bot\xE3o azul com a m\xE3o, no canto direito da tela) e clique no texto da explica\xE7\xE3o para ver em Libras." : "O avatar VLibras precisa de internet e n\xE3o carregou. Verifique a conex\xE3o ou pe\xE7a \xE0 coordena\xE7\xE3o o v\xEDdeo com int\xE9rprete.";
      flash(msg, "info");
      renderFlashes();
      document.getElementById("flashes")?.scrollIntoView({ block: "center" });
    } finally {
      button?.removeAttribute("aria-busy");
    }
  }
  function speak(text, button) {
    if (!("speechSynthesis" in window)) {
      flash("Este navegador n\xE3o l\xEA textos em voz alta.", "info");
      renderFlashes();
      return;
    }
    if (speechSynthesis.speaking) {
      speechSynthesis.cancel();
      button.textContent = "Ouvir explica\xE7\xE3o";
      return;
    }
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "pt-BR";
    u.rate = 0.95;
    const voice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith("pt"));
    if (voice) u.voice = voice;
    u.onend = () => {
      button.textContent = "Ouvir explica\xE7\xE3o";
    };
    button.textContent = "Parar leitura";
    speechSynthesis.speak(u);
  }
  function bindLibras(root) {
    root.querySelectorAll("[data-libras]").forEach((b) => b.addEventListener("click", () => {
      const el = document.getElementById(b.dataset.libras);
      if (el) showInLibras(el.innerText.replace(/\s+/g, " ").trim(), b);
    }));
    root.querySelectorAll("[data-speak]").forEach((b) => b.addEventListener("click", () => {
      const el = document.getElementById(b.dataset.speak);
      if (el) speak(el.innerText, b);
    }));
  }

  // js/pages/helpers.js
  function bindForm(root, selector, handler) {
    root.querySelectorAll(selector).forEach((form) => {
      form.addEventListener("submit", async (e) => {
        e.preventDefault();
        const data = formData(form);
        if (e.submitter?.name) data[e.submitter.name] = e.submitter.value;
        const buttons = [...form.querySelectorAll("button[type=submit], button:not([type])")];
        buttons.forEach((b) => {
          b.disabled = true;
        });
        form.setAttribute("aria-busy", "true");
        try {
          await handler(data, form, e);
        } catch (err) {
          console.warn(err);
          flash(err.message || "N\xE3o foi poss\xEDvel concluir. Tente novamente.", "error");
          renderFlashes();
          document.getElementById("flashes")?.scrollIntoView({ block: "center" });
        } finally {
          buttons.forEach((b) => {
            b.disabled = false;
          });
          form.removeAttribute("aria-busy");
        }
      });
    });
  }
  function notFound() {
    return { title: "P\xE1gina n\xE3o encontrada", body: html`<h1>Página não encontrada</h1><p class="lead">O endereço não existe ou o conteúdo não está publicado.</p>
    <p><a class="btn" href="#/">Voltar ao início</a></p>` };
  }
  function denied() {
    return { title: "Acesso negado", body: html`<h1>Acesso negado</h1><p class="lead">Sua conta não tem permissão para esta página.</p><p><a class="btn" href="#/">Voltar ao início</a></p>` };
  }
  var confirmText = (form, word = "EXCLUIR") => (form.querySelector("[name=confirm]")?.value || "").trim() === word;

  // js/logic/brackets.js
  function seedOrder(size) {
    if (size < 1 || (size & size - 1) !== 0) throw new Error("size deve ser pot\xEAncia de 2");
    let order = [1];
    while (order.length < size) {
      const n = order.length * 2;
      order = order.flatMap((s) => [s, n + 1 - s]);
    }
    return order;
  }
  function singleElimination(entries) {
    const n = entries.length;
    if (n < 2) throw new Error("S\xE3o necess\xE1rios pelo menos 2 inscritos para gerar a chave");
    const size = 2 ** Math.ceil(Math.log2(n));
    const rounds = Math.log2(size);
    const slots = seedOrder(size).map((s) => s <= n ? entries[s - 1] : null);
    const matches = [];
    for (let r = 1; r <= rounds; r++) {
      const count = size >> r;
      for (let p = 0; p < count; p++) {
        const m = {
          round: r,
          position: p,
          a: null,
          b: null,
          winner: null,
          status: "pendente",
          next: r < rounds ? [r + 1, Math.floor(p / 2)] : null,
          next_slot: r < rounds ? p % 2 === 0 ? "a" : "b" : null
        };
        if (r === 1) {
          m.a = slots[2 * p];
          m.b = slots[2 * p + 1];
        }
        matches.push(m);
      }
    }
    const index = new Map(matches.map((m) => [`${m.round}-${m.position}`, m]));
    for (const m of matches.filter((m2) => m2.round === 1)) {
      if (m.a === null || m.b === null) {
        m.winner = m.a !== null ? m.a : m.b;
        m.status = "bye";
        if (m.next && m.winner !== null) index.get(`${m.next[0]}-${m.next[1]}`)[m.next_slot] = m.winner;
      }
    }
    return matches;
  }
  function roundName(round, total) {
    const remaining = total - round;
    return { 0: "Final", 1: "Semifinal", 2: "Quartas de final", 3: "Oitavas de final" }[remaining] || `${round}\xAA fase`;
  }
  function splitGroups(entries, count) {
    if (count < 1) throw new Error("N\xFAmero de grupos deve ser >= 1");
    if (entries.length < 2 * count) throw new Error("Cada grupo precisa de pelo menos 2 inscritos");
    const groups = Array.from({ length: count }, () => []);
    entries.forEach((e, i) => {
      const cycle = Math.floor(i / count), pos = i % count;
      groups[cycle % 2 === 0 ? pos : count - 1 - pos].push(e);
    });
    return groups;
  }
  function roundRobin(members) {
    let players = [...members];
    if (players.length % 2) players.push(null);
    const n = players.length, out = [];
    for (let r = 0; r < n - 1; r++) {
      let pos = 0;
      for (let i = 0; i < n / 2; i++) {
        const a = players[i], b = players[n - 1 - i];
        if (a !== null && b !== null) out.push({ round: r + 1, position: pos++, a, b });
      }
      players = [players[0], players[n - 1], ...players.slice(1, n - 1)];
    }
    return out;
  }
  var groupLabels = (count) => Array.from({ length: count }, (_, i) => String.fromCharCode(65 + i));
  function knockoutFromGroups(rankedGroups, qualifiers) {
    const seeds = [];
    for (let place = 0; place < qualifiers; place++) for (const g of rankedGroups) if (place < g.length) seeds.push(g[place]);
    return seeds;
  }

  // js/logic/calendar.js
  function interval(item, buffer = 0) {
    const start = new Date(item.start).getTime();
    return [start, start + (Number(item.duration_min || 0) + buffer) * 6e4];
  }
  function overlaps(x, y, buffer = 0) {
    const [xs, xe] = interval(x, buffer), [ys, ye] = interval(y, buffer);
    return xs < ye && ys < xe;
  }
  function findConflicts(items, buffer = 0) {
    const timed = items.filter((i) => i.start).sort((a, b) => interval(a)[0] - interval(b)[0]);
    const out = [];
    timed.forEach((x, i) => {
      for (const y of timed.slice(i + 1)) {
        if (interval(y)[0] >= interval(x, buffer)[1]) break;
        const shared = x.people.filter((p) => y.people.includes(p));
        if (shared.length && overlaps(x, y, buffer)) out.push({ a: x, b: y, people: [...new Set(shared)].sort() });
      }
    });
    return out;
  }
  function conflictsFor(candidate, items, buffer = 0) {
    if (!candidate.start) return [];
    return items.filter((y) => y.start && !(y.kind === candidate.kind && y.id === candidate.id)).map((y) => ({ y, shared: candidate.people.filter((p) => y.people.includes(p)) })).filter(({ y, shared }) => shared.length && overlaps(candidate, y, buffer)).map(({ y, shared }) => ({ a: candidate, b: y, people: [...new Set(shared)].sort() }));
  }
  function ageForEvent(birthDate, eventStart, mode3 = "ano") {
    if (!birthDate) return null;
    const [by, bm, bd] = birthDate.slice(0, 10).split("-").map(Number);
    const [ey, em, ed] = eventStart.slice(0, 10).split("-").map(Number);
    if (mode3 === "ano") return ey - by;
    return ey - by - (em < bm || em === bm && ed < bd ? 1 : 0);
  }
  var ageToday = (birthDate) => ageForEvent(birthDate, (/* @__PURE__ */ new Date()).toISOString().slice(0, 10), "data_evento");
  function abbreviate(name) {
    const parts = String(name || "").trim().split(/\s+/);
    if (parts.length <= 1) return name || "";
    return parts[0] + " " + parts.slice(1).map((p) => p[0] + ".").join(" ");
  }

  // js/logic/services.js
  var MODALITIES = [
    { code: "musica", name: "M\xFAsica", kind: "arte", scoring: "arte" },
    { code: "danca", name: "Dan\xE7a", kind: "arte", scoring: "arte" },
    { code: "futebol", name: "Futebol", kind: "coletivo", scoring: "futebol" },
    { code: "futsal", name: "Futsal", kind: "coletivo", scoring: "futsal" },
    { code: "basquete", name: "Basquete", kind: "coletivo", scoring: "basquete" },
    { code: "volei", name: "V\xF4lei", kind: "coletivo", scoring: "volei" },
    { code: "jiu_jitsu", name: "Jiu-jitsu", kind: "luta", scoring: "bjj" },
    { code: "taekwondo", name: "Taekwondo", kind: "luta", scoring: "taekwondo" },
    { code: "para_jiu_jitsu", name: "Parajiu-j\xEDtsu", kind: "luta", scoring: "bjj", adaptedOf: "jiu_jitsu" },
    { code: "para_taekwondo", name: "Parataekwondo", kind: "luta", scoring: "taekwondo", adaptedOf: "taekwondo" }
  ];
  var MOD = Object.fromEntries(MODALITIES.map((m) => [m.code, m]));
  var ROLES = { professor: "Professor", artista: "Artista (m\xFAsica e dan\xE7a)", atleta: "Atleta (futebol, futsal, basquete, v\xF4lei)", lutador: "Lutador (jiu-jitsu, taekwondo)" };
  var ROLE_LABELS = { ...ROLES, admin: "Administrador" };
  var ROLE_KINDS = { artista: ["arte"], atleta: ["coletivo"], lutador: ["luta"], professor: ["arte", "coletivo", "luta"] };
  var DISABILITY_TYPES = {
    fisica: "Defici\xEAncia f\xEDsica / motora",
    visual: "Defici\xEAncia visual (cegueira ou baixa vis\xE3o)",
    auditiva: "Defici\xEAncia auditiva / surdez",
    intelectual: "Defici\xEAncia intelectual",
    tea: "Transtorno do Espectro Autista (TEA)",
    multipla: "Defici\xEAncia m\xFAltipla",
    outra: "Outra"
  };
  var SUPPORT_FUNCTIONS = {
    mesario: "Mes\xE1rio(a) / s\xFAmula",
    cronometrista: "Cronometrista",
    som_palco: "Controle de som e palco",
    foto: "Registro fotogr\xE1fico",
    recepcao: "Recep\xE7\xE3o e credenciamento"
  };
  var SLOTS = { abertura: "Show de abertura", intervalo: "Intervalo", encerramento: "Encerramento" };
  var EVENT_KINDS = { campeonato: "Campeonato", festival: "Festival cultural", misto: "Campeonato + festival", institucional: "Evento institucional" };
  var GENDERS = { misto: "Misto", feminino: "Feminino", masculino: "Masculino" };
  var TERMS_VERSION = "2026-11";
  function publicName(user) {
    return abbreviate(user.name) + (user.affiliation ? ` (${user.affiliation})` : "");
  }
  async function eligibilityProblem(user, cat, event) {
    const { general } = await getSettings();
    const age = ageForEvent(user.birthDate, event.startsOn, general.ageReference);
    if (age == null) return "Data de nascimento n\xE3o informada";
    if (age < cat.ageMin || age > cat.ageMax) return `Idade de refer\xEAncia ${age} fora da faixa ${cat.ageMin}\u2013${cat.ageMax}`;
    if (cat.gender !== "misto" && user.gender !== cat.gender) return "Categoria de outro sexo";
    const um = (user.modalities || {})[cat.modality];
    if (!um) return "Modalidade n\xE3o vinculada ao perfil";
    if (cat.weightMin != null || cat.weightMax != null) {
      if (um.weight == null) return "Peso n\xE3o informado";
      const below = cat.weightMin != null && (cat.weightMinExclusive ? um.weight <= cat.weightMin : um.weight < cat.weightMin);
      if (below || cat.weightMax != null && um.weight > cat.weightMax) return `Peso ${um.weight} kg fora da categoria`;
    }
    return null;
  }
  async function entryLabels(entries, { full = false } = {}) {
    const out = {};
    const users = full ? Object.fromEntries((await db.list("users")).map((u) => [u.id, u])) : {};
    for (const e of entries) {
      if (e.teamId) out[e.id] = e.publicName;
      else if (full && users[e.userId]) out[e.id] = users[e.userId].name + (users[e.userId].affiliation ? ` (${users[e.userId].affiliation})` : "");
      else out[e.id] = e.publicName;
    }
    return out;
  }
  async function entryPeople(entry, teamsById) {
    if (!entry) return [];
    if (entry.userId) return [entry.userId];
    const team = teamsById?.[entry.teamId] || await db.get("teams", entry.teamId);
    return (team?.members || []).map((m) => m.uid);
  }
  async function generateBracket(categoryId) {
    const cat = await db.get("categories", categoryId);
    const entries = (await db.list("entries", [["categoryId", "==", categoryId]])).filter((e) => e.status === "confirmada").sort((a, b) => (a.seed ?? 9999) - (b.seed ?? 9999) || String(a.createdAt).localeCompare(String(b.createdAt)));
    const ids = entries.map((e) => e.id);
    for (const m of await db.list("matches", [["categoryId", "==", categoryId]])) await db.remove("matches", m.id);
    const base = { categoryId, eventId: cat.eventId, durationMin: cat.matchMinutes || 10, log: [], extra: {} };
    if (cat.format === "grupos") {
      const groups = splitGroups(ids, cat.groupCount || 2);
      const labels = groupLabels(groups.length);
      for (const [gi, members] of groups.entries()) {
        for (const m of roundRobin(members)) {
          await db.add("matches", { ...base, stage: "grupo", groupLabel: labels[gi], round: m.round, position: m.position, a: m.a, b: m.b, status: "pendente" });
        }
      }
    } else {
      await insertKnockout(base, singleElimination(ids));
    }
    await db.update("categories", categoryId, { status: "chave_gerada" });
  }
  async function insertKnockout(base, ms) {
    const idByKey = {};
    for (const m of [...ms].sort((x, y) => y.round - x.round)) {
      const nextId = m.next ? idByKey[`${m.next[0]}-${m.next[1]}`] : null;
      idByKey[`${m.round}-${m.position}`] = await db.add("matches", {
        ...base,
        stage: "mata",
        round: m.round,
        position: m.position,
        a: m.a,
        b: m.b,
        winner: m.winner,
        status: m.status,
        nextId: nextId || null,
        nextSlot: m.next_slot,
        method: m.status === "bye" ? "bye" : null
      });
    }
  }
  async function groupTables(categoryId, labels) {
    var _a;
    const cat = await db.get("categories", categoryId);
    const ms = (await db.list("matches", [["categoryId", "==", categoryId]])).filter((m) => m.stage === "grupo");
    const cfg = await pointsConfig(cat);
    const byGroup = {};
    for (const m of ms) (byGroup[_a = m.groupLabel] || (byGroup[_a] = [])).push(m);
    return Object.keys(byGroup).sort().map((label) => {
      const list3 = byGroup[label].sort((x, y) => x.round - y.round || x.position - y.position);
      const teams = [...new Set(list3.flatMap((m) => [m.a, m.b]).filter(Boolean))];
      const results = list3.filter((m) => m.status === "encerrada").map((m) => ({
        a: m.a,
        b: m.b,
        score_a: m.scoreA || 0,
        score_b: m.scoreB || 0,
        winner: m.isDraw ? "draw" : m.winner === m.a ? "a" : "b"
      }));
      const table = standings(teams, results, cfg).map((r) => ({ ...r, name: labels[r.team] || "?" }));
      return { label, table, matches: list3, done: list3.every((m) => m.status === "encerrada") };
    });
  }
  async function pointsConfig(cat) {
    const scoring = MOD[cat.modality].scoring;
    if (scoring === "bjj" || scoring === "taekwondo") return { win: 3, draw: 1, loss: 0 };
    return (await getSettings()).scoring.team[scoring];
  }
  async function generateKnockoutFromGroups(categoryId) {
    const cat = await db.get("categories", categoryId);
    const tables = await groupTables(categoryId, {});
    if (!tables.length || !tables.every((t) => t.done)) throw new Error("Conclua todas as partidas dos grupos antes de gerar o mata-mata");
    for (const m of (await db.list("matches", [["categoryId", "==", categoryId]])).filter((m2) => m2.stage === "mata")) await db.remove("matches", m.id);
    const seeds = knockoutFromGroups(tables.map((t) => t.table.map((r) => r.team)), cat.qualifiers || 2);
    await insertKnockout({ categoryId, eventId: cat.eventId, durationMin: cat.matchMinutes || 10, log: [], extra: {} }, singleElimination(seeds));
  }
  async function knockoutRounds(categoryId) {
    const ms = (await db.list("matches", [["categoryId", "==", categoryId]])).filter((m) => m.stage === "mata").sort((x, y) => x.round - y.round || x.position - y.position);
    if (!ms.length) return [];
    const total = Math.max(...ms.map((m) => m.round));
    return Array.from({ length: total }, (_, i) => ({ round: i + 1, name: roundName(i + 1, total), matches: ms.filter((m) => m.round === i + 1) }));
  }
  async function computeResult(match2, cat) {
    const { scoring: cfg } = await getSettings();
    const engine = MOD[cat.modality].scoring;
    const log = match2.log || [];
    const extra = match2.extra || {};
    if (engine === "bjj") return scoreBjj(log, cfg.bjj, extra.refereeDecision || null);
    if (engine === "taekwondo") return scoreTaekwondo(log, cfg.taekwondo, extra.superiorityDecision || null, extra.roundDecisions || {});
    const sets = (extra.sets || []).map((s) => [s.a, s.b]);
    return scoreTeamMatch(engine, log, cfg.team[engine], { sets, penalties: extra.penalties || null, knockout: match2.stage === "mata" });
  }
  async function finalizeMatch(matchId, woWinner = null) {
    const m = await db.get("matches", matchId);
    const cat = await db.get("categories", m.categoryId);
    const r = woWinner ? { winner: woWinner, method: "wo", score_a: 0, score_b: 0 } : await computeResult(m, cat);
    if (!["a", "b", "draw"].includes(r.winner)) throw new Error(r.pending || "Resultado ainda sem vencedor (falta decis\xE3o do \xE1rbitro/desempate)");
    if (r.winner === "draw" && m.stage === "mata") throw new Error("Mata-mata n\xE3o pode terminar empatado");
    const winEntry = r.winner === "draw" ? null : r.winner === "a" ? m.a : m.b;
    await db.update("matches", matchId, {
      status: "encerrada",
      winner: winEntry,
      isDraw: r.winner === "draw",
      scoreA: r.score_a ?? 0,
      scoreB: r.score_b ?? 0,
      method: r.method,
      result: { scorers: r.scorers || {}, method: r.method }
    });
    if (m.nextId && winEntry) await db.update("matches", m.nextId, { [m.nextSlot]: winEntry });
    return r;
  }
  async function reopenMatch(matchId) {
    const m = await db.get("matches", matchId);
    if (m.nextId) {
      const next = await db.get("matches", m.nextId);
      if (next?.status === "encerrada") throw new Error("A partida seguinte j\xE1 foi encerrada; reabra-a primeiro");
      await db.update("matches", m.nextId, { [m.nextSlot]: null });
    }
    await db.update("matches", matchId, { status: "pendente", winner: null, isDraw: false, method: null });
  }
  async function topScorers(categoryId, { full = false } = {}) {
    const ms = (await db.list("matches", [["categoryId", "==", categoryId]])).filter((m) => m.status === "encerrada");
    const totals = {};
    for (const m of ms) for (const [pid, v] of Object.entries(m.result?.scorers || {})) totals[pid] = (totals[pid] || 0) + v;
    if (!Object.keys(totals).length) return [];
    const teams = await db.list("teams");
    const names = {};
    for (const t of teams) for (const mb of t.members || []) names[mb.uid] = mb.publicName;
    if (full) for (const u of await db.list("users")) names[u.id] = u.name;
    return Object.entries(totals).map(([pid, total]) => ({ name: names[pid] || "?", total })).sort((x, y) => y.total - x.total);
  }
  async function calendarItems(eventId, { full = false, userId = null } = {}) {
    const filt = eventId ? [["eventId", "==", eventId]] : [];
    const [matches, perfs, cats, teams] = await Promise.all([
      db.list("matches", filt),
      db.list("performances", filt),
      db.list("categories", filt),
      db.list("teams")
    ]);
    const catById = Object.fromEntries(cats.map((c) => [c.id, c]));
    const teamsById = Object.fromEntries(teams.map((t) => [t.id, t]));
    const entryIds = [...new Set(matches.flatMap((m) => [m.a, m.b, m.winner]).filter(Boolean))];
    const entries = (await Promise.all(entryIds.map((id) => db.get("entries", id).catch(() => null)))).filter(Boolean);
    const entryById = Object.fromEntries(entries.map((e) => [e.id, e]));
    const labels = await entryLabels(entries, { full });
    const items = [];
    for (const m of matches) {
      if (!m.scheduledAt || m.status === "bye") continue;
      const people = [...await entryPeople(entryById[m.a], teamsById), ...await entryPeople(entryById[m.b], teamsById)];
      const a = labels[m.a] || "a definir", b = labels[m.b] || "a definir";
      const cname = catById[m.categoryId]?.name || "";
      items.push({
        kind: "match",
        id: m.id,
        eventId: m.eventId,
        start: m.scheduledAt,
        duration_min: m.durationMin || 10,
        people,
        label: `${cname}: ${a} \xD7 ${b}`,
        venue: m.venue,
        status: m.status,
        category: cname,
        categoryId: m.categoryId,
        a,
        b,
        scoreA: m.scoreA,
        scoreB: m.scoreB,
        method: m.method,
        winner: m.status === "encerrada" ? m.isDraw ? "Empate" : labels[m.winner] : null
      });
    }
    for (const p of perfs) {
      if (!p.scheduledAt) continue;
      items.push({
        kind: "performance",
        id: p.id,
        eventId: p.eventId,
        start: p.scheduledAt,
        duration_min: p.durationMin || 5,
        people: (p.members || []).map((x) => x.uid),
        label: `Apresenta\xE7\xE3o: ${p.title}`,
        venue: "Palco",
        title: p.title,
        slot: p.slot,
        accLibras: p.accLibras,
        accAudiodesc: p.accAudiodesc,
        accSeating: p.accSeating
      });
    }
    return (userId ? items.filter((i) => i.people.includes(userId)) : items).sort((x, y) => x.start.localeCompare(y.start));
  }
  async function checkSchedule(kind, id, start, duration, people) {
    const { general } = await getSettings();
    const found = conflictsFor({ kind, id, start, duration_min: duration, people }, await calendarItems(null, { full: true }), general.bufferMin || 0);
    return { found, block: general.conflictMode === "impedir" };
  }
  async function describeConflicts(found) {
    const users = Object.fromEntries((await db.list("users")).map((u) => [u.id, u.name]));
    return found.map((c) => `${c.people.map((p) => users[p] || "?").join(", ")} em \u201C${c.b.label}\u201D (${c.b.start.slice(11, 16)})`).join("; ");
  }
  var SLOT_ORDER = { abertura: 0, intervalo: 1, encerramento: 2 };
  async function stageScript(eventId, { full = false } = {}) {
    const perfs = await db.list("performances", [["eventId", "==", eventId]]);
    let names = {};
    if (full) names = Object.fromEntries((await db.list("users")).map((u) => [u.id, u.name]));
    return perfs.sort((x, y) => SLOT_ORDER[x.slot] - SLOT_ORDER[y.slot] || (x.order || 0) - (y.order || 0)).map((p) => ({
      ...p,
      members: (p.members || []).map((m) => ({ ...m, name: names[m.uid] || m.publicName })),
      teacherName: names[p.teacherId] || ""
    }));
  }
  async function defaultEventId() {
    const evs = await listSorted("events", [], "startsOn");
    const today = (/* @__PURE__ */ new Date()).toISOString().slice(0, 10);
    return (evs.find((e) => (e.endsOn || e.startsOn) >= today) || evs.at(-1))?.id || null;
  }
  async function eventHub(eventId, { full = true } = {}) {
    const ev = await db.get("events", eventId);
    if (!ev) return null;
    const { general } = await getSettings();
    const timeline = await calendarItems(eventId, { full });
    const conflicts = findConflicts(timeline, general.bufferMin || 0);
    const flagged = new Set(conflicts.flatMap((c) => [`${c.a.kind}:${c.a.id}`, `${c.b.kind}:${c.b.id}`]));
    timeline.forEach((it) => {
      it.conflict = flagged.has(`${it.kind}:${it.id}`);
    });
    const [cats, allMatches, allEntries] = await Promise.all([
      db.list("categories", [["eventId", "==", eventId]]),
      db.list("matches", [["eventId", "==", eventId]]),
      db.list("entries", [["eventId", "==", eventId]])
    ]);
    const labels = await entryLabels(allEntries, { full });
    const categories = cats.sort((x, y) => MOD[x.modality].name.localeCompare(MOD[y.modality].name) || x.ageMin - y.ageMin || (x.gender || "").localeCompare(y.gender || "") || (x.weightMax ?? 999) - (y.weightMax ?? 999)).map((c) => {
      const ms = allMatches.filter((m) => m.categoryId === c.id && m.status !== "bye");
      const done = ms.filter((m) => m.status === "encerrada");
      const final = ms.find((m) => m.stage === "mata" && !m.nextId && m.status === "encerrada");
      const ready = ms.filter((m) => m.status !== "encerrada" && m.a && m.b).sort((x, y) => (x.scheduledAt || "9999").localeCompare(y.scheduledAt || "9999") || x.round - y.round);
      const ents = allEntries.filter((e) => e.categoryId === c.id);
      return {
        ...c,
        modalityName: MOD[c.modality].name,
        adapted: !!MOD[c.modality].adaptedOf,
        total: ms.length,
        done: done.length,
        pendingEntries: ents.filter((e) => e.status === "pendente").length,
        confirmed: ents.filter((e) => e.status === "confirmada").length,
        champion: final ? labels[final.winner] : null,
        next: ready.slice(0, 3).map((m) => ({ id: m.id, a: labels[m.a], b: labels[m.b], at: m.scheduledAt }))
      };
    });
    const script = await stageScript(eventId, { full });
    const staff = full ? await db.list("staff", [["eventId", "==", eventId]]) : [];
    const todo = [];
    for (const c of categories) {
      if (c.pendingEntries) todo.push(["category", c.id, `${c.name}: ${c.pendingEntries} inscri\xE7\xE3o(\xF5es) aguardando confirma\xE7\xE3o`]);
      if (c.status === "inscricoes") todo.push(["category", c.id, `${c.name}: chave ainda n\xE3o gerada (${c.confirmed} confirmados)`]);
    }
    for (const m of allMatches) if (m.status === "pendente" && m.a && m.b && !m.scheduledAt) {
      todo.push(["match", m.id, `${cats.find((c) => c.id === m.categoryId)?.name}: partida pronta sem hor\xE1rio`]);
    }
    for (const p of script) {
      if (!p.members.length) todo.push(["performance", p.id, `Apresenta\xE7\xE3o \u201C${p.title}\u201D sem integrantes`]);
      if (!p.scheduledAt) todo.push(["performance", p.id, `Apresenta\xE7\xE3o \u201C${p.title}\u201D sem hor\xE1rio`]);
    }
    const total = categories.reduce((s, c) => s + c.total, 0), doneN = categories.reduce((s, c) => s + c.done, 0);
    return {
      ev,
      timeline,
      conflicts,
      categories,
      script,
      staff,
      todo,
      multiDay: new Set(timeline.map((i) => i.start.slice(0, 10))).size > 1,
      progress: { matches: total, done: doneN, performances: script.length, percent: total ? Math.round(100 * doneN / total) : 0 }
    };
  }
  async function audit(actorId, subjectId, action) {
    await db.add("audit", { actorId, subjectId, action, at: (/* @__PURE__ */ new Date()).toISOString() }).catch(() => {
    });
  }

  // js/pages/components.js
  var uid = 0;
  function field(name, label, { type = "text", value = "", hint = "", error = "", required = false, attrs = "", id = null } = {}) {
    const fid = id || name;
    const desc = [hint && `${fid}-hint`, error && `${fid}-err`].filter(Boolean).join(" ");
    return html`<div class="field">
    <label for="${fid}">${label}${required ? raw(' <span aria-hidden="true">*</span>') : ""}</label>
    ${hint ? html`<p class="hint" id="${fid}-hint">${hint}</p>` : ""}
    ${error ? html`<p class="error-msg" id="${fid}-err">${error}</p>` : ""}
    <input type="${type}" id="${fid}" name="${name}" value="${value ?? ""}" ${raw(required ? 'required aria-required="true"' : "")}
      ${raw(error ? 'aria-invalid="true"' : "")} ${raw(desc ? `aria-describedby="${desc}"` : "")} ${raw(attrs)}>
  </div>`;
  }
  function textarea(name, label, { value = "", hint = "", rows = 4, id = null, required = false } = {}) {
    const fid = id || name;
    return html`<div class="field"><label for="${fid}">${label}${required ? raw(' <span aria-hidden="true">*</span>') : ""}</label>
    ${hint ? html`<p class="hint" id="${fid}-hint">${hint}</p>` : ""}
    <textarea id="${fid}" name="${name}" rows="${rows}" ${raw(hint ? `aria-describedby="${fid}-hint"` : "")} ${raw(required ? "required" : "")}>${value ?? ""}</textarea></div>`;
  }
  function select(name, label, options, current2, { id = null, hint = "" } = {}) {
    const fid = id || name;
    return html`<div class="field"><label for="${fid}">${label}</label>
    ${hint ? html`<p class="hint">${hint}</p>` : ""}
    <select id="${fid}" name="${name}">${Object.entries(options).map(([k, v]) => html`<option value="${k}" ${raw(String(k) === String(current2 ?? "") ? "selected" : "")}>${v}</option>`)}</select></div>`;
  }
  function checkbox(name, label, checked, { value = "1", id = null } = {}) {
    return html`<label class="check"><input type="checkbox" name="${name}" value="${value}" ${raw(id ? `id="${id}"` : "")} ${raw(checked ? "checked" : "")}> ${label}</label>`;
  }
  function errorSummary(errors) {
    const keys = Object.keys(errors || {});
    if (!keys.length) return "";
    return html`<div class="error-summary" role="alert" tabindex="-1" aria-labelledby="err-title">
    <h2 id="err-title" style="margin-top:0">Corrija ${keys.length} ${keys.length === 1 ? "item" : "itens"}:</h2>
    <ul>${keys.map((k) => html`<li><a href="#${k}" data-focus="${k}">${errors[k]}</a></li>`)}</ul></div>`;
  }
  function pageHero(eyebrow, title, lead = "") {
    return html`<div class="page-hero"><div class="wrap">${eyebrow ? html`<p class="eyebrow">${eyebrow}</p>` : ""}
    <h1>${title}</h1>${lead ? html`<p class="lead">${lead}</p>` : ""}</div></div>`;
  }
  function img(ref2, alt, cls = "") {
    if (!ref2) return "";
    if (ref2.startsWith("img/")) return html`<img src="${ref2}" alt="${alt || ""}" class="${cls}" loading="lazy">`;
    return html`<img data-media="${ref2}" alt="${alt || ""}" class="${cls}" loading="lazy">`;
  }
  function libras(url, title) {
    if (!url) return "";
    const embed = youtubeEmbed(url);
    return html`<div class="libras"><strong>Em Libras: ${title}</strong>
    ${embed ? html`<iframe src="${embed}" title="Vídeo em Libras: ${title}" loading="lazy" allowfullscreen></iframe>` : ""}
    <a href="${url}" target="_blank" rel="noopener">Abrir o vídeo em Libras em nova aba<span class="visually-hidden"> (${title})</span></a></div>`;
  }
  function accTags(p) {
    return html`<span class="acc-icons">
    ${p.accLibras ? html`<span class="tag">Intérprete de Libras no palco</span>` : ""}
    ${p.accAudiodesc ? html`<span class="tag">Audiodescrição</span>` : ""}
    ${p.accSeating ? html`<span class="tag">Espaço acessível na plateia</span>` : ""}</span>`;
  }
  function eventCard(e) {
    const dp = dateParts(e.startsOn);
    return html`<article class="card event-row">
    <span class="date-badge" aria-hidden="true"><span class="d">${dp.day}</span><span class="m">${dp.month}</span></span>
    <div><h3><a href="#/eventos/${e.id}">${e.name}</a></h3>
      <p class="muted" style="margin:0">${fmtDate(e.startsOn)}${e.timeLabel ? `, ${e.timeLabel}` : ""}${e.location ? ` \xB7 ${e.location}` : ""}</p>
      <p style="margin:.35rem 0 0"><span class="tag">${EVENT_KINDS[e.kind] || e.kind}</span>${e.librasVideoUrl ? html` <span class="tag">Libras</span>` : ""}</p>
      ${e.description ? html`<p style="margin:.4rem 0 0">${truncate(e.description, 160)}</p>` : ""}</div></article>`;
  }
  function newsCard(n) {
    return html`<article class="card news-card project-card">
    <div class="cover">${n.image ? img(n.image, n.imageAlt) : ""}</div>
    <div class="body"><p class="date" style="margin:0">${fmtDate(n.date)}${n.category ? ` \xB7 ${n.category}` : ""}</p>
      <h3><a href="#/noticias/${n.id}">${n.title}</a></h3>${n.summary ? html`<p style="margin:0">${n.summary}</p>` : ""}</div></article>`;
  }
  function projectCard(p) {
    return html`<article class="card project-card">
    <div class="cover">${p.image ? img(p.image, p.imageAlt) : ""}</div>
    <div class="body">${p.area ? html`<p class="eyebrow">${p.area}</p>` : ""}<h3>${p.name}</h3>
      <p style="margin:0">${p.summary}</p>${p.participants ? html`<p class="muted" style="margin:0">${p.participants} participantes</p>` : ""}
      <a class="more" href="#/projetos/${p.id}">Conheça o projeto<span class="visually-hidden"> ${p.name}</span> →</a></div></article>`;
  }
  function matchBox(m, names, link = null) {
    const aWin = m.winner && m.winner === m.a, bWin = m.winner && m.winner === m.b;
    const na = m.a ? names[m.a] || "?" : m.status === "bye" ? "BYE" : "A definir";
    const nb = m.b ? names[m.b] || "?" : m.status === "bye" ? "BYE" : "A definir";
    const meta = m.status === "encerrada" ? `${METHOD_LABELS[m.method] || m.method || ""}${m.isDraw ? " \xB7 empate" : ""}` : m.status === "bye" ? "Avan\xE7a direto" : m.scheduledAt ? `${fmtDate(m.scheduledAt)}${m.venue ? ` \xB7 ${m.venue}` : ""}` : "Hor\xE1rio a definir";
    const inner = html`<div class="side ${aWin ? "win" : ""}"><span>${na}${aWin ? raw('<span class="visually-hidden"> (vencedor)</span>') : ""}</span><span>${m.scoreA ?? ""}</span></div>
    <div class="side ${bWin ? "win" : ""}"><span>${nb}${bWin ? raw('<span class="visually-hidden"> (vencedor)</span>') : ""}</span><span>${m.scoreB ?? ""}</span></div>
    <div class="meta">${meta}</div>`;
    return html`<div class="match">${link ? html`<a href="${link}" aria-label="Súmula: ${na} contra ${nb}">${inner}</a>` : inner}</div>`;
  }
  var fightLabel = (name, total, round, n) => round === total ? "Grande Final" : `${name.replace(/ de final$/i, " de Final")} ${n}`;
  function fighterBox(m, side, names) {
    const id = m[side];
    const won = m.winner && m.winner === id, lost = m.winner && id && m.winner !== id;
    const name = id ? names[id] || "?" : m.status === "bye" ? "BYE" : "";
    const score = side === "a" ? m.scoreA : m.scoreB;
    return html`<div class="fb ${won ? "won" : ""} ${lost ? "lost" : ""} ${id ? "" : "empty"}">
    <span class="fb-name">${name || raw('<span class="visually-hidden">A definir</span>')}${won ? raw('<span class="visually-hidden"> (vencedor)</span>') : ""}</span>
    ${score != null && m.status === "encerrada" && m.method !== "wo" ? html`<span class="fb-score">${score}</span>` : ""}</div>`;
  }
  function fightCard(m, label, names, admin) {
    const meta = m.status === "encerrada" ? `${METHOD_LABELS[m.method] || m.method || ""}` : m.status === "bye" ? "Avan\xE7a direto" : m.scheduledAt ? `${fmtTime(m.scheduledAt)}${m.venue ? ` \xB7 ${m.venue}` : ""}` : "";
    const body = html`${fighterBox(m, "a", names)}<div class="fc-label"><strong>${label}</strong>${meta ? html`<span>${meta}</span>` : ""}</div>${fighterBox(m, "b", names)}`;
    const link = admin && m.status !== "bye" ? `#/painel/partidas/${m.id}` : null;
    return html`<div class="fight">${link ? html`<a href="${link}" aria-label="Súmula de ${label}">${body}</a>` : body}</div>`;
  }
  function bracketView(rounds, names, admin = false, { title = "", subtitle = "", gender = "misto" } = {}) {
    if (!rounds.length) return "";
    const total = rounds.length;
    const final = rounds[total - 1].matches[0];
    const champ = final?.status === "encerrada" && final.winner ? names[final.winner] : null;
    const col2 = (r, matches, side, offset) => html`<ol class="bk-col bk-${side} ${r.round === 1 ? "first" : ""}" aria-label="${r.name} (${side === "left" ? "lado esquerdo" : "lado direito"})">
    ${matches.map((m, i) => html`<li>${fightCard(m, fightLabel(r.name, total, r.round, offset + i + 1), names, admin)}</li>`)}</ol>`;
    const left = [], right = [];
    for (const r of rounds.slice(0, -1)) {
      const half = r.matches.length / 2;
      left.push(col2(r, r.matches.slice(0, half), "left", 0));
      right.unshift(col2(r, r.matches.slice(half), "right", half));
    }
    const cols = 2 * (total - 1) + 1;
    const linear = html`<div class="bracket bk-linear" role="region" aria-label="Chave eliminatória por fases" tabindex="0">
    ${rounds.map((r) => html`<section aria-labelledby="round-${r.round}-${++uid}"><h3 id="round-${r.round}-${uid}">${r.name}</h3>
      <ol>${r.matches.map((m) => html`<li>${matchBox(m, names, admin && m.status !== "bye" ? `#/painel/partidas/${m.id}` : null)}</li>`)}</ol></section>`)}</div>`;
    return html`<div class="bk-poster" role="region" aria-label="Chave eliminatória" tabindex="0">
    ${title || subtitle ? html`<header class="bk-head">${title ? html`<p class="bk-title">${title}</p>` : ""}${subtitle ? html`<p class="bk-sub">${subtitle}</p>` : ""}</header>` : ""}
    <div class="bk-grid" style="grid-template-columns:repeat(${cols}, minmax(170px, 1fr))">
      ${left}
      <ol class="bk-col bk-final ${total === 1 ? "solo" : ""}" aria-label="Grande Final"><li><div class="bk-octagon" aria-hidden="true"></div>
        ${fightCard(final, "Grande Final", names, admin)}
        ${champ ? html`<p class="bk-champ">${gender === "feminino" ? "Campe\xE3" : "Campe\xE3o"}: <strong>${champ}</strong></p>` : ""}</li></ol>
      ${right}
    </div></div>${linear}`;
  }
  function groupView(groups, names, admin = false) {
    return groups.map((g) => html`<h3>Grupo ${g.label}</h3>
    <div class="table-wrap"><table><caption>Classificação do grupo ${g.label}</caption>
      <thead><tr><th scope="col">#</th><th scope="col">Competidor</th><th scope="col">J</th><th scope="col">V</th><th scope="col">E</th><th scope="col">D</th><th scope="col">Pró</th><th scope="col">Contra</th><th scope="col">Saldo</th><th scope="col">Pts</th></tr></thead>
      <tbody>${g.table.map((r, i) => html`<tr><td>${i + 1}</td><th scope="row">${r.name}</th><td>${r.played}</td><td>${r.won}</td><td>${r.drawn}</td><td>${r.lost}</td><td>${r.for}</td><td>${r.against}</td><td>${r.diff}</td><td><strong>${r.points}</strong></td></tr>`)}</tbody>
    </table></div>
    <details><summary>Partidas do grupo ${g.label}</summary><div class="grid" style="margin-top:.75rem">
      ${g.matches.map((m) => matchBox(m, names, admin ? `#/painel/partidas/${m.id}` : null))}</div></details>`);
  }
  var loading = html`<p class="muted">Carregando…</p>`;
  function librasBlock(key, ex, videoUrl) {
    return html`<section class="libras-box" aria-labelledby="lb-${key}">
    <h2 id="lb-${key}">Em Libras: como funciona esta categoria</h2>
    ${videoUrl ? html`<p><strong>Vídeo com intérprete de Libras:</strong></p>${libras(videoUrl, ex.title)}` : ""}
    <div class="actions"><button class="btn" type="button" data-libras="lt-${key}">Ver em Libras (avatar VLibras)</button>
      <button class="btn secondary" type="button" data-speak="lt-${key}">Ouvir explicação</button></div>
    <div id="lt-${key}" class="libras-text">${ex.sections.map((sec) => html`<h3>${sec.title}</h3><p>${sec.text}</p>`)}</div>
    <p class="hint">Explicação montada automaticamente a partir das características da categoria e das regras em vigor.
      O avatar VLibras é a tradução automática do Governo Federal e precisa de internet${videoUrl ? "" : "; o v\xEDdeo com int\xE9rprete humano, quando publicado, aparece aqui"}.</p>
  </section>`;
  }

  // js/logic/divisions.js
  function weightClassesFor(table, modality, division, gender) {
    const pick = (m) => (table || []).filter((r) => r.modality === m && r.division === division && r.gender === gender);
    const own = pick(modality);
    const list3 = own.length ? own : MOD[modality]?.adaptedOf ? pick(MOD[modality].adaptedOf) : [];
    const sorted = [...list3].sort((a, b) => (a.max ?? Infinity) - (b.max ?? Infinity));
    return sorted.map((r, i) => ({ name: r.name, min: i ? sorted[i - 1].max : null, max: r.max }));
  }
  var kg = (n) => String(n).replace(".", ",");
  function weightText(min, max) {
    if (min != null && max != null) return `acima de ${kg(min)} at\xE9 ${kg(max)} kg`;
    if (max != null) return `at\xE9 ${kg(max)} kg`;
    if (min != null) return `acima de ${kg(min)} kg`;
    return "";
  }
  function catWeightLabel(c) {
    if (c.weightMin == null && c.weightMax == null) return "";
    if (c.weightMinExclusive || c.weightMin == null) return (c.weightClass ? `${c.weightClass}: ` : "") + weightText(c.weightMinExclusive ? c.weightMin : null, c.weightMax);
    return c.weightMax != null ? `${kg(c.weightMin)} a ${kg(c.weightMax)} kg` : `${kg(c.weightMin)} kg ou mais`;
  }
  function divisionCategories({ modality, divisions, genders, table }) {
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
          cats.push({
            ...base,
            weightClass: c.name,
            weightMin: c.min,
            weightMax: c.max,
            weightMinExclusive: c.min != null,
            name: `${mod.name} ${dv.name}${gl} \u2013 ${c.name} (${weightText(c.min, c.max)})`
          });
        }
      }
    }
    return { cats, missing };
  }
  function tableToText(table) {
    return (table || []).map((r) => [r.modality, r.division, r.gender, r.name, r.max == null ? "livre" : kg(r.max)].join(";")).join("\n");
  }
  function textToTable(text, divisions) {
    const names = new Set(divisions.map((d) => d.name));
    return text.split("\n").map((l) => l.trim()).filter(Boolean).map((l) => {
      const [modality, division, gender, name, max] = l.split(";").map((x) => (x || "").trim());
      if (!MOD[modality] || MOD[modality].kind !== "luta") throw new Error(`Modalidade inv\xE1lida (use jiu_jitsu, taekwondo, para_jiu_jitsu ou para_taekwondo): ${l}`);
      if (!names.has(division)) throw new Error(`Divis\xE3o n\xE3o cadastrada: ${division}`);
      if (gender !== "masculino" && gender !== "feminino") throw new Error(`Sexo deve ser masculino ou feminino: ${l}`);
      if (!name) throw new Error(`Falta o nome da categoria de peso: ${l}`);
      const free = /^(livre|sem limite|-|—)?$/i.test(max || "");
      const n = free ? null : Number(max.replace(",", "."));
      if (!free && !(n > 0 && n < 300)) throw new Error(`Peso inv\xE1lido: ${l}`);
      return { modality, division, gender, name, max: n };
    });
  }

  // js/logic/explain.js
  var plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;
  function explainCategory(cat, ev, { scoring, general }) {
    const mod = MOD[cat.modality];
    const engine = mod.scoring;
    const team = mod.kind === "coletivo";
    const year = (ev?.startsOn || "").slice(0, 4);
    const who = team ? "as equipes" : "os atletas";
    const p = [];
    const quem = [`Esta \xE9 a categoria ${cat.name}.`, `A modalidade \xE9 ${mod.name}.`];
    if (mod.adaptedOf) quem.push(`\xC9 uma modalidade adaptada, para pessoas com defici\xEAncia.`);
    if (cat.division) quem.push(`A divis\xE3o de idade \xE9 ${cat.division}.`);
    quem.push(general.ageReference === "ano" ? `Podem participar crian\xE7as e adolescentes que fazem de ${cat.ageMin} a ${cat.ageMax} anos em ${year || "o ano do evento"}.` : `Podem participar crian\xE7as e adolescentes de ${cat.ageMin} a ${cat.ageMax} anos na data do evento.`);
    quem.push(cat.gender === "misto" ? "Meninas e meninos participam juntos." : cat.gender === "feminino" ? "Categoria feminina: s\xF3 meninas." : "Categoria masculina: s\xF3 meninos.");
    if (cat.weightMin != null || cat.weightMax != null) {
      const faixa = weightText(cat.weightMinExclusive ? cat.weightMin : null, cat.weightMax);
      if (cat.weightClass) quem.push(`A categoria de peso \xE9 ${cat.weightClass}: ${faixa.replace("kg", "quilos")}${cat.weightMax == null ? ", sem limite de peso" : ""}.`);
      else quem.push(cat.weightMin != null && cat.weightMax != null ? `O peso precisa estar entre ${cat.weightMin} e ${cat.weightMax} quilos.` : cat.weightMin != null ? `O peso m\xEDnimo \xE9 ${cat.weightMin} quilos.` : `O peso m\xE1ximo \xE9 ${cat.weightMax} quilos.`);
    }
    p.push({ title: "Quem participa", text: quem.join(" ") });
    const fmt = [];
    if (cat.format === "grupos") {
      fmt.push(`Primeiro, ${who} ficam em ${plural(cat.groupCount || 2, "grupo", "grupos")}.`);
      fmt.push("No grupo, todos enfrentam todos.");
      fmt.push(`${(cat.qualifiers || 2) === 1 ? "O melhor" : `Os ${cat.qualifiers || 2} melhores`} de cada grupo ${(cat.qualifiers || 2) === 1 ? "passa" : "passam"} para o mata-mata.`);
      fmt.push("No mata-mata, quem vence continua e quem perde sai. A final decide o campe\xE3o.");
    } else {
      fmt.push("A chave \xE9 eliminat\xF3ria: quem vence continua, quem perde sai.");
      fmt.push("Se o n\xFAmero de inscritos n\xE3o fechar a chave, alguns passam direto para a fase seguinte.");
      fmt.push("A final decide o campe\xE3o.");
    }
    fmt.push(`Cada ${team ? "partida" : "luta"} dura ${plural(cat.matchMinutes || 10, "minuto", "minutos")}.`);
    p.push({ title: "Como funciona a chave", text: fmt.join(" ") });
    const r = [];
    if (engine === "bjj") {
      const pts = scoring.bjj.points;
      r.push("Ganha pontos quem faz:");
      r.push(Object.entries(pts).map(([k, v]) => `${BJJ_LABELS[k].toLowerCase()}, ${plural(v, "ponto", "pontos")}`).join("; ") + ".");
      r.push("A finaliza\xE7\xE3o termina a luta na hora e d\xE1 a vit\xF3ria, mesmo para quem est\xE1 perdendo nos pontos.");
      r.push("Repetir a mesma posi\xE7\xE3o sem perder o dom\xEDnio n\xE3o d\xE1 pontos de novo.");
      r.push("Se empatar nos pontos, ganha quem tiver mais vantagens. Se empatar de novo, ganha quem tiver menos penalidades. Se ainda empatar, o \xE1rbitro decide.");
    } else if (engine === "taekwondo") {
      const t = scoring.taekwondo;
      r.push("Ganha pontos quem acerta o colete ou a cabe\xE7a com golpe v\xE1lido:");
      r.push(Object.entries(t.points).map(([k, v]) => `${TKD_LABELS[k].toLowerCase()}, ${plural(v, "ponto", "pontos")}`).join("; ") + ".");
      r.push("Soco na cabe\xE7a \xE9 proibido: n\xE3o vale ponto e \xE9 falta.");
      r.push(`Cada falta, chamada gam-jeom, d\xE1 ${plural(t.gamjeom_points, "ponto", "pontos")} para o advers\xE1rio.`);
      if (t.mode === "melhor_de_3") {
        r.push("A luta tem 3 rounds. Ganha cada round quem fizer mais pontos nele. Vence a luta quem ganhar 2 rounds.");
      } else {
        r.push(`A luta tem ${plural(t.rounds, "round", "rounds")} e os pontos s\xE3o somados.`);
        r.push(`Se terminar empatada, tem um round extra, o golden point: vence quem fizer ${plural(t.golden_point_target, "ponto", "pontos")} primeiro.`);
      }
      if (t.point_gap) r.push(`Se a diferen\xE7a chegar a ${t.point_gap} pontos, a luta acaba.`);
      if (t.max_gamjeom) r.push(`Quem fizer ${t.max_gamjeom} faltas perde a luta.`);
    } else if (engine === "futebol" || engine === "futsal") {
      const c = scoring.team[engine];
      r.push("Vence quem fizer mais gols.");
      if (cat.format === "grupos") r.push(`Nos grupos, vit\xF3ria vale ${plural(c.win, "ponto", "pontos")} e empate vale ${plural(c.draw, "ponto", "pontos")}.`);
      r.push("No mata-mata n\xE3o pode empatar: se empatar, a decis\xE3o \xE9 nos p\xEAnaltis.");
    } else if (engine === "basquete") {
      const c = scoring.team.basquete;
      r.push("Cada cesta vale 1, 2 ou 3 pontos. Vence quem fizer mais pontos.");
      r.push("N\xE3o existe empate: se empatar, tem prorroga\xE7\xE3o.");
      if (cat.format === "grupos") r.push(`Nos grupos, vit\xF3ria vale ${plural(c.win, "ponto", "pontos")} e derrota vale ${plural(c.loss, "ponto", "pontos")}.`);
    } else if (engine === "volei") {
      const c = scoring.team.volei;
      r.push(`A partida \xE9 em melhor de ${c.best_of} sets: vence quem ganhar ${Math.floor(c.best_of / 2) + 1} sets.`);
      r.push(`Cada set vai at\xE9 ${c.set_points} pontos, com 2 pontos de diferen\xE7a. O \xFAltimo set, se precisar, vai at\xE9 ${c.tiebreak_points}.`);
    }
    p.push({ title: team ? "Como se ganha a partida" : "Como se ganha a luta", text: r.join(" ") });
    p.push({ title: "Inscri\xE7\xE3o", text: team ? "A inscri\xE7\xE3o \xE9 feita pela equipe, com o professor respons\xE1vel. Fale com seu professor." : "A inscri\xE7\xE3o \xE9 feita pela \xC1rea do aluno, com acompanhamento do respons\xE1vel. A organiza\xE7\xE3o confirma a inscri\xE7\xE3o." });
    p.push({ title: "Respeito", text: "Respeite o advers\xE1rio, o \xE1rbitro e a equipe de apoio. Em caso de d\xFAvida, procure a organiza\xE7\xE3o do evento." });
    return { title: `Como funciona: ${cat.name}`, sections: p };
  }
  function explanationText(ex) {
    return `${ex.title}

` + ex.sections.map((s) => `${s.title}
${s.text}`).join("\n\n");
  }

  // js/pages/public.js
  var published = (c) => db.list(c, [["published", "==", true]]);
  var projectsList = async () => (await published("projects")).sort((a, b) => (a.order || 0) - (b.order || 0));
  var upcoming = async (kinds = null) => (await published("events")).filter((e) => (e.endsOn || e.startsOn) >= todayISO() && (!kinds || kinds.includes(e.kind))).sort((a, b) => a.startsOn.localeCompare(b.startsOn));
  var visibleModalities = (site) => MODALITIES.filter((m) => site.showAdaptedPublic || !m.adaptedOf);
  var publicHome = async ({ settings: { site } }) => {
    const [projects, news, events, sponsors] = await Promise.all([
      projectsList(),
      published("news").then((n) => n.sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3)),
      upcoming().then((e) => e.slice(0, 4)),
      listSorted("sponsors", [], "order")
    ]);
    const hero = html`<section class="home-hero" aria-labelledby="hero-title"><span class="hero-sun" aria-hidden="true"></span>
    <div class="wrap"><div><p class="eyebrow" style="color:#fff">${site.name}</p><h1 id="hero-title">${site.tagline}</h1><p>${site.heroSubtitle}</p>
      <div class="actions"><a class="btn" href="#/quem-somos">Conheça a Oásis</a><a class="btn ghost" href="#/modalidades">Conheça nossos esportes</a></div></div>
      <div class="hero-media">${site.heroImage ? img(site.heroImage, site.heroImageAlt) : html`<div class="hero-placeholder"><span class="big" aria-hidden="true">${site.shortName}</span>${site.photosNote ? html`<span>${site.photosNote}</span>` : ""}</div>`}</div></div></section>
    ${sponsors.length ? html`<section class="sponsors" aria-labelledby="sp-h"><div class="wrap"><h2 id="sp-h">Patrocinadores e apoiadores</h2>
      <ul>${sponsors.map((s) => html`<li>${s.url ? raw(`<a href="${h(s.url)}" rel="noopener" target="_blank">`) : ""}${s.logo ? img(s.logo, s.name) : s.name}${s.url ? raw("</a>") : ""}</li>`)}</ul></div></section>` : ""}`;
    const body = html`
    <section class="section two-col" aria-labelledby="quem-h"><div><p class="eyebrow">Quem somos</p>
      <h2 id="quem-h" style="margin-top:0;font-size:1.7rem">Arte e esporte para desenvolver pessoas</h2>
      <div class="prose">${paragraphs(site.aboutShort)}</div><a class="btn secondary" href="#/quem-somos">Saiba mais sobre a Oásis</a></div>
      <ul class="stats" aria-label="A Oásis em números">${(site.stats || []).map((s) => html`<li><strong>${s.value}</strong>${s.label}</li>`)}</ul></section>
    <section class="section" aria-labelledby="proj-h"><div class="section-head"><div><p class="eyebrow">Projetos</p><h2 id="proj-h">Nossos projetos</h2></div>
      <a href="#/projetos">Ver todos os projetos →</a></div><div class="grid">${projects.map(projectCard)}</div></section>
    <section class="section" aria-labelledby="incl-h"><div class="inclusive-band"><div>
      <p class="eyebrow" style="color:var(--sun)">Esporte inclusivo</p><h2 id="incl-h">Esporte para todos</h2><p>${site.inclusiveText}</p>
      ${!site.showAdaptedPublic && site.adaptedPendingNote ? html`<p class="note">${site.adaptedPendingNote}</p>` : ""}</div>
      <ul class="compact"><li>Vídeos e intérpretes de Libras</li><li>Espaço acessível nos eventos</li>
        <li><a href="#/professores">Professores preparados para a inclusão</a></li><li><a href="#/esporte-inclusivo">Conheça o esporte inclusivo</a></li></ul></div></section>
    <section class="section two-col" aria-label="Notícias e agenda">
      <div><div class="section-head"><div><p class="eyebrow">Conteúdo</p><h2>Últimas notícias</h2></div><a href="#/noticias">Todas as notícias →</a></div>
        ${news.length ? html`<div class="grid" style="grid-template-columns:1fr">${news.map((n) => html`<article class="card news-card">
          <p class="date" style="margin:0">${fmtDate(n.date)}${n.category ? ` \xB7 ${n.category}` : ""}</p>
          <h3 style="margin:.2rem 0"><a href="#/noticias/${n.id}">${n.title}</a></h3>${n.summary ? html`<p style="margin:0">${n.summary}</p>` : ""}</article>`)}</div>` : html`<p class="muted">Em breve.</p>`}</div>
      <div><div class="section-head"><div><p class="eyebrow">Agenda</p><h2>Próximos eventos</h2></div><a href="#/eventos">Agenda completa →</a></div>
        ${events.length ? html`<div class="grid" style="grid-template-columns:1fr">${events.map(eventCard)}</div>` : html`<p class="muted">Nenhum evento agendado no momento.</p>`}</div></section>
    <section class="section" aria-labelledby="part-h"><div class="cta-band two-col"><div><p class="eyebrow">Participe</p>
      <h2 id="part-h" style="margin-top:0">Inscrições gratuitas</h2><p>${site.participeText}</p>
      <div class="actions"><a class="btn" href="#/inscricoes">Quero me inscrever</a><a class="btn secondary" href="#/cadastro">Fazer cadastro</a></div>
      <p style="margin:.25rem 0 0"><strong>Já é inscrito?</strong> <a href="#/entrar">Acesse a Área do aluno</a> para ver agenda, resultados e avisos.</p></div>
      <div><h3 style="margin-top:0">Como ajudar</h3><ul class="compact"><li><strong>Doações:</strong> ${site.helpDonation}</li>
        <li><strong>Parcerias:</strong> ${site.helpPartnership}</li><li><strong>Voluntariado:</strong> ${site.helpVolunteer}</li></ul>
        <div class="actions"><a class="btn secondary small" href="#/doacoes">Ver canais oficiais</a><a class="btn secondary small" href="#/como-ajudar">Conhecer formas de apoio</a>
          <a class="btn secondary small" href="#/contato">Falar com a equipe</a></div></div></div></section>`;
    return { title: "In\xEDcio", hero, body };
  };
  route("/", publicHome);
  route("/site", publicHome);
  var INST = [["/quem-somos", "Quem somos"], ["/historia", "Nossa hist\xF3ria"], ["/missao-visao-valores", "Miss\xE3o, vis\xE3o e valores"], ["/transparencia", "Transpar\xEAncia"]];
  function institutional(path, title, contentFn) {
    route(path, async (ctx) => {
      const content = await contentFn(ctx);
      return {
        title,
        hero: pageHero("A O\xE1sis", title, ctx.settings.site.tagline),
        body: html`<div class="content-layout"><nav aria-label="A Oásis"><ul class="sidenav">${INST.map(([p, l]) => html`<li><a href="#${p}" ${raw(p === path ? 'aria-current="page"' : "")}>${l}</a></li>`)}</ul></nav><div>${content}</div></div>`
      };
    });
  }
  institutional("/quem-somos", "Quem somos", async ({ settings: { site } }) => {
    const projects = await projectsList();
    return html`<div class="prose">${paragraphs(site.aboutFull)}</div>
    <ul class="stats" aria-label="A Oásis em números" style="grid-template-columns:repeat(auto-fit,minmax(160px,1fr));margin:1.5rem 0">${(site.stats || []).map((s) => html`<li><strong>${s.value}</strong>${s.label}</li>`)}</ul>
    <h2>Como atuamos</h2><div class="grid">${(site.commitments || []).map((c) => html`<div class="card"><h3>${c.title}</h3><p style="margin:0">${c.text}</p></div>`)}</div>
    <h2>Nossos projetos</h2><div class="grid">${projects.map(projectCard)}</div>`;
  });
  institutional("/historia", "Nossa hist\xF3ria", async ({ settings: { site } }) => html`<ol class="timeline-hist prose">${String(site.history || "").split(/\n\s*\n/).filter((b) => b.trim()).map((b) => html`<li>${paragraphs(b)}</li>`)}</ol>`);
  institutional("/missao-visao-valores", "Miss\xE3o, vis\xE3o e valores", async ({ settings: { site } }) => html`<div class="grid"><div class="card"><h2 style="margin-top:0">Missão</h2>${paragraphs(site.mission)}</div>
    <div class="card"><h2 style="margin-top:0">Visão</h2>${paragraphs(site.vision)}</div>
    <div class="card"><h2 style="margin-top:0">Valores</h2><ul>${lines(site.values).map((v) => html`<li>${v}</li>`)}</ul></div></div>`);
  institutional("/transparencia", "Transpar\xEAncia", async ({ settings: { site } }) => html`<div class="prose">${paragraphs(site.transparency)}</div><h2>Documentos e relatórios</h2>
    ${(site.transparencyLinks || []).length ? html`<ul>${site.transparencyLinks.map((d) => html`<li><a href="${d.url}" target="_blank" rel="noopener">${d.title}</a></li>`)}</ul>` : html`<p class="muted">Os documentos serão publicados em breve.</p>`}`);
  route("/projetos", async () => ({
    title: "Projetos",
    hero: pageHero("Projetos", "Nossos projetos", "Cursos e atividades gratuitas de artes e esportes para crian\xE7as e adolescentes de 4 a 17 anos."),
    body: html`<div class="grid">${(await projectsList()).map(projectCard)}</div><p style="margin-top:1.5rem"><a href="#/esporte-inclusivo">Conheça também o esporte inclusivo →</a></p>`
  }));
  route("/projetos/:id", async ({ params, settings: { site } }) => {
    const p = await db.get("projects", params.id).catch(() => null);
    if (!p || !p.published) return notFound();
    const codes = p.modalities || [];
    const mods = visibleModalities(site).filter((m) => codes.includes(m.code));
    const teachers = (await db.list("teachersPublic")).filter((t) => (t.modalities || []).some((m) => codes.includes(m)));
    const events = await upcoming();
    const cats = [];
    for (const ev of events) for (const c of await db.list("categories", [["eventId", "==", ev.id]])) if (codes.includes(c.modality)) cats.push({ ...c, ev });
    const others = (await projectsList()).filter((x) => x.id !== p.id);
    return {
      title: p.name,
      hero: pageHero(p.area || "Projeto", p.name, p.summary),
      body: html`<div class="two-col"><div>${p.image ? img(p.image, p.imageAlt, "article-cover") : ""}<div class="prose">${paragraphs(p.body)}</div>
        <div class="actions"><a class="btn" href="#/inscricoes">Quero participar</a></div></div>
      <div>${p.participants ? html`<ul class="stats" style="grid-template-columns:1fr"><li><strong>${p.participants}</strong>participantes</li></ul>` : ""}
        ${mods.length ? html`<h2>Modalidades</h2><p>${mods.map((m) => html`<span class="tag">${m.name}</span>`)}</p>` : ""}
        ${teachers.length ? html`<h2>Professores</h2><ul class="compact">${teachers.map((t) => html`<li>${t.name}</li>`)}</ul><p><a href="#/professores">Buscar professores por modalidade e inclusão →</a></p>` : ""}
        ${cats.length ? html`<h2>Próximas competições</h2><ul class="compact">${cats.map((c) => html`<li><a href="#/eventos/${c.ev.id}">${c.ev.name}</a> — ${c.name}${c.status !== "inscricoes" ? html` · <a href="#/chaves/${c.id}">ver chave</a>` : ""}</li>`)}</ul>` : ""}</div></div>
      ${others.length ? html`<h2>Outros projetos</h2><div class="grid">${others.map(projectCard)}</div>` : ""}`
    };
  });
  route("/esporte-inclusivo", async ({ settings: { site } }) => {
    const teachers = await db.list("teachersPublic");
    const count = (d) => teachers.filter((t) => (t.aptitudes || []).includes(d)).length;
    return {
      title: "Esporte inclusivo",
      hero: pageHero("Projetos", "Esporte inclusivo", "O esporte \xE9 um direito de todos."),
      body: html`<div class="two-col"><div class="prose">${paragraphs(site.inclusiveText)}
      ${site.showAdaptedPublic ? html`<h2>Modalidades adaptadas</h2><ul>${MODALITIES.filter((m) => m.adaptedOf).map((m) => html`<li>${m.name}</li>`)}</ul>` : site.adaptedPendingNote ? html`<p class="flash info">${site.adaptedPendingNote}</p>` : ""}
      <h2>O que já oferecemos</h2><ul>
        <li><strong>Libras:</strong> vídeos com intérprete nas chaves e na programação, e intérprete no palco quando indicado.</li>
        <li><strong>Eventos acessíveis:</strong> cada apresentação informa audiodescrição e reserva de espaço acessível na plateia.</li>
        <li><strong>Equipe de apoio:</strong> alunos com deficiência podem atuar como mesários, cronometristas, no som e palco ou na fotografia.</li>
        <li><strong>Cadastro sigiloso:</strong> a família pode informar a deficiência (opcional), protegida pela LGPD, para que a equipe prepare o acolhimento.</li></ul></div>
      <div><h2 style="margin-top:0">Professores preparados</h2><p>Encontre professores com experiência em cada tipo de deficiência:</p>
        <ul class="compact">${Object.entries(DISABILITY_TYPES).map(([k, v]) => html`<li><a href="#/professores?deficiencia=${k}">${v}</a> <span class="muted">(${count(k)})</span></li>`)}</ul>
        <div class="actions"><a class="btn" href="#/cadastro">Fazer cadastro</a><a class="btn secondary" href="#/contato">Falar com a equipe</a></div></div></div>`
    };
  });
  route("/modalidades", async ({ settings: { site } }) => {
    const projects = await projectsList();
    const byProject = {};
    for (const p of projects) for (const c of p.modalities || []) byProject[c] || (byProject[c] = p);
    const mods = visibleModalities(site);
    return {
      title: "Modalidades",
      hero: pageHero("Esportes e artes", "Modalidades", "Todas as atividades s\xE3o gratuitas, para crian\xE7as e adolescentes de 4 a 17 anos."),
      body: html`${[["arte", "Artes"], ["coletivo", "Esportes coletivos"], ["luta", "Artes marciais"]].map(([k, t]) => {
        const photo = projects.find((p) => p.image && (p.modalities || []).some((c) => MOD[c]?.kind === k));
        return html`<h2>${t}</h2><div class="kind-row ${photo ? "" : "no-photo"}">${photo ? img(photo.image, photo.imageAlt, "kind-photo") : ""}<div class="grid">
      ${mods.filter((m) => m.kind === k).map((m) => html`<div class="card"><h3>${m.name}${m.adaptedOf ? html` <span class="tag accent">adaptada</span>` : ""}</h3>
        ${byProject[m.code] ? html`<p style="margin:0">Projeto <a href="#/projetos/${byProject[m.code].id}">${byProject[m.code].name}</a></p>` : ""}
        <p style="margin:.4rem 0 0"><a href="#/professores?modalidade=${m.code}">Professores de ${m.name}</a></p></div>`)}</div></div>`;
      })}
      ${!site.showAdaptedPublic && site.adaptedPendingNote ? html`<p class="flash info" style="margin-top:1.5rem">${site.adaptedPendingNote}</p>` : ""}
      <div class="actions"><a class="btn" href="#/inscricoes">Fazer inscrição</a><a class="btn secondary" href="#/calendario">Calendário esportivo</a></div>`
    };
  });
  route("/calendario", async ({ settings: { site } }) => {
    const events = await upcoming(["campeonato", "misto", "festival"]);
    const items = [];
    for (const ev of events) {
      const cats = (await db.list("categories", [["eventId", "==", ev.id]])).filter((c) => site.showAdaptedPublic || !MOD[c.modality].adaptedOf);
      items.push({ ev, cats, timeline: await calendarItems(ev.id) });
    }
    return {
      title: "Calend\xE1rio esportivo",
      hero: pageHero("Esportes", "Calend\xE1rio esportivo", "Competi\xE7\xF5es, festivais, chaves e programa\xE7\xE3o de palco e quadra."),
      body: items.length ? html`${items.map(({ ev, cats, timeline }) => {
        const dp = dateParts(ev.startsOn);
        return html`
      <section class="card" style="margin-bottom:1.25rem" aria-labelledby="ev-${ev.id}"><div class="event-row">
        <span class="date-badge" aria-hidden="true"><span class="d">${dp.day}</span><span class="m">${dp.month}</span></span><div>
        <h2 id="ev-${ev.id}" style="margin:0"><a href="#/eventos/${ev.id}">${ev.name}</a></h2>
        <p class="muted" style="margin:.2rem 0">${fmtDate(ev.startsOn)}${ev.timeLabel ? `, ${ev.timeLabel}` : ""}${ev.location ? ` \xB7 ${ev.location}` : ""} · ${EVENT_KINDS[ev.kind]}</p>
        ${cats.length ? html`<p style="margin:.4rem 0 0"><strong>Chaves:</strong> ${cats.map((c, i) => html`${i ? " \xB7 " : ""}${c.status !== "inscricoes" ? html`<a href="#/chaves/${c.id}">${c.name}</a>` : html`${c.name} <span class="muted">(inscrições)</span>`}`)}</p>` : ""}
        ${timeline.length ? html`<details><summary>Programação (${timeline.length} itens)</summary><ul class="compact">${timeline.map((t) => html`<li><strong>${fmtTime(t.start)}</strong> ${t.kind === "performance" ? `Apresenta\xE7\xE3o: ${t.title}` : `${t.category}: ${t.a} \xD7 ${t.b}`}</li>`)}</ul></details>` : ""}
      </div></div></section>`;
      })}` : html`<p class="muted">Nenhuma competição agendada no momento.</p>`
    };
  });
  route("/professores", async ({ query, settings: { site } }) => {
    const mods = visibleModalities(site);
    const modality = query.modalidade || "", disability = query.deficiencia || "";
    const rows = (await listSorted("teachersPublic", [], "name")).filter((t) => (!modality || (t.modalities || []).includes(modality)) && (!disability || (t.aptitudes || []).includes(disability)));
    return {
      title: "Professores",
      hero: pageHero("Esportes", "Professores e profissionais de inclus\xE3o", "Encontre professores por modalidade e pelo p\xFAblico com defici\xEAncia para o qual t\xEAm forma\xE7\xE3o ou experi\xEAncia."),
      body: html`<form class="card" role="search" aria-label="Buscar professores" id="teacher-search"><div class="row">
        ${select("modalidade", "Modalidade", { "": "Todas", ...Object.fromEntries(mods.map((m) => [m.code, m.name])) }, modality)}
        ${select("deficiencia", "Aptid\xE3o para ensinar pessoas com", { "": "Qualquer", ...DISABILITY_TYPES }, disability)}</div>
        <button class="btn" type="submit">Buscar</button></form>
      <h2 aria-live="polite">${rows.length} ${rows.length === 1 ? "professor encontrado" : "professores encontrados"}</h2>
      <div class="grid">${rows.map((t) => html`<article class="card"><h3>${t.name}</h3>${t.affiliation ? html`<p class="muted">${t.affiliation}</p>` : ""}
        <p><strong>Modalidades:</strong> ${(t.modalities || []).filter((m) => mods.some((x) => x.code === m)).map((m) => MOD[m].name).join(", ") || "\u2014"}</p>
        ${(t.aptitudes || []).length ? html`<p><strong>Inclusão:</strong></p><ul>${t.aptitudes.map((a) => html`<li>${DISABILITY_TYPES[a]}</li>`)}</ul>` : ""}
        ${t.bio ? html`<p>${t.bio}</p>` : ""}</article>`)}</div>`,
      after(root) {
        root.querySelector("#teacher-search").addEventListener("submit", (e) => {
          e.preventDefault();
          const d = formData(e.target);
          go(`/professores?${new URLSearchParams(Object.entries(d).filter(([, v]) => v))}`);
        });
      }
    };
  });
  route("/noticias", async () => ({
    title: "Not\xEDcias",
    hero: pageHero("Conte\xFAdo", "Not\xEDcias"),
    body: html`<div class="grid">${(await published("news")).sort((a, b) => b.date.localeCompare(a.date)).map(newsCard)}</div>`
  }));
  route("/noticias/:id", async ({ params }) => {
    const n = await db.get("news", params.id).catch(() => null);
    if (!n || !n.published) return notFound();
    const more = (await published("news")).filter((x) => x.id !== n.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);
    return {
      title: n.title,
      hero: pageHero(`${n.category || "Not\xEDcia"} \xB7 ${fmtDate(n.date)}`, n.title, n.summary),
      body: html`<article class="prose" style="max-width:780px">${n.image ? img(n.image, n.imageAlt, "article-cover") : ""}${libras(n.librasVideoUrl, n.title)}${paragraphs(n.body)}</article>
      <p><a href="#/noticias">← Todas as notícias</a></p>${more.length ? html`<h2>Leia também</h2><div class="grid">${more.map(newsCard)}</div>` : ""}`
    };
  });
  route("/eventos", async () => {
    const all = (await published("events")).sort((a, b) => a.startsOn.localeCompare(b.startsOn));
    const next = all.filter((e) => (e.endsOn || e.startsOn) >= todayISO()), past = all.filter((e) => (e.endsOn || e.startsOn) < todayISO()).reverse();
    return {
      title: "Eventos",
      hero: pageHero("Conte\xFAdo", "Eventos", "Festivais, competi\xE7\xF5es e encontros da O\xE1sis."),
      body: html`<h2>Próximos eventos</h2>${next.length ? html`<div class="grid">${next.map(eventCard)}</div>` : html`<p class="muted">Nenhum evento agendado.</p>`}
      ${past.length ? html`<h2>Eventos anteriores</h2><div class="grid">${past.slice(0, 20).map(eventCard)}</div>` : ""}`
    };
  });
  route("/eventos/:id", async ({ params, settings: { site } }) => {
    const ev = await db.get("events", params.id).catch(() => null);
    if (!ev || !ev.published) return notFound();
    const cats = (await db.list("categories", [["eventId", "==", ev.id]])).filter((c) => site.showAdaptedPublic || !MOD[c.modality].adaptedOf).sort((a, b) => MOD[a.modality].name.localeCompare(MOD[b.modality].name) || a.ageMin - b.ageMin || (a.gender || "").localeCompare(b.gender || "") || (a.weightMax ?? 999) - (b.weightMax ?? 999));
    const entries = await db.list("entries", [["eventId", "==", ev.id]]);
    const [timeline, script] = await Promise.all([calendarItems(ev.id), stageScript(ev.id)]);
    return { title: ev.name, body: html`<p><a href="#/eventos">← Eventos</a></p><h1>${ev.name}</h1>
    <p><span class="tag">${EVENT_KINDS[ev.kind]}</span> ${fmtDate(ev.startsOn)}${ev.endsOn && ev.endsOn !== ev.startsOn ? ` a ${fmtDate(ev.endsOn)}` : ""}${ev.timeLabel ? `, ${ev.timeLabel}` : ""}${ev.location ? ` \xB7 ${ev.location}` : ""}</p>
    ${ev.image ? img(ev.image, ev.imageAlt, "article-cover") : ""}${ev.description ? html`<p class="lead">${ev.description}</p>` : ""}${libras(ev.librasVideoUrl, "apresenta\xE7\xE3o do evento")}
    ${timeline.length ? html`<h2>Programação completa — palco e quadra</h2><ol class="timeline card">${timeline.map((it) => html`
      <li class="tl-item tl-${it.kind} ${it.status === "encerrada" ? "is-done" : ""}"><span class="tl-time">${fmtTime(it.start)}</span>
        <div class="tl-body">
        ${it.kind === "match" ? html`<span class="tl-cat">${it.category}${it.venue ? ` \xB7 ${it.venue}` : ""}</span>
          <span class="tl-title"><a href="#/chaves/${it.categoryId}">${it.a} × ${it.b}</a></span>
          ${it.status === "encerrada" ? html`<span class="tl-result">Resultado: ${it.scoreA} × ${it.scoreB} — ${it.winner === "Empate" ? "empate" : `vit\xF3ria de ${it.winner}`}</span>` : ""}` : html`<span class="tl-cat">${SLOTS[it.slot]} · Palco</span><span class="tl-title">${it.title}</span>${accTags(it)}`}</div></li>`)}</ol>` : ""}
    ${cats.length ? html`<h2>Chaves e categorias</h2><div class="table-wrap"><table><caption class="visually-hidden">Categorias do evento</caption>
      <thead><tr><th scope="col">Categoria</th><th scope="col">Modalidade</th><th scope="col">Idade</th><th scope="col">Inscritos</th><th scope="col">Chave</th></tr></thead>
      <tbody>${cats.map((c) => html`<tr><th scope="row">${c.name}${MOD[c.modality].adaptedOf ? html` <span class="tag accent">adaptada</span>` : ""}${c.librasVideoUrl || c.librasAuto !== false ? html` <span class="tag">Libras</span>` : ""}</th>
        <td>${MOD[c.modality].name}${c.gender !== "misto" ? ` \xB7 ${GENDERS[c.gender]}` : ""}</td><td>${c.ageMin}–${c.ageMax} anos</td>
        <td>${entries.filter((e) => e.categoryId === c.id && e.status === "confirmada").length}</td>
        <td>${c.status !== "inscricoes" ? html`<a href="#/chaves/${c.id}">Ver chave<span class="visually-hidden"> de ${c.name}</span></a>` : "Inscri\xE7\xF5es abertas"}</td></tr>`)}</tbody></table></div>` : ""}
    ${script.length ? html`<h2>Programação cultural</h2>${Object.entries(SLOTS).map(([slot, label]) => {
      const items = script.filter((p) => p.slot === slot);
      return items.length ? html`
      <h3>${label}</h3><ol class="grid" style="list-style:none;padding:0">${items.map((p) => html`<li class="card"><h4 style="margin:0 0 .25rem;font-size:1.05rem">${p.title}</h4>
        <p class="muted" style="margin:0">${MOD[p.modality]?.name} · ${p.durationMin} min${p.scheduledAt ? ` \xB7 ${fmtTime(p.scheduledAt)}` : ""}</p>${accTags(p)}${libras(p.librasVideoUrl, p.title)}</li>`)}</ol>` : "";
    })}` : ""}` };
  });
  route("/chaves/:id", async ({ params, settings }) => {
    const cat = await db.get("categories", params.id).catch(() => null);
    const ev = cat && await db.get("events", cat.eventId).catch(() => null);
    if (!cat || !ev || !ev.published) return notFound();
    const entries = await db.list("entries", [["categoryId", "==", cat.id]]);
    const names = await entryLabels(entries);
    const [rounds, groups] = await Promise.all([knockoutRounds(cat.id), groupTables(cat.id, names)]);
    const scorers = MOD[cat.modality].kind === "coletivo" ? await topScorers(cat.id) : [];
    return { title: cat.name, body: html`<p><a href="#/eventos/${ev.id}">← ${ev.name}</a></p><h1>${cat.name}</h1>
    <p>${MOD[cat.modality].name} · ${cat.ageMin}–${cat.ageMax} anos${cat.gender !== "misto" ? ` \xB7 ${GENDERS[cat.gender]}` : ""}${MOD[cat.modality].adaptedOf ? html` · <span class="tag accent">modalidade adaptada</span>` : ""}</p>
    <p class="hint">Para proteger crianças e adolescentes, os nomes aparecem abreviados.</p>
    ${groups.length ? html`<h2>Fase de grupos</h2>${groupView(groups, names)}` : ""}
    ${rounds.length ? html`<h2>${groups.length ? "Mata-mata" : "Chave"}</h2>${bracketView(rounds, names, false, { title: ev.name, subtitle: cat.name, gender: cat.gender })}` : ""}
    ${!rounds.length && !groups.length ? html`<p class="muted">A chave ainda não foi gerada.</p>` : ""}
    ${cat.librasAuto !== false || cat.librasVideoUrl ? librasBlock(cat.id, explainCategory(cat, ev, settings), cat.librasVideoUrl) : ""}
    ${scorers.length ? html`<h2>Artilharia / pontuação individual</h2><div class="table-wrap"><table style="max-width:32rem"><thead><tr><th scope="col">Atleta</th><th scope="col">Total</th></tr></thead>
      <tbody>${scorers.map((s) => html`<tr><th scope="row">${s.name}</th><td>${s.total}</td></tr>`)}</tbody></table></div>` : ""}` };
  });
  route("/inscricoes", async ({ settings: { site } }) => {
    const projects = await projectsList();
    const open = [];
    for (const ev of (await upcoming()).filter((e) => e.registrationsOpen)) {
      for (const c of await db.list("categories", [["eventId", "==", ev.id]])) {
        if (c.status === "inscricoes" && (site.showAdaptedPublic || !MOD[c.modality].adaptedOf)) open.push({ ...c, ev });
      }
    }
    return {
      title: "Inscri\xE7\xF5es",
      hero: pageHero("Participe", "Inscri\xE7\xF5es", site.participeText),
      body: html`<ol class="grid" style="list-style:none;padding:0">
      <li class="card"><p class="eyebrow">Passo 1</p><h3>Cadastro com o responsável</h3><p>Crie a conta do participante junto com o responsável legal (menores de 18 anos).</p></li>
      <li class="card"><p class="eyebrow">Passo 2</p><h3>Escolha as modalidades</h3><p>Música, dança, esportes coletivos ou artes marciais. Atividades gratuitas, de 4 a 17 anos.</p></li>
      <li class="card"><p class="eyebrow">Passo 3</p><h3>Acompanhe pela conta</h3><p>Veja inscrições em competições, agenda de jogos e apresentações.</p></li></ol>
      <div class="actions"><a class="btn" href="#/cadastro">Fazer cadastro</a><a class="btn secondary" href="#/entrar">Já sou inscrito: Área do aluno</a></div>
      <h2>Projetos</h2><div class="grid">${projects.map(projectCard)}</div>
      ${open.length ? html`<h2>Competições com inscrições abertas</h2><div class="table-wrap"><table><thead><tr><th scope="col">Evento</th><th scope="col">Categoria</th><th scope="col">Idade</th></tr></thead>
        <tbody>${open.map((c) => html`<tr><td><a href="#/eventos/${c.ev.id}">${c.ev.name}</a></td><th scope="row">${c.name}</th><td>${c.ageMin}–${c.ageMax} anos</td></tr>`)}</tbody></table></div>
        <p class="hint">Alunos já cadastrados se inscrevem pela <a href="#/entrar">Área do aluno</a>.</p>` : ""}`
    };
  });
  route("/como-ajudar", async ({ settings: { site } }) => {
    const sponsors = await listSorted("sponsors", [], "order");
    return {
      title: "Como ajudar",
      hero: pageHero("Participe", "Como ajudar", "Sua contribui\xE7\xE3o mant\xE9m as atividades gratuitas para centenas de crian\xE7as e adolescentes."),
      body: html`<div class="grid help-grid">
      <div class="card"><h2 style="margin-top:0;font-size:1.25rem">Doações</h2><p>${site.helpDonation}</p><a class="btn small" href="#/doacoes">Ver canais oficiais</a></div>
      <div class="card"><h2 style="margin-top:0;font-size:1.25rem">Parcerias</h2><p>${site.helpPartnership}</p><a class="btn small secondary" href="#/contato">Falar com a equipe</a></div>
      <div class="card"><h2 style="margin-top:0;font-size:1.25rem">Voluntariado</h2><p>${site.helpVolunteer}</p><a class="btn small secondary" href="#/contato">Quero ser voluntário</a></div></div>
      ${sponsors.length ? html`<h2>Quem já apoia</h2><p>${sponsors.map((s) => html`<span class="tag">${s.name}</span>`)}</p>` : ""}`
    };
  });
  route("/doacoes", async ({ settings: { site } }) => ({
    title: "Doa\xE7\xF5es",
    hero: pageHero("Participe", "Doa\xE7\xF5es", site.helpDonation),
    body: html`<div class="card prose"><h2 style="margin-top:0">Canais oficiais</h2>${paragraphs(site.donationInfo)}</div>
    <p class="hint">Doe apenas pelos canais oficiais publicados nesta página. Em caso de dúvida, <a href="#/contato">fale com a equipe</a>.</p>`
  }));
  route("/contato", async ({ settings: { site } }) => ({
    title: "Contato",
    hero: pageHero("Participe", "Contato", "Tire d\xFAvidas sobre aulas, inscri\xE7\xF5es, parcerias e voluntariado."),
    body: html`<div class="two-col"><form class="card" id="contact-form" novalidate><div id="contact-errors"></div>
      ${field("name", "Nome", { required: true, attrs: 'autocomplete="name"' })}${field("email", "E-mail", { type: "email", required: true, attrs: 'autocomplete="email"' })}
      ${field("phone", "Telefone (opcional)", { type: "tel", attrs: 'autocomplete="tel"' })}${field("subject", "Assunto")}
      ${textarea("message", "Mensagem", { rows: 6, required: true })}
      <div class="visually-hidden" aria-hidden="true"><label for="website">Não preencha</label><input id="website" name="website" tabindex="-1" autocomplete="off"></div>
      <p class="hint">Seus dados serão usados apenas para responder a esta mensagem.</p><button class="btn" type="submit">Enviar mensagem</button></form>
    <div><h2 style="margin-top:0">Fale com a Oásis</h2><address class="prose" style="font-style:normal;line-height:1.9">
      ${site.email ? html`E-mail: <a href="mailto:${site.email}">${site.email}</a><br>` : ""}${site.phone1 ? html`Telefone: ${site.phone1}<br>` : ""}
      ${site.phone2 ? html`WhatsApp / celular: ${site.phone2}<br>` : ""}${site.address ? html`${site.address}<br>` : ""}${site.hours || ""}</address></div></div>`,
    after(root) {
      bindForm(root, "#contact-form", async (d, form) => {
        if (d.website) return;
        const errors = {};
        if (str(d.name).length < 2) errors.name = "Informe seu nome.";
        if (!str(d.email).includes("@")) errors.email = "Informe um e-mail v\xE1lido.";
        if (str(d.message, 4e3).length < 5) errors.message = "Escreva sua mensagem.";
        if (Object.keys(errors).length) {
          root.querySelector("#contact-errors").innerHTML = errorSummary(errors).s;
          root.querySelector(".error-summary").focus();
          return;
        }
        await db.add("messages", { name: str(d.name, 120), email: str(d.email, 160), phone: str(d.phone, 30), subject: str(d.subject, 150), message: str(d.message, 4e3) });
        form.reset();
        flash("Mensagem enviada! A equipe da O\xE1sis vai responder pelo e-mail informado.", "success");
        go("/contato");
      });
    }
  }));
  route("/faq", async ({ settings: { site } }) => ({
    title: "Perguntas frequentes",
    hero: pageHero("Ajuda", "Perguntas frequentes"),
    body: html`<div class="faq grid" style="grid-template-columns:1fr;max-width:800px">${faqItems(site.faq).map(([q, a]) => html`<details><summary>${q}</summary>${paragraphs(a)}</details>`)}</div>
    <p>Não encontrou a resposta? <a href="#/contato">Fale com a equipe</a>.</p>`
  }));
  route("/termos", async ({ settings: { site } }) => ({ title: "Termos de uso", hero: pageHero("Legal", "Termos de uso"), body: html`<div class="prose">${paragraphs(site.terms)}</div>` }));
  route("/privacidade", async ({ settings: { site } }) => ({
    title: "Privacidade",
    hero: pageHero("Legal", "Pol\xEDtica de privacidade", "LGPD e Estatuto da Crian\xE7a e do Adolescente"),
    body: html`<div class="prose"><p class="hint">Versão do termo: ${TERMS_VERSION}. Texto-base a ser revisado pelo jurídico da instituição.</p>
    <h2>Quem trata os dados</h2><p>${site.name}, para inscrição e participação de crianças e adolescentes em atividades de artes e esportes.</p>
    <h2>Crianças e adolescentes (LGPD art. 14 e ECA)</h2><ul>
      <li>Os dados de menores de 18 anos são tratados no melhor interesse da criança e do adolescente, com consentimento específico de pelo menos um dos pais ou responsável legal, registrado com nome, vínculo, data e versão do termo.</li>
      <li>Coletamos apenas o necessário: nome, data de nascimento (para categorias por idade), modalidades e contato do responsável. Não pedimos documentos.</li>
      <li>Na área pública, os nomes dos alunos aparecem abreviados nas chaves e programações.</li>
      <li>O uso de imagem depende de autorização separada e pode ser revogado.</li></ul>
    <h2>Dados sensíveis: deficiência</h2><p>O informe de deficiência é opcional e depende de consentimento específico. Ele fica separado do restante do cadastro, é visível apenas ao titular e à coordenação, e cada consulta da coordenação é registrada. Nunca aparece na área pública.</p>
    <h2>Seus direitos</h2><p>Em "Minha conta" é possível baixar os dados, corrigir o cadastro, remover a informação de deficiência (revogando o consentimento) e excluir a conta.</p>
    <h2>Segurança</h2><p>As senhas são guardadas apenas como hash (PBKDF2), cada perfil só acessa as próprias páginas e a consulta a dados sensíveis pela coordenação fica registrada. Os dados ficam armazenados no computador da instituição.</p></div>`
  }));
  route("/acessibilidade", async () => ({
    title: "Acessibilidade",
    hero: pageHero("Ajuda", "Declara\xE7\xE3o de acessibilidade", "Este site busca atender \xE0s WCAG 2.1, n\xEDvel AA, e \xE0 Lei Brasileira de Inclus\xE3o."),
    body: html`<div class="prose"><h2>Recursos</h2><ul>
    <li><strong>Teclado:</strong> o site funciona sem mouse. Tab avança, Shift+Tab volta, Enter ativa e Esc fecha os menus. O primeiro link leva direto ao conteúdo.</li>
    <li><strong>Leitores de tela:</strong> cabeçalhos, regiões, tabelas com cabeçalhos, textos alternativos e mensagens anunciadas automaticamente.</li>
    <li><strong>Alto contraste e tamanho do texto:</strong> na barra no topo de todas as páginas.</li>
    <li><strong>Libras:</strong> eventos, chaves, notícias e apresentações podem ter vídeos com intérprete, indicados pela etiqueta "Libras".</li>
    <li><strong>Eventos:</strong> cada apresentação indica intérprete de Libras no palco, audiodescrição e espaço acessível na plateia.</li></ul>
    <h2>Encontrou uma barreira?</h2><p><a href="#/contato">Avise a equipe</a>. Respondemos e corrigimos o quanto antes.</p></div>`
  }));

  // js/pages/auth.js
  function passwordProblem(pw) {
    if (pw.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
    if (/^\d+$/.test(pw) || /^[^\d]+$/.test(pw)) return "Use letras e n\xFAmeros na senha.";
    return null;
  }
  route("/entrar", async ({ query }) => ({
    title: "\xC1rea do aluno",
    hero: pageHero(
      "J\xE1 sou inscrito",
      "\xC1rea do aluno",
      "Entre com o e-mail e a senha do cadastro para ver sua agenda, competi\xE7\xF5es, resultados, apresenta\xE7\xF5es e avisos da coordena\xE7\xE3o."
    ),
    body: html`<div class="two-col"><form class="card" id="login-form" novalidate>
      ${field("email", "E-mail", { type: "email", required: true, attrs: 'autocomplete="username"' })}
      ${field("password", "Senha", { type: "password", required: true, attrs: 'autocomplete="current-password"' })}
      <button class="btn" type="submit">Entrar</button>
      <p class="hint" style="margin-top:1rem"><strong>Esqueceu a senha?</strong> Procure a secretaria da Oásis: a coordenação gera uma senha provisória, e você cria uma nova no primeiro acesso.</p></form>
    <div><h2 style="margin-top:0">O que você encontra aqui</h2><ul class="compact">
      <li>Sua agenda de jogos, lutas e apresentações</li><li>Competições, chaves e resultados</li><li>Apresentações e sua função no palco</li>
      <li>Avisos da coordenação</li><li>Comprovante de inscrição para imprimir</li><li>Seus dados e autorizações (LGPD)</li></ul>
      <p>Ainda não é inscrito? <a href="#/cadastro">Faça seu cadastro</a>.</p>
      <p class="hint">Crianças e adolescentes devem acessar com o acompanhamento do responsável.</p></div></div>`,
    after(root) {
      bindForm(root, "#login-form", async (d) => {
        authFlow.active = true;
        try {
          await auth.signIn(d.email || "", d.password || "");
          await refreshSession();
        } finally {
          authFlow.active = false;
        }
        if (session.profile?.mustChangePassword) {
          flash("Voc\xEA entrou com uma senha provis\xF3ria. Crie sua nova senha.", "warning");
          return go("/senha");
        }
        const next = query.next && query.next.startsWith("/") ? query.next : "/";
        flash(session.isAdmin ? "Bem-vindo(a) \xE0 coordena\xE7\xE3o." : `Ol\xE1, ${(session.profile?.name || "").split(" ")[0]}! Esta \xE9 a sua p\xE1gina inicial.`, "success");
        go(next);
      });
    }
  }));
  route("/cadastro", async () => {
    const mods = MODALITIES;
    return {
      title: "Inscri\xE7\xE3o",
      hero: pageHero(
        "Participe",
        "Inscri\xE7\xE3o",
        "Crie a conta do aluno ou do professor. Para menores de 18 anos, o cadastro deve ser feito junto com o respons\xE1vel legal, que autoriza o uso dos dados."
      ),
      body: html`<div id="reg-errors"></div><form id="register-form" novalidate>
    <fieldset id="role"><legend>1. Perfil</legend><div class="checks">
      ${Object.entries(ROLES).map(([k, v]) => html`<label class="check"><input type="radio" name="role" value="${k}" required> ${v}</label>`)}</div></fieldset>
    <fieldset><legend>2. Dados pessoais</legend>
      ${field("name", "Nome completo", { required: true, attrs: 'autocomplete="name"' })}
      <div class="row">${field("birth_date", "Data de nascimento", { type: "date", hint: "Alunos: de 4 a 17 anos.", attrs: 'autocomplete="bday"' })}
        ${select("gender", "Sexo (para categorias de luta)", { nao_informado: "Prefiro n\xE3o informar", feminino: "Feminino", masculino: "Masculino" }, "nao_informado")}</div>
      <div class="row">${field("phone", "Telefone", { type: "tel", attrs: 'autocomplete="tel"' })}${field("affiliation", "Escola, academia ou turma")}</div>
      ${field("email", "E-mail de acesso", { type: "email", required: true, hint: "Para crian\xE7as, pode ser o e-mail do respons\xE1vel.", attrs: 'autocomplete="email"' })}
      <div class="row">${field("password", "Senha", { type: "password", required: true, hint: "M\xEDnimo de 8 caracteres, com letras e n\xFAmeros.", attrs: 'autocomplete="new-password"' })}
        ${field("password2", "Repita a senha", { type: "password", required: true, attrs: 'autocomplete="new-password"' })}</div></fieldset>
    <fieldset id="modalities"><legend>3. Modalidades</legend><p class="hint">Escolha um perfil acima para ver as modalidades disponíveis.</p><div class="checks">
      ${mods.map((m) => html`<label class="check" data-kind="${m.kind}" hidden><input type="checkbox" name="modalities" value="${m.code}"> ${m.name}</label>`)}</div></fieldset>
    <fieldset data-role-only="professor" hidden><legend>Professor: inclusão e perfil público</legend>
      <p class="hint">Indique os públicos com deficiência para os quais você tem formação ou experiência de ensino.</p>
      <div class="checks">${Object.entries(DISABILITY_TYPES).map(([k, v]) => html`<label class="check"><input type="checkbox" name="aptitude" value="${k}"> ${v}</label>`)}</div>
      ${textarea("bio", "Apresenta\xE7\xE3o (forma\xE7\xE3o, experi\xEAncia)")}${checkbox("public_listing", "Aparecer na busca p\xFAblica de professores", true)}</fieldset>
    <fieldset class="sensitive" data-role-not="professor"><legend>Deficiência (opcional e sigiloso)</legend>
      <p class="hint">Esta informação é um <strong>dado sensível</strong> (LGPD, art. 11). Ela é usada apenas para oferecer modalidades adaptadas, apoio e acessibilidade nos eventos, fica separada do restante do cadastro e só é vista pela coordenação, com registro de cada acesso. Você pode remover a qualquer momento.</p>
      <div class="checks">${Object.entries(DISABILITY_TYPES).map(([k, v]) => html`<label class="check"><input type="checkbox" name="disability" value="${k}"> ${v}</label>`)}</div>
      ${textarea("disability_notes", "Necessidades de apoio (opcional)", { rows: 2 })}
      <label class="check" id="consent_sensitive"><input type="checkbox" name="consent_sensitive" value="1"> Consentimento específico e destacado: autorizo o tratamento da informação sobre deficiência para as finalidades acima (pelo responsável legal, se menor de 18 anos).</label></fieldset>
    <fieldset><legend>Equipe de apoio dos eventos (opcional)</legend><p class="hint">Alunos — com ou sem deficiência — podem participar da organização:</p>
      <div class="checks">${Object.entries(SUPPORT_FUNCTIONS).map(([k, v]) => html`<label class="check"><input type="checkbox" name="support" value="${k}"> ${v}</label>`)}</div></fieldset>
    <fieldset id="guardian-section"><legend>4. Responsável legal (obrigatório para menores de 18 anos)</legend>
      <p class="hint">Conforme a LGPD (art. 14) e o ECA, dados de crianças e adolescentes só são tratados com o consentimento de pelo menos um dos pais ou responsável legal.</p>
      ${field("guardian_name", "Nome do respons\xE1vel")}<div class="row">${field("guardian_email", "E-mail do respons\xE1vel", { type: "email" })}${field("guardian_phone", "Telefone do respons\xE1vel", { type: "tel" })}</div>
      ${field("guardian_relation", "V\xEDnculo (m\xE3e, pai, tutor legal...)")}</fieldset>
    <fieldset><legend>5. Consentimentos</legend>
      <label class="check" id="consent_terms"><input type="checkbox" name="consent_terms" value="1" required> Li a <a href="#/privacidade" target="_blank">política de privacidade (abre em nova aba)</a> e autorizo o tratamento dos dados para inscrição e participação nas atividades. Se o aluno for menor, declaro ser seu responsável legal. (Termo versão ${TERMS_VERSION})</label>
      ${checkbox("consent_image", "Autorizo o uso de imagem (fotos e v\xEDdeos de eventos) nos canais da institui\xE7\xE3o. Opcional; pode ser revogado.", false)}</fieldset>
    <button class="btn" type="submit">Concluir inscrição</button></form>`,
      after(root) {
        const form = root.querySelector("#register-form");
        const sync = () => {
          const role = form.querySelector("input[name=role]:checked")?.value;
          form.querySelectorAll("[data-kind]").forEach((el) => {
            const show = !!role && ROLE_KINDS[role].includes(el.dataset.kind);
            el.hidden = !show;
            if (!show) el.querySelector("input").checked = false;
          });
          form.querySelectorAll("[data-role-only]").forEach((el) => {
            el.hidden = role !== el.dataset.roleOnly;
          });
          form.querySelectorAll("[data-role-not]").forEach((el) => {
            el.hidden = role === el.dataset.roleNot;
          });
          const age = ageToday(form.birth_date.value);
          root.querySelector("#guardian-section").hidden = age != null && age >= 18;
        };
        form.addEventListener("change", sync);
        sync();
        bindForm(root, "#register-form", async (d) => {
          const errors = {};
          const role = d.role, name = str(d.name, 120), email = str(d.email, 160).toLowerCase(), pw = d.password || "";
          if (!ROLES[role]) errors.role = "Escolha um perfil.";
          if (name.length < 3) errors.name = "Informe o nome completo.";
          if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = "Informe um e-mail v\xE1lido.";
          const pp = passwordProblem(pw);
          if (pp) errors.password = pp;
          if (pw !== d.password2) errors.password2 = "As senhas n\xE3o conferem.";
          const age = ageToday(d.birth_date || null);
          if (role === "professor") {
            if (age != null && age < 18) errors.birth_date = "Professores devem ser maiores de 18 anos.";
          } else if (ROLES[role]) {
            if (age == null) errors.birth_date = "Informe a data de nascimento.";
            else if (age < 4 || age > 17) errors.birth_date = "As atividades atendem crian\xE7as e adolescentes de 4 a 17 anos.";
          }
          const minor = age != null && age < 18;
          if (minor) {
            if (!str(d.guardian_name)) errors.guardian_name = "Informe o nome do respons\xE1vel legal.";
            if (!str(d.guardian_email).includes("@")) errors.guardian_email = "Informe o e-mail do respons\xE1vel.";
            if (!str(d.guardian_relation)) errors.guardian_relation = "Informe o v\xEDnculo do respons\xE1vel.";
          }
          if (!d.consent_terms) errors.consent_terms = "\xC9 preciso aceitar a pol\xEDtica de privacidade" + (minor ? " (pelo respons\xE1vel legal)." : ".");
          const allowedKinds = ROLE_KINDS[role] || [];
          const mods2 = asList(d.modalities).filter((m) => MOD[m] && allowedKinds.includes(MOD[m].kind));
          if (ROLES[role] && role !== "professor" && !mods2.length) errors.modalities = "Escolha ao menos uma modalidade do seu perfil.";
          const disabilities = role === "professor" ? [] : asList(d.disability).filter((x) => DISABILITY_TYPES[x]);
          const notes = role === "professor" ? "" : str(d.disability_notes, 500);
          if ((disabilities.length || notes) && !d.consent_sensitive) errors.consent_sensitive = "Para registrar a defici\xEAncia \xE9 preciso o consentimento espec\xEDfico.";
          if (Object.keys(errors).length) {
            root.querySelector("#reg-errors").innerHTML = errorSummary(errors).s;
            for (const k of Object.keys(errors)) form.querySelector(`[name=${k}]`)?.setAttribute("aria-invalid", "true");
            root.querySelector(".error-summary").focus();
            return;
          }
          authFlow.active = true;
          let user;
          try {
            user = await auth.signUp(email, pw);
          } finally {
            authFlow.active = false;
          }
          const guardian = minor ? { name: str(d.guardian_name, 120), email: str(d.guardian_email, 160), phone: str(d.guardian_phone, 30), relation: str(d.guardian_relation, 60) } : null;
          const profile = {
            name,
            email,
            role,
            birthDate: d.birth_date || null,
            gender: d.gender || "nao_informado",
            phone: str(d.phone, 30),
            affiliation: str(d.affiliation, 120),
            guardian,
            imageConsent: !!d.consent_image,
            active: true,
            supportInterest: asList(d.support).filter((s) => SUPPORT_FUNCTIONS[s]),
            modalities: Object.fromEntries(mods2.map((m) => [m, { level: "", weight: null }]))
          };
          if (role === "professor") {
            profile.bio = str(d.bio, 1e3);
            profile.aptitudes = asList(d.aptitude).filter((x) => DISABILITY_TYPES[x]);
            profile.publicListing = !!d.public_listing;
          }
          await db.set("users", user.uid, profile);
          const grantedBy = minor ? guardian.name : name, grantedEmail = minor ? guardian.email : email, relation = minor ? guardian.relation : "titular";
          const consent = (kind) => db.add("consents", { userId: user.uid, kind, grantedBy, grantedEmail, relation, termsVersion: TERMS_VERSION, grantedAt: (/* @__PURE__ */ new Date()).toISOString(), revokedAt: null });
          await consent("cadastro");
          if (d.consent_image) await consent("imagem");
          if (disabilities.length || notes) {
            const consentId = await consent("dados_sensiveis");
            await db.set("sensitive", user.uid, { types: disabilities, notes, consentId });
          }
          if (role === "professor" && profile.publicListing) {
            await db.set("teachersPublic", user.uid, { name, bio: profile.bio, affiliation: profile.affiliation, modalities: mods2, aptitudes: profile.aptitudes });
          }
          await refreshSession();
          flash("Cadastro conclu\xEDdo! Esta \xE9 a sua p\xE1gina inicial de inscrito.", "success");
          go("/");
        });
      }
    };
  });
  route("/senha", async () => ({
    title: "Trocar senha",
    hero: pageHero("Conta", "Trocar senha"),
    body: html`${session.profile?.mustChangePassword ? html`<p class="flash warning" role="alert">Você entrou com uma <strong>senha provisória</strong>. Crie agora uma senha nova, só sua. Em "Senha atual", digite a senha provisória.</p>` : ""}
    <form class="card" style="max-width:34rem" id="pw-form">
    ${field("current", "Senha atual", { type: "password", required: true, attrs: 'autocomplete="current-password"' })}
    ${field("new", "Nova senha", { type: "password", required: true, hint: "M\xEDnimo de 8 caracteres com letras e n\xFAmeros (12 para administradores).", attrs: 'autocomplete="new-password"' })}
    ${field("new2", "Repita a nova senha", { type: "password", required: true, attrs: 'autocomplete="new-password"' })}
    <button class="btn" type="submit">Salvar nova senha</button></form>`,
    after(root) {
      bindForm(root, "#pw-form", async (d) => {
        const p = passwordProblem(d.new || "");
        if (p) throw new Error(p);
        if (session.isAdmin && d.new.length < 12) throw new Error("Administradores devem usar pelo menos 12 caracteres.");
        if (d.new !== d.new2) throw new Error("As senhas novas n\xE3o conferem.");
        await auth.changePassword(d.current, d.new);
        if (session.profile?.defaultCredential || session.profile?.mustChangePassword) await db.update("users", session.user.uid, { defaultCredential: false, mustChangePassword: false });
        await refreshSession();
        flash("Senha alterada.", "success");
        go(session.isAdmin ? "/painel" : "/conta");
      });
    }
  }), { auth: "user" });

  // js/pages/account.js
  var STATUS = { pendente: "Aguardando confirma\xE7\xE3o", confirmada: "Confirmada", recusada: "Recusada" };
  var USER = { auth: "user" };
  async function myEntries(uid2) {
    const own = await db.list("entries", [["userId", "==", uid2]]);
    const teams = await db.list("teams", [["memberIds", "array-contains", uid2]]);
    const teamEntries = (await Promise.all(teams.map((t) => db.list("entries", [["teamId", "==", t.id]])))).flat().map((e) => ({ ...e, team: teams.find((t) => t.id === e.teamId) }));
    return [...own, ...teamEntries];
  }
  function noticeIsFor(n, u) {
    if (!n.published) return false;
    const a = n.audience || "todos";
    if (a === "todos") return u.role !== "admin";
    if (a.startsWith("perfil:")) return u.role === a.slice(7);
    if (a.startsWith("modalidade:")) return !!(u.modalities || {})[a.slice(11)];
    return false;
  }
  async function myNotices(u) {
    return (await db.list("notices")).filter((n) => noticeIsFor(n, u)).sort((a, b) => b.date.localeCompare(a.date));
  }
  var isNew = (n, u) => !u.noticesSeenAt || n.date > u.noticesSeenAt;
  async function myPerformances(uid2) {
    return (await db.list("performances")).filter((p) => (p.members || []).some((m) => m.uid === uid2) || p.teacherId === uid2);
  }
  async function openCategories(u, entries) {
    if (u.role !== "lutador") return [];
    const mine = new Set(entries.map((e) => e.categoryId));
    const out = [];
    for (const ev of (await db.list("events", [["published", "==", true]])).filter((e) => e.registrationsOpen && (e.endsOn || e.startsOn) >= todayISO())) {
      for (const c of await db.list("categories", [["eventId", "==", ev.id]])) {
        if (c.status === "inscricoes" && !mine.has(c.id) && MOD[c.modality].kind === "luta" && !await eligibilityProblem(u, c, ev)) out.push({ ...c, ev });
      }
    }
    return out;
  }
  async function unreadCount(u) {
    return (await myNotices(u)).filter((n) => isNew(n, u)).length;
  }
  async function portal(current2, title, content, after, hero = null) {
    const u = session.profile;
    const area = u.role === "professor" ? "\xC1rea do professor" : "\xC1rea do aluno";
    return { title, hero: hero || pageHero(area, title), body: html`<div class="portal-page">${content}</div>`, after };
  }
  route("/conta", async () => {
    if (session.isAdmin) {
      go("/painel");
      return null;
    }
    const u = session.profile, uid2 = session.user.uid;
    if (!u) return { title: "\xC1rea do aluno", body: html`<h1>Área do aluno</h1><p>Perfil não encontrado. <a href="#/contato">Fale com a equipe</a>.</p>` };
    const student = u.role !== "professor";
    const [entries, agenda, perfs, notices] = await Promise.all([myEntries(uid2), calendarItems(null, { userId: uid2 }), myPerformances(uid2), myNotices(u)]);
    const conflicts = findConflicts(agenda);
    const now = (/* @__PURE__ */ new Date()).toISOString().slice(0, 16);
    const next = agenda.find((i) => i.start >= now && i.status !== "encerrada");
    const open = await openCategories(u, entries);
    const fresh = notices.filter((n) => isNew(n, u));
    const confirmed = entries.filter((e) => e.status === "confirmada").length, pending2 = entries.filter((e) => e.status === "pendente").length;
    const projects = (await db.list("projects", [["published", "==", true]])).filter((p) => (p.modalities || []).some((m) => (u.modalities || {})[m]));
    const photo = projects.find((p) => p.image);
    const first = u.name.split(" ")[0];
    const age = ageToday(u.birthDate);
    const hero = html`<section class="member-hero" aria-labelledby="member-title"><div class="wrap">
    <div><p class="eyebrow">${student ? "\xC1rea do aluno" : "\xC1rea do professor"}</p>
      <h1 id="member-title">Olá, ${first}!</h1>
      <p class="lead">${ROLE_LABELS[u.role]}${age != null && student ? ` \xB7 ${age} anos` : ""}${u.affiliation ? ` \xB7 ${u.affiliation}` : ""}</p>
      <div class="actions">${student ? html`<a class="btn" href="#/conta/competicoes">Competições e resultados</a>` : html`<a class="btn" href="#/painel">Central do evento</a>`}
        <a class="btn secondary" href="#/conta/agenda">Minha agenda</a>${fresh.length ? html`<a class="btn secondary" href="#/conta/avisos">${fresh.length} ${fresh.length === 1 ? "aviso novo" : "avisos novos"}</a>` : ""}</div></div>
    ${photo ? html`<div class="member-photo">${img(photo.image, photo.imageAlt)}<p class="muted">${photo.name}</p></div>` : ""}</div></section>`;
    return portal(
      "/conta",
      student ? "\xC1rea do aluno" : "\xC1rea do professor",
      html`
    ${u.mustChangePassword ? html`<div class="flash warning" role="alert">Você entrou com uma senha provisória. <a href="#/senha">Crie sua nova senha agora</a>.</div>` : ""}
    ${conflicts.length ? html`<div class="flash warning" role="alert"><strong>Conflito na sua agenda:</strong><ul>${conflicts.map((c) => html`<li>“${c.a.label}” (${fmtDate(c.a.start)}) e “${c.b.label}” (${fmtDate(c.b.start)})</li>`)}</ul>Fale com a organização para ajustar os horários.</div>` : ""}
    <ul class="kpis" aria-label="Resumo">
      <li class="card portal-next"><span class="kpi-label">Próximo compromisso</span>${next ? html`<strong>${fmtDate(next.start)}</strong><span>${next.kind === "performance" ? `Apresenta\xE7\xE3o: ${next.title}` : `${next.category}`}</span>${next.venue ? html`<span class="muted">${next.venue}</span>` : ""}` : html`<span class="muted">Nada agendado ainda.</span>`}<a href="#/conta/agenda">Ver agenda</a></li>
      ${student ? html`<li class="card"><span class="stat">${confirmed}</span>inscrições confirmadas${pending2 ? html`<br><span class="muted">${pending2} aguardando</span>` : ""}<br><a href="#/conta/competicoes">Competições</a></li>` : ""}
      <li class="card"><span class="stat">${perfs.length}</span>${perfs.length === 1 ? "apresenta\xE7\xE3o" : "apresenta\xE7\xF5es"}<br><a href="#/conta/apresentacoes">Ver</a></li>
      <li class="card ${fresh.length ? "kpi-alert" : ""}"><span class="stat">${fresh.length}</span>${fresh.length === 1 ? "aviso novo" : "avisos novos"}<br><a href="#/conta/avisos">Ler avisos</a></li>
    </ul>
    <section aria-labelledby="av-h"><h2 id="av-h">Avisos recentes</h2>
      ${notices.length ? html`<div class="grid" style="grid-template-columns:1fr">${notices.slice(0, 3).map((n) => noticeCard(n, u, true))}</div>` : html`<p class="muted">Nenhum aviso por enquanto.</p>`}</section>
    ${open.length ? html`<section aria-labelledby="open-h"><h2 id="open-h">Competições abertas para você</h2><ul class="compact">${open.map((c) => html`<li>${c.ev.name} — ${c.name}
      <button class="btn small" type="button" data-enroll="${c.id}" data-event="${c.ev.id}">Inscrever-me<span class="visually-hidden"> em ${c.name}</span></button></li>`)}</ul></section>` : ""}
    <section aria-labelledby="mod-h"><h2 id="mod-h">Minhas modalidades</h2>
      ${Object.keys(u.modalities || {}).length ? html`<p>${Object.entries(u.modalities).map(([k, v]) => html`<span class="tag">${MOD[k]?.name}${v.level ? ` \xB7 ${v.level}` : ""}${v.weight ? ` \xB7 ${v.weight} kg` : ""}</span>`)}</p>` : html`<p class="muted">Nenhuma modalidade. <a href="#/conta/perfil">Escolher modalidades</a>.</p>`}
      ${projects.length ? html`<p>Projeto${projects.length > 1 ? "s" : ""}: ${projects.map((p, i) => html`${i ? ", " : ""}<a href="#/projetos/${p.id}">${p.name}</a>`)}</p>` : ""}</section>
    ${!student ? html`<section><h2>Ferramentas do professor</h2><p><a class="btn" href="#/painel">Central do evento, calendário e roteiros de palco</a></p></section>` : ""}`,
      (root) => bindEnroll(root, u, uid2),
      hero
    );
  }, USER);
  function bindEnroll(root, u, uid2) {
    root.querySelectorAll("[data-enroll]").forEach((b) => b.addEventListener("click", async () => {
      b.disabled = true;
      try {
        await db.add("entries", { categoryId: b.dataset.enroll, eventId: b.dataset.event, userId: uid2, teamId: null, publicName: publicName(u), status: "pendente", seed: null });
        flash("Inscri\xE7\xE3o enviada! Ela ser\xE1 confirmada pela organiza\xE7\xE3o.", "success");
        go("/conta/competicoes");
      } catch (e) {
        flash(e.message, "error");
        renderFlashes();
        b.disabled = false;
      }
    }));
  }
  function noticeCard(n, u, short = false) {
    return html`<article class="card notice ${n.important ? "notice-important" : ""}">
    <p class="date" style="margin:0">${fmtDate(n.date.slice(0, 10))}${isNew(n, u) ? html` <span class="tag accent">novo</span>` : ""}${n.important ? html` <span class="tag">importante</span>` : ""}</p>
    <h3 style="margin:.2rem 0">${n.title}</h3>${short ? html`<p style="margin:0">${String(n.body || "").slice(0, 180)}${String(n.body || "").length > 180 ? "\u2026" : ""}</p>` : paragraphs(n.body)}</article>`;
  }
  route("/conta/agenda", async () => {
    var _a;
    const uid2 = session.user.uid;
    const agenda = await calendarItems(null, { userId: uid2 });
    const conflicts = findConflicts(agenda);
    const flagged = new Set(conflicts.flatMap((c) => [`${c.a.kind}:${c.a.id}`, `${c.b.kind}:${c.b.id}`]));
    const events = Object.fromEntries((await db.list("events", [["published", "==", true]])).map((e) => [e.id, e]));
    const days = {};
    for (const it of agenda) (days[_a = it.start.slice(0, 10)] || (days[_a] = [])).push(it);
    return portal(
      "/conta/agenda",
      "Minha agenda",
      html`<p class="hint">Lutas, jogos e apresentações em que você está escalado(a). Os horários podem mudar: confira antes de cada evento.</p>
    <div class="actions no-print"><button class="btn secondary small" type="button" id="print">Imprimir agenda</button></div>
    ${conflicts.length ? html`<div class="flash warning" role="alert"><strong>${conflicts.length} conflito(s) de horário.</strong> Fale com a organização.</div>` : ""}
    ${Object.keys(days).sort().map((day) => html`<h3>${fmtDate(day)}${events[days[day][0].eventId] ? ` \xB7 ${events[days[day][0].eventId].name}` : ""}</h3>
      <div class="table-wrap"><table><thead><tr><th scope="col">Horário</th><th scope="col">O quê</th><th scope="col">Onde</th><th scope="col">Situação</th></tr></thead>
      <tbody>${days[day].map((i) => {
        const bad = flagged.has(`${i.kind}:${i.id}`);
        return html`<tr class="${bad ? "conflict" : ""}"><td>${fmtTime(i.start)} (${i.duration_min} min)</td>
        <td>${i.kind === "performance" ? `Apresenta\xE7\xE3o: ${i.title}` : `${i.category}: ${i.a} \xD7 ${i.b}`}</td><td>${i.venue || "\u2014"}</td>
        <td>${bad ? raw("<strong>Conflito de hor\xE1rio</strong>") : i.status === "encerrada" ? `Encerrada: ${i.scoreA} \xD7 ${i.scoreB}` : "Agendado"}</td></tr>`;
      })}</tbody></table></div>`)}
    ${!agenda.length ? html`<p class="muted">Nenhum compromisso agendado ainda. Quando a organização definir os horários, eles aparecem aqui.</p>` : ""}`,
      (root) => root.querySelector("#print").addEventListener("click", () => window.print())
    );
  }, USER);
  route("/conta/competicoes", async () => {
    const u = session.profile, uid2 = session.user.uid;
    const entries = await myEntries(uid2);
    const cards = [];
    for (const e of entries) {
      const cat = await db.get("categories", e.categoryId);
      if (!cat) continue;
      const ev = await db.get("events", cat.eventId).catch(() => null);
      const ms = await db.list("matches", [["categoryId", "==", cat.id]]);
      const allEntries = await db.list("entries", [["categoryId", "==", cat.id]]);
      const names = await entryLabels(allEntries);
      const ko = ms.filter((m) => m.stage === "mata");
      const totalRounds = ko.length ? Math.max(...ko.map((m) => m.round)) : 0;
      const mine = ms.filter((m) => (m.a === e.id || m.b === e.id) && m.status !== "bye").sort((x, y) => (x.stage === y.stage ? 0 : x.stage === "grupo" ? -1 : 1) || x.round - y.round);
      const final = ko.find((m) => !m.nextId);
      let placement;
      if (e.status !== "confirmada") placement = STATUS[e.status];
      else if (final?.status === "encerrada" && final.winner === e.id) placement = "Campe\xE3o(\xE3)";
      else if (final?.status === "encerrada" && (final.a === e.id || final.b === e.id)) placement = "Vice-campe\xE3o(\xE3)";
      else {
        const lost = mine.find((m) => m.stage === "mata" && m.status === "encerrada" && m.winner && m.winner !== e.id);
        placement = lost ? `Eliminado(a) na ${roundName(lost.round, totalRounds).toLowerCase()}` : cat.status === "inscricoes" ? "Aguardando a chave" : "Em disputa";
      }
      cards.push({ e, cat, ev, mine, names, placement, totalRounds });
    }
    const open = await openCategories(u, entries);
    const res = (m, e) => {
      if (m.status !== "encerrada") return ["A disputar", ""];
      if (m.isDraw) return ["Empate", "draw"];
      return m.winner === e.id ? ["Vit\xF3ria", "win"] : ["Derrota", "loss"];
    };
    return portal(
      "/conta/competicoes",
      "Competi\xE7\xF5es e resultados",
      html`${cards.length ? cards.map(({ e, cat, ev, mine, names, placement, totalRounds }) => html`<article class="card" style="margin-bottom:1rem">
      <p class="eyebrow" style="margin:0">${ev?.name || "Evento"}${ev ? ` \xB7 ${fmtDate(ev.startsOn)}` : ""}</p>
      <h3 style="margin:.2rem 0">${cat.name}${e.team ? html` <span class="muted">· equipe ${e.team.name}</span>` : ""}</h3>
      <p><span class="placement">${placement}</span>${e.status === "confirmada" && cat.status !== "inscricoes" ? html` · <a href="#/chaves/${cat.id}">ver chave completa</a>` : ""}</p>
      ${mine.length ? html`<div class="table-wrap"><table><caption class="visually-hidden">Minhas disputas em ${cat.name}</caption>
        <thead><tr><th scope="col">Fase</th><th scope="col">Adversário</th><th scope="col">Quando</th><th scope="col">Resultado</th><th scope="col">Placar</th></tr></thead>
        <tbody>${mine.map((m) => {
        const meA = m.a === e.id;
        const opp = names[meA ? m.b : m.a] || "a definir";
        const [r, cls] = res(m, e);
        return html`<tr><td>${m.stage === "grupo" ? `Grupo ${m.groupLabel}, rodada ${m.round}` : roundName(m.round, totalRounds)}</td><td>${opp}</td>
            <td>${m.scheduledAt ? `${fmtDate(m.scheduledAt)}${m.venue ? ` \xB7 ${m.venue}` : ""}` : "a definir"}</td>
            <td><span class="result ${cls}">${r}</span>${m.status === "encerrada" && m.method ? html`<br><span class="muted">${METHOD_LABELS[m.method] || m.method}</span>` : ""}</td>
            <td>${m.status === "encerrada" ? `${meA ? m.scoreA : m.scoreB} \xD7 ${meA ? m.scoreB : m.scoreA}` : "\u2014"}</td></tr>`;
      })}</tbody></table></div>` : html`<p class="muted">${cat.status === "inscricoes" ? "A chave ainda n\xE3o foi gerada." : "Nenhuma disputa definida ainda."}</p>`}</article>`) : html`<p class="muted">Você ainda não está inscrito(a) em nenhuma competição.</p>`}
    ${open.length ? html`<h2>Competições abertas para você</h2><ul class="compact">${open.map((c) => html`<li>${c.ev.name} — ${c.name}
      <button class="btn small" type="button" data-enroll="${c.id}" data-event="${c.ev.id}">Inscrever-me<span class="visually-hidden"> em ${c.name}</span></button></li>`)}</ul>` : ""}
    ${u.role === "atleta" ? html`<p class="hint">Nos esportes coletivos, a inscrição é feita pela equipe, com o professor responsável.</p>` : ""}
    ${u.role === "artista" ? html`<p class="hint">Artistas participam dos eventos pelas apresentações. Veja em <a href="#/conta/apresentacoes">Apresentações</a>.</p>` : ""}`,
      (root) => bindEnroll(root, u, uid2)
    );
  }, USER);
  route("/conta/apresentacoes", async () => {
    const uid2 = session.user.uid;
    const perfs = await myPerformances(uid2);
    const events = Object.fromEntries((await db.list("events")).map((e) => [e.id, e]));
    const teachers = Object.fromEntries((await db.list("teachersPublic")).map((t) => [t.id, t.name]));
    const staff = await db.list("staff", [["uid", "==", uid2]]);
    perfs.sort((a, b) => String(a.scheduledAt || "9").localeCompare(String(b.scheduledAt || "9")));
    return portal("/conta/apresentacoes", "Apresenta\xE7\xF5es", html`${perfs.length ? perfs.map((p) => {
      const me = (p.members || []).find((m) => m.uid === uid2);
      return html`<article class="card" style="margin-bottom:1rem">
      <p class="eyebrow" style="margin:0">${events[p.eventId]?.name || "Evento"} · ${SLOTS[p.slot]}</p>
      <h3 style="margin:.2rem 0">${p.title}</h3>
      <dl class="facts"><dt>Quando</dt><dd>${p.scheduledAt ? fmtDate(p.scheduledAt) : "hor\xE1rio a definir"} · ${p.durationMin} min · ordem de entrada ${p.order}</dd>
        ${me ? html`<dt>Minha função</dt><dd>${me.part || "integrante"}</dd>` : html`<dt>Minha função</dt><dd>Professor(a) responsável</dd>`}
        <dt>Modalidade</dt><dd>${MOD[p.modality]?.name}</dd>
        ${p.soundtrack ? html`<dt>Trilha sonora</dt><dd>${p.soundtrack}</dd>` : ""}
        ${p.teacherId && teachers[p.teacherId] ? html`<dt>Professor(a)</dt><dd>${teachers[p.teacherId]}</dd>` : ""}
        <dt>Integrantes</dt><dd>${(p.members || []).map((m) => m.uid === uid2 ? "voc\xEA" : m.publicName).join(", ") || "\u2014"}</dd></dl>
      ${accTags(p)}</article>`;
    }) : html`<p class="muted">Você ainda não está escalado(a) em nenhuma apresentação.</p>`}
    ${staff.length ? html`<h2>Equipe de apoio</h2><ul>${staff.map((s) => html`<li>${events[s.eventId]?.name || "Evento"}: ${SUPPORT_FUNCTIONS[s.function]}${s.notes ? ` (${s.notes})` : ""}</li>`)}</ul>` : ""}`);
  }, USER);
  route("/conta/avisos", async () => {
    const u = session.profile;
    const notices = await myNotices(u);
    const view = portal("/conta/avisos", "Avisos", html`${notices.length ? html`<div class="grid" style="grid-template-columns:1fr">${notices.map((n) => noticeCard(n, u))}</div>` : html`<p class="muted">Nenhum aviso por enquanto.</p>`}`);
    const result = await view;
    await db.update("users", session.user.uid, { noticesSeenAt: (/* @__PURE__ */ new Date()).toISOString() });
    session.profile = { ...u, noticesSeenAt: (/* @__PURE__ */ new Date()).toISOString() };
    return result;
  }, USER);
  route("/conta/privacidade", async () => {
    const u = session.profile, uid2 = session.user.uid;
    const consents = (await db.list("consents", [["userId", "==", uid2]])).sort((a, b) => b.grantedAt.localeCompare(a.grantedAt));
    const minor = (ageToday(u.birthDate) ?? 99) < 18;
    const KIND = { cadastro: "Cadastro e participa\xE7\xE3o", imagem: "Uso de imagem (fotos e v\xEDdeos)", dados_sensiveis: "Informa\xE7\xE3o sobre defici\xEAncia" };
    return portal(
      "/conta/privacidade",
      "Privacidade e autoriza\xE7\xF5es",
      html`<p class="hint">Seus direitos pela LGPD: ver, corrigir, baixar e apagar seus dados, e retirar autorizações a qualquer momento.</p>
    <section class="card"><h3 style="margin-top:0">Uso de imagem</h3>
      <p>Situação: <strong>${u.imageConsent ? "autorizado" : "n\xE3o autorizado"}</strong>. ${u.imageConsent ? "Fotos e v\xEDdeos de eventos em que voc\xEA aparece podem ser publicados nos canais da O\xE1sis." : "Fotos em que voc\xEA aparece n\xE3o ser\xE3o publicadas."}</p>
      <form id="img-form">${minor && !u.imageConsent ? field("granted_by", "Nome do respons\xE1vel legal que autoriza", { value: u.guardian?.name }) : ""}
        <button class="btn ${u.imageConsent ? "secondary" : ""} small" type="submit">${u.imageConsent ? "Retirar autoriza\xE7\xE3o de uso de imagem" : "Autorizar uso de imagem"}</button></form></section>
    <h3>Histórico de autorizações</h3>
    <div class="table-wrap"><table><thead><tr><th scope="col">Autorização</th><th scope="col">Concedida por</th><th scope="col">Data</th><th scope="col">Situação</th></tr></thead>
      <tbody>${consents.map((c) => html`<tr><td>${KIND[c.kind] || c.kind}</td><td>${c.grantedBy}${c.relation && c.relation !== "titular" ? ` (${c.relation})` : ""}</td>
        <td>${fmtDate(c.grantedAt.slice(0, 16))}</td><td>${c.revokedAt ? `Retirada em ${fmtDate(c.revokedAt.slice(0, 10))}` : "V\xE1lida"}</td></tr>`)}</tbody></table></div>
    <h3>Meus dados</h3><div class="actions"><button class="btn secondary small" type="button" id="export">Baixar todos os meus dados</button>
      ${u.role !== "professor" ? html`<a class="btn secondary small" href="#/conta/acessibilidade">Informação de acessibilidade</a>` : ""}
      <a class="btn secondary small" href="#/privacidade">Política de privacidade</a></div>
    <h3>Excluir conta</h3><p><a href="#/conta/excluir">Excluir minha conta e meus dados pessoais</a></p>`,
      (root) => {
        bindForm(root, "#img-form", async (d) => {
          if (u.imageConsent) {
            for (const c of consents.filter((c2) => c2.kind === "imagem" && !c2.revokedAt)) await db.update("consents", c.id, { revokedAt: (/* @__PURE__ */ new Date()).toISOString() });
            await db.update("users", uid2, { imageConsent: false });
            flash("Autoriza\xE7\xE3o de uso de imagem retirada.", "success");
          } else {
            await db.add("consents", {
              userId: uid2,
              kind: "imagem",
              grantedBy: minor ? str(d.granted_by, 120) || u.guardian?.name : u.name,
              grantedEmail: minor ? u.guardian?.email : u.email,
              relation: minor ? u.guardian?.relation : "titular",
              termsVersion: TERMS_VERSION,
              grantedAt: (/* @__PURE__ */ new Date()).toISOString(),
              revokedAt: null
            });
            await db.update("users", uid2, { imageConsent: true });
            flash("Uso de imagem autorizado.", "success");
          }
          await refreshSession();
          go("/conta/privacidade");
        });
        root.querySelector("#export").addEventListener("click", async () => {
          const [sensitive, entries, perfs] = await Promise.all([db.get("sensitive", uid2).catch(() => null), myEntries(uid2), myPerformances(uid2)]);
          const data = {
            usuario: { ...u, id: uid2 },
            dados_sensiveis: sensitive,
            consentimentos: consents,
            inscricoes: entries.map(({ team, ...e }) => e),
            apresentacoes: perfs.map((p) => p.title)
          };
          download("meus-dados.json", JSON.stringify(data, null, 2), "application/json");
          await audit(uid2, uid2, "exportou os pr\xF3prios dados");
        });
      }
    );
  }, USER);
  route("/conta/comprovante", async () => {
    const u = session.profile, uid2 = session.user.uid;
    const { site } = await getSettings();
    const entries = (await myEntries(uid2)).filter((e) => e.status === "confirmada");
    const cats = (await Promise.all(entries.map((e) => db.get("categories", e.categoryId)))).filter(Boolean);
    const events = Object.fromEntries((await db.list("events")).map((e) => [e.id, e]));
    const reg = (await db.list("consents", [["userId", "==", uid2]])).find((c) => c.kind === "cadastro");
    return portal(
      "/conta/comprovante",
      "Comprovante de inscri\xE7\xE3o",
      html`
    <div class="actions no-print"><button class="btn" type="button" id="print">Imprimir / salvar em PDF</button></div>
    <article class="card receipt"><header><p class="logo-mark" style="margin:0">${site.shortName}</p><p style="margin:0"><strong>${site.name}</strong><br>${site.address}</p></header>
      <h2>Comprovante de inscrição</h2>
      <dl class="facts"><dt>Participante</dt><dd>${u.name}</dd>
        ${u.birthDate ? html`<dt>Nascimento</dt><dd>${fmtDate(u.birthDate)} (${ageToday(u.birthDate)} anos)</dd>` : ""}
        <dt>Perfil</dt><dd>${ROLE_LABELS[u.role]}</dd>
        <dt>Modalidades</dt><dd>${Object.entries(u.modalities || {}).map(([k, v]) => `${MOD[k]?.name}${v.level ? ` (${v.level})` : ""}`).join(", ") || "\u2014"}</dd>
        ${u.guardian ? html`<dt>Responsável legal</dt><dd>${u.guardian.name} (${u.guardian.relation}) · ${u.guardian.phone || u.guardian.email}</dd>` : ""}
        <dt>Inscrição desde</dt><dd>${reg ? fmtDate(reg.grantedAt.slice(0, 10)) : "\u2014"}</dd>
        <dt>Competições confirmadas</dt><dd>${cats.length ? cats.map((c) => `${events[c.eventId]?.name || ""} \u2014 ${c.name}`).join("; ") : "nenhuma"}</dd>
        <dt>Uso de imagem</dt><dd>${u.imageConsent ? "autorizado" : "n\xE3o autorizado"}</dd></dl>
      <p class="hint">Atividades gratuitas. Emitido em ${fmtDate(todayISO())}. Em caso de dúvida: ${site.email} · ${site.phone1}.</p></article>`,
      (root) => root.querySelector("#print").addEventListener("click", () => window.print())
    );
  }, USER);
  route("/conta/perfil", async () => {
    const u = session.profile;
    const available = MODALITIES.filter((m) => (ROLE_KINDS[u.role] || []).includes(m.kind));
    const support = new Set(u.supportInterest || []), apts = new Set(u.aptitudes || []);
    return portal(
      "/conta/perfil",
      "Perfil e modalidades",
      html`<form id="profile-form"><fieldset><legend>Dados</legend>
      ${field("name", "Nome completo", { value: u.name, required: true })}
      <div class="row">${field("phone", "Telefone", { type: "tel", value: u.phone })}${field("affiliation", "Escola, academia ou turma", { value: u.affiliation })}</div>
      ${u.guardian ? html`<p>Responsável: <strong>${u.guardian.name}</strong> (${u.guardian.relation}, ${u.guardian.email})</p>${field("guardian_phone", "Telefone do respons\xE1vel", { type: "tel", value: u.guardian.phone })}` : ""}</fieldset>
      <fieldset><legend>Modalidades</legend><p class="hint">Nas lutas, informe faixa/graduação e peso — usados para montar as categorias.</p>
        ${available.map((m) => {
        const cur = (u.modalities || {})[m.code];
        return html`<div class="card" style="margin-bottom:.5rem">
          ${checkbox(`mod_${m.code}`, m.name + (m.adaptedOf ? " (adaptada)" : ""), !!cur)}
          <div class="row">${field(`level_${m.code}`, "N\xEDvel, faixa ou instrumento", { value: cur?.level || "" })}
          ${m.kind === "luta" ? field(`weight_${m.code}`, "Peso (kg)", { type: "number", value: cur?.weight ?? "", attrs: 'step="0.1" min="10" max="150"' }) : ""}</div></div>`;
      })}</fieldset>
      ${u.role === "professor" ? html`<fieldset><legend>Inclusão e perfil público</legend>
        <div class="checks">${Object.entries(DISABILITY_TYPES).map(([k, v]) => html`<label class="check"><input type="checkbox" name="aptitude" value="${k}" ${raw(apts.has(k) ? "checked" : "")}> ${v}</label>`)}</div>
        ${textarea("bio", "Apresenta\xE7\xE3o", { value: u.bio })}${checkbox("public_listing", "Aparecer na busca p\xFAblica de professores", !!u.publicListing)}</fieldset>` : ""}
      <fieldset><legend>Equipe de apoio dos eventos</legend><div class="checks">${Object.entries(SUPPORT_FUNCTIONS).map(([k, v]) => html`<label class="check"><input type="checkbox" name="support" value="${k}" ${raw(support.has(k) ? "checked" : "")}> ${v}</label>`)}</div></fieldset>
      <button class="btn" type="submit">Salvar</button></form>`,
      (root) => {
        bindForm(root, "#profile-form", async (d) => {
          const modalities = { ...u.modalities || {} };
          for (const m of available) {
            if (d[`mod_${m.code}`]) modalities[m.code] = { level: str(d[`level_${m.code}`], 60), weight: num(d[`weight_${m.code}`]) };
            else delete modalities[m.code];
          }
          const patch = {
            name: str(d.name, 120) || u.name,
            phone: str(d.phone, 30),
            affiliation: str(d.affiliation, 120),
            modalities,
            supportInterest: asList(d.support).filter((s) => SUPPORT_FUNCTIONS[s])
          };
          if (u.guardian) patch.guardian = { ...u.guardian, phone: str(d.guardian_phone, 30) };
          if (u.role === "professor") {
            Object.assign(patch, { bio: str(d.bio, 1e3), aptitudes: asList(d.aptitude).filter((x) => DISABILITY_TYPES[x]), publicListing: !!d.public_listing });
            if (patch.publicListing) await db.set("teachersPublic", session.user.uid, { name: patch.name, bio: patch.bio, affiliation: patch.affiliation, modalities: Object.keys(modalities), aptitudes: patch.aptitudes });
            else await db.remove("teachersPublic", session.user.uid).catch(() => {
            });
          }
          await db.update("users", session.user.uid, patch);
          await refreshSession();
          flash("Perfil atualizado.", "success");
          go("/conta/perfil");
        });
      }
    );
  }, USER);
  route("/conta/acessibilidade", async () => {
    const u = session.profile, uid2 = session.user.uid;
    const minor = (ageToday(u.birthDate) ?? 99) < 18;
    const data = await db.get("sensitive", uid2).catch(() => null);
    const types = new Set(data?.types || []);
    const adapted = MODALITIES.filter((m) => m.adaptedOf);
    return portal(
      "/conta/acessibilidade",
      "Acessibilidade e defici\xEAncia",
      html`<p class="hint">Informação opcional e sigilosa. Serve para vincular o perfil às modalidades adaptadas e preparar apoio nos eventos. Só a coordenação vê, e cada acesso é registrado.</p>
    <form id="dis-form"><fieldset class="sensitive"><legend>Tipo de deficiência</legend>
      <div class="checks">${Object.entries(DISABILITY_TYPES).map(([k, v]) => html`<label class="check"><input type="checkbox" name="disability" value="${k}" ${raw(types.has(k) ? "checked" : "")}> ${v}</label>`)}</div>
      ${textarea("notes", "Necessidades de apoio", { value: data?.notes || "", rows: 3 })}</fieldset>
    ${u.role === "lutador" ? html`<fieldset><legend>Modalidades adaptadas</legend><div class="checks">${adapted.map((m) => html`<label class="check"><input type="checkbox" name="adapted" value="${m.code}" ${raw((u.modalities || {})[m.code] ? "checked" : "")}> ${m.name}</label>`)}</div></fieldset>` : ""}
    <fieldset><legend>Consentimento</legend>${minor ? field("granted_by", "Nome do respons\xE1vel legal que autoriza", { value: u.guardian?.name, required: true }) : ""}
      <label class="check"><input type="checkbox" name="consent_sensitive" value="1" required> Autorizo, de forma específica e destacada, o tratamento desta informação para as finalidades descritas${minor ? ", na condi\xE7\xE3o de respons\xE1vel legal" : ""}.</label></fieldset>
    <button class="btn" type="submit" name="action" value="save">Salvar</button>
    ${data ? html` <button class="btn danger" type="submit" name="action" value="remove" formnovalidate>Remover informação e revogar consentimento</button>` : ""}</form>`,
      (root) => {
        bindForm(root, "#dis-form", async (d) => {
          var _a;
          const myConsents = await db.list("consents", [["userId", "==", uid2]]);
          if (d.action === "remove") {
            await db.remove("sensitive", uid2);
            for (const c of myConsents.filter((c2) => c2.kind === "dados_sensiveis" && !c2.revokedAt)) await db.update("consents", c.id, { revokedAt: (/* @__PURE__ */ new Date()).toISOString() });
            flash("Informa\xE7\xE3o removida e consentimento revogado.", "success");
            return go("/conta/acessibilidade");
          }
          if (!d.consent_sensitive) throw new Error("Marque o consentimento espec\xEDfico para salvar.");
          const consentId = await db.add("consents", {
            userId: uid2,
            kind: "dados_sensiveis",
            grantedBy: minor ? str(d.granted_by, 120) || u.guardian?.name : u.name,
            grantedEmail: minor ? u.guardian?.email : u.email,
            relation: minor ? u.guardian?.relation : "titular",
            termsVersion: TERMS_VERSION,
            grantedAt: (/* @__PURE__ */ new Date()).toISOString(),
            revokedAt: null
          });
          await db.set("sensitive", uid2, { types: asList(d.disability).filter((x) => DISABILITY_TYPES[x]), notes: str(d.notes, 500), consentId });
          if (u.role === "lutador") {
            const modalities = { ...u.modalities || {} };
            for (const m of adapted) {
              if (asList(d.adapted).includes(m.code)) modalities[_a = m.code] || (modalities[_a] = { level: "", weight: null });
              else delete modalities[m.code];
            }
            await db.update("users", uid2, { modalities });
            await refreshSession();
          }
          flash("Informa\xE7\xE3o salva com sigilo.", "success");
          go("/conta/acessibilidade");
        });
      }
    );
  }, USER);
  route("/conta/excluir", async () => portal(
    "/conta/privacidade",
    "Excluir conta",
    html`<p>Seus dados pessoais, de responsável e a informação de deficiência serão apagados. Resultados de lutas e partidas já disputadas ficam como “Participante removido”, para não alterar as chaves dos demais.</p>
    <form class="card" style="max-width:34rem" id="del-form">${field("confirm", "Digite EXCLUIR para confirmar", { required: true })}
      ${field("password", "Sua senha", { type: "password", required: true, attrs: 'autocomplete="current-password"' })}
      <button class="btn danger" type="submit">Excluir definitivamente</button></form>`,
    (root) => {
      bindForm(root, "#del-form", async (d, form) => {
        if (!confirmText(form)) throw new Error("Digite EXCLUIR para confirmar.");
        const uid2 = session.user.uid;
        await auth.checkPassword(d.password);
        authFlow.active = true;
        try {
          await anonymizeUser(uid2);
          await auth.deleteMe(d.password);
          await refreshSession();
        } finally {
          authFlow.active = false;
        }
        flash("Sua conta e seus dados pessoais foram exclu\xEDdos.", "info");
        go("/");
      });
    }
  ), USER);
  async function anonymizeUser(uid2) {
    await db.remove("sensitive", uid2).catch(() => {
    });
    await db.remove("teachersPublic", uid2).catch(() => {
    });
    for (const c of await db.list("consents", [["userId", "==", uid2]])) {
      await db.update("consents", c.id, { revokedAt: c.revokedAt || (/* @__PURE__ */ new Date()).toISOString(), grantedBy: "removido", grantedEmail: null });
    }
    for (const e of await db.list("entries", [["userId", "==", uid2]])) await db.update("entries", e.id, { publicName: "Participante removido" }).catch(() => {
    });
    await db.set("users", uid2, { name: "Participante removido", email: "", role: (await db.get("users", uid2))?.role || "atleta", active: false, removedAt: (/* @__PURE__ */ new Date()).toISOString() });
  }

  // js/pages/admin.js
  var ADMIN2 = { auth: "admin" };
  var STAFF = { auth: "staff" };
  function adminLayout(current2, content) {
    const item = (href, label) => html`<li><a href="#${href}" ${raw(current2 === href ? 'aria-current="page"' : "")}>${label}</a></li>`;
    const admin = session.isAdmin;
    return html`<div class="admin-layout"><nav class="admin-nav" aria-label="Menu do painel"><ul>
    <li class="nav-group">Eventos</li>${item("/painel", raw("<strong>Central do evento</strong>"))}
    ${admin ? html`${item("/painel/eventos", "Eventos e chaves")}${item("/painel/equipes", "Equipes")}` : ""}${item("/painel/calendario", "Calend\xE1rio unificado")}
    ${admin ? html`${item("/painel/pessoas", "Pessoas")}${item("/painel/avisos", "Avisos aos inscritos")}${item("/painel/regras", "Pontua\xE7\xE3o e regras")}
      <li class="nav-group">Site</li>${item("/painel/site", "Textos e contatos")}${item("/painel/site/noticias", "Not\xEDcias")}${item("/painel/site/projetos", "Projetos")}
      ${item("/painel/site/patrocinadores", "Patrocinadores")}${item("/painel/site/mensagens", "Mensagens")}` : ""}
    ${admin ? html`<li class="nav-group">Sistema</li>${item("/painel/backup", "Backup dos dados")}` : ""}
    <li class="nav-group">Conta</li>${item("/senha", "Trocar senha")}</ul></nav><div>${content}</div></div>`;
  }
  var page = (title, current2, content, after) => ({ title, body: adminLayout(current2, content), after });
  route("/painel", async ({ query }) => {
    const events = await listSorted("events", [], "startsOn", "desc");
    const eventId = query.evento || await defaultEventId();
    const hub = eventId ? await eventHub(eventId, { full: session.isAdmin }) : null;
    const users = session.isAdmin ? await db.list("users") : [];
    const students = users.filter((u) => ["atleta", "lutador", "artista"].includes(u.role) && u.active !== false).length;
    const teachers = users.filter((u) => u.role === "professor" && u.active !== false).length;
    const A2 = session.isAdmin;
    const warn = session.profile?.defaultCredential && A2 ? html`<div class="flash warning" role="alert"><strong>Credencial inicial em uso.</strong>
    Troque a senha do administrador antes de usar com dados reais: <a href="#/senha">trocar senha agora</a>.</div>` : "";
    if (!hub) return page("Central do evento", "/painel", html`${warn}<p class="eyebrow">Central do evento</p><h1>Nenhum evento ainda</h1>
    <div class="card"><h2 style="margin-top:0">Comece por aqui</h2><ol><li>Confira os valores em <a href="#/painel/regras">Pontuação e regras</a>.</li>
    <li>Crie o primeiro evento em <a href="#/painel/eventos">Eventos e chaves</a>.</li><li>Divulgue a página de <a href="#/cadastro">inscrição</a>.</li></ol></div>`);
    const { ev } = hub;
    const lnk = (kind, id) => kind === "category" ? `#/painel/categorias/${id}` : kind === "match" ? `#/painel/partidas/${id}` : `#/painel/apresentacoes/${id}`;
    return page(
      "Central do evento",
      "/painel",
      html`${warn}
    <div class="hub-head"><div><p class="eyebrow">Central do evento</p><h1>${ev.name}</h1>
      <p class="muted">${fmtDate(ev.startsOn)}${ev.location ? ` \xB7 ${ev.location}` : ""} · ${EVENT_KINDS[ev.kind]}${!ev.published ? html` · <span class="tag accent">rascunho</span>` : ""}</p></div>
      ${events.length > 1 ? html`<form class="actions" style="margin:0" id="ev-pick"><label for="evento" class="visually-hidden">Trocar de evento</label>
        <select id="evento" name="evento" style="max-width:18rem">${events.map((e) => html`<option value="${e.id}" ${raw(e.id === ev.id ? "selected" : "")}>${e.name}</option>`)}</select>
        <button class="btn secondary small" type="submit">Abrir</button></form>` : ""}</div>
    <div class="actions">${A2 ? html`<a class="btn small" href="#/painel/eventos/${ev.id}">Gerenciar evento</a>` : ""}
      <a class="btn secondary small" href="#/painel/calendario?evento=${ev.id}">Calendário</a><a class="btn secondary small" href="#/painel/eventos/${ev.id}/roteiro">Roteiro de palco</a>
      ${ev.published ? html`<a class="btn secondary small" href="#/eventos/${ev.id}">Página pública</a>` : ""}</div>
    <ul class="kpis" aria-label="Resumo do evento">
      <li class="card"><span class="stat">${hub.progress.percent}%</span>das lutas e partidas concluídas (${hub.progress.done} de ${hub.progress.matches})</li>
      <li class="card"><span class="stat">${hub.progress.performances}</span>apresentações no palco</li>
      <li class="card ${hub.conflicts.length ? "kpi-alert" : ""}"><span class="stat">${hub.conflicts.length}</span>conflitos palco × quadra</li>
      <li class="card ${hub.todo.length ? "kpi-alert" : ""}"><span class="stat">${hub.todo.length}</span>pendências</li>
      ${A2 ? html`<li class="card"><span class="stat">${students}</span>alunos · ${teachers} professores</li>` : ""}</ul>
    <div class="hub-grid"><section aria-labelledby="prog-h" class="card hub-main"><h2 id="prog-h">Programação unificada — palco e quadra</h2>
      ${hub.timeline.length ? html`<ol class="timeline">${hub.timeline.map((it, i) => html`
        ${hub.multiDay && (i === 0 || it.start.slice(0, 10) !== hub.timeline[i - 1].start.slice(0, 10)) ? html`<li class="tl-day">${fmtDate(it.start.slice(0, 10))}</li>` : ""}
        <li class="tl-item tl-${it.kind} ${it.conflict ? "is-conflict" : ""} ${it.status === "encerrada" ? "is-done" : ""}">
          <span class="tl-time">${fmtTime(it.start)}</span><div class="tl-body">
          ${it.kind === "match" ? html`<span class="tl-cat">${it.category}${it.venue ? ` \xB7 ${it.venue}` : ""}</span>
            <span class="tl-title">${A2 ? html`<a href="#/painel/partidas/${it.id}">${it.a} × ${it.b}</a>` : `${it.a} \xD7 ${it.b}`}</span>
            ${it.status === "encerrada" ? html`<span class="tl-result">Resultado: ${it.scoreA} × ${it.scoreB} — ${it.winner === "Empate" ? "empate" : `vit\xF3ria de ${it.winner}`} (${METHOD_LABELS[it.method] || it.method})</span>` : html`<span class="tl-result muted">A disputar · ${it.duration_min} min</span>`}` : html`<span class="tl-cat">${SLOTS[it.slot]} · Palco · ${it.duration_min} min</span>
            <span class="tl-title">${A2 ? html`<a href="#/painel/apresentacoes/${it.id}">${it.title}</a>` : it.title}</span>${accTags(it)}`}
          ${it.conflict ? html`<span class="tl-warn">Conflito: alguém deste compromisso está em outro no mesmo horário</span>` : ""}</div></li>`)}</ol>` : html`<p class="muted">Nada agendado ainda. Defina horários nas súmulas e nas apresentações.</p>`}</section>
      <div class="hub-side">
        <section aria-labelledby="conf-h" class="card"><h2 id="conf-h">Conflitos</h2>${hub.conflicts.length ? html`<ul class="compact">${hub.conflicts.map((c) => html`<li><strong>${fmtTime(c.a.start)}</strong> ${c.a.label}<br><span class="muted">choca com</span> <strong>${fmtTime(c.b.start)}</strong> ${c.b.label}</li>`)}</ul>` : html`<p class="muted">Nenhum conflito.</p>`}</section>
        <section aria-labelledby="todo-h" class="card"><h2 id="todo-h">Pendências</h2>${hub.todo.length ? html`<ul class="compact">${hub.todo.slice(0, 12).map(([k, id, t]) => html`<li>${A2 ? html`<a href="${lnk(k, id)}">${t}</a>` : t}</li>`)}</ul>
          ${hub.todo.length > 12 ? html`<p class="muted">e mais ${hub.todo.length - 12}.</p>` : ""}` : html`<p class="muted">Tudo em dia.</p>`}</section>
        <section aria-labelledby="staff-h" class="card"><h2 id="staff-h">Equipe de apoio</h2>${hub.staff.length ? html`<ul class="compact">${hub.staff.map((s) => html`<li>${s.fullName || s.publicName} — ${SUPPORT_FUNCTIONS[s.function]}</li>`)}</ul>` : html`<p class="muted">Ninguém escalado.</p>`}</section></div></div>
    <section aria-labelledby="chaves-h"><h2 id="chaves-h">Chaves</h2>${hub.categories.length ? html`<div class="grid">${hub.categories.map((c) => html`<article class="card">
      <h3 style="margin:0 0 .25rem">${A2 ? html`<a href="#/painel/categorias/${c.id}">${c.name}</a>` : c.name}</h3><p class="muted" style="margin:0 0 .5rem">${c.modalityName}${c.adapted ? html` · <span class="tag accent">adaptada</span>` : ""}</p>
      ${c.total ? html`<label for="prog-${c.id}" class="hint">${c.done} de ${c.total} concluídas</label><progress id="prog-${c.id}" max="${c.total}" value="${c.done}">${c.done} de ${c.total}</progress>` : html`<p class="hint">${c.confirmed} inscritos confirmados · chave não gerada</p>`}
      ${c.champion ? html`<p class="champion">Campeão: <strong>${c.champion}</strong></p>` : c.next.length ? html`<p style="margin:.5rem 0 .25rem"><strong>Próximas:</strong></p>
        <ul class="compact">${c.next.map((n) => html`<li>${A2 ? html`<a href="#/painel/partidas/${n.id}">${n.a} × ${n.b}</a>` : `${n.a} \xD7 ${n.b}`}${n.at ? ` \xB7 ${fmtTime(n.at)}` : ""}</li>`)}</ul>` : ""}</article>`)}</div>` : html`<p class="muted">Nenhuma categoria.</p>`}</section>
    <section aria-labelledby="palco-h"><h2 id="palco-h">Palco — ordem de entrada</h2>${hub.script.length ? html`<div class="grid">${Object.entries(SLOTS).map(([slot, label]) => {
        const items = hub.script.filter((p) => p.slot === slot);
        return html`
      <div class="card"><h3 style="margin-top:0">${label}</h3>${items.length ? html`<ol class="compact">${items.map((p) => html`<li>${A2 ? html`<a href="#/painel/apresentacoes/${p.id}">${p.title}</a>` : p.title}
        <span class="muted">(${p.durationMin} min${p.scheduledAt ? `, ${fmtTime(p.scheduledAt)}` : ""}, ${p.members.length} integrantes)</span> ${accTags(p)}</li>`)}</ol>` : html`<p class="muted">—</p>`}</div>`;
      })}</div>` : html`<p class="muted">Nenhuma apresentação.</p>`}</section>`,
      (root) => root.querySelector("#ev-pick")?.addEventListener("submit", (e) => {
        e.preventDefault();
        go(`/painel?evento=${e.target.evento.value}`);
      })
    );
  }, STAFF);
  function eventForm(ev = {}) {
    return html`${field("name", "Nome do evento", { value: ev.name, required: true })}
    <div class="row">${select("kind", "Tipo", EVENT_KINDS, ev.kind || "misto")}${field("startsOn", "In\xEDcio", { type: "date", value: ev.startsOn, required: true })}
      ${field("endsOn", "Fim", { type: "date", value: ev.endsOn })}${field("timeLabel", "Hor\xE1rio na agenda", { value: ev.timeLabel, hint: "Ex.: 19h" })}</div>
    ${field("location", "Local", { value: ev.location })}${textarea("description", "Descri\xE7\xE3o", { value: ev.description })}
    ${field("librasVideoUrl", "V\xEDdeo de apresenta\xE7\xE3o em Libras (URL)", { type: "url", value: ev.librasVideoUrl, hint: "V\xEDdeo com int\xE9rprete. Links do YouTube s\xE3o incorporados na p\xE1gina." })}
    <fieldset><legend>Imagem de capa</legend>${ev.image ? html`${img(ev.image, ev.imageAlt, "thumb")}${checkbox("remove_image", "Remover imagem", false)}` : ""}
      <div class="field"><label for="ev_image">Enviar imagem</label><input type="file" id="ev_image" name="image_file" accept="image/*"></div>
      ${field("imageAlt", "Descri\xE7\xE3o da imagem (para leitores de tela)", { value: ev.imageAlt, id: "ev_alt" })}</fieldset>
    ${checkbox("published", "Publicado na \xE1rea p\xFAblica", !!ev.published)}${checkbox("registrationsOpen", "Inscri\xE7\xF5es abertas", ev.registrationsOpen !== false)}`;
  }
  async function handleImage(form, d, current2) {
    const file = form.querySelector("input[type=file]")?.files?.[0];
    let image = current2?.image || "";
    if (file) {
      const id = await uploadImage(file);
      await removeImage(image);
      image = id;
    } else if (d.remove_image) {
      await removeImage(image);
      image = "";
    }
    const alt = str(d.imageAlt, 300);
    if (image && !alt) throw new Error("Descreva a imagem (texto alternativo) para quem usa leitor de tela.");
    return { image, imageAlt: alt };
  }
  function eventData(d) {
    if (!str(d.name) || !d.startsOn) throw new Error("Nome e data de in\xEDcio s\xE3o obrigat\xF3rios.");
    return {
      name: str(d.name, 150),
      kind: EVENT_KINDS[d.kind] ? d.kind : "misto",
      startsOn: d.startsOn,
      endsOn: d.endsOn || d.startsOn,
      timeLabel: str(d.timeLabel, 30),
      location: str(d.location, 200),
      description: str(d.description, 3e3),
      librasVideoUrl: str(d.librasVideoUrl, 300),
      published: !!d.published,
      registrationsOpen: !!d.registrationsOpen
    };
  }
  route("/painel/eventos", async () => {
    const events = await listSorted("events", [], "startsOn", "desc");
    return page("Eventos", "/painel/eventos", html`<h1>Eventos</h1>
    <p><a class="btn" href="#/painel/eventos/novo">Novo evento (passo a passo)</a></p>
    ${events.length ? "" : html`<p class="muted">Nenhum evento cadastrado ainda.</p>`}
    <div class="table-wrap"><table><thead><tr><th scope="col">Evento</th><th scope="col">Data</th><th scope="col">Tipo</th><th scope="col">Situação</th></tr></thead>
      <tbody>${events.map((e) => html`<tr><th scope="row"><a href="#/painel/eventos/${e.id}">${e.name}</a></th><td>${fmtDate(e.startsOn)}</td><td>${EVENT_KINDS[e.kind]}</td><td>${e.published ? "Publicado" : "Rascunho"}</td></tr>`)}</tbody></table></div>
`);
  }, ADMIN2);
  route("/painel/eventos/:id", async ({ params }) => {
    const ev = await db.get("events", params.id);
    if (!ev) return notFound();
    const { general } = await getSettings();
    const [cats, entries, script, staff, users] = await Promise.all([
      db.list("categories", [["eventId", "==", ev.id]]),
      db.list("entries", [["eventId", "==", ev.id]]),
      stageScript(ev.id, { full: true }),
      db.list("staff", [["eventId", "==", ev.id]]),
      listSorted("users", [], "name")
    ]);
    const people = users.filter((u) => u.role !== "admin" && u.active !== false).sort((a, b) => (b.supportInterest?.length || 0) - (a.supportInterest?.length || 0) || a.name.localeCompare(b.name));
    const teachers = users.filter((u) => u.role === "professor" && u.active !== false);
    cats.sort((a, b) => MOD[a.modality].name.localeCompare(MOD[b.modality].name) || a.ageMin - b.ageMin || (a.gender || "").localeCompare(b.gender || "") || (a.weightMax ?? 999) - (b.weightMax ?? 999));
    return page(
      ev.name,
      "/painel/eventos",
      html`<p><a href="#/painel/eventos">← Eventos</a></p><h1>${ev.name}</h1>
    <div class="actions">${ev.published ? html`<a class="btn secondary small" href="#/eventos/${ev.id}">Ver página pública</a>` : ""}
      <a class="btn secondary small" href="#/painel?evento=${ev.id}">Central do evento</a><a class="btn secondary small" href="#/painel/eventos/${ev.id}/roteiro">Roteiro de palco</a></div>
    <details><summary>Editar dados do evento</summary><form class="card" id="ev-edit">${eventForm(ev)}<button class="btn" type="submit">Salvar</button></form></details>
    <h2 id="categorias">Categorias e chaves</h2>
    ${cats.length ? html`<div class="table-wrap"><table><thead><tr><th scope="col">Categoria</th><th scope="col">Idade</th><th scope="col">Peso</th><th scope="col">Formato</th><th scope="col">Inscritos</th><th scope="col">Situação</th></tr></thead>
      <tbody>${cats.map((c) => {
        const es = entries.filter((e) => e.categoryId === c.id);
        const pend = es.filter((e) => e.status === "pendente").length;
        return html`<tr>
        <th scope="row"><a href="#/painel/categorias/${c.id}">${c.name}</a>${MOD[c.modality].adaptedOf ? html` <span class="tag accent">adaptada</span>` : ""}</th>
        <td>${c.ageMin}–${c.ageMax}</td><td>${catWeightLabel(c) || "\u2014"}</td><td>${c.format === "grupos" ? "Grupos + mata-mata" : "Eliminat\xF3ria simples"}</td><td>${es.length}${pend ? ` (${pend} pendentes)` : ""}</td>
        <td>${{ inscricoes: "Inscri\xE7\xF5es", chave_gerada: "Chave gerada", encerrada: "Encerrada" }[c.status]}</td></tr>`;
      })}</tbody></table></div>` : html`<p class="muted">Nenhuma categoria.</p>`}
    <details ${raw(cats.length ? "" : "open")}><summary>Nova categoria</summary><form class="card" id="cat-form">
      <div class="row">${select("modality", "Modalidade", Object.fromEntries(MODALITIES.filter((m) => m.kind !== "arte").map((m) => [m.code, m.name + (m.adaptedOf ? " (adaptada)" : "")])), ev.modality || "jiu_jitsu")}
        ${select("gender", "Sexo", { ...GENDERS, ambos: "Feminino e masculino (categorias separadas)" }, "misto")}${select("format", "Formato da chave", { eliminatoria: "Eliminat\xF3ria simples", grupos: "Grupos + mata-mata" }, "eliminatoria")}</div>
      <fieldset><legend>Divisões por idade</legend>
        <p class="hint">Marque as divisões. Nas lutas (jiu-jitsu, taekwondo e adaptadas), com sexo feminino ou masculino, é criada uma categoria para cada peso da tabela da divisão
          (<a href="#/painel/regras">ver/editar tabela de peso</a>).</p>
        <div class="checks">${general.ageBands.map((b, i) => checkbox(`div_${i}`, `${b.name} (${b.min}\u2013${b.max} anos)`, false))}</div>
        <details><summary>Ou uma faixa específica (sem usar as divisões)</summary><div class="row">${field("name", "Nome (opcional)", { id: "cat_name" })}
        ${field("ageMin", "Idade m\xEDnima", { type: "number", attrs: 'min="4" max="17"' })}${field("ageMax", "Idade m\xE1xima", { type: "number", attrs: 'min="4" max="17"' })}</div>
      <div class="row">${field("weightMin", "Peso m\xEDnimo (kg, lutas)", { type: "number", attrs: 'step="0.1"' })}${field("weightMax", "Peso m\xE1ximo (kg, lutas)", { type: "number", attrs: 'step="0.1"' })}</div></details></fieldset>
      <div class="row">        ${field("matchMinutes", "Dura\xE7\xE3o de cada luta/partida (min)", { type: "number", value: 10 })}</div>
      <div class="row">${field("groupCount", "N\xBA de grupos", { type: "number", value: 2 })}${field("qualifiers", "Classificados por grupo", { type: "number", value: 2 })}</div>
      <fieldset><legend>Libras</legend>
        ${checkbox("librasAuto", "Gerar a explica\xE7\xE3o da categoria em Libras automaticamente (avatar VLibras), a partir das caracter\xEDsticas escolhidas acima", true)}
        <p class="hint">O texto é montado com a modalidade, idade, sexo, peso, formato da chave, duração e regras de pontuação. Depois de criar, você pode baixar o roteiro para um intérprete gravar o vídeo.</p>
        ${field("librasVideoUrl", "V\xEDdeo com int\xE9rprete humano (URL, opcional)", { type: "url", id: "cat_libras" })}</fieldset>
      <button class="btn" type="submit">Criar</button></form></details>
    <h2 id="apresentacoes">Apresentações culturais</h2>
    ${script.length ? html`<div class="table-wrap"><table><thead><tr><th scope="col">Momento</th><th scope="col">Ordem</th><th scope="col">Título</th><th scope="col">Horário</th><th scope="col">Integrantes</th><th scope="col">Acessibilidade</th></tr></thead>
      <tbody>${script.map((p) => html`<tr><td>${SLOTS[p.slot]}</td><td>${p.order}</td><th scope="row"><a href="#/painel/apresentacoes/${p.id}">${p.title}</a></th><td>${fmtDate(p.scheduledAt)}</td><td>${p.members.length}</td><td>${accTags(p)}</td></tr>`)}</tbody></table></div>` : ""}
    <details ${raw(script.length ? "" : "open")}><summary>Nova apresentação</summary><form class="card" id="perf-form">${perfForm({}, teachers)}<button class="btn" type="submit">Cadastrar apresentação</button></form></details>
    <h2 id="apoio">Equipe de apoio e organização</h2>
    <p class="hint">Inclua alunos — inclusive com deficiência — como mesários, cronometristas, som/palco e fotografia. Quem marcou interesse no cadastro aparece primeiro.</p>
    ${staff.length ? html`<ul>${staff.map((s) => html`<li>${s.fullName || s.publicName} — ${SUPPORT_FUNCTIONS[s.function]}${s.notes ? ` (${s.notes})` : ""}
      <button class="btn small secondary" type="button" data-remove-staff="${s.id}">Remover<span class="visually-hidden"> ${s.fullName}</span></button></li>`)}</ul>` : ""}
    <form class="card" id="staff-form"><div class="row">
      ${select("uid", "Pessoa", Object.fromEntries(people.map((u) => [u.id, u.name + (u.supportInterest?.length ? ` \u2014 interesse: ${u.supportInterest.map((x) => SUPPORT_FUNCTIONS[x]).join(", ")}` : "")])), "", { id: "staff_user" })}
      ${select("function", "Fun\xE7\xE3o", SUPPORT_FUNCTIONS, "mesario")}${field("notes", "Observa\xE7\xF5es (ex.: adapta\xE7\xE3o necess\xE1ria)", { id: "staff_notes" })}</div>
      <button class="btn" type="submit">Adicionar à equipe</button></form>
    <h2>Excluir evento</h2><form class="card" id="ev-del">${field("confirm", "Digite EXCLUIR para apagar o evento com categorias, chaves e apresenta\xE7\xF5es", { id: "ev_confirm" })}
      <button class="btn danger" type="submit">Excluir evento</button></form>`,
      (root) => {
        bindForm(root, "#ev-edit", async (d, form) => {
          await db.update("events", ev.id, { ...eventData(d), ...await handleImage(form, d, ev) });
          flash("Evento atualizado.", "success");
          go(`/painel/eventos/${ev.id}`);
        });
        bindForm(root, "#cat-form", async (d) => {
          const mod = MOD[d.modality];
          if (!mod || mod.kind === "arte") throw new Error("Escolha uma modalidade esportiva.");
          const genders = d.gender === "ambos" ? ["feminino", "masculino"] : [GENDERS[d.gender] ? d.gender : "misto"];
          const common = {
            eventId: ev.id,
            modality: d.modality,
            format: d.format === "grupos" ? "grupos" : "eliminatoria",
            groupCount: int(d.groupCount, 2),
            qualifiers: int(d.qualifiers, 2),
            matchMinutes: int(d.matchMinutes, 10),
            librasVideoUrl: str(d.librasVideoUrl, 300),
            librasAuto: !!d.librasAuto,
            status: "inscricoes"
          };
          const divisions = general.ageBands.filter((_, i) => d[`div_${i}`]);
          if (divisions.length) {
            const { cats: made, missing } = divisionCategories({ modality: d.modality, divisions, genders, table: general.weightTable });
            for (const c of made) await db.add("categories", { ...common, ...c });
            flash(`${made.length} categorias criadas.` + (missing.length ? ` Sem tabela de peso (criadas sem peso): ${missing.join(", ")}. Cadastre os pesos em Pontua\xE7\xE3o e regras.` : ""), missing.length ? "info" : "success");
            return go(`/painel/eventos/${ev.id}`);
          }
          const amin = int(d.ageMin), amax = int(d.ageMax);
          if (amin == null || amax == null || !(amin >= 4 && amin <= amax && amax <= 17)) throw new Error("Marque ao menos uma divis\xE3o ou informe uma faixa de idade entre 4 e 17 anos.");
          if (genders.length > 1) throw new Error("Para criar feminino e masculino juntos, use as divis\xF5es.");
          const gl = genders[0] !== "misto" ? ` ${GENDERS[genders[0]]}` : "";
          const id = await db.add("categories", {
            ...common,
            gender: genders[0],
            weightMin: num(d.weightMin),
            weightMax: num(d.weightMax),
            name: str(d.name, 150) || `${mod.name} ${amin}\u2013${amax} anos${gl}`,
            ageMin: amin,
            ageMax: amax
          });
          flash("Categoria criada.", "success");
          go(`/painel/categorias/${id}`);
        });
        bindForm(root, "#perf-form", async (d) => {
          const data = perfData(d);
          const id = await db.add("performances", { ...data, eventId: ev.id, members: [] });
          flash("Apresenta\xE7\xE3o cadastrada. Agora adicione os integrantes.", "success");
          go(`/painel/apresentacoes/${id}`);
        });
        bindForm(root, "#staff-form", async (d) => {
          const u = users.find((x) => x.id === d.uid);
          if (!u || !SUPPORT_FUNCTIONS[d.function]) throw new Error("Escolha a pessoa e a fun\xE7\xE3o.");
          await db.add("staff", { eventId: ev.id, uid: u.id, fullName: u.name, publicName: publicName(u), function: d.function, notes: str(d.notes, 300) });
          flash("Pessoa adicionada \xE0 equipe de apoio.", "success");
          go(`/painel/eventos/${ev.id}`);
        });
        root.querySelectorAll("[data-remove-staff]").forEach((b) => b.addEventListener("click", async () => {
          await db.remove("staff", b.dataset.removeStaff);
          go(`/painel/eventos/${ev.id}`);
        }));
        bindForm(root, "#ev-del", async (d, form) => {
          if (!confirmText(form)) throw new Error("Digite EXCLUIR para confirmar a exclus\xE3o do evento.");
          for (const c of ["matches", "categories", "entries", "performances", "staff"]) for (const x of await db.list(c, [["eventId", "==", ev.id]])) await db.remove(c, x.id);
          await removeImage(ev.image);
          await db.remove("events", ev.id);
          flash("Evento exclu\xEDdo.", "success");
          go("/painel/eventos");
        });
      }
    );
  }, ADMIN2);
  route("/painel/categorias/:id", async ({ params }) => {
    const cat = await db.get("categories", params.id);
    if (!cat) return notFound();
    const ev = await db.get("events", cat.eventId);
    const mod = MOD[cat.modality], teamBased = mod.kind === "coletivo";
    const entries = (await db.list("entries", [["categoryId", "==", cat.id]])).sort((a, b) => a.status.localeCompare(b.status) || (a.seed ?? 9999) - (b.seed ?? 9999));
    const names = await entryLabels(entries, { full: true });
    const users = await db.list("users");
    const usersById = Object.fromEntries(users.map((u) => [u.id, u]));
    const [rounds, groups] = await Promise.all([knockoutRounds(cat.id), groupTables(cat.id, names)]);
    const taken = new Set(entries.map((e) => e.userId).filter(Boolean));
    const eligible = [];
    if (!teamBased) for (const u of users.filter((u2) => ["atleta", "lutador", "artista"].includes(u2.role) && u2.active !== false && !taken.has(u2.id))) {
      if (!await eligibilityProblem(u, cat, ev)) eligible.push(u);
    }
    const teams = teamBased ? (await db.list("teams", [["modality", "==", cat.modality]])).filter((t) => !entries.some((e) => e.teamId === t.id)) : [];
    const scorers = teamBased ? await topScorers(cat.id, { full: true }) : [];
    const librasEx = explainCategory(cat, ev, await getSettings());
    return page(
      cat.name,
      "/painel/eventos",
      html`<p><a href="#/painel/eventos/${ev.id}">← ${ev.name}</a></p><h1>${cat.name}</h1>
    <p>${mod.name} · ${cat.ageMin}–${cat.ageMax} anos · ${GENDERS[cat.gender]}${catWeightLabel(cat) ? ` \xB7 ${catWeightLabel(cat)}` : ""}${mod.adaptedOf ? html` · <span class="tag accent">adaptada</span>` : ""}</p>
    <details><summary>Editar categoria</summary><form class="card" id="cat-edit">${field("name", "Nome", { value: cat.name })}
      <div class="row">${select("format", "Formato", { eliminatoria: "Eliminat\xF3ria simples", grupos: "Grupos + mata-mata" }, cat.format)}
        ${field("groupCount", "N\xBA de grupos", { type: "number", value: cat.groupCount })}${field("qualifiers", "Classificados por grupo", { type: "number", value: cat.qualifiers })}
        ${field("matchMinutes", "Dura\xE7\xE3o (min)", { type: "number", value: cat.matchMinutes })}</div>
      ${checkbox("librasAuto", "Mostrar a explica\xE7\xE3o autom\xE1tica em Libras (avatar VLibras)", cat.librasAuto !== false)}
      ${field("librasVideoUrl", "V\xEDdeo com int\xE9rprete humano (URL, opcional)", { type: "url", value: cat.librasVideoUrl })}<button class="btn" type="submit">Salvar</button></form></details>
    <details ${raw(cat.librasAuto !== false ? "open" : "")}><summary>Explicação em Libras desta categoria</summary>
      <div class="actions"><button class="btn secondary small" type="button" id="dl-roteiro">Baixar roteiro para intérprete (.txt)</button>
        ${ev.published ? html`<a class="btn secondary small" href="#/chaves/${cat.id}">Ver como o público vê</a>` : ""}</div>
      ${librasBlock(`adm-${cat.id}`, librasEx, cat.librasVideoUrl)}</details>
    <h2>Inscrições</h2><form id="seeds-form"><div class="table-wrap"><table><caption class="visually-hidden">Inscrições da categoria</caption>
      <thead><tr><th scope="col">Competidor</th><th scope="col">Idade hoje</th><th scope="col">Situação</th><th scope="col">Cabeça de chave</th><th scope="col">Ações</th></tr></thead>
      <tbody>${entries.length ? entries.map((e) => html`<tr><th scope="row">${names[e.id]}</th><td>${e.userId ? ageToday(usersById[e.userId]?.birthDate) ?? "\u2014" : "\u2014"}</td><td>${e.status}</td>
        <td><label class="visually-hidden" for="seed_${e.id}">Cabeça de chave de ${names[e.id]}</label><input id="seed_${e.id}" name="seed_${e.id}" type="number" min="1" value="${e.seed ?? ""}" style="max-width:6rem"></td>
        <td>${["confirmada", "recusada"].filter((s) => s !== e.status).map((s) => html`<button class="btn small secondary" type="button" data-entry="${e.id}" data-status="${s}">${s === "confirmada" ? "Confirmar" : "Recusar"}<span class="visually-hidden"> ${names[e.id]}</span></button> `)}
          <button class="btn small danger" type="button" data-entry="${e.id}" data-status="remove">Remover<span class="visually-hidden"> ${names[e.id]}</span></button></td></tr>`) : html`<tr><td colspan="5">Nenhuma inscrição.</td></tr>`}</tbody></table></div>
      ${entries.length ? html`<button class="btn small" type="submit">Salvar cabeças de chave</button>` : ""}</form>
    ${teamBased ? html`<form class="card" style="margin-top:1rem" id="add-team">${teams.length ? select("teamId", "Inscrever equipe", Object.fromEntries(teams.map((t) => [t.id, t.name])), "") : html`<p class="hint">Nenhuma equipe de ${mod.name} disponível. Cadastre em <a href="#/painel/equipes">Equipes</a>.</p>`}
        <button class="btn" type="submit" ${raw(teams.length ? "" : "disabled")}>Inscrever equipe</button></form>` : html`<form class="card" style="margin-top:1rem" id="add-user">${select(
        "userId",
        "Inscrever aluno eleg\xEDvel",
        Object.fromEntries(eligible.map((u) => [u.id, u.name + (u.affiliation ? ` (${u.affiliation})` : "")])),
        "",
        { hint: "Lista filtrada por idade de refer\xEAncia, sexo, peso e modalidade vinculada ao perfil." }
      )}
        <button class="btn" type="submit" ${raw(eligible.length ? "" : "disabled")}>Inscrever</button></form>`}
    <h2>Chave</h2><div class="actions"><button class="btn" type="button" id="gen">${rounds.length || groups.length ? "Gerar novamente" : "Gerar chave"}</button>
      ${cat.format === "grupos" && groups.length ? html`<button class="btn secondary" type="button" id="ko">Gerar mata-mata com os classificados</button>` : ""}
      <span class="hint">Gerar de novo apaga resultados já lançados nesta categoria.</span></div>
    ${groups.length ? groupView(groups, names, true) : ""}${rounds.length ? html`<h3>Mata-mata</h3>${bracketView(rounds, names, true, { title: ev?.name || "", subtitle: cat.name, gender: cat.gender })}` : ""}
    ${scorers.length ? html`<h2>Artilharia / pontuação individual</h2><ol>${scorers.map((s) => html`<li>${s.name} — ${s.total}</li>`)}</ol>` : ""}
    <h2>Excluir categoria</h2><button class="btn danger small" type="button" id="cat-del">Excluir categoria e chave</button>`,
      (root) => {
        const reload = () => go(`/painel/categorias/${cat.id}`);
        root.querySelector("#dl-roteiro").addEventListener("click", () => download(
          `roteiro-libras-${slugify(cat.name)}.txt`,
          `ROTEIRO PARA INT\xC9RPRETE DE LIBRAS
${ev.name}

${explanationText(librasEx)}

Depois de gravar, publique o v\xEDdeo (por exemplo, no YouTube) e cole o link no campo "V\xEDdeo com int\xE9rprete humano" desta categoria.
`,
          "text/plain;charset=utf-8"
        ));
        bindForm(root, "#cat-edit", async (d) => {
          await db.update("categories", cat.id, {
            name: str(d.name, 150) || cat.name,
            format: d.format === "grupos" ? "grupos" : "eliminatoria",
            groupCount: int(d.groupCount, 2),
            qualifiers: int(d.qualifiers, 2),
            matchMinutes: int(d.matchMinutes, 10),
            librasVideoUrl: str(d.librasVideoUrl, 300),
            librasAuto: !!d.librasAuto
          });
          flash("Categoria atualizada.", "success");
          reload();
        });
        bindForm(root, "#seeds-form", async (d) => {
          for (const e of entries) await db.update("entries", e.id, { seed: int(d[`seed_${e.id}`]) });
          flash("Cabe\xE7as de chave salvos.", "success");
          reload();
        });
        root.querySelectorAll("[data-entry]").forEach((b) => b.addEventListener("click", async () => {
          if (b.dataset.status === "remove") await db.remove("entries", b.dataset.entry);
          else await db.update("entries", b.dataset.entry, { status: b.dataset.status });
          reload();
        }));
        bindForm(root, "#add-user", async (d) => {
          const u = usersById[d.userId];
          if (!u) throw new Error("Escolha um aluno.");
          await db.add("entries", { categoryId: cat.id, eventId: cat.eventId, userId: u.id, teamId: null, publicName: publicName(u), status: "confirmada", seed: null });
          flash("Inscri\xE7\xE3o adicionada.", "success");
          reload();
        });
        bindForm(root, "#add-team", async (d) => {
          const t = teams.find((x) => x.id === d.teamId);
          if (!t) throw new Error("Escolha uma equipe.");
          await db.add("entries", { categoryId: cat.id, eventId: cat.eventId, userId: null, teamId: t.id, publicName: t.name, status: "confirmada", seed: null });
          flash("Equipe inscrita.", "success");
          reload();
        });
        const act = (sel, fn, msg) => root.querySelector(sel)?.addEventListener("click", async (e) => {
          e.target.disabled = true;
          try {
            await fn();
            flash(msg, "success");
            reload();
          } catch (err) {
            flash(err.message, "error");
            reload();
          }
        });
        act("#gen", () => generateBracket(cat.id), "Chave gerada.");
        act("#ko", () => generateKnockoutFromGroups(cat.id), "Mata-mata gerado a partir dos grupos.");
        root.querySelector("#cat-del").addEventListener("click", async () => {
          if (!window.confirm || !confirm("Excluir a categoria, as inscri\xE7\xF5es e a chave?")) return;
          for (const c of ["matches", "entries"]) for (const x of await db.list(c, [["categoryId", "==", cat.id]])) await db.remove(c, x.id);
          await db.remove("categories", cat.id);
          flash("Categoria exclu\xEDda.", "success");
          go(`/painel/eventos/${ev.id}`);
        });
      }
    );
  }, ADMIN2);
  route("/painel/partidas/:id", async ({ params }) => {
    const m = await db.get("matches", params.id);
    if (!m) return notFound();
    const cat = await db.get("categories", m.categoryId);
    const engine = MOD[cat.modality].scoring;
    const entries = (await Promise.all([m.a, m.b, m.winner].filter(Boolean).map((id) => db.get("entries", id)))).filter(Boolean);
    const names = await entryLabels(entries, { full: true });
    const na = names[m.a] || "A definir", nb = names[m.b] || "A definir";
    const { scoring } = await getSettings();
    const tkd = scoring.taekwondo;
    let preview = null, previewError = null;
    try {
      preview = await computeResult(m, cat);
    } catch (e) {
      previewError = e.message;
    }
    const logByIndex = Object.fromEntries((preview?.log || []).map((l) => [l.index, l]));
    const players = { a: [], b: [] };
    const pnames = {};
    if (!["bjj", "taekwondo"].includes(engine)) {
      const users = Object.fromEntries((await db.list("users")).map((u) => [u.id, u.name]));
      for (const side of ["a", "b"]) {
        const e = entries.find((x) => x.id === m[side]);
        const team2 = e?.teamId ? await db.get("teams", e.teamId) : null;
        players[side] = (team2?.members || []).map((mb) => ({ ...mb, name: users[mb.uid] || mb.publicName }));
        for (const p of players[side]) pnames[p.uid] = p.name;
      }
    }
    const team = !["bjj", "taekwondo"].includes(engine);
    const extra = m.extra || {};
    const labels = engine === "bjj" ? BJJ_LABELS : engine === "taekwondo" ? TKD_LABELS : TEAM_LABELS;
    const kinds = engine === "bjj" ? Object.keys(BJJ_LABELS) : engine === "taekwondo" ? Object.keys(TKD_LABELS) : Object.keys(TEAM_LABELS).filter((k) => ["goal", "own_goal"].includes(k) && ["futebol", "futsal"].includes(engine) || k === "basket" && engine === "basquete" || k === "point" && engine === "volei" || ["yellow", "red", "note"].includes(k));
    const pick = (name, legend, cur) => html`<fieldset><legend>${legend}</legend>
    <label class="check"><input type="radio" name="${name}" value="" ${raw(!cur ? "checked" : "")}> Não se aplica</label>
    <label class="check"><input type="radio" name="${name}" value="a" ${raw(cur === "a" ? "checked" : "")}> ${na}</label>
    <label class="check"><input type="radio" name="${name}" value="b" ${raw(cur === "b" ? "checked" : "")}> ${nb}</label></fieldset>`;
    const open = m.status !== "encerrada" && m.a && m.b;
    return page(
      "S\xFAmula",
      "/painel/eventos",
      html`<p><a href="#/painel/categorias/${cat.id}">← ${cat.name}</a></p><h1>Súmula: ${na} × ${nb}</h1>
    <p>${MOD[cat.modality].name} · ${m.stage === "grupo" ? `Grupo ${m.groupLabel}, rodada ${m.round}` : `Mata-mata, fase ${m.round}`} · <strong>${{ pendente: "Em aberto", encerrada: "Encerrada", bye: "BYE" }[m.status] || m.status}</strong></p>
    <section aria-labelledby="placar-h"><h2 id="placar-h">Placar ${m.status !== "encerrada" ? "(parcial, calculado)" : ""}</h2>
      ${previewError ? html`<p class="flash error">${previewError}</p>` : ""}
      ${preview ? html`<div class="score-board" aria-live="polite"><div><div class="name">${na}</div><div class="num">${preview.score_a}</div></div><div aria-hidden="true">×</div>
        <div><div class="name">${nb}</div><div class="num">${preview.score_b}</div></div></div>
        <p>${engine === "bjj" ? `Vantagens: ${preview.advantages.a} \xD7 ${preview.advantages.b} \xB7 Penalidades: ${preview.penalties.a} \xD7 ${preview.penalties.b}` : engine === "taekwondo" ? `${preview.rounds_won ? `Rounds vencidos: ${preview.rounds_won.a} \xD7 ${preview.rounds_won.b} \xB7 Pontos totais: ${preview.points.a} \xD7 ${preview.points.b} \xB7 ` : ""}Gam-jeom: ${preview.gamjeom.a} \xD7 ${preview.gamjeom.b}${preview.golden_points && (preview.golden_points.a || preview.golden_points.b) ? ` \xB7 Golden point: ${preview.golden_points.a} \xD7 ${preview.golden_points.b}` : ""}` : engine === "volei" && (preview.sets || []).length ? `Sets: ${preview.sets.map((s) => s.join("-")).join(", ")}` : ""}</p>
        <p><strong>Situação:</strong> ${preview.winner === "a" ? `vit\xF3ria de ${na}` : preview.winner === "b" ? `vit\xF3ria de ${nb}` : preview.winner === "draw" ? "empate" : "sem vencedor definido"}
          ${preview.method ? ` (${METHOD_LABELS[preview.method] || preview.method})` : ""}${preview.pending ? ` \u2014 ${preview.pending}` : ""}</p>` : ""}</section>
    <section aria-labelledby="agenda-h"><h2 id="agenda-h">Horário e local</h2><form class="card" id="sched"><div class="row">
      ${field("scheduledAt", "In\xEDcio", { type: "datetime-local", value: m.scheduledAt })}${field("durationMin", "Dura\xE7\xE3o (min)", { type: "number", value: m.durationMin })}
      ${field("venue", "Quadra / tatame / \xE1rea", { value: m.venue })}</div><button class="btn" type="submit">Salvar horário</button>
      <p class="hint">O sistema verifica conflito com apresentações e outras partidas de todos os envolvidos.</p></form></section>
    ${open ? html`<section aria-labelledby="lancar-h"><h2 id="lancar-h">Lançar na súmula</h2><form class="card" id="add-ev"><div class="row">
      <fieldset style="flex:1 1 220px"><legend>${team ? "Equipe" : "Atleta"}</legend><label class="check"><input type="radio" name="side" value="a" checked> ${na}</label>
        <label class="check"><input type="radio" name="side" value="b"> ${nb}</label></fieldset>
      ${select("kind", "Lance", Object.fromEntries(kinds.map((k) => [k, labels[k] + (engine === "taekwondo" && tkd.points[k] ? ` \u2014 ${tkd.points[k]} pt` : "")])), kinds[0])}
      ${engine === "taekwondo" ? select("round", "Round", Object.fromEntries([...Array(tkd.rounds)].map((_, i) => [i + 1, `${i + 1}\xBA round`]).concat(tkd.mode === "cumulativo" ? [[tkd.rounds + 1, "Golden point"]] : [])), 1) : ""}
      ${team ? html`<div class="field"><label for="player">Jogador(a)</label><select id="player" name="player_id"><option value="">—</option>
          ${["a", "b"].map((s) => html`<optgroup label="${s === "a" ? na : nb}">${players[s].map((p) => html`<option value="${p.uid}">${p.number ? `${p.number} \xB7 ` : ""}${p.name}</option>`)}</optgroup>`)}</select></div>
        ${engine === "basquete" ? select("value", "Valor da cesta", { 2: "2", 3: "3", 1: "1" }, 2) : ""}${field("minute", "Minuto", { attrs: 'inputmode="numeric" style="max-width:7rem"' })}${field("note", "Observa\xE7\xE3o")}` : ""}
      </div><button class="btn" type="submit">Registrar lance</button></form></section>` : ""}
    <section aria-labelledby="sumula"><h2 id="sumula">Súmula (${(m.log || []).length} lances)</h2>
      ${(m.log || []).length ? html`<div class="table-wrap"><table><thead><tr><th scope="col">#</th><th scope="col">Lado</th><th scope="col">Lance</th>${engine === "taekwondo" ? html`<th scope="col">Round</th>` : ""}${team ? html`<th scope="col">Jogador</th>` : ""}<th scope="col">Efeito</th><th scope="col"><span class="visually-hidden">Ações</span></th></tr></thead>
        <tbody>${m.log.map((e, i) => {
        const lg = logByIndex[i];
        const side = e.athlete || e.team;
        return html`<tr><td>${i + 1}</td><td>${side === "a" ? na : side === "b" ? nb : "\u2014"}</td>
          <td>${labels[e.kind] || e.kind}${e.kind === "basket" ? ` (${e.value})` : ""}${e.note ? ` \u2014 ${e.note}` : ""}</td>
          ${engine === "taekwondo" ? html`<td>${tkd.mode === "cumulativo" && e.round === tkd.rounds + 1 ? "GP" : e.round}</td>` : ""}
          ${team ? html`<td>${pnames[e.player_id] || "\u2014"}${e.minute ? ` (${e.minute}')` : ""}</td>` : ""}
          <td>${lg ? `${lg.points ? `+${lg.points} ` : ""}${lg.note}` : ""}</td>
          <td>${m.status !== "encerrada" ? html`<button class="btn small secondary" type="button" data-remove-ev="${i}">Remover<span class="visually-hidden"> lance ${i + 1}</span></button>` : ""}</td></tr>`;
      })}</tbody></table></div>` : html`<p class="muted">Nenhum lance registrado.</p>`}</section>
    ${open ? html`<section aria-labelledby="extra-h"><h2 id="extra-h">Desempate e dados complementares</h2><form class="card" id="extra">
      ${engine === "bjj" ? pick("refereeDecision", "Decis\xE3o do \xE1rbitro (empate em pontos, vantagens e penalidades)", extra.refereeDecision) : engine === "taekwondo" ? tkd.mode === "cumulativo" ? pick("superiorityDecision", "Decis\xE3o de superioridade (golden point sem pontos)", extra.superiorityDecision) : html`${[1, 2, 3].map((r) => pick(`round_${r}`, `Decis\xE3o do \xE1rbitro no ${r}\xBA round (empate total)`, (extra.roundDecisions || {})[r]))}` : engine === "volei" ? field("sets", "Placar dos sets", { value: (extra.sets || []).map((s) => `${s.a}-${s.b}`).join(", "), hint: "Ex.: 25-20, 23-25, 15-13 (pontos do primeiro listado primeiro)." }) : m.stage === "mata" && ["futebol", "futsal"].includes(engine) ? html`<div class="row">${field("pen_a", `P\xEAnaltis \u2014 ${na}`, { type: "number", value: extra.penalties?.[0] ?? "" })}${field("pen_b", `P\xEAnaltis \u2014 ${nb}`, { type: "number", value: extra.penalties?.[1] ?? "" })}</div>` : html`<p class="muted">Nada adicional para esta modalidade.</p>`}
      <button class="btn secondary" type="submit">Salvar</button></form></section>` : ""}
    <section aria-labelledby="fim-h"><h2 id="fim-h">Encerramento</h2><div class="actions">
      ${m.status === "encerrada" ? html`<button class="btn secondary" type="button" id="reopen">Reabrir para correção</button>` : m.a && m.b ? html`<button class="btn" type="button" id="finalize">Encerrar e avançar vencedor</button>
          <button class="btn secondary" type="button" data-wo="a">W.O. — vitória de ${na}</button><button class="btn secondary" type="button" data-wo="b">W.O. — vitória de ${nb}</button>` : html`<p class="muted">Aguardando os vencedores das partidas anteriores.</p>`}</div></section>`,
      (root) => {
        const reload = () => go(`/painel/partidas/${m.id}`);
        const validateAndSave = async (patch) => {
          const next = { ...m, ...patch };
          await computeResult(next, cat);
          await db.update("matches", m.id, patch);
        };
        bindForm(root, "#sched", async (d) => {
          const start = d.scheduledAt || null, duration = int(d.durationMin, m.durationMin || 10);
          const es = await Promise.all([m.a, m.b].filter(Boolean).map((id) => db.get("entries", id)));
          const people = (await Promise.all(es.map((e) => entryPeople(e)))).flat();
          const { found, block } = await checkSchedule("match", m.id, start, duration, people);
          if (found.length) {
            const desc = await describeConflicts(found);
            if (block) throw new Error(`Conflito de hor\xE1rio \u2014 agendamento bloqueado: ${desc}`);
            flash(`Aten\xE7\xE3o, conflito de hor\xE1rio: ${desc}`, "warning");
          }
          await db.update("matches", m.id, { scheduledAt: start, durationMin: duration, venue: str(d.venue, 80) });
          flash("Hor\xE1rio salvo.", "success");
          reload();
        });
        bindForm(root, "#add-ev", async (d) => {
          let ev;
          if (engine === "bjj") ev = { athlete: d.kind === "reset" ? null : d.side, kind: d.kind };
          else if (engine === "taekwondo") ev = { athlete: d.side, kind: d.kind, round: int(d.round, 1) };
          else ev = { team: d.side, kind: d.kind, player_id: d.player_id || null, value: int(d.value, 2), note: str(d.note, 300), minute: str(d.minute, 10) };
          await validateAndSave({ log: [...m.log || [], ev] });
          reload();
        });
        root.querySelectorAll("[data-remove-ev]").forEach((b) => b.addEventListener("click", async () => {
          const log = [...m.log];
          log.splice(Number(b.dataset.removeEv), 1);
          await db.update("matches", m.id, { log });
          reload();
        }));
        bindForm(root, "#extra", async (d) => {
          const ex = { ...extra };
          if ("refereeDecision" in d) ex.refereeDecision = d.refereeDecision || null;
          if ("superiorityDecision" in d) ex.superiorityDecision = d.superiorityDecision || null;
          if ("round_1" in d) ex.roundDecisions = Object.fromEntries([1, 2, 3].filter((r) => d[`round_${r}`]).map((r) => [r, d[`round_${r}`]]));
          if ("pen_a" in d) ex.penalties = d.pen_a !== "" && d.pen_b !== "" ? [int(d.pen_a), int(d.pen_b)] : null;
          if ("sets" in d) {
            ex.sets = str(d.sets).split(/[,;]/).map((x) => x.trim()).filter(Boolean).map((x) => {
              const mm = x.match(/^(\d+)\s*[-x×]\s*(\d+)$/);
              if (!mm) throw new Error("Use o formato 25-20, 23-25, 15-13");
              return { a: Number(mm[1]), b: Number(mm[2]) };
            });
          }
          await validateAndSave({ extra: ex });
          flash("Dados complementares salvos.", "success");
          reload();
        });
        const act = (el, fn) => el?.addEventListener("click", async () => {
          el.disabled = true;
          try {
            await fn();
          } catch (e) {
            flash(e.message, "error");
          }
          reload();
        });
        act(root.querySelector("#finalize"), async () => {
          const r = await finalizeMatch(m.id);
          flash(`Resultado registrado (${METHOD_LABELS[r.method] || r.method}). Vencedor avan\xE7ou na chave.`, "success");
        });
        act(root.querySelector("#reopen"), async () => {
          await reopenMatch(m.id);
          flash("Partida reaberta para corre\xE7\xE3o.", "info");
        });
        root.querySelectorAll("[data-wo]").forEach((b) => act(b, async () => {
          await finalizeMatch(m.id, b.dataset.wo);
          flash("W.O. registrado.", "success");
        }));
      }
    );
  }, ADMIN2);
  route("/painel/equipes", async () => {
    const [teams, users] = await Promise.all([listSorted("teams", [], "name"), db.list("users")]);
    const teachers = users.filter((u) => u.role === "professor" && u.active !== false);
    const uname = Object.fromEntries(users.map((u) => [u.id, u.name]));
    return page(
      "Equipes",
      "/painel/equipes",
      html`<h1>Equipes (esportes coletivos)</h1>
    <div class="table-wrap"><table><thead><tr><th scope="col">Equipe</th><th scope="col">Modalidade</th><th scope="col">Técnico(a)</th><th scope="col">Atletas</th></tr></thead>
      <tbody>${teams.length ? teams.map((t) => html`<tr><th scope="row"><a href="#/painel/equipes/${t.id}">${t.name}</a></th><td>${MOD[t.modality].name}</td><td>${uname[t.coachId] || "\u2014"}</td><td>${(t.members || []).length}</td></tr>`) : html`<tr><td colspan="4">Nenhuma equipe.</td></tr>`}</tbody></table></div>
    <h2>Nova equipe</h2><form class="card" id="team-form"><div class="row">${field("name", "Nome da equipe", { required: true })}
      ${select("modality", "Modalidade", Object.fromEntries(MODALITIES.filter((m) => m.kind === "coletivo").map((m) => [m.code, m.name])), "futsal")}
      ${select("coachId", "T\xE9cnico(a)", { "": "\u2014", ...Object.fromEntries(teachers.map((t) => [t.id, t.name])) }, "")}</div><button class="btn" type="submit">Criar equipe</button></form>`,
      (root) => bindForm(root, "#team-form", async (d) => {
        if (!str(d.name) || MOD[d.modality]?.kind !== "coletivo") throw new Error("Informe nome e modalidade coletiva.");
        const id = await db.add("teams", { name: str(d.name, 100), modality: d.modality, coachId: d.coachId || null, members: [], memberIds: [] });
        go(`/painel/equipes/${id}`);
      })
    );
  }, ADMIN2);
  route("/painel/equipes/:id", async ({ params }) => {
    const t = await db.get("teams", params.id);
    if (!t) return notFound();
    const users = await listSorted("users", [], "name");
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));
    const memberIds = new Set(t.memberIds || []);
    const candidates = users.filter((u) => u.active !== false && (u.modalities || {})[t.modality] && !memberIds.has(u.id));
    return page(
      t.name,
      "/painel/equipes",
      html`<p><a href="#/painel/equipes">← Equipes</a></p><h1>${t.name}</h1><p>${MOD[t.modality].name}</p>
    <h2>Elenco</h2><div class="table-wrap"><table><thead><tr><th scope="col">Nº</th><th scope="col">Atleta</th><th scope="col">Idade</th><th scope="col"><span class="visually-hidden">Ações</span></th></tr></thead>
      <tbody>${(t.members || []).length ? t.members.map((mb) => html`<tr><td>${mb.number ?? "\u2014"}</td><th scope="row">${byId[mb.uid]?.name || mb.publicName}</th><td>${ageToday(byId[mb.uid]?.birthDate) ?? "\u2014"}</td>
        <td><button class="btn small secondary" type="button" data-remove="${mb.uid}">Remover<span class="visually-hidden"> ${byId[mb.uid]?.name}</span></button></td></tr>`) : html`<tr><td colspan="4">Sem atletas.</td></tr>`}</tbody></table></div>
    <h2>Adicionar atleta</h2><form class="card" id="add-member"><div class="row">
      ${select("uid", `Atleta (com ${MOD[t.modality].name} no perfil)`, Object.fromEntries(candidates.map((u) => [u.id, `${u.name} (${ageToday(u.birthDate) ?? "?"} anos)`])), "")}
      ${field("number", "N\xFAmero da camisa", { type: "number", attrs: 'min="0" max="99"' })}</div><button class="btn" type="submit" ${raw(candidates.length ? "" : "disabled")}>Adicionar</button></form>
    <h2>Excluir equipe</h2><button class="btn danger small" type="button" id="team-del">Excluir equipe</button>`,
      (root) => {
        const save2 = async (members) => {
          await db.update("teams", t.id, { members, memberIds: members.map((m) => m.uid) });
          go(`/painel/equipes/${t.id}`);
        };
        bindForm(root, "#add-member", async (d) => {
          const u = byId[d.uid];
          if (!u) throw new Error("Escolha um atleta.");
          await save2([...t.members || [], { uid: u.id, number: int(d.number), publicName: publicName(u) }]);
        });
        root.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", () => save2(t.members.filter((m) => m.uid !== b.dataset.remove))));
        root.querySelector("#team-del").addEventListener("click", async () => {
          if (!confirm("Excluir a equipe?")) return;
          await db.remove("teams", t.id);
          go("/painel/equipes");
        });
      }
    );
  }, ADMIN2);
  function perfForm(p, teachers) {
    return html`${field("title", "T\xEDtulo da apresenta\xE7\xE3o", { value: p.title, required: true, id: "perf_title" })}
    <div class="row">${select("modality", "Modalidade", { musica: "M\xFAsica", danca: "Dan\xE7a" }, p.modality || "danca", { id: "p_modality" })}
      ${select("slot", "Momento no evento", SLOTS, p.slot || "intervalo")}${field("order", "Ordem de entrada", { type: "number", value: p.order ?? 1, attrs: 'min="1"' })}</div>
    <div class="row">${field("scheduledAt", "Hor\xE1rio", { type: "datetime-local", value: p.scheduledAt, id: "perf_start", hint: "Usado para detectar conflito com jogos e lutas dos integrantes." })}
      ${field("durationMin", "Dura\xE7\xE3o (min)", { type: "number", value: p.durationMin ?? 5, attrs: 'min="1"' })}</div>
    <fieldset><legend>Ficha técnica</legend>${field("soundtrack", "Trilha sonora (m\xFAsica, artista, arquivo)", { value: p.soundtrack })}
      ${textarea("equipment", "Equipamentos necess\xE1rios", { value: p.equipment, rows: 2 })}
      ${select("teacherId", "Professor(a) respons\xE1vel", { "": "\u2014", ...Object.fromEntries(teachers.map((t) => [t.id, t.name])) }, p.teacherId || "")}
      ${textarea("notes", "Observa\xE7\xF5es de palco", { value: p.notes, rows: 2, id: "p_notes" })}</fieldset>
    <fieldset><legend>Recursos de acessibilidade</legend>${checkbox("accLibras", "Int\xE9rprete de Libras no palco", !!p.accLibras)}
      ${checkbox("accAudiodesc", "Audiodescri\xE7\xE3o da coreografia", !!p.accAudiodesc)}${checkbox("accSeating", "Reserva de espa\xE7o acess\xEDvel na plateia", !!p.accSeating)}
      ${field("accNotes", "Detalhes de acessibilidade", { value: p.accNotes })}${field("librasVideoUrl", "V\xEDdeo em Libras sobre a apresenta\xE7\xE3o (URL)", { type: "url", value: p.librasVideoUrl, id: "perf_libras" })}</fieldset>`;
  }
  function perfData(d) {
    if (!str(d.title) || !["musica", "danca"].includes(d.modality)) throw new Error("Informe t\xEDtulo e modalidade (m\xFAsica ou dan\xE7a).");
    return {
      title: str(d.title, 150),
      modality: d.modality,
      slot: SLOTS[d.slot] ? d.slot : "intervalo",
      order: int(d.order, 1),
      durationMin: int(d.durationMin, 5),
      scheduledAt: d.scheduledAt || null,
      soundtrack: str(d.soundtrack, 300),
      equipment: str(d.equipment, 1e3),
      notes: str(d.notes, 1e3),
      teacherId: d.teacherId || null,
      accLibras: !!d.accLibras,
      accAudiodesc: !!d.accAudiodesc,
      accSeating: !!d.accSeating,
      accNotes: str(d.accNotes, 500),
      librasVideoUrl: str(d.librasVideoUrl, 300)
    };
  }
  route("/painel/apresentacoes/:id", async ({ params }) => {
    const p = await db.get("performances", params.id);
    if (!p) return notFound();
    const ev = await db.get("events", p.eventId);
    const users = await listSorted("users", [], "name");
    const byId = Object.fromEntries(users.map((u) => [u.id, u]));
    const memberIds = new Set((p.members || []).map((m) => m.uid));
    const candidates = users.filter((u) => ["artista", "atleta", "lutador"].includes(u.role) && u.active !== false && !memberIds.has(u.id));
    const teachers = users.filter((u) => u.role === "professor" && u.active !== false);
    const checkConflicts = async (start, duration, people) => {
      const { found, block } = await checkSchedule("performance", p.id, start, duration, people);
      if (!found.length) return;
      const desc = await describeConflicts(found);
      if (block) throw new Error(`Conflito de hor\xE1rio \u2014 agendamento bloqueado: ${desc}`);
      flash(`Aten\xE7\xE3o, conflito de hor\xE1rio: ${desc}`, "warning");
    };
    return page(
      p.title,
      "/painel/eventos",
      html`<p><a href="#/painel/eventos/${ev.id}">← ${ev.name}</a></p><h1>${p.title}</h1>${accTags(p)}
    <h2>Integrantes</h2><ul>${(p.members || []).length ? p.members.map((mb) => html`<li>${byId[mb.uid]?.name || mb.publicName}${mb.part ? ` \u2014 ${mb.part}` : ""}
      <button class="btn small secondary" type="button" data-remove="${mb.uid}">Remover<span class="visually-hidden"> ${byId[mb.uid]?.name}</span></button></li>`) : html`<li class="muted">Nenhum integrante.</li>`}</ul>
    <form class="card" id="add-member"><div class="row">${select("uid", "Aluno(a)", Object.fromEntries(candidates.map((u) => [u.id, u.name])), "", { id: "member" })}
      ${field("part", "Fun\xE7\xE3o (instrumento, voz, papel)")}</div><button class="btn" type="submit">Adicionar integrante</button>
      <p class="hint">Alunos atletas e lutadores também podem se apresentar; o sistema avisa se houver jogo ou luta no mesmo horário.</p></form>
    <h2>Ficha técnica</h2><form class="card" id="perf-edit">${perfForm(p, teachers)}<button class="btn" type="submit">Salvar</button></form>
    <button class="btn danger small" type="button" id="perf-del" style="margin-top:1rem">Excluir apresentação</button>`,
      (root) => {
        const reload = () => go(`/painel/apresentacoes/${p.id}`);
        bindForm(root, "#add-member", async (d) => {
          const u = byId[d.uid];
          if (!u) throw new Error("Escolha um aluno.");
          await checkConflicts(p.scheduledAt, p.durationMin, [u.id]);
          await db.update("performances", p.id, { members: [...p.members || [], { uid: u.id, publicName: publicName(u), part: str(d.part, 80) }] });
          reload();
        });
        root.querySelectorAll("[data-remove]").forEach((b) => b.addEventListener("click", async () => {
          await db.update("performances", p.id, { members: p.members.filter((m) => m.uid !== b.dataset.remove) });
          reload();
        }));
        bindForm(root, "#perf-edit", async (d) => {
          const data = perfData(d);
          await checkConflicts(data.scheduledAt, data.durationMin, (p.members || []).map((m) => m.uid));
          await db.update("performances", p.id, data);
          flash("Apresenta\xE7\xE3o atualizada.", "success");
          reload();
        });
        root.querySelector("#perf-del").addEventListener("click", async () => {
          if (!confirm("Excluir a apresenta\xE7\xE3o?")) return;
          await db.remove("performances", p.id);
          go(`/painel/eventos/${ev.id}`);
        });
      }
    );
  }, ADMIN2);
  route("/painel/eventos/:id/roteiro", async ({ params }) => {
    const ev = await db.get("events", params.id);
    if (!ev) return notFound();
    const script = await stageScript(ev.id, { full: session.isAdmin });
    return page(
      "Roteiro de palco",
      "/painel",
      html`<h1>Roteiro de palco</h1><p><strong>${ev.name}</strong> · ${fmtDate(ev.startsOn)}${ev.location ? ` \xB7 ${ev.location}` : ""}</p>
    <div class="actions no-print"><button class="btn" type="button" id="print">Imprimir / salvar em PDF</button><button class="btn secondary" type="button" id="csv">Baixar planilha (CSV)</button></div>
    ${Object.entries(SLOTS).map(([slot, label]) => {
        const items = script.filter((p) => p.slot === slot);
        return items.length ? html`<h2>${label}</h2>${items.map((p) => html`
      <article class="card print-break" style="margin-bottom:1rem"><h3 style="margin-top:0">${p.order}. ${p.title} <span class="muted">(${MOD[p.modality]?.name}, ${p.durationMin} min${p.scheduledAt ? `, ${fmtTime(p.scheduledAt)}` : ""})</span></h3>
        <dl><dt>Trilha sonora</dt><dd>${p.soundtrack || "\u2014"}</dd><dt>Equipamentos</dt><dd>${p.equipment || "\u2014"}</dd>
          <dt>Integrantes (${p.members.length})</dt><dd>${p.members.map((mb) => `${mb.name}${mb.part ? ` (${mb.part})` : ""}`).join("; ") || "\u2014"}</dd>
          <dt>Professor(a)</dt><dd>${p.teacherName || "\u2014"}</dd><dt>Acessibilidade</dt><dd>${accTags(p)}${p.accNotes ? ` ${p.accNotes}` : ""}${!(p.accLibras || p.accAudiodesc || p.accSeating) ? "\u2014" : ""}</dd>
          ${p.notes ? html`<dt>Observações</dt><dd>${p.notes}</dd>` : ""}</dl></article>`)}` : "";
      })}
    ${!script.length ? html`<p class="muted">Nenhuma apresentação cadastrada.</p>` : ""}`,
      (root) => {
        root.querySelector("#print").addEventListener("click", () => window.print());
        root.querySelector("#csv").addEventListener("click", () => {
          const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
          const rows = [
            ["Momento", "Ordem", "Hor\xE1rio", "T\xEDtulo", "Modalidade", "Dura\xE7\xE3o (min)", "Trilha sonora", "Equipamentos", "Integrantes", "Professor(a)", "Libras no palco", "Audiodescri\xE7\xE3o", "Espa\xE7o acess\xEDvel", "Obs. acessibilidade", "Observa\xE7\xF5es"],
            ...script.map((p) => [
              SLOTS[p.slot],
              p.order,
              (p.scheduledAt || "").slice(11, 16),
              p.title,
              MOD[p.modality]?.name,
              p.durationMin,
              p.soundtrack,
              p.equipment,
              p.members.map((mb) => mb.name + (mb.part ? ` (${mb.part})` : "")).join(", "),
              p.teacherName,
              p.accLibras ? "Sim" : "N\xE3o",
              p.accAudiodesc ? "Sim" : "N\xE3o",
              p.accSeating ? "Sim" : "N\xE3o",
              p.accNotes,
              p.notes
            ])
          ];
          download(`roteiro-palco-${slugify(ev.name)}.csv`, "\uFEFF" + rows.map((r) => r.map(q).join(";")).join("\r\n"), "text/csv;charset=utf-8");
        });
      }
    );
  }, STAFF);
  route("/painel/calendario", async ({ query }) => {
    var _a;
    const events = await listSorted("events", [], "startsOn", "desc");
    const eventId = query.evento || null;
    const { general } = await getSettings();
    const items = await calendarItems(eventId, { full: session.isAdmin });
    const conflicts = findConflicts(items, general.bufferMin || 0);
    const flagged = new Set(conflicts.flatMap((c) => [`${c.a.kind}:${c.a.id}`, `${c.b.kind}:${c.b.id}`]));
    const names = session.isAdmin ? Object.fromEntries((await db.list("users")).map((u) => [u.id, u.name])) : {};
    const days = {};
    for (const it of items) (days[_a = it.start.slice(0, 10)] || (days[_a] = [])).push(it);
    return page(
      "Calend\xE1rio unificado",
      "/painel/calendario",
      html`<h1>Calendário unificado — palco e quadra</h1>
    <form class="actions" id="cal-filter"><label for="evento" class="visually-hidden">Evento</label><select id="evento" name="evento" style="max-width:24rem"><option value="">Todos os eventos</option>
      ${events.map((e) => html`<option value="${e.id}" ${raw(e.id === eventId ? "selected" : "")}>${e.name}</option>`)}</select><button class="btn secondary" type="submit">Filtrar</button></form>
    <p class="hint">Modo de conflito: <strong>${general.conflictMode === "impedir" ? "impedir agendamento" : "alertar"}</strong> (altere em Pontuação e regras).</p>
    ${conflicts.length ? html`<div class="flash warning" role="alert"><h2 style="margin-top:0;font-size:1.1rem">${conflicts.length} conflito(s)</h2><ul>${conflicts.map((c) => html`<li>
      ${session.isAdmin ? html`<strong>${c.people.map((p) => names[p] || "?").join(", ")}</strong>: ` : ""}“${c.a.label}” (${fmtDate(c.a.start)}, ${c.a.duration_min} min) e “${c.b.label}” (${fmtDate(c.b.start)})</li>`)}</ul></div>` : ""}
    ${Object.keys(days).sort().map((day) => html`<h2>${fmtDate(day)}</h2><div class="table-wrap"><table><thead><tr><th scope="col">Horário</th><th scope="col">Tipo</th><th scope="col">Compromisso</th><th scope="col">Local</th><th scope="col">Situação</th></tr></thead>
      <tbody>${days[day].map((it) => {
        const bad = flagged.has(`${it.kind}:${it.id}`);
        return html`<tr class="${bad ? "conflict" : ""}"><td>${fmtTime(it.start)} (${it.duration_min} min)</td>
        <td>${it.kind === "performance" ? "Palco" : "Quadra/tatame"}</td><td>${session.isAdmin ? html`<a href="#/painel/${it.kind === "performance" ? "apresentacoes" : "partidas"}/${it.id}">${it.label}</a>` : it.label}</td>
        <td>${it.venue || "\u2014"}</td><td>${bad ? raw("<strong>Conflito de hor\xE1rio</strong>") : "OK"}</td></tr>`;
      })}</tbody></table></div>`)}
    ${!items.length ? html`<p class="muted">Nada agendado.</p>` : ""}`,
      (root) => root.querySelector("#cal-filter").addEventListener("submit", (e) => {
        e.preventDefault();
        go(`/painel/calendario${e.target.evento.value ? `?evento=${e.target.evento.value}` : ""}`);
      })
    );
  }, STAFF);
  route("/painel/pessoas", async ({ query }) => {
    const role = query.perfil || "", q = (query.q || "").toLowerCase();
    const [users, sensitive] = await Promise.all([listSorted("users", [], "name"), db.list("sensitive")]);
    const has = new Set(sensitive.map((s) => s.id));
    const rows = users.filter((u) => u.active !== false && (!role || u.role === role) && (!q || `${u.name} ${u.email}`.toLowerCase().includes(q)));
    return page(
      "Pessoas",
      "/painel/pessoas",
      html`<h1>Pessoas</h1>
    <form class="actions" role="search" id="people-filter"><label for="q" class="visually-hidden">Buscar por nome ou e-mail</label>
      <input id="q" name="q" type="text" value="${query.q || ""}" placeholder="Nome ou e-mail" style="max-width:18rem">
      <label for="perfil" class="visually-hidden">Perfil</label><select id="perfil" name="perfil" style="max-width:14rem"><option value="">Todos os perfis</option>
      ${Object.entries(ROLE_LABELS).map(([k, v]) => html`<option value="${k}" ${raw(k === role ? "selected" : "")}>${v}</option>`)}</select>
      <button class="btn secondary" type="submit">Filtrar</button></form>
    <div class="table-wrap"><table><thead><tr><th scope="col">Nome</th><th scope="col">Perfil</th><th scope="col">Idade</th><th scope="col">Responsável</th><th scope="col">Dado sensível</th></tr></thead>
      <tbody>${rows.map((u) => html`<tr><th scope="row"><a href="#/painel/pessoas/${u.id}">${u.name}</a></th><td>${ROLE_LABELS[u.role]}</td><td>${ageToday(u.birthDate) ?? "\u2014"}</td>
        <td>${u.guardian?.name || "\u2014"}</td><td>${has.has(u.id) ? "sim" : "\u2014"}</td></tr>`)}</tbody></table></div>`,
      (root) => root.querySelector("#people-filter").addEventListener("submit", (e) => {
        e.preventDefault();
        go(`/painel/pessoas?${new URLSearchParams({ q: e.target.q.value, perfil: e.target.perfil.value })}`);
      })
    );
  }, ADMIN2);
  route("/painel/pessoas/:id", async ({ params, query }) => {
    const u = await db.get("users", params.id);
    if (!u) return notFound();
    const hasSensitive = !!await db.get("sensitive", u.id).catch(() => null);
    let sensitive = null;
    if (query.ver === "1" && hasSensitive) {
      sensitive = await db.get("sensitive", u.id);
      await audit(session.user.uid, u.id, "visualizou dado sens\xEDvel (defici\xEAncia)");
    }
    const [consents, logs, admins] = await Promise.all([db.list("consents", [["userId", "==", u.id]]), db.list("audit", [["subjectId", "==", u.id]]), db.list("admins")]);
    const actorNames = Object.fromEntries((await db.list("users")).map((x) => [x.id, x.name]));
    logs.sort((a, b) => b.at.localeCompare(a.at));
    return page(
      u.name,
      "/painel/pessoas",
      html`<p><a href="#/painel/pessoas">← Pessoas</a></p><h1>${u.name}</h1>
    <dl><dt>Perfil</dt><dd>${ROLE_LABELS[u.role]}</dd><dt>E-mail</dt><dd>${u.email}</dd>
      ${u.birthDate ? html`<dt>Nascimento</dt><dd>${fmtDate(u.birthDate)} (${ageToday(u.birthDate)} anos)</dd>` : ""}
      ${u.guardian ? html`<dt>Responsável legal</dt><dd>${u.guardian.name} (${u.guardian.relation}) · ${u.guardian.email} · ${u.guardian.phone || "\u2014"}</dd>` : ""}
      <dt>Modalidades</dt><dd>${Object.entries(u.modalities || {}).map(([k, v]) => `${MOD[k]?.name}${v.level ? ` (${v.level})` : ""}${v.weight ? ` ${v.weight} kg` : ""}`).join("; ") || "\u2014"}</dd>
      ${(u.aptitudes || []).length ? html`<dt>Aptidão em inclusão</dt><dd>${u.aptitudes.map((a) => DISABILITY_TYPES[a]).join("; ")}</dd>` : ""}
      <dt>Interesse em apoio</dt><dd>${(u.supportInterest || []).map((s) => SUPPORT_FUNCTIONS[s]).join(", ") || "\u2014"}</dd>
      <dt>Uso de imagem</dt><dd>${u.imageConsent ? "Autorizado" : "N\xE3o autorizado"}</dd></dl>
    <h2>Dado sensível (deficiência)</h2>
    ${sensitive ? html`<div class="card sensitive"><p><strong>Tipos:</strong> ${(sensitive.types || []).map((t) => DISABILITY_TYPES[t]).join("; ") || "\u2014"}</p>
      <p><strong>Necessidades de apoio:</strong> ${sensitive.notes || "\u2014"}</p><p class="hint">Este acesso foi registrado na trilha de auditoria.</p></div>` : hasSensitive ? html`<a class="btn secondary" href="#/painel/pessoas/${u.id}?ver=1">Ver informação sigilosa (acesso será registrado)</a>` : html`<p class="muted">Não informado.</p>`}
    <h2>Consentimentos</h2><div class="table-wrap"><table><thead><tr><th scope="col">Tipo</th><th scope="col">Concedido por</th><th scope="col">Vínculo</th><th scope="col">Data</th><th scope="col">Termo</th><th scope="col">Revogado</th></tr></thead>
      <tbody>${consents.length ? consents.map((c) => html`<tr><td>${c.kind}</td><td>${c.grantedBy}</td><td>${c.relation}</td><td>${fmtDate(c.grantedAt?.slice(0, 16))}</td><td>${c.termsVersion}</td><td>${c.revokedAt ? fmtDate(c.revokedAt.slice(0, 16)) : "\u2014"}</td></tr>`) : html`<tr><td colspan="6">Nenhum.</td></tr>`}</tbody></table></div>
    <h2>Auditoria</h2><ul>${logs.length ? logs.slice(0, 20).map((a) => html`<li>${fmtDate(a.at.slice(0, 16))} — ${actorNames[a.actorId] || "sistema"}: ${a.action}</li>`) : html`<li class="muted">Sem registros.</li>`}</ul>
    ${!admins.some((a) => a.id === u.id) && u.active !== false && dataMode() === "firebase" ? html`<h2>Esqueceu a senha</h2><div class="card">
      <p>O sistema envia para <strong>${u.email}</strong> um e-mail com um link para a pessoa criar uma nova senha.</p>
      <button class="btn secondary" type="button" id="reset-mail">Enviar e-mail para criar nova senha</button><div id="reset-mail-msg" aria-live="polite"></div></div>` : ""}
    ${!admins.some((a) => a.id === u.id) && u.active !== false && dataMode() !== "firebase" ? html`<h2>Senha provisória</h2><div class="card">
      <p>Para quem esqueceu a senha. O sistema gera uma senha provisória; entregue-a pessoalmente ao aluno ou ao responsável. No primeiro acesso, a pessoa cria uma nova senha.</p>
      <button class="btn secondary" type="button" id="reset-pw">Gerar senha provisória</button><div id="new-pw" aria-live="polite"></div></div>` : ""}
    ${!admins.some((a) => a.id === u.id) ? html`<h2>Exclusão (LGPD)</h2><form class="card" id="anon">${field("confirm", "Digite EXCLUIR para anonimizar este cadastro a pedido do titular/respons\xE1vel")}
      <button class="btn danger" type="submit">Anonimizar</button><p class="hint">O cadastro e o login da pessoa são desativados.</p></form>` : ""}`,
      (root) => {
        root.querySelector("#reset-mail")?.addEventListener("click", async (e) => {
          const out = root.querySelector("#reset-mail-msg");
          e.target.disabled = true;
          try {
            await auth.sendPasswordReset(u.email);
            await audit(session.user.uid, u.id, "enviou e-mail para nova senha");
            out.innerHTML = html`<p class="flash success" style="margin-top:1rem">E-mail enviado para ${u.email}. Peça para olhar também a caixa de spam.</p>`.s;
          } catch (err) {
            e.target.disabled = false;
            out.innerHTML = html`<p class="flash error" style="margin-top:1rem">${err.message}</p>`.s;
          }
        });
        root.querySelector("#reset-pw")?.addEventListener("click", async (e) => {
          if (!confirm(`Gerar uma senha provis\xF3ria para ${u.name}? A senha atual deixar\xE1 de funcionar.`)) return;
          const digits = String(crypto.getRandomValues(new Uint32Array(1))[0] % 1e4).padStart(4, "0");
          const letters = "abcdefghjkmnpqrstuvwxyz";
          const pick = () => letters[crypto.getRandomValues(new Uint8Array(1))[0] % letters.length];
          const pw = `oasis${digits}${pick()}${pick()}`;
          await auth.adminSetPassword(u.id, pw);
          await db.update("users", u.id, { mustChangePassword: true });
          await audit(session.user.uid, u.id, "gerou senha provis\xF3ria");
          e.target.disabled = true;
          root.querySelector("#new-pw").innerHTML = html`<p class="flash success" style="margin-top:1rem">Senha provisória de ${u.name}: <strong style="font-size:1.3rem;letter-spacing:.05em">${pw}</strong><br>
        Anote e entregue pessoalmente. Ela não será mostrada de novo. E-mail de acesso: ${u.email}</p>`.s;
        });
        bindForm(root, "#anon", async (d, form) => {
          if (!confirmText(form)) throw new Error("Digite EXCLUIR para confirmar.");
          await anonymizeUser(u.id);
          await auth.disableLogin(u.id);
          await audit(session.user.uid, u.id, "anonimizou cadastro");
          flash("Cadastro anonimizado.", "success");
          go("/painel/pessoas");
        });
      }
    );
  }, ADMIN2);
  route("/painel/regras", async () => {
    const { scoring, general } = await getSettings(true);
    const { bjj, taekwondo: tkd, team } = scoring;
    return page(
      "Pontua\xE7\xE3o e regras",
      "/painel/regras",
      html`<h1>Pontuação e regras</h1>
    <p class="lead">As regras mudam entre temporadas. Os valores abaixo valem para os próximos cálculos; partidas já encerradas mantêm o resultado gravado (reabra uma partida para recalcular).</p>
    <form id="rules">
      <fieldset><legend>Jiu-jitsu</legend><div class="row">${Object.entries(bjj.points).map(([k, v]) => field(`bjj_${k}`, BJJ_LABELS[k], { type: "number", value: v, attrs: 'min="1" max="20" style="max-width:8rem"' }))}</div></fieldset>
      <fieldset><legend>Taekwondo</legend><div class="row">${Object.entries(tkd.points).map(([k, v]) => field(`tkd_${k}`, TKD_LABELS[k], { type: "number", value: v, attrs: 'min="1" max="20" style="max-width:8rem"', hint: k === "spin_kick_head" ? "Decis\xE3o do cliente: 5 ou 6" : "" }))}</div>
        <div class="row">${field("tkd_gamjeom_points", "Pontos ao oponente por gam-jeom", { type: "number", value: tkd.gamjeom_points })}
          ${field("tkd_max_gamjeom", "Gam-jeom que encerra a luta (0 = sem limite)", { type: "number", value: tkd.max_gamjeom })}
          ${field("tkd_point_gap", "Diferen\xE7a de pontos que encerra (0 = desativado)", { type: "number", value: tkd.point_gap })}</div>
        <div class="row">${select("tkd_mode", "Sistema de rounds", { cumulativo: "Soma dos rounds + golden point no empate", melhor_de_3: "Melhor de 3 rounds" }, tkd.mode)}
          ${field("tkd_rounds", "N\xBA de rounds", { type: "number", value: tkd.rounds })}${field("tkd_golden_point_target", "Pontos para vencer o golden point", { type: "number", value: tkd.golden_point_target })}</div></fieldset>
      <fieldset><legend>Esportes coletivos — pontos na classificação</legend>
        ${Object.entries(team).map(([sport, cfg]) => html`<div class="row"><strong style="flex:0 0 8rem;align-self:center">${MOD[sport].name}</strong>
          ${field(`${sport}_win`, "Vit\xF3ria", { type: "number", value: cfg.win })}${field(`${sport}_draw`, "Empate", { type: "number", value: cfg.draw })}${field(`${sport}_loss`, "Derrota", { type: "number", value: cfg.loss })}</div>`)}
        ${select("volei_best_of", "V\xF4lei: partidas em", { 3: "Melhor de 3 sets", 5: "Melhor de 5 sets" }, team.volei.best_of)}</fieldset>
      <fieldset id="pesos"><legend>Categorias de peso das lutas</legend>
        <p class="hint">Uma linha por categoria: <code>modalidade;divisão;sexo;categoria;peso máximo</code>. Use <code>livre</code> na última (sem limite de peso).
          Modalidades: jiu_jitsu, taekwondo, para_jiu_jitsu, para_taekwondo — as adaptadas usam a tabela da modalidade de origem quando não têm a própria.
          O limite de baixo de cada categoria é o peso máximo da anterior (ex.: Pluma = acima de 53,5 até 58,5 kg).
          A divisão precisa ter o mesmo nome da lista de divisões.</p>
        ${textarea("weight_table", "Tabela de peso", { value: tableToText(general.weightTable), rows: 14 })}
        ${(() => {
        const have = new Set((general.weightTable || []).map((r) => `${r.modality}|${r.division}`));
        const falta = general.ageBands.filter((b) => !have.has(`jiu_jitsu|${b.name}`)).map((b) => b.name);
        return falta.length ? html`<p class="hint"><strong>Atenção:</strong> jiu-jitsu ainda sem pesos para: ${falta.join(", ")}. Nessas divisões as categorias são criadas sem peso.</p>` : "";
      })()}</fieldset>
      <fieldset><legend>Categorias e calendário</legend>
        ${textarea("age_bands", "Divis\xF5es por idade (uma por linha: Nome;idade m\xEDnima;idade m\xE1xima)", { value: general.ageBands.map((b) => `${b.name};${b.min};${b.max}`).join("\n"), rows: 10 })}
        <div class="row">${select("ageReference", "Idade de refer\xEAncia", { ano: "Idade que completa no ano do evento", data_evento: "Idade exata na data do evento" }, general.ageReference)}
          ${select("conflictMode", "Conflito palco \xD7 quadra", { alertar: "Alertar e permitir", impedir: "Impedir o agendamento" }, general.conflictMode)}
          ${field("bufferMin", "Folga m\xEDnima entre compromissos (min)", { type: "number", value: general.bufferMin || 0 })}</div>
        ${checkbox("publicNameAbbrev", "Abreviar nomes de alunos na \xE1rea p\xFAblica", general.publicNameAbbrev !== false)}</fieldset>
      <button class="btn" type="submit">Salvar configurações</button></form>`,
      (root) => bindForm(root, "#rules", async (d) => {
        const pos = (k, zero = false) => {
          const v = int(d[k]);
          if (v == null || v < 0 || v === 0 && !zero) throw new Error(`Valor inv\xE1lido em ${k}`);
          return v;
        };
        const nb = structuredClone(bjj), nt = structuredClone(tkd), nteam = structuredClone(team);
        for (const k of Object.keys(nb.points)) nb.points[k] = pos(`bjj_${k}`);
        for (const k of Object.keys(nt.points)) nt.points[k] = pos(`tkd_${k}`);
        for (const k of ["gamjeom_points", "rounds", "max_gamjeom", "point_gap", "golden_point_target"]) nt[k] = pos(`tkd_${k}`, true);
        nt.mode = d.tkd_mode === "melhor_de_3" ? "melhor_de_3" : "cumulativo";
        if (nt.mode === "melhor_de_3") nt.rounds = 3;
        for (const [sport, cfg] of Object.entries(nteam)) for (const k of ["win", "draw", "loss"]) cfg[k] = pos(`${sport}_${k}`, true);
        nteam.volei.best_of = d.volei_best_of === "5" ? 5 : 3;
        const bands = str(d.age_bands, 3e3).split("\n").filter((l) => l.trim()).map((l) => {
          const [name, a, b] = l.split(";").map((x) => x.trim());
          const min = int(a), max = int(b);
          if (!name || min == null || max == null || !(min >= 4 && min <= max && max <= 17)) throw new Error(`Divis\xE3o inv\xE1lida (idades de 4 a 17 anos): ${l}`);
          return { name, min, max };
        });
        if (!bands.length) throw new Error("Informe ao menos uma divis\xE3o por idade");
        if (new Set(bands.map((b) => b.name)).size !== bands.length) throw new Error("H\xE1 divis\xF5es com o mesmo nome");
        const weightTable = textToTable(str(d.weight_table, 2e4), bands);
        await db.set("settings", "scoring", { bjj: nb, taekwondo: nt, team: nteam });
        await db.set("settings", "general", {
          ageBands: bands,
          weightTable,
          ageReference: d.ageReference === "data_evento" ? "data_evento" : "ano",
          conflictMode: d.conflictMode === "impedir" ? "impedir" : "alertar",
          bufferMin: pos("bufferMin", true),
          publicNameAbbrev: !!d.publicNameAbbrev
        });
        invalidateSettings();
        await audit(session.user.uid, null, "alterou configura\xE7\xF5es de pontua\xE7\xE3o");
        flash("Configura\xE7\xF5es salvas. Os novos valores valem para os pr\xF3ximos c\xE1lculos de resultado.", "success");
        go("/painel/regras");
      })
    );
  }, ADMIN2);
  route("/painel/backup", async () => {
    const online = dataMode() === "firebase";
    const usage = storageUsage3();
    const pct = usage ? Math.min(100, Math.round(100 * usage.usedBytes / usage.limitBytes)) : 0;
    const last = localStorage.getItem("oasis:ultimo-backup");
    return page(
      "Backup dos dados",
      "/painel/backup",
      html`<h1>Backup dos dados</h1>
    ${online ? html`<div class="card"><p>Os dados estão <strong>online</strong> (Firebase): todos os computadores e celulares veem as mesmas informações.</p>
      <ul><li>Mesmo assim, baixe um backup depois de cada evento e guarde em local protegido: ele tem dados pessoais de crianças e adolescentes.</li>
        <li>Para trazer os dados que estavam guardados em um computador (modo local), abra o site antigo nesse computador, baixe o backup lá e restaure aqui. Os logins não vão junto: cada pessoa cria a conta de novo com o mesmo e-mail.</li></ul>
      <p><strong>Último backup feito neste computador:</strong> ${last ? fmtDate(last.slice(0, 16)) : "nunca"}</p></div>` : html`<div class="card"><p>Todos os dados do sistema (cadastros, chaves, resultados, notícias, fotos e configurações) ficam guardados <strong>neste navegador, neste computador</strong>.</p>
      <ul><li>Se alguém limpar o histórico ou os dados de navegação, <strong>tudo é apagado</strong>.</li>
        <li>Outros computadores não veem estes dados. Para passar para outro computador, baixe o backup aqui e restaure lá.</li>
        <li>Faça um backup <strong>pelo menos uma vez por semana</strong> e depois de cada evento, e guarde o arquivo em um pendrive ou na nuvem da instituição.</li>
        <li>O arquivo de backup contém dados pessoais de crianças e adolescentes: guarde-o em local protegido.</li></ul>
      <p><strong>Último backup feito neste computador:</strong> ${last ? fmtDate(last.slice(0, 16)) : "nunca"}</p>
      <label for="uso" class="hint">Espaço usado: ${((usage?.usedBytes || 0) / 1048576).toFixed(1)} MB de cerca de 5 MB (${pct}%)</label>
      <progress id="uso" max="100" value="${pct}">${pct}%</progress>
      ${pct > 80 ? html`<p class="flash warning">O espaço está quase cheio. Remova fotos ou notícias antigas.</p>` : ""}</div>`}
    <h2>Baixar backup</h2><p><button class="btn" type="button" id="export-all">Baixar backup agora</button></p>
    <h2>Restaurar backup</h2><form class="card" id="import-form"><p class="flash warning">${online ? raw("Restaurar <strong>grava os registros do arquivo</strong> no banco online, por cima dos que t\xEAm o mesmo c\xF3digo.") : raw("Restaurar <strong>substitui todos os dados atuais</strong> deste navegador pelos do arquivo.")}</p>
      <div class="field"><label for="backup_file">Arquivo de backup (.json)</label><input type="file" id="backup_file" accept="application/json,.json" required></div>
      ${field("confirm", "Digite RESTAURAR para confirmar", { id: "restore_confirm" })}<button class="btn danger" type="submit">Restaurar</button></form>`,
      (root) => {
        root.querySelector("#export-all").addEventListener("click", async () => {
          const now = (/* @__PURE__ */ new Date()).toISOString();
          download(`backup-oasis-${now.slice(0, 10)}.json`, await exportAll3(), "application/json");
          localStorage.setItem("oasis:ultimo-backup", now);
          flash("Backup baixado. Guarde o arquivo em local seguro.", "success");
          go("/painel/backup");
        });
        bindForm(root, "#import-form", async (d, form) => {
          if (!confirmText(form, "RESTAURAR")) throw new Error("Digite RESTAURAR para confirmar.");
          const file = form.querySelector("#backup_file").files[0];
          if (!file) throw new Error("Escolha o arquivo de backup.");
          await importAll3(await file.text());
          invalidateSettings();
          if (dataMode() === "firebase") {
            flash("Backup restaurado no banco online.", "success");
            return go("/painel");
          }
          flash("Backup restaurado. Entre novamente.", "success");
          await auth.signOut();
          go("/entrar");
        });
      }
    );
  }, ADMIN2);
  function audienceOptions() {
    return {
      todos: "Todos os inscritos (alunos e professores)",
      ...Object.fromEntries(Object.entries(ROLES).map(([k, v]) => [`perfil:${k}`, `S\xF3 perfil ${v}`])),
      ...Object.fromEntries(MODALITIES.map((m) => [`modalidade:${m.code}`, `Quem pratica ${m.name}`]))
    };
  }
  route("/painel/avisos", async () => {
    const notices = (await db.list("notices")).sort((a, b) => b.date.localeCompare(a.date));
    const aud = audienceOptions();
    return page(
      "Avisos aos inscritos",
      "/painel/avisos",
      html`<h1>Avisos aos inscritos</h1>
    <p class="lead">Os avisos aparecem na Área do aluno (e do professor) de quem faz parte do público escolhido, com o selo "novo" até a pessoa ler.</p>
    <h2>Novo aviso</h2><form class="card" id="notice-form">${field("title", "T\xEDtulo", { required: true })}
      ${textarea("body", "Mensagem", { rows: 6, required: true, hint: "Separe par\xE1grafos com uma linha em branco." })}
      <div class="row">${select("audience", "Para quem", aud, "todos")}</div>
      ${checkbox("important", "Marcar como importante", false)}${checkbox("published", "Publicar agora", true)}
      <button class="btn" type="submit">Salvar aviso</button></form>
    <h2>Avisos enviados</h2>
    ${notices.length ? notices.map((n) => html`<article class="card" style="margin-bottom:.75rem">
      <p class="date" style="margin:0">${fmtDate(n.date.slice(0, 16))} · ${aud[n.audience] || n.audience}${n.important ? html` · <span class="tag">importante</span>` : ""}${!n.published ? html` · <span class="tag accent">rascunho</span>` : ""}</p>
      <h3 style="margin:.2rem 0">${n.title}</h3><p style="white-space:pre-line;margin:0 0 .5rem">${n.body}</p>
      <div class="actions" style="margin:0"><button class="btn small secondary" type="button" data-toggle="${n.id}">${n.published ? "Ocultar" : "Publicar"}</button>
        <button class="btn small danger" type="button" data-del="${n.id}">Excluir<span class="visually-hidden"> aviso ${n.title}</span></button></div></article>`) : html`<p class="muted">Nenhum aviso ainda.</p>`}`,
      (root) => {
        bindForm(root, "#notice-form", async (d) => {
          if (!str(d.title) || !str(d.body)) throw new Error("Informe t\xEDtulo e mensagem.");
          await db.add("notices", {
            title: str(d.title, 150),
            body: str(d.body, 5e3),
            audience: aud[d.audience] ? d.audience : "todos",
            important: !!d.important,
            published: !!d.published,
            date: (/* @__PURE__ */ new Date()).toISOString(),
            authorId: session.user.uid
          });
          flash("Aviso salvo.", "success");
          go("/painel/avisos");
        });
        root.querySelectorAll("[data-toggle]").forEach((b) => b.addEventListener("click", async () => {
          const n = notices.find((x) => x.id === b.dataset.toggle);
          await db.update("notices", n.id, { published: !n.published });
          go("/painel/avisos");
        }));
        root.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
          if (!confirm("Excluir este aviso?")) return;
          await db.remove("notices", b.dataset.del);
          go("/painel/avisos");
        }));
      }
    );
  }, ADMIN2);

  // js/pages/site-admin.js
  var ADMIN3 = { auth: "admin" };
  var page2 = (title, current2, content, after) => ({ title, body: adminLayout(current2, content), after });
  var GROUPS = [
    ["Identidade", [
      ["name", "Nome da institui\xE7\xE3o"],
      ["shortName", "Nome curto (logotipo)"],
      ["tagline", "Frase principal (destaque da p\xE1gina inicial)"],
      ["heroSubtitle", "Texto abaixo da frase principal", "textarea"],
      ["photosNote", "Aviso sobre fotos (deixe vazio quando publicar fotos)"]
    ]],
    ["A O\xE1sis", [
      ["aboutShort", "Quem somos \u2014 resumo (p\xE1gina inicial)", "textarea"],
      ["aboutFull", "Quem somos \u2014 texto completo", "textarea", "Separe par\xE1grafos com uma linha em branco."],
      ["stats", "N\xFAmeros em destaque", "pairs:value:label", "Uma linha por n\xFAmero: valor | descri\xE7\xE3o"],
      ["commitments", "Como atuamos", "pairs:title:text", "Uma linha por compromisso: t\xEDtulo | descri\xE7\xE3o"],
      ["history", "Nossa hist\xF3ria", "textarea", "Um marco por par\xE1grafo."],
      ["mission", "Miss\xE3o", "textarea"],
      ["vision", "Vis\xE3o", "textarea"],
      ["values", "Valores", "textarea", "Um valor por linha."],
      ["transparency", "Transpar\xEAncia \u2014 texto", "textarea"],
      ["transparencyLinks", "Transpar\xEAncia \u2014 documentos", "pairs:title:url", "Uma linha por documento: t\xEDtulo | link"]
    ]],
    ["Esporte inclusivo", [
      ["inclusiveText", "Esporte para todos \u2014 texto", "textarea"],
      ["showAdaptedPublic", "Publicar as modalidades adaptadas (parajiu-j\xEDtsu, parataekwondo) no site", "bool"],
      ["adaptedPendingNote", "Aviso exibido enquanto as adaptadas n\xE3o forem publicadas", "textarea"]
    ]],
    ["Participe", [
      ["participeText", "Texto de inscri\xE7\xF5es", "textarea"],
      ["helpDonation", "Como ajudar \u2014 doa\xE7\xF5es", "textarea"],
      ["helpPartnership", "Como ajudar \u2014 parcerias", "textarea"],
      ["helpVolunteer", "Como ajudar \u2014 voluntariado", "textarea"],
      ["donationInfo", "Canais oficiais de doa\xE7\xE3o (PIX, banco)", "textarea"],
      ["faq", "Perguntas frequentes", "textarea", "Blocos separados por linha em branco: 1\xAA linha \xE9 a pergunta, as seguintes a resposta."],
      ["terms", "Termos de uso", "textarea"]
    ]],
    ["Contato e redes", [
      ["email", "E-mail"],
      ["phone1", "Telefone 1"],
      ["phone2", "Telefone 2"],
      ["address", "Endere\xE7o"],
      ["hours", "Hor\xE1rio de atendimento"],
      ["facebook", "Facebook (link)"],
      ["instagram", "Instagram (link)"],
      ["youtube", "YouTube (link)"]
    ]]
  ];
  route("/painel/site", async () => {
    const { site } = await getSettings(true);
    const fieldFor = ([key, label, type = "text", hint = ""]) => {
      if (type === "bool") return checkbox(key, label, !!site[key]);
      if (type.startsWith("pairs")) {
        const [, a, b] = type.split(":");
        return textarea(key, label, { value: (site[key] || []).map((x) => `${x[a]} | ${x[b]}`).join("\n"), hint, rows: 5 });
      }
      if (type === "textarea") return textarea(key, label, { value: site[key], hint, rows: String(site[key] || "").length > 300 ? 7 : 3 });
      return field(key, label, { value: site[key], hint });
    };
    return page2(
      "Textos e contatos",
      "/painel/site",
      html`<h1>Textos e contatos do site</h1><p class="lead">Tudo o que aparece nas páginas públicas institucionais. As alterações valem na hora.</p>
    <form id="site-form"><fieldset><legend>Foto principal da página inicial</legend>
      ${site.heroImage ? html`${img(site.heroImage, site.heroImageAlt, "thumb")}${checkbox("remove_image", "Remover a foto", false)}` : ""}
      <div class="field"><label for="hero_file">Enviar foto (JPG, PNG ou WebP)</label><input type="file" id="hero_file" name="hero_file" accept="image/*"></div>
      ${field("imageAlt", "Descri\xE7\xE3o da foto (texto alternativo)", { value: site.heroImageAlt, hint: "Ex.: Crian\xE7as se apresentando no Festival de Artes, com int\xE9rprete de Libras ao lado do palco." })}</fieldset>
      ${GROUPS.map(([title, fields]) => html`<fieldset><legend>${title}</legend>${fields.map(fieldFor)}</fieldset>`)}
      <button class="btn" type="submit">Salvar conteúdo</button></form>`,
      (root) => bindForm(root, "#site-form", async (d, form) => {
        const next = { ...site };
        for (const [, fields] of GROUPS) for (const [key, , type = "text"] of fields) {
          if (type === "bool") next[key] = !!d[key];
          else if (type.startsWith("pairs")) {
            const [, a, b] = type.split(":");
            next[key] = str(d[key], 6e3).split("\n").filter((l) => l.trim()).map((l) => {
              const [x, ...rest] = l.split("|");
              return { [a]: x.trim(), [b]: rest.join("|").trim() };
            });
          } else next[key] = str(d[key], 6e3);
        }
        const { image, imageAlt } = await handleImage(form, d, { image: site.heroImage });
        next.heroImage = image;
        next.heroImageAlt = imageAlt;
        await db.set("settings", "site", next);
        invalidateSettings();
        await audit(session.user.uid, null, "editou o conte\xFAdo do site");
        flash("Conte\xFAdo do site salvo.", "success");
        go("/painel/site");
      })
    );
  }, ADMIN3);
  route("/painel/site/noticias", async () => {
    const rows = await listSorted("news", [], "date", "desc");
    return page2("Not\xEDcias", "/painel/site/noticias", html`<h1>Notícias</h1><div class="actions"><a class="btn" href="#/painel/site/noticias/nova">Nova notícia</a></div>
    <div class="table-wrap"><table><thead><tr><th scope="col">Título</th><th scope="col">Data</th><th scope="col">Categoria</th><th scope="col">Situação</th></tr></thead>
      <tbody>${rows.length ? rows.map((n) => html`<tr><th scope="row"><a href="#/painel/site/noticias/${n.id}">${n.title}</a></th><td>${fmtDate(n.date)}</td><td>${n.category || "\u2014"}</td><td>${n.published ? "Publicada" : "Rascunho"}</td></tr>`) : html`<tr><td colspan="4">Nenhuma notícia.</td></tr>`}</tbody></table></div>`);
  }, ADMIN3);
  route("/painel/site/noticias/:id", async ({ params }) => {
    const isNew2 = params.id === "nova";
    const n = isNew2 ? {} : await db.get("news", params.id);
    if (!n) return notFound();
    return page2(
      isNew2 ? "Nova not\xEDcia" : "Editar not\xEDcia",
      "/painel/site/noticias",
      html`<p><a href="#/painel/site/noticias">← Notícias</a></p><h1>${isNew2 ? "Nova not\xEDcia" : "Editar not\xEDcia"}</h1>
    <form class="card" id="news-form">${field("title", "T\xEDtulo", { value: n.title, required: true })}
      <div class="row">${field("date", "Data", { type: "date", value: n.date, required: true })}${field("category", "Categoria", { value: n.category, hint: "Ex.: Cultura, Esporte, Capacita\xE7\xE3o" })}</div>
      ${textarea("summary", "Resumo", { value: n.summary, rows: 2 })}${textarea("body", "Texto", { value: n.body, rows: 12, hint: "Separe par\xE1grafos com uma linha em branco." })}
      <fieldset><legend>Imagem</legend>${n.image ? html`${img(n.image, n.imageAlt, "thumb")}${checkbox("remove_image", "Remover imagem", false)}` : ""}
        <div class="field"><label for="news_file">Enviar imagem</label><input type="file" id="news_file" name="image_file" accept="image/*"></div>
        ${field("imageAlt", "Descri\xE7\xE3o da imagem (obrigat\xF3ria se houver imagem)", { value: n.imageAlt })}</fieldset>
      ${field("librasVideoUrl", "V\xEDdeo em Libras (URL, opcional)", { type: "url", value: n.librasVideoUrl })}${checkbox("published", "Publicada no site", !!n.published)}
      <div class="actions"><button class="btn" type="submit">Salvar</button>${!isNew2 ? html`<a class="btn secondary" href="#/noticias/${n.id}">Ver no site</a>` : ""}</div></form>
    ${!isNew2 ? html`<button class="btn danger small" type="button" id="news-del" style="margin-top:1rem">Excluir notícia</button>` : ""}`,
      (root) => {
        bindForm(root, "#news-form", async (d, form) => {
          if (!str(d.title) || !d.date) throw new Error("T\xEDtulo e data s\xE3o obrigat\xF3rios.");
          const img2 = await handleImage(form, d, n);
          const data = {
            title: str(d.title, 200),
            date: d.date,
            category: str(d.category, 60),
            summary: str(d.summary, 500),
            body: str(d.body, 2e4),
            librasVideoUrl: str(d.librasVideoUrl, 300),
            published: !!d.published,
            ...img2
          };
          let id = n.id;
          if (isNew2) {
            id = slugify(data.title);
            if (await db.get("news", id).catch(() => null)) id = `${id}-${data.date}`;
            await db.set("news", id, data);
          } else await db.update("news", id, data);
          flash("Not\xEDcia salva.", "success");
          go(`/painel/site/noticias/${id}`);
        });
        root.querySelector("#news-del")?.addEventListener("click", async () => {
          if (!confirm("Excluir esta not\xEDcia?")) return;
          await removeImage(n.image);
          await db.remove("news", n.id);
          go("/painel/site/noticias");
        });
      }
    );
  }, ADMIN3);
  route("/painel/site/projetos", async () => {
    const rows = await listSorted("projects", [], "order");
    return page2("Projetos", "/painel/site/projetos", html`<h1>Projetos</h1><div class="actions"><a class="btn" href="#/painel/site/projetos/novo">Novo projeto</a></div>
    <div class="table-wrap"><table><thead><tr><th scope="col">Ordem</th><th scope="col">Projeto</th><th scope="col">Área</th><th scope="col">Participantes</th><th scope="col">Situação</th></tr></thead>
      <tbody>${rows.map((p) => html`<tr><td>${p.order}</td><th scope="row"><a href="#/painel/site/projetos/${p.id}">${p.name}</a></th><td>${p.area || "\u2014"}</td><td>${p.participants || "\u2014"}</td><td>${p.published ? "Publicado" : "Oculto"}</td></tr>`)}</tbody></table></div>`);
  }, ADMIN3);
  route("/painel/site/projetos/:id", async ({ params }) => {
    const isNew2 = params.id === "novo";
    const p = isNew2 ? { published: true, modalities: [] } : await db.get("projects", params.id);
    if (!p) return notFound();
    const chosen = new Set(p.modalities || []);
    return page2(
      p.name || "Novo projeto",
      "/painel/site/projetos",
      html`<p><a href="#/painel/site/projetos">← Projetos</a></p><h1>${p.name || "Novo projeto"}</h1>
    <form class="card" id="proj-form">${field("name", "Nome", { value: p.name, required: true })}
      <div class="row">${field("area", "\xC1rea", { value: p.area, hint: "Cultura ou Esporte" })}${field("participants", "N\xBA de participantes", { value: p.participants })}
        ${field("order", "Ordem no site", { type: "number", value: p.order ?? 0 })}</div>
      ${textarea("summary", "Resumo", { value: p.summary, rows: 2 })}${textarea("body", "Texto completo", { value: p.body, rows: 8 })}
      <fieldset><legend>Modalidades do projeto</legend><p class="hint">A página do projeto mostra os professores e as próximas chaves dessas modalidades.</p>
        <div class="checks">${MODALITIES.map((m) => html`<label class="check"><input type="checkbox" name="modalities" value="${m.code}" ${raw(chosen.has(m.code) ? "checked" : "")}> ${m.name}</label>`)}</div></fieldset>
      <fieldset><legend>Imagem</legend>${p.image ? html`${img(p.image, p.imageAlt, "thumb")}${checkbox("remove_image", "Remover imagem", false)}` : ""}
        <div class="field"><label for="proj_file">Enviar imagem</label><input type="file" id="proj_file" name="image_file" accept="image/*"></div>
        ${field("imageAlt", "Descri\xE7\xE3o da imagem", { value: p.imageAlt })}</fieldset>
      ${checkbox("published", "Publicado no site", !!p.published)}
      <div class="actions"><button class="btn" type="submit">Salvar</button>${!isNew2 ? html`<a class="btn secondary" href="#/projetos/${p.id}">Ver no site</a>` : ""}</div></form>
    ${!isNew2 ? html`<button class="btn danger small" type="button" id="proj-del" style="margin-top:1rem">Excluir projeto</button>` : ""}`,
      (root) => {
        bindForm(root, "#proj-form", async (d, form) => {
          if (!str(d.name)) throw new Error("Informe o nome do projeto.");
          const data = {
            name: str(d.name, 150),
            area: str(d.area, 40),
            participants: str(d.participants, 20),
            order: int(d.order, 0),
            summary: str(d.summary, 500),
            body: str(d.body, 2e4),
            modalities: asList(d.modalities).filter((m) => MOD[m]),
            published: !!d.published,
            ...await handleImage(form, d, p)
          };
          let id = p.id;
          if (isNew2) {
            id = slugify(data.name);
            if (await db.get("projects", id).catch(() => null)) throw new Error("J\xE1 existe um projeto com esse nome.");
            await db.set("projects", id, data);
          } else await db.update("projects", id, data);
          flash("Projeto salvo.", "success");
          go(`/painel/site/projetos/${id}`);
        });
        root.querySelector("#proj-del")?.addEventListener("click", async () => {
          if (!confirm("Excluir este projeto?")) return;
          await removeImage(p.image);
          await db.remove("projects", p.id);
          go("/painel/site/projetos");
        });
      }
    );
  }, ADMIN3);
  route("/painel/site/patrocinadores", async () => {
    const rows = await listSorted("sponsors", [], "order");
    return page2(
      "Patrocinadores",
      "/painel/site/patrocinadores",
      html`<h1>Patrocinadores e apoiadores</h1>
    ${rows.map((s) => html`<form class="card sponsor-form" style="margin-bottom:.75rem" data-id="${s.id}"><div class="row" style="align-items:flex-end">
      ${s.logo ? img(s.logo, `Logo ${s.name}`, "thumb") : ""}${field("name", "Nome", { value: s.name, id: `sp_name_${s.id}` })}${field("url", "Site", { type: "url", value: s.url, id: `sp_url_${s.id}` })}
      ${field("order", "Ordem", { type: "number", value: s.order, id: `sp_ord_${s.id}` })}
      <div class="field"><label for="sp_logo_${s.id}">Trocar logo</label><input type="file" id="sp_logo_${s.id}" name="logo_file" accept="image/*"></div></div>
      <button class="btn small" type="submit" name="action" value="update">Salvar<span class="visually-hidden"> ${s.name}</span></button>
      <button class="btn small danger" type="submit" name="action" value="delete">Excluir<span class="visually-hidden"> ${s.name}</span></button></form>`)}
    <h2>Adicionar</h2><form class="card" id="sp-add"><div class="row">${field("name", "Nome", { required: true })}${field("url", "Site", { type: "url" })}${field("order", "Ordem", { type: "number", value: rows.length })}
      <div class="field"><label for="logo">Logo</label><input type="file" id="logo" name="logo_file" accept="image/*"></div></div><button class="btn" type="submit">Adicionar</button></form>`,
      (root) => {
        bindForm(root, ".sponsor-form", async (d, form) => {
          const s = rows.find((x) => x.id === form.dataset.id);
          if (d.action === "delete") {
            await removeImage(s.logo);
            await db.remove("sponsors", s.id);
          } else {
            const file = form.querySelector("input[type=file]").files[0];
            const logo = file ? await uploadImage(file, 600) : s.logo;
            if (file) {
              await removeImage(s.logo);
              forgetImage(s.logo);
            }
            await db.update("sponsors", s.id, { name: str(d.name, 120) || s.name, url: str(d.url, 300), order: int(d.order, 0), logo });
          }
          flash("Patrocinadores atualizados.", "success");
          go("/painel/site/patrocinadores");
        });
        bindForm(root, "#sp-add", async (d, form) => {
          if (!str(d.name)) throw new Error("Informe o nome.");
          const file = form.querySelector("input[type=file]").files[0];
          await db.add("sponsors", { name: str(d.name, 120), url: str(d.url, 300), order: int(d.order, 0), logo: file ? await uploadImage(file, 600) : "" });
          flash("Patrocinador adicionado.", "success");
          go("/painel/site/patrocinadores");
        });
      }
    );
  }, ADMIN3);
  route("/painel/site/mensagens", async () => {
    const rows = (await db.list("messages")).sort((a, b) => !!a.readAt - !!b.readAt || b.createdAt.localeCompare(a.createdAt));
    return page2(
      "Mensagens",
      "/painel/site/mensagens",
      html`<h1>Mensagens do formulário de contato</h1>
    ${rows.length ? rows.map((m) => html`<article class="card" style="margin-bottom:.75rem${m.readAt ? "" : ";border-top-color:var(--brand)"}">
      <h2 style="margin:0;font-size:1.05rem">${!m.readAt ? html`<span class="tag accent">nova</span> ` : ""}${m.subject || "Sem assunto"}</h2>
      <p class="muted" style="margin:.25rem 0">${m.name} · <a href="mailto:${m.email}">${m.email}</a>${m.phone ? ` \xB7 ${m.phone}` : ""} · ${fmtDate(m.createdAt.slice(0, 16))}</p>
      <p style="white-space:pre-line">${m.message}</p><div class="actions" style="margin:0">
        ${!m.readAt ? html`<button class="btn small secondary" type="button" data-read="${m.id}">Marcar como lida</button>` : ""}
        <button class="btn small danger" type="button" data-del="${m.id}">Excluir</button></div></article>`) : html`<p class="muted">Nenhuma mensagem.</p>`}`,
      (root) => {
        root.querySelectorAll("[data-read]").forEach((b) => b.addEventListener("click", async () => {
          await db.update("messages", b.dataset.read, { readAt: (/* @__PURE__ */ new Date()).toISOString() });
          go("/painel/site/mensagens");
        }));
        root.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", async () => {
          await db.remove("messages", b.dataset.del);
          go("/painel/site/mensagens");
        }));
      }
    );
  }, ADMIN3);

  // js/pages/event-wizard.js
  var TYPES = {
    jiu_jitsu: { title: "Campeonato de jiu-jitsu", text: "Lutas por divis\xE3o de idade, sexo e peso. Pontos, vantagens e finaliza\xE7\xE3o.", group: "luta" },
    taekwondo: { title: "Campeonato de taekwondo", text: "Lutas por divis\xE3o de idade, sexo e peso. Rounds, golden point e gam-jeom.", group: "luta" },
    futebol: { title: "Torneio de futebol", text: "Times por divis\xE3o de idade. Eliminat\xF3ria ou grupos.", group: "coletivo" },
    futsal: { title: "Torneio de futsal", text: "Times por divis\xE3o de idade. Eliminat\xF3ria ou grupos.", group: "coletivo" },
    basquete: { title: "Torneio de basquete", text: "Times por divis\xE3o de idade. Sem empate.", group: "coletivo" },
    volei: { title: "Torneio de v\xF4lei", text: "Times por divis\xE3o de idade. Jogos em sets.", group: "coletivo" },
    festival: { title: "Festival de m\xFAsica e dan\xE7a", text: "Apresenta\xE7\xF5es no palco: abertura, intervalo e encerramento.", group: "arte" },
    institucional: { title: "Evento institucional", text: "Reuni\xE3o, encontro de fam\xEDlias, palestra. S\xF3 data, local e descri\xE7\xE3o.", group: "institucional" }
  };
  var ADAPTED = { jiu_jitsu: "para_jiu_jitsu", taekwondo: "para_taekwondo" };
  var MINUTES = { jiu_jitsu: 5, taekwondo: 6, futebol: 40, futsal: 30, basquete: 32, volei: 45 };
  var STEP_TITLES = { tipo: "Tipo de evento", info: "Informa\xE7\xF5es", categorias: "Categorias", apresentacoes: "Apresenta\xE7\xF5es", publicacao: "Inscri\xE7\xF5es e publica\xE7\xE3o", revisao: "Revis\xE3o" };
  function stepsFor(type, withShows) {
    const g = TYPES[type]?.group;
    if (g === "luta" || g === "coletivo") return ["tipo", "info", "categorias", ...withShows ? ["apresentacoes"] : [], "publicacao", "revisao"];
    if (g === "arte") return ["tipo", "info", "apresentacoes", "publicacao", "revisao"];
    if (g === "institucional") return ["tipo", "info", "publicacao", "revisao"];
    return ["tipo", "info", "publicacao", "revisao"];
  }
  var ADMIN4 = { auth: "admin" };
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
        <div id="wz-shows" hidden>${checkbox("withShows", "Este campeonato tamb\xE9m ter\xE1 apresenta\xE7\xF5es culturais (abertura, intervalo ou encerramento)", false)}</div>
        <p class="hint">Quer juntar modalidades diferentes no mesmo evento? Crie com a principal; na página do evento dá para acrescentar categorias de outras modalidades.</p>
      </section>

      <section data-step="info" aria-labelledby="h-info" hidden><h2 id="h-info" tabindex="-1">Informações do evento</h2>
        ${field("name", "Nome do evento", { required: true, id: "wz_name" })}
        <div class="row">${field("startsOn", "Data de in\xEDcio", { type: "date", required: true, id: "wz_start" })}${field("endsOn", "Data de fim", { type: "date", id: "wz_end", hint: "Deixe em branco se for um dia s\xF3." })}
          ${field("timeLabel", "Hor\xE1rio", { id: "wz_time", hint: "Ex.: 8h \xE0s 17h" })}</div>
        ${field("location", "Local", { id: "wz_loc", hint: "Ex.: Gin\xE1sio Municipal de Pomp\xE9ia" })}
        ${textarea("description", "Descri\xE7\xE3o para o p\xFAblico", { id: "wz_desc", rows: 4 })}
        <fieldset><legend>Imagem de capa (opcional)</legend>
          <div class="field"><label for="wz_image">Enviar imagem</label><input type="file" id="wz_image" name="image_file" accept="image/*"></div>
          ${field("imageAlt", "Descri\xE7\xE3o da imagem (para leitores de tela)", { id: "wz_alt", hint: "Obrigat\xF3ria se enviar imagem. Ex.: Crian\xE7as de quimono se cumprimentando no tatame." })}</fieldset>
      </section>

      <section data-step="categorias" aria-labelledby="h-cat" hidden><h2 id="h-cat" tabindex="-1">Categorias</h2>
        <div id="cat-intro"></div>
        <fieldset><legend>Divisões por idade</legend>
          <p class="hint">Marque as divisões que vão competir. A idade usada é a ${general.ageReference === "ano" ? "que a crian\xE7a completa no ano do evento" : "do dia do evento"}.</p>
          <div class="checks">${general.ageBands.map((b, i) => checkbox(`div_${i}`, `${b.name} (${b.min}\u2013${b.max} anos)`, false))}</div>
          <p><button type="button" class="btn small secondary" id="wz-all">Marcar todas</button></p></fieldset>
        <div class="row">${select("gender", "Sexo", {}, "", { id: "wz_gender" })}
          ${field("matchMinutes", "Tempo reservado para cada luta/partida (min)", { type: "number", id: "wz_minutes", attrs: 'min="1" max="180"', hint: "Usado na agenda e no aviso de conflito de hor\xE1rio." })}</div>
        <div id="wz-format">
          ${select("format", "Formato da chave", { eliminatoria: "Eliminat\xF3ria simples (mata-mata)", grupos: "Fase de grupos + mata-mata" }, "eliminatoria", { id: "wz_format" })}
          <div class="row" id="wz-groups" hidden>${field("groupCount", "N\xFAmero de grupos", { type: "number", value: 2, id: "wz_gc", attrs: 'min="2" max="8"' })}
            ${field("qualifiers", "Classificados por grupo", { type: "number", value: 2, id: "wz_q", attrs: 'min="1" max="4"' })}</div></div>
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
        <div id="wz-reg">${checkbox("registrationsOpen", "Inscri\xE7\xF5es abertas: os alunos j\xE1 podem se inscrever pela \xE1rea do inscrito", true)}</div>
        ${checkbox("published", "Publicar no site agora (aparece em Eventos e na agenda p\xFAblica)", true)}
        <p class="hint">Desmarcado, o evento fica como rascunho e só a coordenação vê.</p>
        <fieldset><legend>Libras</legend>
          <div id="wz-libras-auto">${checkbox("librasAuto", "Gerar a explica\xE7\xE3o de cada categoria em Libras (avatar VLibras), a partir das regras escolhidas", true)}</div>
          ${field("librasVideoUrl", "V\xEDdeo de apresenta\xE7\xE3o do evento em Libras (URL, opcional)", { type: "url", id: "wz_libras", hint: "V\xEDdeo gravado por int\xE9rprete. Links do YouTube aparecem dentro da p\xE1gina." })}</fieldset>
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
    return { title: "Novo evento", body: adminLayout("/painel/eventos", body), after(root) {
      wizard(root, { general, scoring });
    } };
  }, ADMIN4);
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
    const genders = () => val("gender") === "ambos" ? ["feminino", "masculino"] : [val("gender") || "misto"];
    function renderSteps() {
      const list3 = steps();
      $("#wz-steps").innerHTML = list3.map((s, i) => html`<li ${raw(s === step ? 'aria-current="step"' : "")} class="${list3.indexOf(step) > i ? "done" : ""}">
      <span class="ws-n" aria-hidden="true">${list3.indexOf(step) > i ? "\u2713" : i + 1}</span> ${STEP_TITLES[s]}${list3.indexOf(step) > i ? raw('<span class="visually-hidden"> (conclu\xEDda)</span>') : ""}</li>`.s).join("");
      form.querySelectorAll("section[data-step]").forEach((sec) => {
        sec.hidden = sec.dataset.step !== step;
      });
      const last = list3.indexOf(step) === list3.length - 1;
      $("#wz-back").hidden = step === "tipo";
      $("#wz-next").hidden = last;
      $("#wz-create").hidden = !last;
    }
    function setupCategories() {
      const t = type(), g = group();
      if (g !== "luta" && g !== "coletivo") return;
      const mod = MOD[t];
      $("#cat-intro").innerHTML = (g === "luta" ? html`<p>Em ${mod.name.toLowerCase()} as lutas são separadas por <strong>divisão de idade, sexo e peso</strong>. Para cada divisão e sexo, o sistema cria uma categoria para cada peso da tabela.</p>` : html`<p>No ${mod.name.toLowerCase()} os times são separados por <strong>divisão de idade</strong> e, se quiser, por sexo. Os times são montados depois, em <strong>Equipes</strong>.</p>`).s;
      const gSel = $("#wz_gender"), prev = gSel.value;
      const opts = g === "luta" ? { ambos: "Feminino e masculino (separados)", feminino: "S\xF3 feminino", masculino: "S\xF3 masculino" } : { misto: "Misto (meninas e meninos juntos)", ambos: "Feminino e masculino (separados)", feminino: "S\xF3 feminino", masculino: "S\xF3 masculino" };
      gSel.innerHTML = Object.entries(opts).map(([k, v]) => html`<option value="${k}">${v}</option>`.s).join("");
      if (opts[prev]) gSel.value = prev;
      if (!$("#wz_minutes").dataset.touched) $("#wz_minutes").value = MINUTES[t] || 10;
      $("#wz-format").hidden = g === "luta";
      $("#wz-adapted").innerHTML = ADAPTED[t] ? html`<fieldset><legend>Categorias adaptadas</legend>
      ${checkbox("withAdapted", `Criar tamb\xE9m categorias de ${MOD[ADAPTED[t]].name.toLowerCase()} (atletas com defici\xEAncia)`, false)}
      ${select("adaptedWeights", "Peso nas adaptadas", { sem: "Sem divis\xE3o de peso (uma categoria por divis\xE3o e sexo)", tabela: "Usar a mesma tabela de peso" }, "sem", { id: "wz_adw" })}
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
      } else if (MOD[t]) {
        const r = sc.team[t];
        body = html`<ul><li>Vitória: ${r.win} ponto(s) na tabela${r.allow_draw ? `; empate: ${r.draw}` : "; n\xE3o h\xE1 empate"}</li>
        ${t === "volei" ? html`<li>Melhor de ${r.best_of} sets de ${r.set_points} pontos (tie-break de ${r.tiebreak_points}), vantagem mínima de ${r.min_lead}</li>` : ""}</ul>`.s;
      }
      $("#wz-rules-body").innerHTML = body;
    }
    function renderWeights() {
      if (group() !== "luta") {
        $("#wz-weights").innerHTML = "";
        return;
      }
      const dv = divisions(), gs = genders();
      if (!dv.length) {
        $("#wz-weights").innerHTML = "";
        return;
      }
      const rows = [], missing = [];
      for (const d of dv) for (const g of gs) {
        const cl = weightClassesFor(settings.general.weightTable, type(), d.name, g);
        if (!cl.length) missing.push(`${d.name} ${GENDERS[g]}`);
        rows.push(html`<tr><th scope="row">${d.name} ${GENDERS[g]}</th><td>${cl.length ? cl.map((c) => `${c.name} (${weightText(c.min, c.max)})`).join(" \xB7 ") : raw('<span class="warn-text">sem tabela de peso: ser\xE1 criada uma categoria s\xF3, sem peso</span>')}</td></tr>`);
      }
      $("#wz-weights").innerHTML = html`<h3>Pesos de cada divisão</h3>
      ${missing.length ? html`<p class="flash warning">Faltam os pesos de: ${missing.join(", ")}. Você pode criar assim mesmo (uma categoria sem peso) ou cadastrar a tabela em <a href="#/painel/regras" target="_blank" rel="noopener">Pontuação e regras (nova aba)</a> e clicar em "Atualizar".</p>` : ""}
      <div class="table-wrap"><table><thead><tr><th scope="col">Divisão</th><th scope="col">Categorias de peso</th></tr></thead><tbody>${rows}</tbody></table></div>`.s;
    }
    function addShow() {
      const i = shows++;
      const div = document.createElement("div");
      div.className = "card show-row";
      div.innerHTML = html`<fieldset><legend>Apresentação ${i + 1}</legend>
      <div class="row">${field(`s${i}_title`, "T\xEDtulo", { id: `s${i}_title` })}${select(`s${i}_modality`, "Modalidade", { danca: "Dan\xE7a", musica: "M\xFAsica" }, "danca", { id: `s${i}_mod` })}
        ${select(`s${i}_slot`, "Momento", SLOTS, i === 0 ? "abertura" : "intervalo", { id: `s${i}_slot` })}</div>
      <div class="row">${field(`s${i}_time`, "Hor\xE1rio", { type: "time", id: `s${i}_time` })}${field(`s${i}_dur`, "Dura\xE7\xE3o (min)", { type: "number", value: 5, id: `s${i}_dur`, attrs: 'min="1"' })}</div>
      <div class="checks">${checkbox(`s${i}_libras`, "Int\xE9rprete de Libras no palco", false)}${checkbox(`s${i}_ad`, "Audiodescri\xE7\xE3o", false)}${checkbox(`s${i}_seat`, "Espa\xE7o acess\xEDvel na plateia", false)}</div>
      <button type="button" class="btn small secondary" data-remove-show>Remover esta apresentação</button></fieldset>`.s;
      div.querySelector("[data-remove-show]").addEventListener("click", () => {
        div.remove();
        $("#wz-add-show").focus();
      });
      $("#wz-shows-list").append(div);
      div.querySelector("input").focus();
    }
    const showRows = () => [...form.querySelectorAll(".show-row")].map((row2) => {
      const i = row2.querySelector("[name$=_title]").name.split("_")[0];
      return {
        title: str(val(`${i}_title`), 150),
        modality: val(`${i}_modality`),
        slot: val(`${i}_slot`),
        time: val(`${i}_time`),
        durationMin: int(val(`${i}_dur`), 5),
        accLibras: checked(`${i}_libras`),
        accAudiodesc: checked(`${i}_ad`),
        accSeating: checked(`${i}_seat`)
      };
    });
    function plannedCategories() {
      const t = type();
      if (!["luta", "coletivo"].includes(group())) return { cats: [], missing: [] };
      const dv = divisions(), gs = genders();
      const main2 = divisionCategories({ modality: t, divisions: dv, genders: gs, table: settings.general.weightTable });
      let cats = main2.cats.map((c) => ({ ...c }));
      if (ADAPTED[t] && checked("withAdapted")) {
        const ad = divisionCategories({ modality: ADAPTED[t], divisions: dv, genders: gs, table: val("adaptedWeights") === "tabela" ? settings.general.weightTable : [] });
        cats = cats.concat(ad.cats);
      }
      return { cats, missing: main2.missing };
    }
    function problems(s) {
      if (s === "tipo" && !type()) return [["Escolha o tipo de evento.", "input[name=type]"]];
      if (s === "info") {
        const out = [];
        if (!str(val("name"))) out.push(["Informe o nome do evento.", "#wz_name"]);
        if (!val("startsOn")) out.push(["Informe a data de in\xEDcio.", "#wz_start"]);
        if (val("endsOn") && val("startsOn") && val("endsOn") < val("startsOn")) out.push(["A data de fim \xE9 antes do in\xEDcio.", "#wz_end"]);
        if ($("#wz_image").files?.length && !str(val("imageAlt"))) out.push(["Descreva a imagem de capa para quem usa leitor de tela.", "#wz_alt"]);
        return out;
      }
      if (s === "categorias") {
        const out = [];
        if (!divisions().length) out.push(["Marque ao menos uma divis\xE3o por idade.", "input[name=div_0]"]);
        const m = int(val("matchMinutes"));
        if (!(m >= 1 && m <= 180)) out.push(["Informe o tempo de cada luta/partida (1 a 180 minutos).", "#wz_minutes"]);
        if (group() === "coletivo" && val("format") === "grupos") {
          const gc = int(val("groupCount")), q = int(val("qualifiers"));
          if (!(gc >= 2 && gc <= 8)) out.push(["N\xFAmero de grupos: de 2 a 8.", "#wz_gc"]);
          if (!(q >= 1 && q <= 4) || (gc * q & gc * q - 1) !== 0) out.push(["Grupos \xD7 classificados precisa dar 2, 4, 8 ou 16 times no mata-mata.", "#wz_q"]);
        }
        return out;
      }
      if (s === "apresentacoes") {
        const rows = showRows();
        const i = rows.findIndex((r) => !r.title);
        if (i >= 0) return [[`D\xEA um t\xEDtulo para a apresenta\xE7\xE3o ${i + 1} ou remova ela.`, `.show-row:nth-of-type(${i + 1}) input`]];
      }
      return [];
    }
    function showProblems(list3) {
      $("#wz-error").innerHTML = list3.length ? html`<div class="flash error"><strong>Antes de continuar:</strong><ul>${list3.map(([m]) => html`<li>${m}</li>`)}</ul></div>`.s : "";
      if (list3.length) form.querySelector(list3[0][1])?.focus();
    }
    function goStep(s) {
      step = s;
      showProblems([]);
      if (s === "categorias") setupCategories();
      if (s === "revisao") renderReview();
      if (s === "publicacao") {
        const sport = ["luta", "coletivo"].includes(group());
        $("#wz-reg").hidden = !sport;
        $("#wz-libras-auto").hidden = !sport;
      }
      renderSteps();
      form.querySelector(`section[data-step="${s}"] h2`).focus();
      window.scrollTo({ top: 0 });
    }
    function next() {
      const p = problems(step);
      if (p.length) return showProblems(p);
      const list3 = steps();
      goStep(list3[list3.indexOf(step) + 1]);
    }
    function renderReview() {
      const t = type(), { cats, missing } = plannedCategories(), rows = showRows();
      const dates = val("endsOn") && val("endsOn") !== val("startsOn") ? `${C_date(val("startsOn"))} a ${C_date(val("endsOn"))}` : C_date(val("startsOn"));
      $("#wz-review").innerHTML = html`<dl class="review">
      <dt>Tipo</dt><dd>${TYPES[t].title}${checked("withShows") && group() !== "arte" ? " + apresenta\xE7\xF5es culturais" : ""}</dd>
      <dt>Nome</dt><dd>${val("name")}</dd><dt>Data</dt><dd>${dates}${val("timeLabel") ? ` \xB7 ${val("timeLabel")}` : ""}</dd>
      ${val("location") ? html`<dt>Local</dt><dd>${val("location")}</dd>` : ""}
      <dt>Situação</dt><dd>${checked("published") ? "Publicado no site" : "Rascunho (s\xF3 a coordena\xE7\xE3o v\xEA)"}${["luta", "coletivo"].includes(group()) ? checked("registrationsOpen") ? " \xB7 inscri\xE7\xF5es abertas" : " \xB7 inscri\xE7\xF5es fechadas" : ""}</dd></dl>
      ${cats.length ? html`<h3>${cats.length > 1 ? `${cats.length} categorias que ser\xE3o criadas` : "1 categoria que ser\xE1 criada"}</h3>
        ${missing.length ? html`<p class="flash warning">Sem tabela de peso (categoria única, sem peso): ${missing.join(", ")}.</p>` : ""}
        <details ${raw(cats.length <= 12 ? "open" : "")}><summary>Ver a lista</summary><ul class="cat-list">${cats.map((c) => html`<li>${c.name}</li>`)}</ul></details>
        <p class="hint">Tempo por ${group() === "luta" ? "luta" : "partida"}: ${val("matchMinutes")} min${group() === "coletivo" ? ` \xB7 ${val("format") === "grupos" ? `${val("groupCount")} grupos, ${val("qualifiers")} classificados por grupo` : "eliminat\xF3ria simples"}` : " \xB7 eliminat\xF3ria simples"}</p>` : ""}
      ${steps().includes("apresentacoes") ? html`<h3>Apresentações</h3>${rows.length ? html`<ul>${rows.map((r) => html`<li>${r.title} — ${SLOTS[r.slot]}${r.time ? ` \xE0s ${r.time}` : ""} (${r.modality === "musica" ? "m\xFAsica" : "dan\xE7a"})</li>`)}</ul>` : html`<p class="muted">Nenhuma por enquanto.</p>`}` : ""}`.s;
    }
    const C_date = (iso) => iso ? iso.split("-").reverse().join("/") : "";
    form.addEventListener("change", (e) => {
      if ($("#wz-error").innerHTML && !problems(step).length) showProblems([]);
      if (e.target.name === "type") {
        $("#wz-shows").hidden = !["luta", "coletivo"].includes(group());
        const name = $("#wz_name");
        if (!name.value || name.dataset.auto) {
          name.value = `${TYPES[type()].title} ${(/* @__PURE__ */ new Date()).getFullYear()}`;
          name.dataset.auto = "1";
        }
        renderSteps();
      }
      if (e.target.name === "withShows") renderSteps();
      if (e.target.id === "wz_name") delete e.target.dataset.auto;
      if (e.target.id === "wz_minutes") e.target.dataset.touched = "1";
      if (e.target.id === "wz_format") $("#wz-groups").hidden = e.target.value !== "grupos";
      if (step === "categorias" && (e.target.name?.startsWith("div_") || e.target.id === "wz_gender")) renderWeights();
    });
    $("#wz-all").addEventListener("click", () => {
      form.querySelectorAll("[name^=div_]").forEach((c) => {
        c.checked = true;
      });
      renderWeights();
    });
    $("#wz-reload").addEventListener("click", async () => {
      invalidateSettings();
      const s = await getSettings();
      settings.general = s.general;
      settings.scoring = s.scoring;
      renderRules();
      renderWeights();
      flash("Regras e tabela de peso atualizadas.", "success");
    });
    $("#wz-add-show").addEventListener("click", addShow);
    $("#wz-next").addEventListener("click", next);
    $("#wz-back").addEventListener("click", () => {
      const l = steps();
      goStep(l[Math.max(0, l.indexOf(step) - 1)]);
    });
    bindForm(root, "#wizard", async (d) => {
      if (step !== "revisao") return next();
      for (const s of steps()) {
        const p = problems(s);
        if (p.length) {
          goStep(s);
          return showProblems(p);
        }
      }
      const t = type(), g = group(), withShows = g === "arte" || checked("withShows");
      const kind = g === "arte" ? "festival" : g === "institucional" ? "institucional" : withShows ? "misto" : "campeonato";
      const startsOn = d.startsOn;
      const image = await handleImage(form, d, null);
      const evId = await db.add("events", {
        name: str(d.name, 150),
        kind,
        modality: MOD[t] ? t : null,
        startsOn,
        endsOn: d.endsOn || startsOn,
        timeLabel: str(d.timeLabel, 30),
        location: str(d.location, 200),
        description: str(d.description, 3e3),
        librasVideoUrl: str(d.librasVideoUrl, 300),
        published: !!d.published,
        registrationsOpen: ["luta", "coletivo"].includes(g) ? !!d.registrationsOpen : false,
        ...image
      });
      const { cats } = plannedCategories();
      const common = {
        eventId: evId,
        format: g === "coletivo" && d.format === "grupos" ? "grupos" : "eliminatoria",
        groupCount: int(d.groupCount, 2),
        qualifiers: int(d.qualifiers, 2),
        matchMinutes: int(d.matchMinutes, 10),
        librasAuto: !!d.librasAuto,
        librasVideoUrl: "",
        status: "inscricoes"
      };
      for (const c of cats) await db.add("categories", { ...common, ...c });
      let order = { abertura: 0, intervalo: 0, encerramento: 0 };
      for (const r of withShows ? showRows() : []) {
        await db.add("performances", {
          eventId: evId,
          title: r.title,
          modality: r.modality === "musica" ? "musica" : "danca",
          slot: SLOTS[r.slot] ? r.slot : "intervalo",
          order: ++order[r.slot],
          durationMin: r.durationMin,
          scheduledAt: r.time ? `${startsOn}T${r.time}` : null,
          soundtrack: "",
          equipment: "",
          notes: "",
          teacherId: null,
          accLibras: r.accLibras,
          accAudiodesc: r.accAudiodesc,
          accSeating: r.accSeating,
          accNotes: "",
          librasVideoUrl: "",
          members: []
        });
      }
      flash(`Evento criado${cats.length ? ` com ${cats.length} categoria${cats.length > 1 ? "s" : ""}` : ""}.`, "success");
      go(`/painel/eventos/${evId}`);
    });
    renderSteps();
  }

  // js/app.js
  var firstRender = true;
  var rendering = Promise.resolve();
  var homeFor = () => !session.user ? "/" : session.isAdmin ? "/painel" : "/conta";
  async function render() {
    let { path, query } = currentPath();
    if (session.user) {
      if (path === "/") path = homeFor();
      else if (path === "/entrar" || path === "/cadastro") {
        flash("Voc\xEA j\xE1 est\xE1 conectado(a). Esta \xE9 a sua p\xE1gina inicial.", "info");
        go(homeFor());
        return;
      }
    }
    const settings = await getSettings();
    const projects = (await db.list("projects", [["published", "==", true]]).catch(() => [])).sort((a, b) => (a.order || 0) - (b.order || 0));
    const unread = session.user && !session.isAdmin && session.profile ? await unreadCount(session.profile).catch(() => 0) : 0;
    renderHeader(settings.site, projects, path, { unread });
    renderFooter(settings.site, projects);
    const r = resolve(path);
    let view;
    try {
      if (!r) view = notFound();
      else if (r.opts.auth && !session.user) {
        go(`/entrar?next=${encodeURIComponent(path)}`);
        return;
      } else if (r.opts.auth === "admin" && !session.isAdmin) view = denied();
      else if (r.opts.auth === "staff" && !isStaff()) view = denied();
      else view = await r.handler({ params: r.params, query, settings });
    } catch (err) {
      console.error(err);
      view = { title: "Erro", body: html`<h1>Não foi possível carregar a página</h1><p class="lead">${err.message || "Tente novamente."}</p><p><a class="btn" href="#/">Voltar ao início</a></p>` };
    }
    if (!view) return;
    const pageEl = document.getElementById("page"), heroEl = document.getElementById("hero");
    heroEl.innerHTML = view.hero ? String(view.hero) : "";
    pageEl.innerHTML = String(view.body || "");
    document.title = `${view.title || settings.site.tagline} \xB7 ${settings.site.name}`;
    renderFlashes();
    closeMenus();
    view.after?.(pageEl);
    bindLibras(pageEl);
    hydrateImages(document.getElementById("conteudo"));
    if (!firstRender) {
      window.scrollTo(0, 0);
      const h1 = document.querySelector("#conteudo h1");
      if (h1) {
        h1.setAttribute("tabindex", "-1");
        h1.focus({ preventScroll: true });
      }
      announce(`P\xE1gina: ${view.title || ""}`);
    }
    firstRender = false;
  }
  var queueRender = () => {
    rendering = rendering.then(render).catch(console.error);
    return rendering;
  };
  async function main() {
    initA11yBar();
    await initData();
    await refreshSession();
    let lastUid = session.user?.uid ?? null;
    auth.onChange(async (u) => {
      if ((u?.uid ?? null) === lastUid) return;
      lastUid = u?.uid ?? null;
      if (authFlow.active) return;
      await refreshSession();
      queueRender();
    });
    document.addEventListener("click", async (e) => {
      if (e.target.closest("[data-action=logout]")) {
        authFlow.active = true;
        try {
          await auth.signOut();
          await refreshSession();
        } finally {
          authFlow.active = false;
        }
        flash("Voc\xEA saiu da sua conta.", "info");
        go("/");
      }
    });
    window.addEventListener("hashchange", queueRender);
    queueRender();
  }
  main().catch((err) => {
    console.error(err);
    document.getElementById("page").innerHTML = `<h1>O site n\xE3o p\xF4de ser iniciado</h1><p>${String(err.message || err).replace(/</g, "&lt;")}</p>
    <p>Abra o site pelo Live Server do VS Code ou pelo arquivo Iniciar (veja o README).</p>`;
  });
})();
