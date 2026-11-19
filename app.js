const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];

const CATEGORIES = [
  "Música",
  "Dança",
  "Basquetebol",
  "Futebol",
  "Futsal",
  "Voleibol",
  "Jiu-Jitsu",
  "Taekwondo"
];

const ICONS = {
  "Música":"🎵",
  "Dança":"💃",
  "Basquetebol":"🏀",
  "Futebol":"⚽",
  "Futsal":"⚽",
  "Voleibol":"🏐",
  "Jiu-Jitsu":"🥋",
  "Taekwondo":"🥋"
};

const STORE = "oasis-connect-v1";

const DEMO_USERS = [
  {
    id:"admin-demo",
    name:"Administrador",
    email:"admin@oasis.com",
    password:"OasisAdmin2026!",
    phone:"",
    category:"",
    role:"admin"
  },
  {
    id:"support-demo",
    name:"Equipe de suporte",
    email:"suporte@oasis.com",
    password:"OasisSuporte2026!",
    phone:"",
    category:"",
    role:"support"
  }
];

let state = loadState();
let currentUser = null;
let activeFilter = "Todas";
let adminTab = "participants";

/* ARMAZENAMENTO */

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORE));
    if(saved) return saved;
  } catch(e) {}

  return {
    users:[],
    competitions:[],
    events:[],
    notifications:[],
    history:[]
  };
}

function save() {
  localStorage.setItem(STORE,JSON.stringify(state));
  renderAll();
}

/* SEGURANÇA DE EXIBIÇÃO */

function escapeHTML(v="") {
  return String(v).replace(/[&<>"']/g,c=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#39;"
  }[c]));
}

/* MENSAGENS */

function toast(msg) {
  const el = $("#toast");

  el.textContent = msg;
  el.classList.add("show");

  clearTimeout(toast.t);

  toast.t = setTimeout(
    ()=>el.classList.remove("show"),
    2800
  );
}

/* NAVEGAÇÃO */

function showView(name) {

  $$(".view").forEach(v=>{
    v.classList.toggle(
      "active",
      v.id==="view-"+name
    );
  });

  $$(".nav-link").forEach(b=>{
    b.classList.toggle(
      "active",
      b.dataset.view===name
    );
  });

  $("#notificationPanel").classList.add("hidden");

  $("#mobileMenu").textContent="☰";
  $(".nav-links").classList.remove("open");

  if(name==="admin") renderAdmin();

  window.scrollTo({
    top:0,
    behavior:"smooth"
  });
}

/* MODAIS */

function modal(content) {
  $("#modalContent").innerHTML=content;
  $("#modalBackdrop").classList.remove("hidden");
}

function closeModal() {
  $("#modalBackdrop").classList.add("hidden");
}

/* PERMISSÕES */

function isStaff() {
  return currentUser &&
    ["admin","support"].includes(currentUser.role);
}

function isAdmin() {
  return currentUser?.role==="admin";
}

/* NOTIFICAÇÕES */

function addNotification(title,message,audience="Todos") {

  state.notifications.unshift({
    id:crypto.randomUUID(),
    title,
    message,
    audience,
    date:new Date().toISOString(),
    read:false
  });

}

function publishNotice(title,message,audience="Todos") {

  addNotification(title,message,audience);

  save();

  if(
    "Notification" in window &&
    Notification.permission==="granted"
  ) {
    new Notification(title,{
      body:message
    });
  }

}

/* CABEÇALHO */

function updateHeader() {

  const logged=!!currentUser;

  $("#loginOpen").classList.toggle("hidden",logged);
  $("#registerOpen").classList.toggle("hidden",logged);
  $("#userMenu").classList.toggle("hidden",!logged);

  if(logged) {

    $("#userName").textContent=currentUser.name;

    $("#userAvatar").textContent=
      currentUser.name.trim()[0].toUpperCase();

  }

  $("#notificationDot").style.display=
    state.notifications.some(n=>!n.read)
    ?"block":"none";

  if(isStaff()) {

    $("#newCompetition").classList.remove("hidden");
    $("#newEvent").classList.remove("hidden");

  } else {

    $("#newCompetition").classList.add("hidden");
    $("#newEvent").classList.add("hidden");

  }

}

