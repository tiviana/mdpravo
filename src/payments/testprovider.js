// Тестовый провайдер — только для разработки и автотестов. В production не создаётся
// (см. src/payments/index.js и configProblems в src/config.js).
import crypto from 'node:crypto';
import { config } from '../config.js';

export function createTestProvider() {
  if (config.isProd) throw new Error('Тестовый платёжный провайдер запрещён в production');
  const store = new Map();
  return {
    name: 'test',
    store,
    async create({ amountKop, invoiceId, idempotenceKey }) {
      for (const p of store.values()) if (p.idempotenceKey === idempotenceKey) return { ...p };
      const id = 'test-' + crypto.randomUUID();
      const p = {
        id,
        status: 'pending',
        amountKop,
        currency: 'RUB',
        invoiceId,
        paid: false,
        refundedKop: 0,
        idempotenceKey,
        confirmationUrl: `${config.baseUrl}/dev/test-pay/${id}/`,
        cancelReason: null,
        test: true,
      };
      store.set(id, p);
      return { ...p };
    },
    async get(id) {
      const p = store.get(id);
      if (!p) throw Object.assign(new Error('not found'), { status: 404 });
      return { ...p };
    },
    // управление состоянием из тестовой страницы и тестов
    set(id, status, extra = {}) {
      const p = store.get(id);
      if (!p) return null;
      Object.assign(p, { status, paid: status === 'succeeded' || p.paid }, extra);
      return { ...p };
    },
  };
}
