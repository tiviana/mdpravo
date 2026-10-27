// Журнал без персональных данных: e-mail, телефоны и длинные числа маскируются.
const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /\+?\d[\d\s()-]{8,}\d/g;

export function redact(s) {
  return String(s).replace(EMAIL, '[email]').replace(PHONE, '[phone]');
}

function line(level, msg, extra) {
  const rec = { t: new Date().toISOString(), level, msg: redact(msg) };
  if (extra) for (const [k, v] of Object.entries(extra)) rec[k] = typeof v === 'string' ? redact(v) : v;
  const out = JSON.stringify(rec);
  if (level === 'error') console.error(out);
  else if (process.env.NODE_ENV !== 'test' || process.env.LOG_IN_TESTS) console.log(out);
}

export const log = {
  info: (m, e) => line('info', m, e),
  warn: (m, e) => line('warn', m, e),
  error: (m, e) => line('error', m, e),
};