/* ESTATÍSTICAS */

function renderStats() {

  $("#statUsers").textContent=state.users.length;

  $("#statCompetitions").textContent=
    state.competitions.length;

  $("#statEvents").textContent=state.events.length;

}

/* COMPETIÇÕES */

function renderCompetitions() {

  const list=state.competitions.filter(c=>
    activeFilter==="Todas" ||
    c.category===activeFilter
  );

  $("#competitionGrid").innerHTML=list.map(c=>`

    <article class="competition-card">

      <div class="competition-top">

        <span class="category-icon">
          ${ICONS[c.category]||"🏆"}
        </span>

        <span class="status ${
          c.status==="Finalizada"?"done":""
        }">
          ${escapeHTML(c.status||"Inscrições abertas")}
        </span>

      </div>

      <h3>${escapeHTML(c.title)}</h3>

      <p>
        ${escapeHTML(
          c.description ||
          "Competição da Associação Oásis de Pompeia."
        )}
      </p>

      <div class="card-meta">
        <span>◉ ${escapeHTML(c.category)}</span>
        <span>♙ ${c.participants.length} participantes</span>
        <span>▦ ${escapeHTML(c.date||"Data a definir")}</span>
      </div>

      <div class="card-actions">

        <button class="text-link"
          data-bracket="${c.id}">
          Ver chaveamento →
        </button>

        ${isStaff()?`
          <button class="text-link"
            data-edit-bracket="${c.id}">
            Gerenciar
          </button>
        `:""}

      </div>

    </article>

  `).join("");

  $("#competitionEmpty").classList.toggle(
    "hidden",
    list.length>0
  );

  $("#bracketSelect").innerHTML=
    '<option value="">Selecione uma competição</option>'+
    state.competitions.map(c=>`
      <option value="${c.id}">
        ${escapeHTML(c.title)} — ${escapeHTML(c.category)}
      </option>
    `).join("");

}

/* CHAVEAMENTOS */

function renderBracket(id) {

  const c=state.competitions.find(x=>x.id===id);

  if(!c) {

    $("#bracketDisplay").innerHTML=`
      <p class="muted">
        Selecione uma competição para visualizar seu chaveamento.
      </p>
    `;

    return;
  }

  const players=c.participants;

  let matches=[];

  for(let i=0;i<players.length;i+=2) {

    matches.push({
      a:players[i],
      b:players[i+1]||null,
      winner:c.winners?.[Math.floor(i/2)]||null
    });

  }

  $("#bracketDisplay").innerHTML=`

    <div class="bracket-rounds">

      <div class="bracket-round">

        <h4>Rodada inicial</h4>

        ${
          matches.length
          ?matches.map(m=>`

            <div class="match">

              <div class="match-player ${
                m.winner===m.a?"winner":""
              }">

                <span>
                  ${escapeHTML(m.a||"A definir")}
                </span>

                <small>
                  ${m.winner===m.a?"Vencedor":""}
                </small>

              </div>

              <div class="match-player ${
                m.winner===m.b?"winner":""
              }">

                <span>
                  ${escapeHTML(
                    m.b||"Aguardando adversário"
                  )}
                </span>

                <small>
                  ${m.winner===m.b?"Vencedor":""}
                </small>

              </div>

            </div>

          `).join("")
          :'<p class="muted">Ainda não há participantes inscritos.</p>'
        }

      </div>

      <div class="bracket-round">

        <h4>Final</h4>

        <div class="match">

          <div class="match-player">
            <span>Vencedor da disputa 1</span>
          </div>

          <div class="match-player">
            <span>Vencedor da disputa 2</span>
          </div>

        </div>

      </div>

      <div class="bracket-round">

        <h4>Campeão</h4>

        <div class="match">

          <div class="match-player winner">

            <span>
              ${escapeHTML(c.champion||"A definir")}
            </span>

            <small>🏆</small>

          </div>

        </div>

      </div>

    </div>

  `;

}

