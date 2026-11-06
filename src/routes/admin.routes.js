import crypto from 'node:crypto';
import express from 'express';
import { invoices, notifications, orders, products, usageStats, users } from '../data/demo-store.js';
import { authRequired, demoDataOnly } from '../middleware/auth.js';
import { hashPassword, sanitizeUser } from '../services/auth.js';

const router = express.Router();
const roles = ['ADMIN', 'USER', 'CUSTOMER', 'CUSTOMER_VIEWER', 'SALES_AGENT', 'LOGISTICS'];
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

router.get('/users', demoDataOnly, authRequired(['ADMIN']), (_req, res) => {
  return res.json({ users: users.map(sanitizeUser) });
});

router.post('/users', demoDataOnly, authRequired(['ADMIN']), async (req, res) => {
  const { name, email, password, role = 'CUSTOMER' } = req.body || {};
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
  if (!normalizedName || normalizedName.length > 120 || !normalizedEmail || normalizedEmail.length > 254
      || typeof password !== 'string') {
    return res.status(400).json({ error: 'Faltan datos válidos del usuario.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || !passwordPattern.test(password)) {
    return res.status(422).json({ error: 'Correo o contraseña no cumplen los requisitos.' });
  }
  if (!roles.includes(role)) return res.status(422).json({ error: 'Rol no válido.' });
  if (users.some((user) => user.email === normalizedEmail)) {
    return res.status(409).json({ error: 'El usuario ya existe.' });
  }

  const user = {
    id: crypto.randomUUID(),
    name: normalizedName,
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    role,
  };
  users.push(user);
  return res.status(201).json({ user: sanitizeUser(user) });
});

router.post('/roles', demoDataOnly, authRequired(['ADMIN']), (req, res) => {
  const { userId, role } = req.body || {};
  if (!userId || !roles.includes(role)) return res.status(422).json({ error: 'Datos de rol inválidos.' });

  const user = users.find((candidate) => candidate.id === userId);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  if (user.role === 'ADMIN' && role !== 'ADMIN' && users.filter((candidate) => candidate.role === 'ADMIN').length === 1) {
    return res.status(409).json({ error: 'No se puede quitar el rol del único administrador.' });
  }
  user.role = role;
  return res.json({ user: sanitizeUser(user) });
});

router.get('/reports', demoDataOnly, authRequired(['ADMIN', 'SALES_AGENT', 'LOGISTICS']), (req, res) => {
  if (req.user.role === 'LOGISTICS') {
    return res.json({ products: products.map(({ id, name, category, stock }) => ({ id, name, category, stock })) });
  }

  const summary = {
    totalProducts: products.length,
    totalOrders: orders.length,
    totalInvoices: invoices.length,
    totalRevenue: orders.reduce((sum, order) => sum + (order.status === 'Cancelado' ? 0 : Number(order.total || 0)), 0),
    lowStock: products.filter((product) => product.stock < 20).length,
    totalUsers: users.length,
    loginCount: usageStats.loginCount,
    registrationCount: usageStats.registrationCount,
    chatMessageCount: usageStats.chatMessageCount,
  };
  if (req.user.role === 'SALES_AGENT') {
    return res.json({
      summary: { totalOrders: summary.totalOrders, totalRevenue: summary.totalRevenue },
      orders: orders.map(({ id, customer, total, status, createdAt }) => ({ id, customer, total, status, createdAt })),
    });
  }
  return res.json({ summary, products, orders, invoices });
});

router.get('/notifications', demoDataOnly, authRequired(['ADMIN', 'CUSTOMER']), (req, res) => {
  const visible = notifications.filter((notification) => req.user.role === 'ADMIN'
    ? notification.audience === 'ADMIN' || !notification.audience
    : notification.audience === 'CUSTOMER' && notification.userId === req.user.sub);
  return res.json({ notifications: visible });
});

router.post('/notifications', demoDataOnly, authRequired(['ADMIN']), (req, res) => {
  const { title, message, level = 'info', userId } = req.body || {};
  const levels = ['info', 'warning', 'success'];
  if (typeof title !== 'string' || !title.trim() || title.length > 120
      || typeof message !== 'string' || !message.trim() || message.length > 1000
      || !levels.includes(level) || (userId !== undefined && typeof userId !== 'string')) {
    return res.status(422).json({ error: 'Título, mensaje, nivel o destinatario no válidos.' });
  }
  if (userId && !users.some((user) => user.id === userId && user.role === 'CUSTOMER')) {
    return res.status(404).json({ error: 'Cliente no encontrado.' });
  }

  const notification = {
    id: crypto.randomUUID(),
    title: title.trim(),
    message: message.trim(),
    level,
    audience: userId ? 'CUSTOMER' : 'ADMIN',
    userId: userId || undefined,
    createdAt: new Date().toISOString(),
  };
  notifications.push(notification);
  return res.status(201).json({ notification });
});

export default router;
