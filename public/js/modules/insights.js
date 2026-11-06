import { api, createBadge, showMessage } from '../core/api.js';

function renderSummary(summary) {
  const root = document.getElementById('summary-grid');
  const cards = [
    ['Productos', summary.totalProducts ?? 0],
    ['Pedidos', summary.totalOrders ?? 0],
    ['Facturas', summary.totalInvoices ?? 0],
    ['Stock bajo', summary.lowStock ?? 0],
    ['Usuarios', summary.totalUsers ?? 0],
    ['Mensajes atendidos', summary.chatMessageCount ?? 0],
  ];
  root.replaceChildren();
  cards.forEach(([label, count]) => {
    const card = document.createElement('div');
    card.className = 'summary-card';
    const caption = document.createElement('p');
    caption.className = 'summary-label';
    caption.textContent = label;
    const value = document.createElement('strong');
    value.textContent = String(count);
    card.append(caption, value);
    root.appendChild(card);
  });
}

function renderSalesSummary(summary) {
  const root = document.getElementById('summary-grid');
  root.replaceChildren();
  [['Pedidos', summary.totalOrders || 0], ['Ingresos', `$${Number(summary.totalRevenue || 0).toFixed(2)}`]]
    .forEach(([label, value]) => {
      const card = document.createElement('div');
      card.className = 'summary-card';
      const caption = document.createElement('p');
      caption.className = 'summary-label';
      caption.textContent = label;
      const metric = document.createElement('strong');
      metric.textContent = String(value);
      card.append(caption, metric);
      root.appendChild(card);
    });
}

function renderReport(report, role) {
  const root = document.getElementById('reports-panel');
  root.replaceChildren();
  if (role === 'LOGISTICS') {
    const heading = document.createElement('p');
    heading.textContent = 'Inventario para logística';
    const list = document.createElement('ul');
    report.products.forEach((product) => {
      const item = document.createElement('li');
      item.textContent = `${product.name}: ${product.stock} unidades`;
      list.appendChild(item);
    });
    root.append(heading, list);
    return;
  }

  const revenue = document.createElement('p');
  revenue.textContent = `Ingresos totales: $${Number(report.summary.totalRevenue || 0).toFixed(2)} · Productos con stock bajo: ${report.summary.lowStock || 0}`;
  const productsList = document.createElement('ul');
  (report.products || []).slice(0, 3).forEach((product) => {
    const item = document.createElement('li');
    item.textContent = `${product.name} (${product.stock} disponibles)`;
    productsList.appendChild(item);
  });
  const orders = document.createElement('p');
  orders.textContent = `Pedidos registrados: ${(report.orders || []).length}`;
  root.append(revenue, productsList, orders);
}

function renderNotifications(items) {
  const root = document.getElementById('notifications-list');
  root.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No hay notificaciones pendientes.';
    root.appendChild(empty);
    return;
  }
  items.forEach((notification) => {
    const card = document.createElement('article');
    card.className = 'notification-item';
    const title = document.createElement('strong');
    title.textContent = notification.title;
    const tone = notification.level === 'warning' || notification.level === 'success'
      ? notification.level
      : 'neutral';
    const message = document.createElement('p');
    message.textContent = notification.message;
    card.append(title, createBadge(notification.level || 'info', tone), message);
    root.appendChild(card);
  });
}

function renderInvoices(items) {
  const root = document.getElementById('invoices-list');
  root.replaceChildren();
  if (!items.length) {
    const empty = document.createElement('p');
    empty.textContent = 'No hay facturas disponibles.';
    root.appendChild(empty);
    return;
  }
  items.forEach((invoice) => {
    const card = document.createElement('article');
    card.className = 'report-card';
    const customer = document.createElement('strong');
    customer.textContent = invoice.customer;
    const amount = document.createElement('span');
    amount.textContent = `$${Number(invoice.amount).toFixed(2)}`;
    const link = document.createElement('a');
    link.href = `/api/invoices/${encodeURIComponent(invoice.id)}/print`;
    link.target = '_blank';
    link.rel = 'noopener';
    link.textContent = 'Ver / guardar PDF';
    card.append(customer, amount, createBadge(invoice.status || 'Pendiente'), link);
    root.appendChild(card);
  });
}

export async function loadInsights() {
  const role = document.body.dataset.role;
  try {
    if (['ADMIN', 'SALES_AGENT', 'LOGISTICS'].includes(role)) {
      const report = await api('/api/reports');
      if (role === 'ADMIN') renderSummary(report.summary);
      if (role === 'SALES_AGENT') renderSalesSummary(report.summary);
      renderReport(report, role);
    } else {
      document.getElementById('summary-grid').replaceChildren();
      document.getElementById('reports-panel').replaceChildren();
    }

    if (['ADMIN', 'CUSTOMER'].includes(role)) {
      const [notifications, invoices] = await Promise.all([
        api('/api/notifications'),
        api('/api/invoices'),
      ]);
      renderNotifications(notifications.notifications);
      renderInvoices(invoices.invoices);
    } else {
      document.getElementById('notifications-list').replaceChildren();
      document.getElementById('invoices-list').replaceChildren();
    }

    if (role === 'ADMIN') {
      await initializeNotificationForm();
    }
  } catch (error) {
    showMessage(error.message);
  }
}

let notificationFormInitialized = false;
async function initializeNotificationForm() {
  const form = document.getElementById('notification-form');
  if (!notificationFormInitialized) {
    notificationFormInitialized = true;
    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(form);
      try {
        await api('/api/notifications', {
          method: 'POST',
          body: JSON.stringify({
            title: formData.get('title'),
            message: formData.get('message'),
            level: formData.get('level'),
            userId: formData.get('userId') || undefined,
          }),
        });
        form.reset();
        await loadInsights();
      } catch (error) {
        showMessage(error.message);
      }
    });
  }
}

export function initializeInvoiceForm(onChanged) {
  const form = document.getElementById('invoice-form');
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    try {
      await api('/api/invoices', {
        method: 'POST',
        body: JSON.stringify({
          customer: formData.get('customer'),
          customerEmail: formData.get('customerEmail'),
          amount: Number(formData.get('amount')),
          status: formData.get('status'),
        }),
      });
      form.reset();
      await onChanged();
    } catch (error) {
      showMessage(error.message);
    }
  });
}
