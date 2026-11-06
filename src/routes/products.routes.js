import crypto from 'node:crypto';
import express from 'express';
import { products, notifications } from '../data/demo-store.js';
import { authRequired, demoDataOnly } from '../middleware/auth.js';

const router = express.Router();

router.get('/public/products', demoDataOnly, (_req, res) => {
  res.json({ products: products.map(({ id, name, category, price }) => ({ id, name, category, price })) });
});

router.get('/products', demoDataOnly, authRequired(), (_req, res) => {
  res.json({ products });
});

router.post('/products', demoDataOnly, authRequired(['ADMIN']), (req, res) => {
  const { name, category, price, stock } = req.body || {};
  const productName = typeof name === 'string' ? name.trim() : '';
  const productCategory = typeof category === 'string' ? category.trim() : '';
  const numericPrice = Number(price);
  const numericStock = Number(stock);

  if (!productName || productName.length > 160 || !productCategory || productCategory.length > 80
      || !Number.isFinite(numericPrice) || numericPrice < 0
      || !Number.isInteger(numericStock) || numericStock < 0) {
    return res.status(422).json({ error: 'Nombre, categoría, precio y stock no son válidos.' });
  }

  const product = {
    id: crypto.randomUUID(),
    name: productName,
    category: productCategory,
    price: numericPrice,
    stock: numericStock,
  };
  products.push(product);
  return res.status(201).json({ product });
});

router.patch('/products/:productId', demoDataOnly, authRequired(['ADMIN']), (req, res) => {
  const product = products.find((candidate) => candidate.id === req.params.productId);
  if (!product) return res.status(404).json({ error: 'Producto no encontrado.' });

  const { name, category, price, stock } = req.body || {};
  if (name !== undefined) {
    if (typeof name !== 'string' || !name.trim() || name.trim().length > 160) return res.status(422).json({ error: 'Nombre inválido.' });
    product.name = name.trim();
  }
  if (category !== undefined) {
    if (typeof category !== 'string' || !category.trim() || category.trim().length > 80) return res.status(422).json({ error: 'Categoría inválida.' });
    product.category = category.trim();
  }
  if (price !== undefined) {
    if (!Number.isFinite(Number(price)) || Number(price) < 0) return res.status(422).json({ error: 'Precio inválido.' });
    product.price = Number(price);
  }
  if (stock !== undefined) {
    if (!Number.isInteger(Number(stock)) || Number(stock) < 0) return res.status(422).json({ error: 'Stock inválido.' });
    product.stock = Number(stock);
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

  return res.json({ product });
});

router.delete('/products/:productId', demoDataOnly, authRequired(['ADMIN']), (req, res) => {
  const index = products.findIndex((product) => product.id === req.params.productId);
  if (index < 0) return res.status(404).json({ error: 'Producto no encontrado.' });
  products.splice(index, 1);
  return res.status(204).end();
});

export default router;
