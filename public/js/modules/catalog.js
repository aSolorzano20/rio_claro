import { api, createCell, showMessage } from '../core/api.js';

export async function loadProducts() {
  const { products } = await api('/api/products');
  const tableRoot = document.getElementById('products-table');
  const checkoutSelect = document.getElementById('checkout-product');
  const table = document.createElement('table');
  const head = document.createElement('thead');
  const headRow = document.createElement('tr');
  const isAdmin = document.body.dataset.role === 'ADMIN';

  ['Producto', 'Categoría', 'Precio', 'Stock', ...(isAdmin ? ['Acciones'] : [])].forEach((label) => {
    const cell = document.createElement('th');
    cell.textContent = label;
    headRow.appendChild(cell);
  });
  head.appendChild(headRow);
  table.appendChild(head);

  const body = document.createElement('tbody');
  products.forEach((product) => {
    const row = document.createElement('tr');
    row.append(
      createCell(product.name),
      createCell(product.category),
      createCell(`$${Number(product.price).toFixed(2)}`),
      createCell(product.stock),
    );
    if (isAdmin) row.appendChild(createProductActions(product));
    body.appendChild(row);
  });
  table.appendChild(body);
  tableRoot.replaceChildren(table);

  checkoutSelect.replaceChildren();
  products.filter((product) => product.stock > 0).forEach((product) => {
    const option = document.createElement('option');
    option.value = product.id;
    option.textContent = `${product.name} · $${Number(product.price).toFixed(2)} · ${product.stock} disponibles`;
    checkoutSelect.appendChild(option);
  });
}

function createProductActions(product) {
  const cell = document.createElement('td');
  const editButton = document.createElement('button');
  editButton.type = 'button';
  editButton.className = 'text-button';
  editButton.textContent = 'Editar';
  editButton.addEventListener('click', async () => {
    const name = prompt('Nombre del producto:', product.name);
    if (name === null) return;
    const category = prompt('Categoría:', product.category);
    if (category === null) return;
    const price = prompt('Precio:', String(product.price));
    if (price === null) return;
    const stock = prompt('Stock:', String(product.stock));
    if (stock === null) return;
    try {
      await api(`/api/products/${encodeURIComponent(product.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, category, price: Number(price), stock: Number(stock) }),
      });
      await loadProducts();
    } catch (error) {
      showMessage(error.message);
    }
  });

  const deleteButton = document.createElement('button');
  deleteButton.type = 'button';
  deleteButton.className = 'text-button danger';
  deleteButton.textContent = 'Eliminar';
  deleteButton.addEventListener('click', async () => {
    if (!confirm(`¿Eliminar ${product.name}?`)) return;
    try {
      await api(`/api/products/${encodeURIComponent(product.id)}`, { method: 'DELETE' });
      await loadProducts();
    } catch (error) {
      showMessage(error.message);
    }
  });
  cell.append(editButton, deleteButton);
  return cell;
}

export function initializeCatalog(onChanged) {
  const form = document.getElementById('product-form');
  const checkoutForm = document.getElementById('checkout-form');
  document.getElementById('refresh-products-button').addEventListener('click', onChanged);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    try {
      await api('/api/products', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.get('name'),
          category: formData.get('category'),
          price: Number(formData.get('price')),
          stock: Number(formData.get('stock')),
        }),
      });
      form.reset();
      await onChanged();
    } catch (error) {
      showMessage(error.message);
    }
  });

  checkoutForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(checkoutForm);
    try {
      const result = await api('/api/checkout', {
        method: 'POST',
        body: JSON.stringify({
          items: [{ productId: formData.get('productId'), quantity: Number(formData.get('quantity')) }],
        }),
      });
      checkoutForm.reset();
      showMessage(`Pedido creado: ${result.order.id} · $${Number(result.order.total).toFixed(2)}`);
      await onChanged();
    } catch (error) {
      showMessage(error.message);
    }
  });
}
