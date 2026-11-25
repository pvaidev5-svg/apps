// Ajudantes das páginas: formulários, página não encontrada.

import { flash, renderFlashes, formData, html } from "../core/ui.js";

// Liga um formulário: impede o envio padrão, bloqueia o botão enquanto salva,
// mostra o erro de forma acessível. O botão clicado vai em data.action.
export function bindForm(root, selector, handler) {
  root.querySelectorAll(selector).forEach((form) => {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      const data = formData(form);
      if (e.submitter?.name) data[e.submitter.name] = e.submitter.value;
      const buttons = [...form.querySelectorAll("button[type=submit], button:not([type])")];
      buttons.forEach((b) => { b.disabled = true; });
      form.setAttribute("aria-busy", "true");
      try {
        await handler(data, form, e);
      } catch (err) {
        console.warn(err);
        flash(err.message || "Não foi possível concluir. Tente novamente.", "error");
        renderFlashes();
        document.getElementById("flashes")?.scrollIntoView({ block: "center" });
      } finally {
        buttons.forEach((b) => { b.disabled = false; });
        form.removeAttribute("aria-busy");
      }
    });
  });
}

export function notFound() {
  return { title: "Página não encontrada", body: html`<h1>Página não encontrada</h1><p class="lead">O endereço não existe ou o conteúdo não está publicado.</p>
    <p><a class="btn" href="#/">Voltar ao início</a></p>` };
}

export function denied() {
  return { title: "Acesso negado", body: html`<h1>Acesso negado</h1><p class="lead">Sua conta não tem permissão para esta página.</p><p><a class="btn" href="#/">Voltar ao início</a></p>` };
}

export const confirmText = (form, word = "EXCLUIR") => (form.querySelector("[name=confirm]")?.value || "").trim() === word;
