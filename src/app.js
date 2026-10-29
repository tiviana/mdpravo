// Сборка приложения: обработчик запросов с безопасностью, сессиями, статикой и маршрутами.
import { config } from './config.js';
import { Ctx, HttpError } from './lib/http.js';
import { log } from './lib/log.js';
import { Router } from './lib/router.js';
import { securityHeaders } from './lib/security.js';
import { loadSession } from './lib/session.js';
import { serveStatic } from './lib/static.js';
import { cases } from './repos/index.js';
import { registerAccount } from './routes/account.js';
import { registerCabinet } from './routes/cabinet.js';
import { registerPayments } from './routes/payments.js';
import { registerPublic } from './routes/public.js';
import { registerSeo } from './routes/seo.js';
import { registerStaff } from './routes/staff.js';
import { errorPage } from './views/public.js';

export function createApp() {
  const router = new Router();
  registerSeo(router);
  registerPublic(router);
  registerAccount(router);
  registerCabinet(router);
  registerStaff(router);
  registerPayments(router);
  const headers = securityHeaders();

  async function handle(req, res) {
    const ctx = new Ctx(req, res);
    ctx.state.securityHeaders = headers;
    try {
      if (ctx.path.length > 400 || ctx.url.search.length > 2000) throw new HttpError(414, 'Слишком длинный адрес');
      if (serveStatic(ctx)) return;
      loadSession(ctx);
      if (ctx.user?.role === 'client') ctx.state.unread = cases.unreadForClient(ctx.user.id);
      let m = router.match(ctx.method, ctx.path);
      // единый вид адресов: со слешем на конце (как канонические URL старого сайта)
      if (!m && !ctx.path.endsWith('/') && !/\.[a-z0-9]{2,12}$/i.test(ctx.path)) {
        const withSlash = ctx.path + '/';
        if (router.match('GET', withSlash) && (ctx.method === 'GET' || ctx.method === 'HEAD')) {
          return ctx.redirect(withSlash + ctx.url.search, 301);
        }
      }
      if (!m) throw new HttpError(404, 'Страница не найдена');
      if (m.methodNotAllowed) throw new HttpError(405, 'Метод не поддерживается');
      ctx.params = m.params;
      if (m.route.opts.private !== false && (ctx.path.startsWith('/cabinet') || ctx.path.startsWith('/staff') || ctx.path.startsWith('/login') || ctx.path.startsWith('/register'))) {
        ctx.state.private = true;
        ctx.setHeader('X-Robots-Tag', 'noindex, nofollow');
      }
      await m.route.handler(ctx);
      if (!res.headersSent) throw new Error(`Маршрут ${ctx.method} ${ctx.path} не отправил ответ`);
    } catch (err) {
      handleError(ctx, err);
    }
  }

  function handleError(ctx, err) {
    if (ctx.res.headersSent) {
      ctx.res.destroy();
      return;
    }
    if (err?.redirect) return ctx.redirect(err.redirect);
    const status = err instanceof HttpError || Number.isInteger(err?.status) ? err.status : 500;
    const expose = status < 500 || err?.expose;
    if (status >= 500) log.error('Ошибка обработки запроса', { path: ctx.path, error: err?.stack || String(err) });
    const message = expose ? err.message : '';
    const wantsJson = String(ctx.req.headers.accept || '').includes('application/json') || ctx.path.startsWith('/payments/');
    if (wantsJson) return ctx.json({ ok: false, error: message || 'Внутренняя ошибка' }, status);
    ctx.state.private = true;
    try {
      ctx.html(errorPage(ctx, status, message), status);
    } catch (e) {
      log.error('Не удалось отрисовать страницу ошибки', { error: e?.message });
      ctx.text('Ошибка', status);
    }
  }

  return { handle, router };
}

export { config };
