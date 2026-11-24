import { DIVISIONS_DEFAULT, WEIGHT_TABLE_DEFAULT } from "../logic/divisions-data.js";
// Conteúdo inicial, baseado no site atual da Associação Oásis de Pompéia.
// É gravado UMA vez (banco vazio) e depois editado em Painel > Site.
// Os textos foram reescritos a partir do site atual: revise com a coordenação.

import { BJJ_DEFAULTS, TKD_DEFAULTS, TEAM_DEFAULTS } from "../logic/scoring.js";

export const SITE_DEFAULTS = {
  name: "Associação Oásis de Pompéia",
  shortName: "OÁSIS",
  tagline: "Desenvolvendo pessoas. Transformando vidas.",
  heroSubtitle: "Arte, esporte, inclusão e oportunidades para crianças e adolescentes construírem um futuro melhor.",
  heroImage: "img/apresentacao-danca-palco.jpg",
  heroImageAlt: "Alunas de dança se apresentando em um palco iluminado, com a banda ao fundo e telões coloridos.",
  photosNote: "",
  aboutShort: "A Oásis é uma associação sem fins lucrativos que desenvolve projetos sociais de artes e esportes em Pompéia, no interior de São Paulo. Oferecemos cursos, capacitações e eventos gratuitos para crianças e adolescentes de 4 a 17 anos.",
  aboutFull: "A Oásis é uma associação sem fins lucrativos que desenvolve projetos sociais de artes e esportes em Pompéia, no interior de São Paulo, com cursos, capacitações e eventos gratuitos.\n\nAtendemos crianças e adolescentes de 4 a 17 anos, buscando o desenvolvimento integral (físico, social, emocional, cognitivo e sensorial) e a prevenção de situações de risco e vulnerabilidade, em um ambiente seguro e acolhedor.\n\nNossos projetos são viabilizados por meio das leis de incentivo à cultura e ao esporte.",
  stats: [
    { value: "1.200+", label: "crianças e adolescentes atendidos por ano" },
    { value: "1987", label: "ano de fundação" },
    { value: "3", label: "projetos ativos" },
    { value: "4 a 17", label: "anos de idade" },
  ],
  commitments: [
    { title: "Arte que desperta", text: "Música e dança para a expressão, a autoestima e a descoberta de talentos." },
    { title: "Esporte que forma", text: "Basquete, futebol, futsal, vôlei e artes marciais como escola de convivência." },
    { title: "Proteção e cuidado", text: "Ambiente seguro, com estrutura adequada e equipe preparada." },
    { title: "Gestão transparente", text: "Prestação de contas pública e relatórios publicados." },
  ],
  history: "15 de março de 1987 — fundação, com o nome de Associação Holiness de Pompéia.\n\n2005 — após a compra do terreno da sede e a atualização do estatuto, passa a se chamar Associação Oásis de Pompéia.\n\n2017 — recebe a qualificação de OSCIP (Organização da Sociedade Civil de Interesse Público).\n\nHoje — mais de 1.200 crianças e adolescentes atendidos por ano em três projetos de artes e esportes.",
  mission: "Desenvolver pessoas por meio da arte e do esporte, oferecendo oportunidades gratuitas a crianças e adolescentes de Pompéia e região.",
  vision: "Ser referência regional em projetos sociais de artes e esportes que transformam vidas.",
  values: "Respeito\nInclusão\nTransparência\nCuidado e proteção\nDisciplina e convivência\nCompromisso com a comunidade",
  transparency: "A Oásis presta contas publicamente de seus projetos e recursos. Aqui ficam os documentos e relatórios: estatuto, balanços, relatórios de atividades e prestações de contas dos projetos incentivados.",
  transparencyLinks: [],
  inclusiveText: "O esporte é um direito de todos. Queremos que cada criança e adolescente possa participar de acordo com as suas necessidades, com acolhimento, adaptação e professores preparados.",
  showAdaptedPublic: false,
  adaptedPendingNote: "As modalidades adaptadas estão em fase de planejamento e serão publicadas somente após confirmação institucional.",
  participeText: "As inscrições são gratuitas. A família cadastra o participante, escolhe a modalidade e acompanha a inscrição pela própria conta.",
  helpDonation: "Doações únicas ou mensais, de pessoas físicas ou empresas.",
  helpPartnership: "Empresas podem patrocinar diretamente ou por meio das leis de incentivo à cultura e ao esporte.",
  helpVolunteer: "Profissionais e pessoas da comunidade podem contribuir com oficinas, eventos e apoio.",
  donationInfo: "Informe aqui os canais oficiais de doação (chave PIX, dados bancários da associação).",
  email: "contato@aop.org.br",
  phone1: "(14) 3535-0855",
  phone2: "(14) 99751-2730",
  address: "Av. João Batista Lima, 1800 — Jardim José Januário, Pompéia/SP",
  hours: "",
  facebook: "https://www.facebook.com/aopompeia",
  instagram: "https://www.instagram.com/oasispompeia",
  youtube: "https://www.youtube.com/@oasispompeia",
  terms: "Ao usar este site e o sistema de inscrições, você concorda em fornecer informações verdadeiras e em usar a conta apenas para acompanhar as atividades do participante.\n\nTexto a ser revisado pelo jurídico da associação.",
  faq: "As atividades são gratuitas?\nSim. Todos os projetos da Oásis são gratuitos para as famílias.\n\nQual é a idade para participar?\nDe 4 a 17 anos.\n\nComo faço a inscrição?\nCrie a conta em Inscreva-se junto com o responsável legal e escolha as modalidades.\n\nPessoas com deficiência podem participar?\nSim. Informe as necessidades no cadastro (de forma sigilosa) para que a equipe prepare o acolhimento.",
};