/* RESULTADOS E HISTÓRICO */

function renderResults() {

  const done=state.competitions.filter(c=>
    c.status==="Finalizada" || c.champion
  );

  $("#resultsList").innerHTML=done.map(c=>`

    <article class="result-card">

      <div class="result-title">

        <strong>${escapeHTML(c.title)}</strong>

        <small>
          ${escapeHTML(c.category)}
          ·
          ${escapeHTML(c.date||"Data não informada")}
        </small>

      </div>

      <div class="result-score">
        🏆 ${escapeHTML(c.champion||"Resultado publicado")}
      </div>

    </article>

  `).join("");

  $("#resultsEmpty").classList.toggle(
    "hidden",
    done.length>0
  );

  $("#historyList").innerHTML=

    state.history.length

    ?state.history.map(h=>`

      <div class="history-item">

        <span>

          <strong>${escapeHTML(h.title)}</strong>

          <br>

          <small>
            ${escapeHTML(h.category)}
            ·
            ${escapeHTML(h.date)}
          </small>

        </span>

        <span>
          ${escapeHTML(h.champion||"Concluída")}
        </span>

      </div>

    `).join("")

    :'<p class="muted">O histórico será exibido aqui após a conclusão das competições.</p>';

}

/* EVENTOS */

function renderEvents() {

  const events=state.events.slice().sort(
    (a,b)=>b.createdAt.localeCompare(a.createdAt)
  );

  $("#eventsGrid").innerHTML=events.map(e=>`

    <article class="event-card">

      <span class="event-date">
        ${escapeHTML(e.date||"DATA A DEFINIR")}
      </span>

      <h3>${escapeHTML(e.title)}</h3>

      <p>${escapeHTML(e.message)}</p>

      <div class="event-audience">
        DESTINADO A:
        ${escapeHTML(e.audience||"Todos")}
      </div>

    </article>

  `).join("");

  $("#eventsEmpty").classList.toggle(
    "hidden",
    events.length>0
  );

}

/* CENTRAL DE NOTIFICAÇÕES */

function renderNotifications() {

  $("#notificationList").innerHTML=

    state.notifications.length

    ?state.notifications.map(n=>`

      <div class="notification-item ${
        n.read?"":"unread"
      }">

        <strong>${escapeHTML(n.title)}</strong>

        <p>${escapeHTML(n.message)}</p>

        <small>
          ${new Date(n.date).toLocaleString("pt-BR")}
        </small>

      </div>

    `).join("")

    :'<p class="muted">Você ainda não tem notificações.</p>';

}

/* PAINEL ADMINISTRATIVO */

