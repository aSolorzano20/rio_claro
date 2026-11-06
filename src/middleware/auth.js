import { config } from '../config/index.js';
import { users } from '../data/demo-store.js';
import { verifyToken } from '../services/auth.js';

export function authRequired(requiredRoles = []) {
  return (req, res, next) => {
    const authorization = req.headers.authorization || '';
    const token = authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
    const payload = verifyToken(token);
    if (!payload) return res.status(401).json({ error: 'No autorizado.' });

    const user = users.find((candidate) => candidate.id === payload.sub);
    if (!user) return res.status(401).json({ error: 'Sesión inválida.' });
    if (requiredRoles.length && !requiredRoles.includes(user.role)) {
      return res.status(403).json({ error: 'No tienes permiso para esta acción.' });
    }

    req.user = { ...payload, role: user.role, email: user.email };
    return next();
  };
}

export function demoDataOnly(_req, res, next) {
  if (!config.demoMode) {
    return res.status(503).json({ error: 'Los módulos comerciales aún no están conectados a un almacén productivo.' });
  }
  return next();
}