export const GENERAL_DEFAULTS = {
  ageReference: "ano",          // "ano" | "data_evento"
  conflictMode: "alertar",      // "alertar" | "impedir"
  bufferMin: 0,
  publicNameAbbrev: true,
  ageBands: DIVISIONS_DEFAULT,         // divisões por idade (Pré-Mirim … Juvenil, 4 a 17 anos)
  weightTable: WEIGHT_TABLE_DEFAULT,    // categorias de peso das lutas
};

export const SCORING_DEFAULTS = { bjj: BJJ_DEFAULTS, taekwondo: TKD_DEFAULTS, team: TEAM_DEFAULTS };

const PROJECTS = [
  { id: "artes-em-pompeia", name: "Artes em Pompéia", area: "Cultura", order: 1, modalities: ["musica", "danca"], participants: "429",
    summary: "Aulas gratuitas de música e dança, com apresentações abertas à comunidade.",
    body: "O projeto Artes em Pompéia oferece aulas gratuitas de música e dança para crianças e adolescentes, estimulando a expressão, a autoestima e a descoberta de talentos.\n\nAo longo do ano, os alunos se apresentam em eventos abertos à comunidade, como o Festival de Artes." },
  { id: "educacao-atraves-do-esporte", name: "Educação através do Esporte", area: "Esporte", order: 2, modalities: ["basquete", "futebol", "futsal", "volei"], participants: "671",
    summary: "Basquete, futebol, futsal e vôlei como ferramentas de desenvolvimento integral.",
    body: "O projeto usa o basquete, o futebol, o futsal e o vôlei como ferramentas de desenvolvimento integral: trabalho em equipe, respeito às regras, saúde e convivência." },
  { id: "artes-marciais-construindo-cidadania", name: "Artes Marciais Construindo Cidadania", area: "Esporte", order: 3, modalities: ["jiu_jitsu", "taekwondo"], participants: "141",
    summary: "Jiu-jitsu e taekwondo com foco em disciplina, respeito, autocontrole e convivência.",
    body: "Jiu-jitsu e taekwondo ensinados com foco em disciplina, respeito, autocontrole e convivência, valores que os alunos levam para a escola, a família e a comunidade." },
];

const NEWS = [
  { id: "festival-de-artes", title: "Festival de Artes reúne famílias e alunos", category: "Cultura", date: "2025-11-08",
    summary: "Apresentações de música e dança dos alunos do projeto Artes em Pompéia.",
    body: "Alunos do projeto Artes em Pompéia apresentaram números de música e dança para as famílias e a comunidade." },
  { id: "compreendendo-o-autismo", title: "Compreendendo o autismo: preparação da equipe da Oásis", category: "Capacitação", date: "2025-03-17",
    summary: "Capacitação da equipe sobre o Transtorno do Espectro Autista.",
    body: "A equipe da Oásis participou de uma capacitação sobre o Transtorno do Espectro Autista (TEA), para acolher melhor cada aluno." },
  { id: "treinamento-primeiros-socorros", title: "A importância do treinamento em primeiros socorros", category: "Segurança", date: "2025-03-10",
    summary: "Professores e equipe passaram por treinamento de primeiros socorros.",
    body: "Professores e colaboradores da Oásis passaram por treinamento de primeiros socorros, reforçando a segurança nas atividades." },
];