function renderAdmin() {

  if(!isStaff()) {
    showView("home");
    return;
  }

  const root=$("#adminContent");

  if(adminTab==="participants") {

    root.innerHTML=`

      <div class="admin-table-wrap">

        <table class="admin-table">

          <thead>
            <tr>
              <th>NOME</th>
              <th>E-MAIL</th>
              <th>TELEFONE</th>
              <th>MODALIDADE</th>
              <th>CADASTRO</th>
            </tr>
          </thead>

          <tbody>

            ${
              state.users.length

              ?state.users.map(u=>`

                <tr>

                  <td>${escapeHTML(u.name)}</td>

                  <td>${escapeHTML(u.email)}</td>

                  <td>${escapeHTML(u.phone||"—")}</td>

                  <td>${escapeHTML(u.category||"Equipe")}</td>

                  <td>
                    ${escapeHTML(
                      u.role==="admin"?"Admin":
                      u.role==="support"?"Suporte":
                      "Participante"
                    )}
                  </td>

                </tr>

              `).join("")

              :'<tr><td colspan="5">Nenhum participante cadastrado.</td></tr>'
            }

          </tbody>

        </table>

      </div>

    `;

  }

  else if(adminTab==="competitions") {

    root.innerHTML=`

      <div class="admin-table-wrap">

        <table class="admin-table">

          <thead>
            <tr>
              <th>COMPETIÇÃO</th>
              <th>MODALIDADE</th>
              <th>PARTICIPANTES</th>
              <th>STATUS</th>
              <th>AÇÃO</th>
            </tr>
          </thead>

          <tbody>

            ${
              state.competitions.map(c=>`

                <tr>

                  <td>${escapeHTML(c.title)}</td>

                  <td>${escapeHTML(c.category)}</td>

                  <td>${c.participants.length}</td>

                  <td>${escapeHTML(c.status)}</td>

                  <td>
                    <button class="text-button"
                      data-edit-bracket="${c.id}">
                      Atualizar resultado
                    </button>
                  </td>

                </tr>

              `).join("")

              ||'<tr><td colspan="5">Nenhuma competição cadastrada.</td></tr>'
            }

          </tbody>

        </table>

      </div>

    `;

  }

  else {

    root.innerHTML=`

      <div class="admin-table-wrap">

        <table class="admin-table">

          <thead>
            <tr>
              <th>AVISO</th>
              <th>DATA</th>
              <th>PÚBLICO</th>
            </tr>
          </thead>

          <tbody>

            ${
              state.events.map(e=>`

                <tr>
                  <td>${escapeHTML(e.title)}</td>
                  <td>${escapeHTML(e.date)}</td>
                  <td>${escapeHTML(e.audience)}</td>
                </tr>

              `).join("")

              ||'<tr><td colspan="3">Nenhum aviso publicado.</td></tr>'
            }

          </tbody>

        </table>

      </div>

    `;

  }

}

/* ATUALIZAR TODAS AS ÁREAS */

function renderAll() {

  updateHeader();
  renderStats();
  renderCompetitions();
  renderResults();
  renderEvents();
  renderNotifications();

  if($("#view-admin").classList.contains("active")) {
    renderAdmin();
  }

}

/* LOGIN */

function showLogin() {

  modal(`

    <span class="eyebrow">BEM-VINDO DE VOLTA</span>

    <h2 id="modalTitle">Entrar no Oásis</h2>

    <p class="modal-intro">
      Acesse sua área de participante ou equipe.
    </p>

    <form id="loginForm">

      <div class="field">
        <label>E-MAIL</label>
        <input
          name="email"
          type="email"
          required
          placeholder="seu@email.com">
      </div>

      <div class="field">
        <label>SENHA</label>
        <input
          name="password"
          type="password"
          required
          placeholder="Sua senha">
      </div>

      <div class="role-hint">

        Acesso de demonstração da equipe:

        <br>

        <b>Admin:</b>
        admin@oasis.com / OasisAdmin2026!

        <br>

        <b>Suporte:</b>
        suporte@oasis.com / OasisSuporte2026!

      </div>

      <button class="btn btn-primary form-submit">
        Entrar na minha conta
      </button>

    </form>

    <div class="form-foot">
      Ainda não tem cadastro?
      <button id="switchRegister">Criar conta</button>
    </div>

  `);

  $("#loginForm").addEventListener("submit",login);
  $("#switchRegister").onclick=showRegister;

}

function login(e) {

  e.preventDefault();

  const data=new FormData(e.target);

  const email=String(data.get("email"))
    .trim()
    .toLowerCase();

  const password=data.get("password");

  const user=[...DEMO_USERS,...state.users].find(
    u=>u.email.toLowerCase()===email &&
       u.password===password
  );

  if(!user) {
    toast("E-mail ou senha incorretos.");
    return;
  }

  currentUser=user;

  closeModal();
  renderAll();

  toast("Login realizado com sucesso!");

  if(isStaff()) {
    showView("admin");
  }

}

