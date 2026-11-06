import crypto from 'node:crypto';
import express from 'express';
import { invoices, notifications, users } from '../data/demo-store.js';
import { authRequired, demoDataOnly } from '../middleware/auth.js';

const router = express.Router();
const invoiceStatuses = ['Pendiente', 'Pagada', 'Vencida', 'Cancelada'];

router.get('/invoices', demoDataOnly, authRequired(['ADMIN', 'CUSTOMER']), (req, res) => {
  const visibleInvoices = req.user.role === 'ADMIN'
    ? invoices
    : invoices.filter((invoice) => invoice.userId === req.user.sub);
  return res.json({ invoices: visibleInvoices });
});

router.post('/invoices', demoDataOnly, authRequired(['ADMIN']), (req, res) => {
  const { customer, customerEmail, amount, status = 'Pendiente' } = req.body || {};
  const parsedAmount = Number(amount);
  if (typeof customer !== 'string' || !customer.trim() || !Number.isFinite(parsedAmount)
      || parsedAmount < 0 || !invoiceStatuses.includes(status)) {
    return res.status(422).json({ error: 'Cliente, monto o estado de factura no son válidos.' });
  }

  const linkedCustomer = typeof customerEmail === 'string'
    ? users.find((user) => user.email === customerEmail.trim().toLowerCase() && user.role === 'CUSTOMER')
    : null;
  if (customerEmail && !linkedCustomer) return res.status(404).json({ error: 'Cliente no encontrado.' });

  const invoice = {
    id: crypto.randomUUID(),
    userId: linkedCustomer?.id,
    customer: customer.trim(),
    amount: parsedAmount,
    status,
  };
  invoices.push(invoice);
  if (linkedCustomer) {
    notifications.push({
      id: crypto.randomUUID(),
      title: 'Factura disponible',
      message: `Hay una nueva factura (${invoice.id}) disponible para tu cuenta.`,
      level: 'info',
      audience: 'CUSTOMER',
      userId: linkedCustomer.id,
      createdAt: new Date().toISOString(),
    });
  }
  return res.status(201).json({ invoice });
});

router.get('/invoices/:invoiceId/print', demoDataOnly, authRequired(['ADMIN', 'CUSTOMER']), (req, res) => {
  const invoice = invoices.find((candidate) => candidate.id === req.params.invoiceId);
  if (!invoice || (req.user.role !== 'ADMIN' && invoice.userId !== req.user.sub)) {
    return res.status(404).json({ error: 'Factura no encontrada.' });
  }

  const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
  res.type('html').send(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Factura ${escapeHtml(invoice.id)}</title><style>body{font:16px Arial;max-width:720px;margin:48px auto;color:#18312d}button{padding:10px 16px}@media print{button{display:none}}</style><h1>Río Claro</h1><h2>Factura ${escapeHtml(invoice.id)}</h2><p>Cliente: ${escapeHtml(invoice.customer)}</p><p>Monto: $${Number(invoice.amount).toFixed(2)}</p><p>Estado: ${escapeHtml(invoice.status)}</p><button onclick="window.print()">Imprimir / guardar como PDF</button></html>`);
});

export default router;
