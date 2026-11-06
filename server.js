import express from 'express';
import path from 'node:path';
import authRouter from './src/routes/auth.routes.js';
import productsRouter from './src/routes/products.routes.js';
import ordersRouter from './src/routes/orders.routes.js';
import invoicesRouter from './src/routes/invoices.routes.js';
import adminRouter from './src/routes/admin.routes.js';
import chatRouter from './src/routes/chat.routes.js';
import { config } from './src/config/index.js';
import { bootstrapDemoAdmin } from './src/services/auth.js';

const app = express();
const projectRoot = import.meta.dirname;
const publicDir = path.join(projectRoot, 'public');
const indexFile = path.join(publicDir, 'index.html');
const portalFile = path.join(publicDir, 'portal.html');

await bootstrapDemoAdmin();

app.use(express.json({ limit: '2mb' }));
app.use(express.static(publicDir));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/status', (_req, res) => {
  res.json({
    mode: config.demoMode ? 'demo' : 'production',
    foundryConfigured: Boolean(config.projectEndpoint && config.agentName),
    commerceDataConnected: false,
    emailAndMfaConfigured: false,
  });
});

app.use('/api/auth', authRouter);
app.use('/api', productsRouter);
app.use('/api', ordersRouter);
app.use('/api', invoicesRouter);
app.use('/api', adminRouter);
app.use('/api', chatRouter);

app.get('/portal', (_req, res) => {
  res.sendFile(portalFile);
});

app.get('/', (_req, res) => {
  res.sendFile(indexFile);
});

app.use('/api', (_req, res) => {
  res.status(404).json({ error: 'Ruta de API no encontrada.' });
});

app.use((error, _req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.parse.failed') {
    return res.status(400).json({ error: 'El cuerpo de la solicitud debe ser JSON válido.' });
  }
  if (error.type === 'entity.too.large') {
    return res.status(413).json({ error: 'El cuerpo de la solicitud excede el límite permitido.' });
  }
  console.error('Unhandled request error:', error);
  return res.status(500).json({ error: 'Ocurrió un error interno.' });
});

const server = app.listen(config.port, () => {
  console.log(`Sitio Río Claro disponible en http://localhost:${config.port}`);
  if (config.demoMode) {
    console.warn('Modo demo activo: los datos se borran al reiniciar.');
  }
  if (!config.projectEndpoint || !config.agentName) {
    console.warn('Foundry no está configurado; el chat responde con HTTP 502.');
  }
});

function shutdown() {
  server.close(() => process.exit(0));
}

process.once('SIGINT', shutdown);
process.once('SIGTERM', shutdown);