/* CADASTRO */

function showRegister() {

  modal(`

    <span class="eyebrow">FAÇA PARTE</span>

    <h2 id="modalTitle">Criar cadastro</h2>

    <p class="modal-intro">
      Preencha seus dados para participar das atividades.
    </p>

    <form id="registerForm">

      <div class="form-grid">

        <div class="field">
          <label>NOME COMPLETO</label>
          <input
            name="name"
            required
            minlength="3"
            placeholder="Seu nome">
        </div>

        <div class="field">
          <label>TELEFONE</label>
          <input
            name="phone"
            type="tel"
            required
            placeholder="(14) 99999-9999">
        </div>

        <div class="field full">
          <label>E-MAIL</label>
          <input
            name="email"
            type="email"
            required
            placeholder="seu@email.com">
        </div>

        <div class="field full">
          <label>SENHA</label>
          <input
            name="password"
            type="password"
            required
            minlength="8"
            placeholder="Mínimo de 8 caracteres">
        </div>

        <div class="field full">

          <label>ÁREA / MODALIDADE</label>

          <select name="category" required>

            <option value="">
              Selecione sua modalidade
            </option>

            ${CATEGORIES.map(c=>`
              <option>${c}</option>
            `).join("")}

          </select>

        </div>

      </div>

      <button class="btn btn-primary form-submit">
        Finalizar cadastro
      </button>

    </form>

    <div class="form-foot">
      Já tem uma conta?
      <button id="switchLogin">Entrar</button>
    </div>

  `);

  $("#registerForm").addEventListener("submit",register);
  $("#switchLogin").onclick=showLogin;

}

function register(e) {

  e.preventDefault();

  const d=Object.fromEntries(
    new FormData(e.target)
  );

  if(
    state.users.some(
      u=>u.email.toLowerCase()===d.email.toLowerCase()
    ) ||
    DEMO_USERS.some(
      u=>u.email===d.email.toLowerCase()
    )
  ) {

    toast("Este e-mail já está cadastrado.");
    return;

  }

  state.users.push({

    ...d,

    id:crypto.randomUUID(),

    role:"participant",

    createdAt:new Date().toISOString()

  });

  currentUser=state.users[state.users.length-1];

  addNotification(
    "Cadastro realizado",
    "Seu cadastro no Oásis Connect foi concluído.",
    currentUser.email
  );

  save();

  closeModal();

  toast("Cadastro realizado! Bem-vindo ao Oásis.");

}

/* NOVA COMPETIÇÃO */

function showNewCompetition() {

  if(!isStaff()) return;

  modal(`

    <span class="eyebrow">GESTÃO DE COMPETIÇÕES</span>

    <h2 id="modalTitle">Nova competição</h2>

    <p class="modal-intro">
      Crie uma competição e associe os participantes já cadastrados na modalidade.
    </p>

    <form id="competitionForm">

      <div class="field">
        <label>NOME DA COMPETIÇÃO</label>
        <input
          name="title"
          required
          placeholder="Ex.: Torneio de Outono">
      </div>

      <div class="form-grid">

        <div class="field">
          <label>MODALIDADE</label>
          <select name="category" required>
            ${CATEGORIES.map(c=>`
              <option>${c}</option>
            `).join("")}
          </select>
        </div>

        <div class="field">
          <label>DATA</label>
          <input
            name="date"
            placeholder="Ex.: 20/12/2026">
        </div>

      </div>

      <div class="field">
        <label>DESCRIÇÃO</label>
        <textarea
          name="description"
          placeholder="Informações sobre a competição">
        </textarea>
      </div>

      <div class="field">

        <label>PARTICIPANTES</label>

        <select name="participants" multiple size="5">

          ${state.users
            .filter(u=>u.role==="participant")
            .map(u=>`
              <option value="${u.id}">
                ${escapeHTML(u.name)} — ${escapeHTML(u.category)}
              </option>
            `).join("")}

        </select>

        <small class="muted">
          Segure Ctrl (ou Command) para selecionar mais de uma pessoa.
        </small>

      </div>

      <button class="btn btn-primary form-submit">
        Criar competição
      </button>

    </form>

  `);

  $("#competitionForm").addEventListener("submit",e=>{

    e.preventDefault();

    const d=new FormData(e.target);

    const cat=d.get("category");

    const ids=d.getAll("participants");

    const participants=ids.map(
      id=>state.users.find(u=>u.id===id)?.name
    ).filter(Boolean);

    const c={

      id:crypto.randomUUID(),

      title:d.get("title"),

      category:cat,

      date:d.get("date"),

      description:d.get("description"),

      participants,

      status:"Inscrições abertas",

      winners:[],

      createdAt:new Date().toISOString()

    };

    state.competitions.push(c);

    addNotification(
      "Nova competição",
      `${c.title} — inscrições e informações disponíveis.`,
      cat
    );

    save();

    closeModal();

    toast("Competição criada!");

  });

}

