// Форма обращения — одна на всём сайте (главная, услуги, контакты).
import { directions } from '../content/services.js';
import { html } from '../lib/html.js';
import { alert, csrfField, icon } from './ui.js';

export function requestForm(ctx, { values = {}, errors = {}, source = '', dark = false, title = true } = {}) {
  const err = (k) => (errors[k] ? html`<span class="error" id="e-${k}">${errors[k]}</span>` : '');
  const inv = (k) => (errors[k] ? html`aria-invalid="true" aria-describedby="e-${k}"` : '');
  return html`<form class="form" method="post" action="/request/" novalidate data-request-form>
  ${csrfField(ctx)}
  <input type="hidden" name="source" value="${source || ctx.path}">
  <div class="visually-hidden" aria-hidden="true"><label>Сайт <input type="text" name="website" tabindex="-1" autocomplete="off"></label></div>
  ${errors._form ? alert('error', errors._form) : ''}
  ${title ? html`<p class="${dark ? '' : 'muted'}">На первом этапе хватит пары предложений. Документы можно прислать позже.</p>` : ''}
  <div class="form-row">
    <div class="field">
      <label for="rf-name">Как к вам обращаться</label>
      <input class="input" id="rf-name" name="name" autocomplete="name" maxlength="120" required value="${values.name || ''}" ${inv('name')}>
      ${err('name')}
    </div>
    <div class="field">
      <label for="rf-contact">Телефон или e-mail</label>
      <input class="input" id="rf-contact" name="contact" autocomplete="email" inputmode="email" maxlength="160" required value="${values.contact || ''}" ${inv('contact')}>
      ${err('contact')}
    </div>
  </div>
  <div class="field">
    <label for="rf-topic">Тема</label>
    <select class="input select" id="rf-topic" name="topic">
      <option value="">Не знаю, подскажите</option>
      ${directions.map((d) => html`<option value="${d.slug}" ${values.topic === d.slug ? html`selected` : ''}>${d.navTitle || d.title}</option>`)}
    </select>
  </div>
  <div class="field">
    <label for="rf-message">Что произошло</label>
    <textarea class="textarea" id="rf-message" name="message" maxlength="5000" required placeholder="Коротко: что случилось и какого результата хотите" ${inv('message')}>${values.message || ''}</textarea>
    ${err('message')}
  </div>
  <label class="check">
    <input type="checkbox" name="consent" value="1" required ${values.consent ? html`checked` : ''} ${inv('consent')}>
    <span>Соглашаюсь на <a href="/consent/">обработку персональных данных</a> и принимаю <a href="/privacy/">политику конфиденциальности</a>.</span>
  </label>
  ${err('consent')}
  <div><button class="btn ${dark ? 'btn--gold' : 'btn--primary'}" type="submit">Отправить обращение ${icon('arrow')}</button></div>
</form>`;
}

export function validateRequest(form) {
  const v = {
    name: form.str('name', 120),
    contact: form.str('contact', 160),
    topic: form.str('topic', 60),
    message: form.str('message', 5000),
    consent: form.get('consent') === '1',
    source: form.str('source', 300),
  };
  const errors = {};
  if (v.name.length < 2) errors.name = 'Укажите имя';
  const isEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.contact);
  const digits = v.contact.replace(/\D/g, '');
  if (!isEmail && (digits.length < 10 || digits.length > 15)) errors.contact = 'Укажите телефон или e-mail для связи';
  if (v.message.length < 10) errors.message = 'Опишите ситуацию хотя бы в одном предложении';
  if (!v.consent) errors.consent = 'Без согласия мы не можем принять обращение';
  if (v.topic && !directions.some((d) => d.slug === v.topic)) v.topic = '';
  v.email = isEmail ? v.contact.toLowerCase() : null;
  return { values: v, errors };
}
