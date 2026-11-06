import { api, createCell, showMessage } from '../core/api.js';

const orderStates = ['Procesando', 'Preparando', 'En tránsito', 'Entregado', 'Cancelado'];

export async function loadOrders() {
  const { orders } = await api('/api/orders');
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const headerRow = document.createElement('tr');
  const canUpdate = ['ADMIN', 'LOGISTICS'].includes(document.body.dataset.role);

  ['Pedido', 'Cliente', 'Total', 'Estado', ...(canUpdate ? ['Logística'] : [])].forEach((label) => {
    const cell = document.createElement('th');
    cell.textContent = label;
    headerRow.appendChild(cell);
  });
  head.appendChild(headerRow);
  table.appendChild(head);

  const body = document.createElement('tbody');
  orders.forEach((order) => {
    const row = document.createElement('tr');
    row.append(
      createCell(order.id),
      createCell(order.customer),
      createCell(`$${Number(order.total).toFixed(2)}`),
      createCell(order.status),
    );
    if (canUpdate) row.appendChild(createStatusEditor(order));
    body.appendChild(row);
  });
  table.appendChild(body);
  document.getElementById('orders-table').replaceChildren(table);
}

function createStatusEditor(order) {
  const cell = document.createElement('td');
  const select = document.createElement('select');
  orderStates.forEach((status) => {
    const option = document.createElement('option');
    option.value = status;
    option.textContent = status;
    option.selected = status === order.status;
    select.appendChild(option);
  });
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'text-button';
  button.textContent = 'Guardar';
  button.addEventListener('click', async () => {
    try {
      await api(`/api/orders/${encodeURIComponent(order.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: select.value }),
      });
      await loadOrders();
    } catch (error) {
      showMessage(error.message);
    }
  });
  cell.append(select, button);
  return cell;
}

export function initializeOrders(onChanged) {
  const form = document.getElementById('order-form');
  document.getElementById('refresh-orders-button').addEventListener('click', onChanged);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    try {
      await api('/api/orders', {
        method: 'POST',
        body: JSON.stringify({
          customer: formData.get('customer'),
          customerEmail: formData.get('customerEmail'),
          total: Number(formData.get('total')),
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
