export const users = [];

export const products = [
  { id: 'prod-1001', name: 'Agua Mineral 500ml', category: 'Bebidas', price: 12.5, stock: 120 },
  { id: 'prod-1002', name: 'Batería 12V', category: 'Automotriz', price: 499.9, stock: 32 },
  { id: 'prod-1003', name: 'Kit de Seguridad', category: 'Seguridad', price: 185, stock: 18 },
  { id: 'prod-1004', name: 'Mochila Turística', category: 'Accesorios', price: 260, stock: 45 },
];

export const orders = [
  { id: 'ord-001', customer: 'Cliente de muestra', total: 120, status: 'En tránsito', createdAt: '2026-11-01' },
  { id: 'ord-002', customer: 'Ana de muestra', total: 820, status: 'Entregado', createdAt: '2026-11-03' },
  { id: 'ord-003', customer: 'Luis de muestra', total: 230, status: 'Procesando', createdAt: '2026-11-05' },
];

export const invoices = [
  { id: 'inv-001', customer: 'Cliente de muestra', amount: 120, status: 'Pagada' },
  { id: 'inv-002', customer: 'Ana de muestra', amount: 820, status: 'Pendiente' },
];

export const notifications = [
  { id: 'notif-001', title: 'Stock bajo', message: 'El producto Kit de Seguridad está por debajo del nivel recomendado.', level: 'warning' },
  { id: 'notif-002', title: 'Venta finalizada', message: 'La venta ord-002 ha sido entregada y confirmada.', level: 'success' },
];

export const usageStats = { loginCount: 0, registrationCount: 0, chatMessageCount: 0 };
