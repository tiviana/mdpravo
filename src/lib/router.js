// Простой роутер: шаблоны вида /services/:dir/:task/ и обработчики (ctx) => void.

export class Router {
  constructor() {
    this.routes = [];
  }

  add(method, pattern, handler, opts = {}) {
    const keys = [];
    const src = pattern
      .split('/')
      .map((seg) => {
        if (seg.startsWith(':')) {
          keys.push(seg.slice(1));
          return '([a-z0-9][a-z0-9-]*)';
        }
        return seg.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      })
      .join('/');
    this.routes.push({ method, pattern, re: new RegExp(`^${src}$`), keys, handler, opts });
    return this;
  }

  get(p, h, o) {
    return this.add('GET', p, h, o);
  }
  post(p, h, o) {
    return this.add('POST', p, h, o);
  }

  /** @returns {{route, params} | {methodNotAllowed: true} | null} */
  match(method, pathname) {
    let pathMatched = false;
    for (const r of this.routes) {
      const m = r.re.exec(pathname);
      if (!m) continue;
      pathMatched = true;
      const ok = r.method === method || (r.method === 'GET' && method === 'HEAD');
      if (!ok) continue;
      const params = {};
      r.keys.forEach((k, i) => (params[k] = m[i + 1]));
      return { route: r, params };
    }
    return pathMatched ? { methodNotAllowed: true } : null;
  }

  /** Все GET-маршруты без параметров — для проверок и sitemap. */
  staticGetPaths() {
    return this.routes.filter((r) => r.method === 'GET' && r.keys.length === 0).map((r) => r.pattern);
  }
}
