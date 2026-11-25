// Libras e leitura em voz alta das explicações.
// - "Ver em Libras": usa o avatar do VLibras (Governo Federal, gratuito), carregado em index.html.
//   Ele precisa de internet. Se não for possível acionar o avatar automaticamente, o site
//   explica como fazer: abrir o VLibras (botão azul com a mão) e clicar no texto.
// - "Ouvir explicação": leitura em voz alta pelo próprio navegador (pt-BR), funciona sem internet.

import { flash, renderFlashes } from "./ui.js";

const wait = (ms) => new Promise((r) => setTimeout(r, ms));

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

export async function showInLibras(text, button) {
  button?.setAttribute("aria-busy", "true");
  try {
    const player = await vlibrasPlayer();
    if (player) { player.translate(text); return; }
    const msg = window.VLibras
      ? "Abra o VLibras (botão azul com a mão, no canto direito da tela) e clique no texto da explicação para ver em Libras."
      : "O avatar VLibras precisa de internet e não carregou. Verifique a conexão ou peça à coordenação o vídeo com intérprete.";
    flash(msg, "info"); renderFlashes();
    document.getElementById("flashes")?.scrollIntoView({ block: "center" });
  } finally { button?.removeAttribute("aria-busy"); }
}

export function speak(text, button) {
  if (!("speechSynthesis" in window)) { flash("Este navegador não lê textos em voz alta.", "info"); renderFlashes(); return; }
  if (speechSynthesis.speaking) { speechSynthesis.cancel(); button.textContent = "Ouvir explicação"; return; }
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "pt-BR"; u.rate = 0.95;
  const voice = speechSynthesis.getVoices().find((v) => v.lang?.toLowerCase().startsWith("pt"));
  if (voice) u.voice = voice;
  u.onend = () => { button.textContent = "Ouvir explicação"; };
  button.textContent = "Parar leitura";
  speechSynthesis.speak(u);
}

// Liga os botões de uma página: [data-libras="id-do-texto"] e [data-speak="id-do-texto"]
export function bindLibras(root) {
  root.querySelectorAll("[data-libras]").forEach((b) => b.addEventListener("click", () => {
    const el = document.getElementById(b.dataset.libras);
    if (el) showInLibras(el.innerText.replace(/\s+/g, " ").trim(), b);
  }));
  root.querySelectorAll("[data-speak]").forEach((b) => b.addEventListener("click", () => {
    const el = document.getElementById(b.dataset.speak);
    if (el) speak(el.innerText, b);
  }));
}
