import crypto from 'node:crypto';
import express from 'express';
import { invoices, notifications, orders, products, users } from '../data/demo-store.js';
import { authRequired, demoDataOnly } from '../middleware/auth.js';

const router = express.Router();
const orderStatuses = ['Procesando', 'Preparando', 'En tránsito', 'Entregado', 'Cancelado'];

router.get('/orders', demoDataOnly, authRequired(['ADMIN', 'CUSTOMER', 'SALES_AGENT', 'LOGISTICS']), (req, res) => {
  const visibleOrders = ['ADMIN', 'SALES_AGENT', 'LOGISTICS'].includes(req.user.role)
    ? orders
    : orders.filter((order) => order.userId === req.user.sub);
  return res.json({ orders: visibleOrders });
});

router.post('/orders', demoDataOnly, authRequired(['ADMIN']), (req, res) => {
  const { customer, customerEmail, total, status = 'Procesando' } = req.body || {};
  const amount = Number(total);
  if (typeof customer !== 'string' || !customer.trim() || !Number.isFinite(amount) || amount < 0
      || !orderStatuses.includes(status)) {
    return res.status(422).json({ error: 'Cliente, total o estado de pedido no son válidos.' });
  }

  const linkedCustomer = typeof customerEmail === 'string'
    ? users.find((user) => user.email === customerEmail.trim().toLowerCase() && user.role === 'CUSTOMER')
    : null;
  if (customerEmail && !linkedCustomer) return res.status(404).json({ error: 'Cliente no encontrado.' });

  const order = {
    id: crypto.randomUUID(),
    userId: linkedCustomer?.id,
    customer: customer.trim(),
    total: amount,
    status,
    createdAt: new Date().toISOString().slice(0, 10),
  };
  orders.push(order);
  notifications.push({
    id: crypto.randomUUID(),
    title: 'Venta registrada',
    message: `Se registró el pedido ${order.id}.`,
    level: 'success',
    audience: 'ADMIN',
    createdAt: new Date().toISOString(),
  });
  if (linkedCustomer) {
    notifications.push({
      id: crypto.randomUUID(),
      title: 'Pedido registrado',
      message: `Se registró el pedido ${order.id}.`,
      level: 'info',
      audience: 'CUSTOMER',
      userId: linkedCustomer.id,
      createdAt: new Date().toISOString(),
    });
  }
  return res.status(201).json({ order });
});

router.post('/checkout', demoDataOnly, authRequired(['CUSTOMER']), (req, res) => {
  const { items } = req.body || {};
  if (!Array.isArray(items) || items.length === 0 || items.length > 50) {
    return res.status(422).json({ error: 'Selecciona al menos un producto.' });
  }

  const quantities = new Map();
  for (const item of items) {
    if (!item || typeof item.productId !== 'string' || !Number.isInteger(item.quantity) || item.quantity < 1) {
      return res.status(422).json({ error: 'El carrito contiene artículos inválidos.' });
    }
    quantities.set(item.productId, (quantities.get(item.productId) || 0) + item.quantity);
  }

  const itemsToOrder = [];
  for (const [productId, quantity] of quantities) {
    const product = products.find((candidate) => candidate.id === productId);
    if (!product) return res.status(404).json({ error: 'Uno de los productos ya no está disponible.' });
    if (product.stock < quantity) return res.status(409).json({ error: `Stock insuficiente para ${product.name}.` });
    itemsToOrder.push({ productId, name: product.name, quantity, unitPrice: product.price });
  }

  const customer = users.find((user) => user.id === req.user.sub);
  const order = {
    id: crypto.randomUUID(),
    userId: req.user.sub,
    customer: customer.name,
    customerEmail: customer.email,
    items: itemsToOrder,
    total: itemsToOrder.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    status: 'Procesando',
    createdAt: new Date().toISOString().slice(0, 10),
  };

  for (const item of itemsToOrder) {
    const product = products.find((candidate) => candidate.id === item.productId);
    product.stock -= item.quantity;
    if (product.stock < 20) {
      notifications.push({
        id: crypto.randomUUID(),
        title: 'Stock bajo',
        message: `${product.name}: quedan ${product.stock} unidades.`,
        level: 'warning',
        audience: 'ADMIN',
        createdAt: new Date().toISOString(),
      });
    }
  }

  orders.push(order);
  invoices.push({
    id: crypto.randomUUID(),
    userId: req.user.sub,
    orderId: order.id,
    customer: customer.name,
    amount: order.total,
    status: 'Pendiente',
  });
  notifications.push({
    id: crypto.randomUUID(),
    title: 'Pedido recibido',
    message: `Tu pedido ${order.id} fue recibido y está en procesamiento.`,
    level: 'info',
    audience: 'CUSTOMER',
    userId: req.user.sub,
    createdAt: new Date().toISOString(),
  });
  notifications.push({
    id: crypto.randomUUID(),
    title: 'Venta registrada',
    message: `Se registró el pedido ${order.id}.`,
    level: 'success',
    audience: 'ADMIN',
    createdAt: new Date().toISOString(),
  });
  return res.status(201).json({ order });
});

router.patch('/orders/:orderId', demoDataOnly, authRequired(['ADMIN', 'LOGISTICS']), (req, res) => {
  const order = orders.find((candidate) => candidate.id === req.params.orderId);
  const { status } = req.body || {};
  if (!order) return res.status(404).json({ error: 'Pedido no encontrado.' });
  if (typeof status !== 'string' || !orderStatuses.includes(status)) {
    return res.status(422).json({ error: 'Estado de pedido inválido.' });
  }

  order.status = status;
  if (order.userId) {
    notifications.push({
      id: crypto.randomUUID(),
      title: 'Actualización de pedido',
      message: `El pedido ${order.id} ahora está ${status}.`,
      level: status === 'Entregado' ? 'success' : 'info',
      audience: 'CUSTOMER',
      userId: order.userId,
      createdAt: new Date().toISOString(),
    });
  }
  return res.json({ order });
});

export default router;