const EVENTS = [
  { name: "Festival de Artes 2026", kind: "festival", startsOn: "2026-12-05", timeLabel: "19h", location: "Espaço de Artes Lincoln Nishimura",
    description: "Apresentações de música e dança dos alunos do projeto Artes em Pompéia." },
  { name: "Encontro de famílias dos projetos", kind: "institucional", startsOn: "2026-12-12", timeLabel: "9h", location: "Sede da Oásis",
    description: "Roda de conversa com os responsáveis e apresentação do calendário de atividades." },
];

export async function seedInitialContent({ set, add }) {
  await set("settings", "site", SITE_DEFAULTS);
  await set("settings", "general", GENERAL_DEFAULTS);
  await set("settings", "scoring", SCORING_DEFAULTS);
  for (const p of PROJECTS) {
    const { id, ...data } = p;
    await set("projects", id, { ...data, published: true, ...(SEED_IMAGES.projects[id] || { image: "", imageAlt: "" }) });
  }
  for (const [i, name] of ["Jacto", "Unipac", "Mapfre", "Sicoob", "Brudden"].entries()) {
    await add("sponsors", { name, url: "", logo: "", order: i });
  }
  for (const n of NEWS) {
    const { id, ...data } = n;
    await set("news", id, { ...data, published: true, librasVideoUrl: "", ...(SEED_IMAGES.news[id] || { image: "", imageAlt: "" }) });
  }
  for (const e of EVENTS) {
    await add("events", { ...e, endsOn: e.startsOn, published: true, registrationsOpen: false, librasVideoUrl: "", ...(SEED_IMAGES.events[e.name] || { image: "", imageAlt: "" }) });
  }
}

// Fotos do conteúdo inicial (pasta img/). Também aplicadas a instalações que
// já existiam antes das fotos, sem substituir imagens escolhidas no painel.
export const SEED_IMAGES = {
  site: { heroImage: "img/apresentacao-danca-palco.jpg",
    heroImageAlt: "Alunas de dança se apresentando em um palco iluminado, com a banda ao fundo e telões coloridos." },
  projects: {
    "artes-em-pompeia": { image: "img/alunos-musica-flauta.jpg",
      imageAlt: "Crianças e adolescentes tocando flauta transversal e flauta doce em uma apresentação de música." },
    "educacao-atraves-do-esporte": { image: "img/criancas-basquete.jpg",
      imageAlt: "Crianças de uniforme sentadas em roda na quadra, uma delas segurando uma bola de basquete, ouvindo a explicação." },
    "artes-marciais-construindo-cidadania": { image: "img/jiu-jitsu-luta.jpg",
      imageAlt: "Duas atletas de quimono azul em uma luta de jiu-jitsu no tatame, acompanhadas pelo árbitro." },
  },
  news: { "festival-de-artes": { image: "img/criancas-danca.jpg",
    imageAlt: "Foto em preto e branco de crianças pequenas com perucas cacheadas e vestidos de bolinhas dançando no palco." } },
  events: { "Festival de Artes 2026": { image: "img/apresentacao-danca-palco.jpg",
    imageAlt: "Alunas de dança se apresentando em um palco iluminado, com a banda ao fundo." } },
};

export async function applySeedImages({ get, list, update, set }) {
  const site = await get("settings", "site");
  if (site && !site.heroImage) await set("settings", "site", { ...site, ...SEED_IMAGES.site, photosNote: "" }, { merge: true });
  for (const [id, img] of Object.entries(SEED_IMAGES.projects)) {
    const p = await get("projects", id);
    if (p && !p.image) await update("projects", id, img);
  }
  for (const [id, img] of Object.entries(SEED_IMAGES.news)) {
    const n = await get("news", id);
    if (n && !n.image) await update("news", id, img);
  }
  for (const ev of await list("events")) {
    const img = SEED_IMAGES.events[ev.name];
    if (img && !ev.image) await update("events", ev.id, img);
  }
}

// Versão 5: as atividades atendem só de 4 a 17 anos (sem Adulto/Master).
export async function applyDivisions({ get, set }) {
  const g = await get("settings", "general");
  if (!g || !Array.isArray(g.ageBands)) return;
  const { id, ...rest } = g;
  let bands = g.ageBands.every((b) => /^Sub-\d+ \(/.test(b.name)) ? DIVISIONS_DEFAULT : g.ageBands.filter((b) => b.max <= 17);
  if (!bands.length) bands = DIVISIONS_DEFAULT;
  const names = new Set(bands.map((b) => b.name));
  await set("settings", "general", { ...rest, ageBands: bands, ...(Array.isArray(g.weightTable) ? { weightTable: g.weightTable.filter((r) => names.has(r.division)) } : {}) });
}
