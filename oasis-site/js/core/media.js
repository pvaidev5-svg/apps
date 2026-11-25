// Imagens: o navegador reduz a foto (máx. 1400 px, JPEG) e grava junto com os
// dados, na coleção "media". Fotos menores ocupam menos do espaço do navegador.

import { db } from "../data/db.js";

const SIGNATURES = [[[0xff, 0xd8, 0xff], "image/jpeg"], [[0x89, 0x50, 0x4e, 0x47], "image/png"], [[0x47, 0x49, 0x46, 0x38], "image/gif"]];
const MAX_INPUT = 8 * 1024 * 1024;

async function sniff(file) {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  for (const [sig, type] of SIGNATURES) if (sig.every((b, i) => head[i] === b)) return type;
  if (String.fromCharCode(...head.slice(0, 4)) === "RIFF" && String.fromCharCode(...head.slice(8, 12)) === "WEBP") return "image/webp";
  return null;
}

// Valida, reduz e grava. Retorna o id da imagem (ou null se nenhum arquivo).
export async function uploadImage(file, maxSide = 1200) {
  if (!file || !file.size) return null;
  if (file.size > MAX_INPUT) throw new Error("Imagem maior que 8 MB.");
  if (!(await sniff(file))) throw new Error("Envie uma imagem JPG, PNG, WebP ou GIF.");
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
  const canvas = Object.assign(document.createElement("canvas"), {
    width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) });
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  let quality = 0.82, data = canvas.toDataURL("image/jpeg", quality);
  while (data.length > 350_000 && quality > 0.4) { quality -= 0.1; data = canvas.toDataURL("image/jpeg", quality); }
  if (data.length > 450_000) throw new Error("Não foi possível reduzir a imagem o suficiente. Use uma foto menor.");
  return db.add("media", { data, width: canvas.width, height: canvas.height });
}

export const removeImage = async (id) => { if (id && !id.startsWith("img/")) await db.remove("media", id).catch(() => {}); };

// Depois de renderizar a página: carrega as <img data-media="id">.
const cache = new Map();
export async function hydrateImages(root = document) {
  const imgs = [...root.querySelectorAll("img[data-media]")];
  await Promise.all(imgs.map(async (img) => {
    const id = img.dataset.media;
    if (!cache.has(id)) cache.set(id, db.get("media", id).then((m) => m?.data || "").catch(() => ""));
    const src = await cache.get(id);
    if (src) img.src = src; else img.remove();
  }));
}
export const forgetImage = (id) => cache.delete(id);
