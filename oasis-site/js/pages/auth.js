// Cadastro (com consentimento do responsável legal), login e troca de senha.

import { auth, db } from "../data/db.js";
import { route, go } from "../core/router.js";
import { html, raw, flash, str, asList } from "../core/ui.js";
import { session, refreshSession, authFlow } from "../core/session.js";
import { ageToday } from "../logic/calendar.js";
import * as C from "./components.js";
import * as S from "../logic/services.js";
import { bindForm } from "./helpers.js";

export function passwordProblem(pw) {
  if (pw.length < 8) return "A senha precisa ter pelo menos 8 caracteres.";
  if (/^\d+$/.test(pw) || /^[^\d]+$/.test(pw)) return "Use letras e números na senha.";
  return null;
}

route("/entrar", async ({ query }) => ({ title: "Área do aluno", hero: C.pageHero("Já sou inscrito", "Área do aluno",
  "Entre com o e-mail e a senha do cadastro para ver sua agenda, competições, resultados, apresentações e avisos da coordenação."),
  body: html`<div class="two-col"><form class="card" id="login-form" novalidate>
      ${C.field("email", "E-mail", { type: "email", required: true, attrs: 'autocomplete="username"' })}
      ${C.field("password", "Senha", { type: "password", required: true, attrs: 'autocomplete="current-password"' })}
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
      } finally { authFlow.active = false; }
      if (session.profile?.mustChangePassword) {
        flash("Você entrou com uma senha provisória. Crie sua nova senha.", "warning");
        return go("/senha");
      }
      const next = query.next && query.next.startsWith("/") ? query.next : "/";
      flash(session.isAdmin ? "Bem-vindo(a) à coordenação." : `Olá, ${(session.profile?.name || "").split(" ")[0]}! Esta é a sua página inicial.`, "success");
      go(next);
    });
  } }));

route("/cadastro", async () => {
  const mods = S.MODALITIES;
  return { title: "Inscrição", hero: C.pageHero("Participe", "Inscrição",
    "Crie a conta do aluno ou do professor. Para menores de 18 anos, o cadastro deve ser feito junto com o responsável legal, que autoriza o uso dos dados."),
  body: html`<div id="reg-errors"></div><form id="register-form" novalidate>
    <fieldset id="role"><legend>1. Perfil</legend><div class="checks">
      ${Object.entries(S.ROLES).map(([k, v]) => html`<label class="check"><input type="radio" name="role" value="${k}" required> ${v}</label>`)}</div></fieldset>
    <fieldset><legend>2. Dados pessoais</legend>
      ${C.field("name", "Nome completo", { required: true, attrs: 'autocomplete="name"' })}
      <div class="row">${C.field("birth_date", "Data de nascimento", { type: "date", hint: "Alunos: de 4 a 17 anos.", attrs: 'autocomplete="bday"' })}
        ${C.select("gender", "Sexo (para categorias de luta)", { nao_informado: "Prefiro não informar", feminino: "Feminino", masculino: "Masculino" }, "nao_informado")}</div>
      <div class="row">${C.field("phone", "Telefone", { type: "tel", attrs: 'autocomplete="tel"' })}${C.field("affiliation", "Escola, academia ou turma")}</div>
      ${C.field("email", "E-mail de acesso", { type: "email", required: true, hint: "Para crianças, pode ser o e-mail do responsável.", attrs: 'autocomplete="email"' })}
      <div class="row">${C.field("password", "Senha", { type: "password", required: true, hint: "Mínimo de 8 caracteres, com letras e números.", attrs: 'autocomplete="new-password"' })}
        ${C.field("password2", "Repita a senha", { type: "password", required: true, attrs: 'autocomplete="new-password"' })}</div></fieldset>
    <fieldset id="modalities"><legend>3. Modalidades</legend><p class="hint">Escolha um perfil acima para ver as modalidades disponíveis.</p><div class="checks">
      ${mods.map((m) => html`<label class="check" data-kind="${m.kind}" hidden><input type="checkbox" name="modalities" value="${m.code}"> ${m.name}</label>`)}</div></fieldset>
    <fieldset data-role-only="professor" hidden><legend>Professor: inclusão e perfil público</legend>
      <p class="hint">Indique os públicos com deficiência para os quais você tem formação ou experiência de ensino.</p>
      <div class="checks">${Object.entries(S.DISABILITY_TYPES).map(([k, v]) => html`<label class="check"><input type="checkbox" name="aptitude" value="${k}"> ${v}</label>`)}</div>
      ${C.textarea("bio", "Apresentação (formação, experiência)")}${C.checkbox("public_listing", "Aparecer na busca pública de professores", true)}</fieldset>
    <fieldset class="sensitive" data-role-not="professor"><legend>Deficiência (opcional e sigiloso)</legend>
      <p class="hint">Esta informação é um <strong>dado sensível</strong> (LGPD, art. 11). Ela é usada apenas para oferecer modalidades adaptadas, apoio e acessibilidade nos eventos, fica separada do restante do cadastro e só é vista pela coordenação, com registro de cada acesso. Você pode remover a qualquer momento.</p>
      <div class="checks">${Object.entries(S.DISABILITY_TYPES).map(([k, v]) => html`<label class="check"><input type="checkbox" name="disability" value="${k}"> ${v}</label>`)}</div>
      ${C.textarea("disability_notes", "Necessidades de apoio (opcional)", { rows: 2 })}
      <label class="check" id="consent_sensitive"><input type="checkbox" name="consent_sensitive" value="1"> Consentimento específico e destacado: autorizo o tratamento da informação sobre deficiência para as finalidades acima (pelo responsável legal, se menor de 18 anos).</label></fieldset>
    <fieldset><legend>Equipe de apoio dos eventos (opcional)</legend><p class="hint">Alunos — com ou sem deficiência — podem participar da organização:</p>
      <div class="checks">${Object.entries(S.SUPPORT_FUNCTIONS).map(([k, v]) => html`<label class="check"><input type="checkbox" name="support" value="${k}"> ${v}</label>`)}</div></fieldset>
    <fieldset id="guardian-section"><legend>4. Responsável legal (obrigatório para menores de 18 anos)</legend>
      <p class="hint">Conforme a LGPD (art. 14) e o ECA, dados de crianças e adolescentes só são tratados com o consentimento de pelo menos um dos pais ou responsável legal.</p>
      ${C.field("guardian_name", "Nome do responsável")}<div class="row">${C.field("guardian_email", "E-mail do responsável", { type: "email" })}${C.field("guardian_phone", "Telefone do responsável", { type: "tel" })}</div>
      ${C.field("guardian_relation", "Vínculo (mãe, pai, tutor legal...)")}</fieldset>
    <fieldset><legend>5. Consentimentos</legend>
      <label class="check" id="consent_terms"><input type="checkbox" name="consent_terms" value="1" required> Li a <a href="#/privacidade" target="_blank">política de privacidade (abre em nova aba)</a> e autorizo o tratamento dos dados para inscrição e participação nas atividades. Se o aluno for menor, declaro ser seu responsável legal. (Termo versão ${S.TERMS_VERSION})</label>
      ${C.checkbox("consent_image", "Autorizo o uso de imagem (fotos e vídeos de eventos) nos canais da instituição. Opcional; pode ser revogado.", false)}</fieldset>
    <button class="btn" type="submit">Concluir inscrição</button></form>`,
  after(root) {
    const form = root.querySelector("#register-form");
    const sync = () => {
      const role = form.querySelector("input[name=role]:checked")?.value;
      form.querySelectorAll("[data-kind]").forEach((el) => {
        const show = !!role && S.ROLE_KINDS[role].includes(el.dataset.kind);
        el.hidden = !show; if (!show) el.querySelector("input").checked = false;
      });
      form.querySelectorAll("[data-role-only]").forEach((el) => { el.hidden = role !== el.dataset.roleOnly; });
      form.querySelectorAll("[data-role-not]").forEach((el) => { el.hidden = role === el.dataset.roleNot; });
      const age = ageToday(form.birth_date.value);
      root.querySelector("#guardian-section").hidden = age != null && age >= 18;
    };
    form.addEventListener("change", sync);
    sync();
    bindForm(root, "#register-form", async (d) => {
      const errors = {};
      const role = d.role, name = str(d.name, 120), email = str(d.email, 160).toLowerCase(), pw = d.password || "";
      if (!S.ROLES[role]) errors.role = "Escolha um perfil.";
      if (name.length < 3) errors.name = "Informe o nome completo.";
      if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = "Informe um e-mail válido.";
      const pp = passwordProblem(pw); if (pp) errors.password = pp;
      if (pw !== d.password2) errors.password2 = "As senhas não conferem.";
      const age = ageToday(d.birth_date || null);
      if (role === "professor") { if (age != null && age < 18) errors.birth_date = "Professores devem ser maiores de 18 anos."; }
      else if (S.ROLES[role]) {
        if (age == null) errors.birth_date = "Informe a data de nascimento.";
        else if (age < 4 || age > 17) errors.birth_date = "As atividades atendem crianças e adolescentes de 4 a 17 anos.";
      }
      const minor = age != null && age < 18;
      if (minor) {
        if (!str(d.guardian_name)) errors.guardian_name = "Informe o nome do responsável legal.";
        if (!str(d.guardian_email).includes("@")) errors.guardian_email = "Informe o e-mail do responsável.";
        if (!str(d.guardian_relation)) errors.guardian_relation = "Informe o vínculo do responsável.";
      }
      if (!d.consent_terms) errors.consent_terms = "É preciso aceitar a política de privacidade" + (minor ? " (pelo responsável legal)." : ".");
      const allowedKinds = S.ROLE_KINDS[role] || [];
      const mods = asList(d.modalities).filter((m) => S.MOD[m] && allowedKinds.includes(S.MOD[m].kind));
      if (S.ROLES[role] && role !== "professor" && !mods.length) errors.modalities = "Escolha ao menos uma modalidade do seu perfil.";
      const disabilities = role === "professor" ? [] : asList(d.disability).filter((x) => S.DISABILITY_TYPES[x]);
      const notes = role === "professor" ? "" : str(d.disability_notes, 500);
      if ((disabilities.length || notes) && !d.consent_sensitive) errors.consent_sensitive = "Para registrar a deficiência é preciso o consentimento específico.";
      if (Object.keys(errors).length) {
        root.querySelector("#reg-errors").innerHTML = C.errorSummary(errors).s;
        for (const k of Object.keys(errors)) form.querySelector(`[name=${k}]`)?.setAttribute("aria-invalid", "true");
        root.querySelector(".error-summary").focus();
        return;
      }
      authFlow.active = true;
      let user;
      try { user = await auth.signUp(email, pw); } finally { authFlow.active = false; }
      const guardian = minor ? { name: str(d.guardian_name, 120), email: str(d.guardian_email, 160), phone: str(d.guardian_phone, 30), relation: str(d.guardian_relation, 60) } : null;
      const profile = { name, email, role, birthDate: d.birth_date || null, gender: d.gender || "nao_informado", phone: str(d.phone, 30),
        affiliation: str(d.affiliation, 120), guardian, imageConsent: !!d.consent_image, active: true,
        supportInterest: asList(d.support).filter((s) => S.SUPPORT_FUNCTIONS[s]),
        modalities: Object.fromEntries(mods.map((m) => [m, { level: "", weight: null }])) };
      if (role === "professor") {
        profile.bio = str(d.bio, 1000);
        profile.aptitudes = asList(d.aptitude).filter((x) => S.DISABILITY_TYPES[x]);
        profile.publicListing = !!d.public_listing;
      }
      await db.set("users", user.uid, profile);
      const grantedBy = minor ? guardian.name : name, grantedEmail = minor ? guardian.email : email, relation = minor ? guardian.relation : "titular";
      const consent = (kind) => db.add("consents", { userId: user.uid, kind, grantedBy, grantedEmail, relation, termsVersion: S.TERMS_VERSION, grantedAt: new Date().toISOString(), revokedAt: null });
      await consent("cadastro");
      if (d.consent_image) await consent("imagem");
      if (disabilities.length || notes) {
        const consentId = await consent("dados_sensiveis");
        await db.set("sensitive", user.uid, { types: disabilities, notes, consentId });
      }
      if (role === "professor" && profile.publicListing) {
        await db.set("teachersPublic", user.uid, { name, bio: profile.bio, affiliation: profile.affiliation, modalities: mods, aptitudes: profile.aptitudes });
      }
      await refreshSession();
      flash("Cadastro concluído! Esta é a sua página inicial de inscrito.", "success");
      go("/");
    });
  } };
});

route("/senha", async () => ({ title: "Trocar senha", hero: C.pageHero("Conta", "Trocar senha"),
  body: html`${session.profile?.mustChangePassword ? html`<p class="flash warning" role="alert">Você entrou com uma <strong>senha provisória</strong>. Crie agora uma senha nova, só sua. Em "Senha atual", digite a senha provisória.</p>` : ""}
    <form class="card" style="max-width:34rem" id="pw-form">
    ${C.field("current", "Senha atual", { type: "password", required: true, attrs: 'autocomplete="current-password"' })}
    ${C.field("new", "Nova senha", { type: "password", required: true, hint: "Mínimo de 8 caracteres com letras e números (12 para administradores).", attrs: 'autocomplete="new-password"' })}
    ${C.field("new2", "Repita a nova senha", { type: "password", required: true, attrs: 'autocomplete="new-password"' })}
    <button class="btn" type="submit">Salvar nova senha</button></form>`,
  after(root) {
    bindForm(root, "#pw-form", async (d) => {
      const p = passwordProblem(d.new || "");
      if (p) throw new Error(p);
      if (session.isAdmin && d.new.length < 12) throw new Error("Administradores devem usar pelo menos 12 caracteres.");
      if (d.new !== d.new2) throw new Error("As senhas novas não conferem.");
      await auth.changePassword(d.current, d.new);
      if (session.profile?.defaultCredential || session.profile?.mustChangePassword) await db.update("users", session.user.uid, { defaultCredential: false, mustChangePassword: false });
      await refreshSession();
      flash("Senha alterada.", "success");
      go(session.isAdmin ? "/painel" : "/conta");
    });
  } }), { auth: "user" });
