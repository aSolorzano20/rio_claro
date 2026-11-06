import crypto from 'node:crypto';
import express from 'express';
import { authRequired, demoDataOnly } from '../middleware/auth.js';
import { usageStats, users } from '../data/demo-store.js';
import { createToken, hashPassword, sanitizeUser, verifyPassword } from '../services/auth.js';

const router = express.Router();
const passwordPattern = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,128}$/;

router.post('/register', demoDataOnly, async (req, res) => {
  const { name, email, password } = req.body || {};
  const normalizedName = typeof name === 'string' ? name.trim() : '';
  const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

  if (!normalizedName || normalizedName.length > 120 || !normalizedEmail || normalizedEmail.length > 254
      || typeof password !== 'string') {
    return res.status(400).json({ error: 'Nombre, correo y contraseña son obligatorios.' });
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    return res.status(422).json({ error: 'El correo electrónico no es válido.' });
  }
  if (!passwordPattern.test(password)) {
    return res.status(422).json({ error: 'La contraseña debe tener entre 8 y 128 caracteres, mayúsculas, minúsculas, un número y un símbolo.' });
  }
  if (users.some((user) => user.email === normalizedEmail)) {
    return res.status(409).json({ error: 'El correo ya está registrado.' });
  }

  const user = {
    id: crypto.randomUUID(),
    name: normalizedName,
    email: normalizedEmail,
    passwordHash: await hashPassword(password),
    role: 'CUSTOMER',
  };
  users.push(user);
  usageStats.registrationCount += 1;
  return res.status(201).json({ user: sanitizeUser(user), token: createToken(user) });
});

router.post('/login', demoDataOnly, async (req, res) => {
  const { email, password } = req.body || {};
  if (typeof email !== 'string' || email.length > 254 || typeof password !== 'string' || password.length > 128) {
    return res.status(400).json({ error: 'Correo y contraseña obligatorios.' });
  }

  const user = users.find((candidate) => candidate.email === email.trim().toLowerCase());
  if (!user || !(await verifyPassword(password, user.passwordHash))) {
    return res.status(401).json({ error: 'Credenciales inválidas.' });
  }

  usageStats.loginCount += 1;
  return res.json({ user: sanitizeUser(user), token: createToken(user) });
});

router.get('/me', demoDataOnly, authRequired(), (req, res) => {
  const user = users.find((candidate) => candidate.id === req.user.sub);
  if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });
  return res.json({ user: sanitizeUser(user) });
});

export default router;
