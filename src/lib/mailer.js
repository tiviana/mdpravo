// Отправка писем по SMTP (порт 465 — неявный TLS, 587 — STARTTLS). Без внешних библиотек.
// Без настроенного SMTP письма складываются в outbox (разработка и тесты).
import crypto from 'node:crypto';
import net from 'node:net';
import tls from 'node:tls';
import { config } from '../config.js';
import { log } from './log.js';

export const outbox = [];

function b64(s) {
  return Buffer.from(s, 'utf8').toString('base64');
}

function encodeHeader(s) {
  return /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`;
}

function addressOnly(from) {
  const m = /<([^>]+)>/.exec(from);
  return m ? m[1] : from;
}

function formatFrom(from) {
  const m = /^(.*)<([^>]+)>$/.exec(from);
  return m ? `${encodeHeader(m[1].trim())} <${m[2]}>` : from;
}

export function buildMessage({ from, to, subject, text }) {
  const id = `<${crypto.randomUUID()}@${addressOnly(from).split('@')[1] || 'localhost'}>`;
  const body = b64(text).replace(/.{1,76}/g, '$&\r\n');
  return [
    `From: ${formatFrom(from)}`,
    `To: ${to}`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${id}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: base64',
    '',
    body,
  ].join('\r\n');
}

class SmtpSession {
  constructor(socket) {
    this.socket = socket;
    this.buf = '';
    this.waiters = [];
    socket.setEncoding('utf8');
    socket.on('data', (d) => this.onData(d));
    socket.on('error', (e) => this.fail(e));
    socket.on('close', () => this.fail(new Error('SMTP: соединение закрыто')));
  }
  onData(d) {
    this.buf += d;
    // ответ завершён, когда последняя строка вида "250 ..." (без дефиса)
    const lines = this.buf.split('\r\n');
    for (let i = 0; i < lines.length - 1; i++) {
      if (/^\d{3} /.test(lines[i])) {
        const resp = lines.slice(0, i + 1).join('\n');
        this.buf = lines.slice(i + 1).join('\r\n');
        const w = this.waiters.shift();
        if (w) w.resolve(resp);
        return this.onData('');
      }
    }
  }
  fail(e) {
    while (this.waiters.length) this.waiters.shift().reject(e);
  }
  read() {
    return new Promise((resolve, reject) => this.waiters.push({ resolve, reject }));
  }
  async cmd(line, expect) {
    if (line !== null) this.socket.write(line + '\r\n');
    const resp = await this.read();
    const code = Number(resp.slice(0, 3));
    if (!expect.includes(code)) throw new Error(`SMTP ${code}: ${resp.split('\n').pop()}`);
    return resp;
  }
}

function connect(host, port) {
  return new Promise((resolve, reject) => {
    const s = port === 465 ? tls.connect({ host, port, servername: host }) : net.connect({ host, port });
    s.setTimeout(20000, () => s.destroy(new Error('SMTP: таймаут')));
    s.once(port === 465 ? 'secureConnect' : 'connect', () => resolve(s));
    s.once('error', reject);
  });
}

export async function smtpSend(msg, smtp = config.smtp) {
  let socket = await connect(smtp.host, smtp.port);
  let s = new SmtpSession(socket);
  try {
    await s.cmd(null, [220]);
    const ehlo = await s.cmd(`EHLO ${new URL(config.baseUrl).hostname}`, [250]);
    if (smtp.port !== 465 && /STARTTLS/i.test(ehlo)) {
      await s.cmd('STARTTLS', [220]);
      socket.removeAllListeners('data');
      socket = tls.connect({ socket, servername: smtp.host });
      await new Promise((res, rej) => {
        socket.once('secureConnect', res);
        socket.once('error', rej);
      });
      s = new SmtpSession(socket);
      await s.cmd(`EHLO ${new URL(config.baseUrl).hostname}`, [250]);
    } else if (smtp.port !== 465 && !smtp.allowPlain) {
      throw new Error('SMTP: сервер не поддерживает STARTTLS — отправка без шифрования запрещена');
    }
    if (smtp.user) {
      await s.cmd('AUTH LOGIN', [334]);
      await s.cmd(b64(smtp.user), [334]);
      await s.cmd(b64(smtp.pass), [235]);
    }
    await s.cmd(`MAIL FROM:<${addressOnly(msg.from)}>`, [250]);
    await s.cmd(`RCPT TO:<${msg.to}>`, [250, 251]);
    await s.cmd('DATA', [354]);
    const data = buildMessage(msg).replace(/\r\n\./g, '\r\n..');
    await s.cmd(`${data}\r\n.`, [250]);
    await s.cmd('QUIT', [221]).catch(() => {});
  } finally {
    socket.end();
  }
}

export async function sendMail({ to, subject, text }) {
  const msg = { from: config.smtp.from, to, subject, text };
  if (!config.smtp.host) {
    outbox.push({ ...msg, at: new Date().toISOString() });
    if (outbox.length > 200) outbox.shift();
    if (!config.isTest) log.warn('SMTP не настроен: письмо не отправлено, сохранено в outbox', { subject });
    return { queued: false };
  }
  await smtpSend(msg);
  return { queued: true };
}
