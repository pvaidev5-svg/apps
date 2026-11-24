// Roteamento por "#/caminho" (funciona em qualquer hospedagem estática, sem configurar servidor).

const routes = [];

export function route(pattern, handler, opts = {}) {
  const keys = [];
  const re = new RegExp("^" + pattern.replace(/:(\w+)/g, (_, k) => { keys.push(k); return "([^/]+)"; }) + "/?$");
  routes.push({ re, keys, handler, opts });
}

export function currentPath() {
  const hash = location.hash.replace(/^#/, "") || "/";
  const [path, qs = ""] = hash.split("?");
  return { path: path || "/", query: Object.fromEntries(new URLSearchParams(qs)) };
}

export function resolve(path) {
  for (const r of routes) {
    const m = path.match(r.re);
    if (m) return { ...r, params: Object.fromEntries(r.keys.map((k, i) => [k, decodeURIComponent(m[i + 1])])) };
  }
  return null;
}

export function go(path) {
  if (location.hash === "#" + path) window.dispatchEvent(new HashChangeEvent("hashchange"));
  else location.hash = path;
}

export const link = (path) => "#" + path;
