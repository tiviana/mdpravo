// Заполнение шаблона документа в браузере. Введённые данные никуда не отправляются и не сохраняются.
// Текст собирается так же, как на старом сайте (lib/onlineDocumentSchemas.ts → buildOnlineDocumentText).
(() => {
  const root = document.querySelector('[data-docfill]');
  if (!root) return;
  const form = root.querySelector('[data-docfill-form]');
  const result = root.querySelector('[data-docfill-result]');
  const preview = root.querySelector('#df-preview');
  const status = root.querySelector('[data-docfill-status]');
  const title = root.dataset.title || 'Документ';
  const BASE = ['recipient', 'sender', 'facts', 'request', 'evidence', 'attachments', 'signatureDate'];
  form.hidden = false;

  const fields = () => [...form.querySelectorAll('input, textarea')];
  const val = (id) => (form.elements[id]?.value || '').trim();
  const labelOf = (el) => (form.querySelector(`label[for="${el.id}"]`)?.firstChild?.textContent || el.name).trim();

  function problems() {
    const out = [];
    for (const el of fields()) {
      const v = el.value.trim();
      if (el.required && !v) { out.push([el, 'Обязательное поле.']); continue; }
      if (!v) continue;
      if (el.name === 'amount') {
        const n = v.replace(/\s/g, '').replace(',', '.');
        if (!/^\d{1,12}(?:\.\d{1,2})?$/.test(n) || Number(n) <= 0) out.push([el, 'Укажите положительную сумму цифрами, например 45000 или 45000,50.']);
      }
      if (el.type === 'date' && !/^\d{4}-\d{2}-\d{2}$/.test(v)) out.push([el, 'Выберите дату в календаре.']);
      if (/\[(?:укажите|вставьте|фио|дата|сумма|адрес)\b/i.test(v)) out.push([el, 'Замените текст подсказки в квадратных скобках своими сведениями.']);
    }
    return out;
  }

  function build() {
    const specials = fields().filter((el) => !BASE.includes(el.name) && el.value.trim());
    const rows = [
      `Кому: ${val('recipient')}`,
      `От: ${val('sender')}`,
      '',
      title.toUpperCase(),
      '',
      ...specials.map((el) => `${labelOf(el)}: ${el.type === 'date' ? el.value.trim().replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3.$2.$1') : el.value.trim()}`),
      ...(specials.length ? [''] : []),
      'Обстоятельства:',
      val('facts'),
      '',
      ...(val('evidence') ? ['Подтверждающие документы и сведения:', val('evidence'), ''] : []),
      'Прошу:',
      val('request'),
      '',
      ...(val('attachments') ? ['Приложения:', val('attachments'), ''] : []),
      `Дата: ${val('signatureDate').replace(/^(\d{4})-(\d{2})-(\d{2})$/, '$3.$2.$1')}`,
      'Подпись: ____________________',
    ];
    return rows.join('\n');
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    for (const s of form.querySelectorAll('[data-error-for]')) { s.hidden = true; s.textContent = ''; }
    for (const el of fields()) el.removeAttribute('aria-invalid');
    const list = problems();
    if (list.length) {
      for (const [el, msg] of list) {
        const s = form.querySelector(`[data-error-for="${el.name}"]`);
        if (s) { s.textContent = msg; s.hidden = false; s.id = `dfe-${el.name}`; el.setAttribute('aria-describedby', s.id); }
        el.setAttribute('aria-invalid', 'true');
      }
      list[0][0].focus();
      return;
    }
    preview.value = build();
    form.hidden = true;
    result.hidden = false;
    status.textContent = '';
    preview.focus();
  });

  root.querySelector('[data-docfill-edit]').addEventListener('click', () => {
    result.hidden = true;
    form.hidden = false;
    form.querySelector('input, textarea')?.focus();
  });

  root.querySelector('[data-docfill-copy]').addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(preview.value);
      status.textContent = 'Текст скопирован.';
    } catch {
      preview.select();
      status.textContent = 'Скопировать автоматически не удалось. Выделите текст в поле просмотра.';
    }
  });

  root.querySelector('[data-docfill-download]').addEventListener('click', () => {
    const blob = new Blob(['﻿' + preview.value.replace(/\n/g, '\r\n')], { type: 'text/plain;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `${root.dataset.slug || 'document'}.txt`;
    document.body.append(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    status.textContent = 'Файл сохранён. Перед подачей проверьте текст и подпишите документ.';
  });
})();
