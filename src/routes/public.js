// Маршруты публичной части. Адреса совпадают со старым сайтом (см. tests/urls.test.js).
import { config } from '../config.js';
import { team } from '../content/company.js';
import { articleBySlug, downloadBySlug, topicBySlug, urgentBySlug } from '../content/knowledge.js';
import { directionBySlug, findTask } from '../content/services.js';
import * as db from '../db/index.js';
import { HttpError } from '../lib/http.js';
import { log } from '../lib/log.js';
import { sendMail } from '../lib/mailer.js';
import { search } from '../lib/search.js';
import { assertRate, verifyCsrf } from '../lib/security.js';
import { publicFileExists } from '../lib/static.js';
import { library, requests } from '../repos/index.js';
import { validateRequest } from '../views/forms.js';
import * as V from '../views/public.js';

const legacy = (path) => db.one('SELECT * FROM legacy_content WHERE path = ?', path);
const bookmarked = (ctx, path) => (ctx.user ? library.isBookmarked(ctx.user.id, path) : false);
const notFound = () => new HttpError(404, 'Страница не найдена');

const FORM_PAGES = { '/': V.homePage, '/contacts/': V.contactsPage, '/partnership/contact/': V.partnershipContactPage };

export function registerPublic(r) {
  r.get('/', (ctx) => ctx.html(V.homePage(ctx)));
  r.get('/directions/', (ctx) => ctx.html(V.directionsPage(ctx)));
  r.get('/services/', (ctx) => ctx.redirect('/directions/', 301));
  r.get('/services/:dir/', (ctx) => {
    const d = directionBySlug.get(ctx.params.dir);
    if (!d) throw notFound();
    ctx.html(V.directionPage(ctx, d));
  });
  r.get('/services/:dir/:task/', (ctx) => {
    const d = directionBySlug.get(ctx.params.dir);
    const t = d && findTask(d.slug, ctx.params.task);
    if (!t) throw notFound();
    ctx.html(V.taskPage(ctx, d, t));
  });

  r.get('/urgent/', (ctx) => ctx.html(V.urgentIndex(ctx)));
  r.get('/urgent/:slug/', (ctx) => {
    const u = urgentBySlug.get(ctx.params.slug);
    if (!u) throw notFound();
    ctx.html(V.urgentPage(ctx, u, legacy(u.path)));
  });

  r.get('/knowledge/', (ctx) => ctx.html(V.knowledgeIndex(ctx)));
  r.get('/knowledge/topics/', (ctx) => ctx.html(V.topicsIndex(ctx)));
  r.get('/knowledge/topics/:slug/', (ctx) => {
    const t = topicBySlug.get(ctx.params.slug);
    if (!t) throw notFound();
    ctx.html(V.topicPage(ctx, t));
  });
  r.get('/knowledge/downloads/', (ctx) => ctx.html(V.downloadsIndex(ctx)));
  r.get('/knowledge/downloads/:slug/', (ctx) => {
    const d = downloadBySlug.get(ctx.params.slug);
    if (!d) throw notFound();
    const files = { pdf: publicFileExists(d.pdf), docx: publicFileExists(d.docx) };
    ctx.html(V.downloadPage(ctx, d, legacy(d.path), bookmarked(ctx, d.path), files));
  });
  r.get('/knowledge/calculators/', (ctx) => ctx.html(V.calculatorsPage(ctx, V.calcPenalty(ctx.query))));
  r.get('/knowledge/services/', (ctx) => ctx.html(V.sectionPage(ctx, 'services', legacy('/knowledge/services/'))));
  r.get('/knowledge/sizo-fsin-services/', (ctx) => ctx.html(V.sectionPage(ctx, 'sizo', legacy('/knowledge/sizo-fsin-services/'))));
  r.get('/knowledge/search/', (ctx) => {
    const q = (ctx.query.get('q') || '').slice(0, 200).trim();
    if (q) assertRate(`search:${ctx.ip}`, 60, 60_000);
    ctx.html(V.searchPage(ctx, q, q ? search(q) : []));
  });
  // старый адрес кабинета внутри базы знаний
  r.get('/knowledge/cabinet/', (ctx) => ctx.redirect('/cabinet/', 301));
  r.get('/knowledge/:slug/', (ctx) => {
    const a = articleBySlug.get(ctx.params.slug);
    if (!a) throw notFound();
    ctx.html(V.articlePage(ctx, a, legacy(a.path), bookmarked(ctx, a.path)));
  });

  r.get('/about/', (ctx) => ctx.html(V.aboutPage(ctx)));
  r.get('/team/:slug/', (ctx) => {
    const m = team.find((x) => x.slug === ctx.params.slug);
    if (!m) throw notFound();
    ctx.html(V.teamPage(ctx, m));
  });
  r.get('/process/', (ctx) => ctx.html(V.processPage(ctx)));
  r.get('/prices/', (ctx) => ctx.html(V.pricesPage(ctx)));
  r.get('/faq/', (ctx) => ctx.html(V.faqPage(ctx)));
  r.get('/contacts/', (ctx) => ctx.html(V.contactsPage(ctx)));
  r.get('/partnership/', (ctx) => ctx.html(V.partnershipPage(ctx)));
  r.get('/partnership/contact/', (ctx) => ctx.html(V.partnershipContactPage(ctx)));
  r.get('/privacy/', (ctx) => ctx.html(V.legalPage(ctx, 'privacy', legacy('/privacy/'))));
  r.get('/consent/', (ctx) => ctx.html(V.legalPage(ctx, 'consent', legacy('/consent/'))));

  r.post('/request/', async (ctx) => {
    await verifyCsrf(ctx);
    assertRate(`request:${ctx.ip}`, 5, 10 * 60_000, 'Слишком много обращений подряд. Позвоните нам или попробуйте через 10 минут.');
    const form = await ctx.form();
    if (form.str('website')) return ctx.redirect('/request/sent/'); // ловушка для ботов
    const { values, errors } = validateRequest(form);
    const source = FORM_PAGES[values.source] ? values.source : '/';
    if (Object.keys(errors).length) {
      ctx.state.private = true;
      return ctx.html(FORM_PAGES[source](ctx, { values, errors }), 422);
    }
    const req = requests.create({
      userId: ctx.user?.id || null,
      name: values.name,
      contact: values.contact,
      email: values.email || (ctx.user?.email ?? null),
      topic: values.topic,
      message: values.message,
      sourcePath: values.source,
    });
    notifyNewRequest(req).catch((e) => log.error('Не удалось отправить уведомление об обращении', { error: e.message }));
    ctx.redirect(`/request/sent/?n=${encodeURIComponent(req.number)}`);
  });
  r.get('/request/sent/', (ctx) => {
    const n = ctx.query.get('n');
    ctx.html(V.requestSentPage(ctx, n && /^MP-\d{4}-\d{5}$/.test(n) ? n : null));
  });
}

async function notifyNewRequest(req) {
  // в письмо сотрудникам — только номер и ссылка: персональные данные остаются в системе
  if (config.notifyEmail) {
    await sendMail({
      to: config.notifyEmail,
      subject: `Новое обращение ${req.number}`,
      text: `Поступило обращение ${req.number}.\nОткрыть: ${config.baseUrl}/staff/requests/\n`,
    });
  }
  if (req.email) {
    await sendMail({
      to: req.email,
      subject: `Обращение ${req.number} принято`,
      text: `Здравствуйте!\n\nМы получили ваше обращение ${req.number}. Специалист изучит ситуацию и свяжется с вами.\n\nСтатус можно смотреть в личном кабинете: ${config.baseUrl}/login/code/ (вход по коду на этот адрес).\n\nМосдевелопмент Право`,
    });
  }
}
