// Вход по паролю, вход по коду на e-mail, регистрация, выход.
import crypto from 'node:crypto';
import { config } from '../config.js';
import { HttpError } from '../lib/http.js';
import { log } from '../lib/log.js';
import { sendMail } from '../lib/mailer.js';
import { dummyVerify, hashPassword, passwordProblem, verifyPassword } from '../lib/password.js';
import { assertRate, verifyCsrf } from '../lib/security.js';
import { createSession, destroySession, isStaff, safeNext } from '../lib/session.js';
import { audit, codes, requests, users } from '../repos/index.js';
import * as V from '../views/cabinet.js';

const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,24}$/;
// Метка браузера, в котором прошла регистрация. Пароль, заданный при регистрации,
// сохраняется только если e-mail подтверждён из того же браузера.
const REG_COOKIE = 'reg';
const regTag = (userId, email) => crypto.createHmac('sha256', config.secret).update(`reg|${userId}|${email}`).digest('base64url');

const normEmail = (s) => String(s || '').trim().toLowerCase().slice(0, 254);

function landing(user, next) {
  return safeNext(next, isStaff(user) ? '/staff/' : '/cabinet/');
}

async function sendCode(email) {
  const code = codes.issue(email);
  await sendMail({
    to: email,
    subject: `Код входа: ${code}`,
    text: `Ваш код для входа в личный кабинет «Мосдевелопмент Право»: ${code}\n\nКод действует 10 минут. Если вы не запрашивали вход, просто проигнорируйте письмо.\n`,
  });
  // показываем код на странице только в разработке без SMTP
  return !config.smtp.host && !config.isProd ? code : undefined;
}

export function registerAccount(r) {
  r.get('/login/', (ctx) => {
    if (ctx.user) return ctx.redirect(landing(ctx.user, ctx.query.get('next')));
    ctx.html(V.loginPage(ctx, { next: safeNext(ctx.query.get('next'), '') }));
  });

  r.post('/login/', async (ctx) => {
    await verifyCsrf(ctx);
    const form = await ctx.form();
    const login = form.str('login', 254);
    const password = form.get('password') || '';
    const next = form.str('next', 500);
    assertRate(`login-ip:${ctx.ip}`, 20, 15 * 60_000);
    assertRate(`login-user:${login.toLowerCase()}`, 8, 15 * 60_000, 'Слишком много попыток для этого аккаунта. Подождите 15 минут или войдите по коду.');
    const user = login.includes('@') ? users.byEmail(normEmail(login)) : users.byLogin(login);
    // вход по паролю — только после подтверждения e-mail (логин без e-mail подтверждения не требует)
    const usable = user && !user.disabled_at && user.password_hash && (user.email_verified_at || !user.email);
    const ok = usable ? await verifyPassword(password, user.password_hash) : await dummyVerify(password);
    if (!ok) {
      ctx.state.private = true;
      return ctx.html(V.loginPage(ctx, { error: 'Неверный логин или пароль', login, next }), 401);
    }
    createSession(ctx, user.id);
    ctx.redirect(landing(user, next));
  });

  r.get('/login/code/', (ctx) => {
    ctx.html(V.codeRequestPage(ctx, { email: normEmail(ctx.query.get('email')), next: safeNext(ctx.query.get('next'), '') }));
  });

  r.post('/login/code/', async (ctx) => {
    await verifyCsrf(ctx);
    const form = await ctx.form();
    const email = normEmail(form.get('email'));
    const next = form.str('next', 500);
    if (!EMAIL_RE.test(email)) return ctx.html(V.codeRequestPage(ctx, { error: 'Проверьте e-mail', email, next }), 422);
    assertRate(`code-ip:${ctx.ip}`, 10, 15 * 60_000);
    assertRate(`code-mail:${email}`, 3, 10 * 60_000, 'Код уже отправлен. Проверьте почту, папку «Спам», или запросите новый через 10 минут.');
    let devCode;
    try {
      devCode = await sendCode(email);
    } catch (e) {
      log.error('Не удалось отправить код входа', { error: e.message });
      throw new HttpError(502, 'Не получилось отправить письмо. Попробуйте позже или войдите по паролю.');
    }
    ctx.html(V.codeVerifyPage(ctx, { email, next, devCode }));
  });

  r.post('/login/code/verify/', async (ctx) => {
    await verifyCsrf(ctx);
    const form = await ctx.form();
    const email = normEmail(form.get('email'));
    const code = form.str('code', 10).replace(/\s/g, '');
    const next = form.str('next', 500);
    assertRate(`verify-ip:${ctx.ip}`, 30, 15 * 60_000);
    if (!EMAIL_RE.test(email) || !codes.verify(email, code)) {
      return ctx.html(V.codeVerifyPage(ctx, { email, next, error: 'Код неверный или устарел. Запросите новый, если прошло больше 10 минут.' }), 401);
    }
    let user = users.byEmail(email);
    if (!user) {
      user = users.create({ email, emailVerified: true });
      audit(user.id, 'register_by_code');
    } else {
      if (!user.email_verified_at && user.password_hash && ctx.cookies[REG_COOKIE] !== regTag(user.id, email)) {
        // пароль задал не владелец адреса (или другой браузер) — сбрасываем
        users.setPassword(user.id, null);
        audit(user.id, 'password_reset_unverified');
      }
      users.verifyEmail(user.id);
    }
    ctx.clearCookie(REG_COOKIE);
    if (user.disabled_at) throw new HttpError(403, 'Доступ к кабинету отключён. Свяжитесь с нами.');
    requests.attachToUserByEmail(email, user.id);
    createSession(ctx, user.id);
    ctx.redirect(landing(user, next));
  });

  r.get('/register/', (ctx) => {
    if (ctx.user) return ctx.redirect('/cabinet/');
    ctx.html(V.registerPage(ctx));
  });

  r.post('/register/', async (ctx) => {
    await verifyCsrf(ctx);
    assertRate(`register:${ctx.ip}`, 5, 60 * 60_000);
    const form = await ctx.form();
    const values = { name: form.str('name', 120), email: normEmail(form.get('email')), consent: form.get('consent') === '1' };
    const password = form.get('password') || '';
    const errors = {};
    if (!EMAIL_RE.test(values.email)) errors.email = 'Проверьте e-mail';
    const pp = passwordProblem(password);
    if (pp) errors.password = pp;
    if (!values.consent) errors.consent = 'Нужно согласие на обработку данных';
    if (Object.keys(errors).length) return ctx.html(V.registerPage(ctx, { errors, values }), 422);
    const existing = users.byEmail(values.email);
    // не раскрываем, есть ли аккаунт: в обоих случаях отправляем код подтверждения
    if (!existing) {
      const u = users.create({ email: values.email, name: values.name, passwordHash: await hashPassword(password) });
      audit(u.id, 'register');
      ctx.setCookie(REG_COOKIE, regTag(u.id, values.email), { maxAge: 60 * 60 });
    }
    assertRate(`code-mail:${values.email}`, 3, 10 * 60_000, 'Код уже отправлен. Проверьте почту.');
    const devCode = await sendCode(values.email);
    ctx.html(V.codeVerifyPage(ctx, { email: values.email, next: '/cabinet/', devCode }));
  });

  r.post('/logout/', async (ctx) => {
    await verifyCsrf(ctx);
    destroySession(ctx);
    ctx.redirect('/');
  });
}