/* PUBLICAR AVISO */

function showNewEvent() {

  if(!isStaff()) return;

  modal(`

    <span class="eyebrow">COMUNICAÇÃO</span>

    <h2 id="modalTitle">Publicar aviso</h2>

    <p class="modal-intro">
      Compartilhe uma informação com os participantes.
    </p>

    <form id="eventForm">

      <div class="field">
        <label>TÍTULO DO AVISO</label>
        <input
          name="title"
          required
          placeholder="Ex.: Encontro neste sábado">
      </div>

      <div class="field">
        <label>DATA DO EVENTO</label>
        <input
          name="date"
          placeholder="Ex.: 22/11/2026 às 14h">
      </div>

      <div class="field">
        <label>MENSAGEM</label>
        <textarea
          name="message"
          required
          placeholder="Escreva os detalhes do aviso...">
        </textarea>
      </div>

      <div class="field">
        <label>DESTINATÁRIOS</label>

        <select name="audience">

          <option>Todos</option>

          ${CATEGORIES.map(c=>`
            <option>${c}</option>
          `).join("")}

        </select>
      </div>

      <button class="btn btn-primary form-submit">
        Publicar e notificar
      </button>

    </form>

  `);

  $("#eventForm").addEventListener("submit",e=>{

    e.preventDefault();

    const d=Object.fromEntries(
      new FormData(e.target)
    );

    state.events.push({

      ...d,

      id:crypto.randomUUID(),

      createdAt:new Date().toISOString()

    });

    publishNotice(
      d.title,
      d.message,
      d.audience
    );

    closeModal();

    toast("Aviso publicado e notificação criada!");

  });

}

/* ATUALIZAR RESULTADOS */

function manageBracket(id) {

  if(!isStaff()) return;

  const c=state.competitions.find(x=>x.id===id);

  if(!c) return;

  modal(`

    <span class="eyebrow">ATUALIZAÇÃO DE RESULTADO</span>

    <h2 id="modalTitle">
      ${escapeHTML(c.title)}
    </h2>

    <p class="modal-intro">
      Registre o vencedor e, se a competição terminou, publique o campeão.
    </p>

    <form id="winnerForm">

      <div class="field">

        <label>VENCEDOR / CAMPEÃO</label>

        <select name="champion" required>

          <option value="">Selecione</option>

          ${c.participants.map(p=>`
            <option ${c.champion===p?"selected":""}>
              ${escapeHTML(p)}
            </option>
          `).join("")}

        </select>

      </div>

      <div class="field">

        <label>STATUS</label>

        <select name="status">

          <option ${
            c.status!=="Finalizada"?"selected":""
          }>
            Em andamento
          </option>

          <option ${
            c.status==="Finalizada"?"selected":""
          }>
            Finalizada
          </option>

        </select>

      </div>

      <button class="btn btn-primary form-submit">
        Salvar resultado
      </button>

    </form>

  `);

  $("#winnerForm").addEventListener("submit",e=>{

    e.preventDefault();

    const d=Object.fromEntries(
      new FormData(e.target)
    );

    c.champion=d.champion;
    c.status=d.status;

    if(d.status==="Finalizada") {

      state.history.unshift({

        title:c.title,

        category:c.category,

        date:c.date ||
          new Date().toLocaleDateString("pt-BR"),

        champion:c.champion

      });

    }

    addNotification(
      "Resultado atualizado",
      `${c.title}: ${c.champion} — ${c.status}.`,
      c.category
    );

    save();

    closeModal();

    toast("Resultado atualizado.");

  });

}

/* INICIALIZAÇÃO */

function init() {

  if(localStorage.getItem("oasis-theme")==="dark") {
    document.body.classList.add("dark");
  }

  $("#year").textContent=new Date().getFullYear();

  renderAll();

  /* CLIQUES DE NAVEGAÇÃO */

  document.addEventListener("click",e=>{

    const view=e.target.closest("[data-view]");

    if(view) {
      e.preventDefault();
      showView(view.dataset.view);
    }

    const go=e.target.closest("[data-goto]");

    if(go) {
      showView(go.dataset.goto);
    }

    const bracket=e.target.closest("[data-bracket]");

    if(bracket) {

      showView("competitions");

      $("#bracketSelect").value=
        bracket.dataset.bracket;

      renderBracket(bracket.dataset.bracket);

    }

    const edit=e.target.closest("[data-edit-bracket]");

    if(edit) {
      manageBracket(edit.dataset.editBracket);
    }

  });

  /* LOGIN E CADASTRO */

  $("#loginOpen").onclick=showLogin;
  $("#registerOpen").onclick=showRegister;

  $("#heroRegister").onclick=()=>{

    currentUser
      ?showView("competitions")
      :showRegister();

  };

  $("#modalClose").onclick=closeModal;

  $("#modalBackdrop").addEventListener("click",e=>{

    if(e.target.id==="modalBackdrop") {
      closeModal();
    }

  });

  $("#logoutButton").onclick=()=>{

    currentUser=null;

    renderAll();

    showView("home");

    toast("Você saiu da sua conta.");

  };

  /* MODO ESCURO */

  $("#themeToggle").onclick=()=>{

    document.body.classList.toggle("dark");

    localStorage.setItem(
      "oasis-theme",
      document.body.classList.contains("dark")
        ?"dark"
        :"light"
    );

  };

  /* MENU MOBILE */

  $("#mobileMenu").onclick=()=>{

    $(".nav-links").classList.toggle("open");

    $("#mobileMenu").textContent=
      $(".nav-links").classList.contains("open")
        ?"×"
        :"☰";

  };

  /* FILTROS */

  $("#categoryFilters").onclick=e=>{

    const b=e.target.closest("[data-filter]");

    if(!b) return;

    activeFilter=b.dataset.filter;

    $$(".filter-pill").forEach(x=>
      x.classList.toggle("active",x===b)
    );

    renderCompetitions();

  };

  /* CHAVEAMENTO */

  $("#bracketSelect").onchange=e=>
    renderBracket(e.target.value);

  /* ADMINISTRAÇÃO */

  $("#newCompetition").onclick=showNewCompetition;
  $("#newEvent").onclick=showNewEvent;

  /* NOTIFICAÇÕES */

  $("#notificationButton").onclick=()=>{

    $("#notificationPanel").classList.toggle("hidden");

    renderNotifications();

  };

  $("#markRead").onclick=()=>{

    state.notifications.forEach(n=>{
      n.read=true;
    });

    save();

  };

  /* ABAS DO ADMINISTRADOR */

  $$(".admin-tab").forEach(b=>{

    b.onclick=()=>{

      adminTab=b.dataset.admin;

      $$(".admin-tab").forEach(x=>
        x.classList.toggle("active",x===b)
      );

      renderAdmin();

    };

  });

}

init();