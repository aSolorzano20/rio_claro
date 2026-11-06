import { api, clearSession, session } from './core/api.js';

const menuToggle = document.getElementById('menu-toggle');
const themeToggle = document.getElementById('theme-toggle');
const siteNav = document.getElementById('site-nav');
const productGrid = document.getElementById('product-grid');
const catalogNote = document.getElementById('catalog-note');
const tabButtons = [...document.querySelectorAll('[role="tab"][data-tab]')];
const tabPanels = [...document.querySelectorAll('[role="tabpanel"]')];
const customerChatPanel = document.getElementById('customer-chat-panel');
const customerChatWindow = document.getElementById('customer-chat-window');
const customerChatForm = document.getElementById('customer-chat-form');
const customerChatInput = document.getElementById('customer-chat-input');
const customerChatSend = document.getElementById('customer-chat-send');
const portalAccountLink = document.getElementById('portal-account-link');
let customerConversationId = null;
let customerChatWaiting = false;

function setTheme(theme, persist = false) {
  document.documentElement.dataset.theme = theme;
  themeToggle.setAttribute('aria-checked', String(theme === 'dark'));
  if (persist) localStorage.setItem('rioClaroTheme', theme);
}

const savedTheme = localStorage.getItem('rioClaroTheme');
const initialTheme = savedTheme === 'light' || savedTheme === 'dark'
  ? savedTheme
  : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
setTheme(initialTheme);

themeToggle.addEventListener('click', () => {
  const nextTheme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark';
  setTheme(nextTheme, true);
});

function updatePortalAccountLink(user) {
  portalAccountLink.textContent = user?.name || 'Acceso al portal';
  portalAccountLink.href = user ? '/portal' : '/portal#auth';
  portalAccountLink.setAttribute('aria-label', user ? `Portal de ${user.name}` : 'Acceso al portal');
}

async function restorePortalAccount() {
  if (!session.token) {
    updatePortalAccountLink(null);
    return;
  }

  try {
    const { user } = await api('/api/auth/me');
    session.user = user;
    localStorage.setItem('rioClaroUser', JSON.stringify(user));
    updatePortalAccountLink(user);
  } catch (error) {
    clearSession();
    updatePortalAccountLink(null);
    if (error.status !== 401) console.error('No se pudo validar la sesión del portal:', error);
  }
}

window.addEventListener('storage', (event) => {
  if (event.key === 'rioClaroToken') session.token = event.newValue || '';
  if (event.key === 'rioClaroUser') {
    try {
      session.user = JSON.parse(event.newValue || 'null');
    } catch {
      session.user = null;
    }
  }
  if (event.key === 'rioClaroToken' || event.key === 'rioClaroUser') {
    updatePortalAccountLink(session.token ? session.user : null);
    restorePortalAccount();
  }
});

restorePortalAccount();

function initializeCustomerChat() {
  appendCustomerChatMessage('Hola, soy el Agente de Atención a Clientes de Río Claro. ¿En qué puedo ayudarte?', 'bot');
}

function appendCustomerChatMessage(text, role) {
  const message = document.createElement('p');
  message.className = `customer-chat-message ${role}`;
  message.textContent = text;
  customerChatWindow.appendChild(message);
  customerChatWindow.scrollTop = customerChatWindow.scrollHeight;
}

customerChatForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const message = customerChatInput.value.trim();
  if (!message || customerChatWaiting) return;

  appendCustomerChatMessage(message, 'user');
  customerChatInput.value = '';
  customerChatWaiting = true;
  customerChatSend.disabled = true;
  customerChatSend.textContent = 'Escribiendo…';
  try {
    const requestBody = { message };
    if (customerConversationId) requestBody.conversation_id = customerConversationId;
    const result = await api('/api/chat', {
      method: 'POST',
      body: JSON.stringify(requestBody),
    });
    customerConversationId = result.conversation_id;
    appendCustomerChatMessage(result.reply, 'bot');
  } catch (error) {
    appendCustomerChatMessage(error.message, 'bot');
  } finally {
    customerChatWaiting = false;
    customerChatSend.disabled = false;
    customerChatSend.textContent = 'Enviar';
  }
});

customerChatInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter' && !event.shiftKey) {
    event.preventDefault();
    customerChatForm.requestSubmit();
  }
});

initializeCustomerChat();

function activateTab(tabId) {
  const selectedTab = tabButtons.find((button) => button.dataset.tab === tabId);
  if (!selectedTab) return false;

  tabButtons.forEach((button) => {
    const isSelected = button === selectedTab;
    button.setAttribute('aria-selected', String(isSelected));
    button.tabIndex = isSelected ? 0 : -1;
  });
  tabPanels.forEach((panel) => {
    panel.hidden = panel.id !== tabId;
  });
  return true;
}

function navigateToTab(tabId) {
  if (!activateTab(tabId)) return;
  if (window.location.hash !== `#${tabId}`) {
    window.history.pushState(null, '', `#${tabId}`);
  }
  siteNav.classList.remove('open');
  menuToggle.setAttribute('aria-expanded', 'false');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

menuToggle.addEventListener('click', () => {
  const isExpanded = menuToggle.getAttribute('aria-expanded') === 'true';
  menuToggle.setAttribute('aria-expanded', String(!isExpanded));
  siteNav.classList.toggle('open', !isExpanded);
});

siteNav.addEventListener('click', (event) => {
  const link = event.target.closest('a');
  if (link) {
    siteNav.classList.remove('open');
    menuToggle.setAttribute('aria-expanded', 'false');
  }
});

tabButtons.forEach((button) => {
  button.addEventListener('click', () => navigateToTab(button.dataset.tab));
  button.addEventListener('keydown', (event) => {
    const currentIndex = tabButtons.indexOf(button);
    let nextIndex;
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % tabButtons.length;
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + tabButtons.length) % tabButtons.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = tabButtons.length - 1;
    if (nextIndex === undefined) return;

    event.preventDefault();
    const nextTab = tabButtons[nextIndex];
    nextTab.focus();
    navigateToTab(nextTab.dataset.tab);
  });
});

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  const tabId = link?.getAttribute('href')?.slice(1);
  if (!tabId || !tabButtons.some((button) => button.dataset.tab === tabId)) return;

  event.preventDefault();
  navigateToTab(tabId);
});

window.addEventListener('popstate', () => {
  const tabId = window.location.hash.slice(1);
  if (activateTab(tabId)) window.scrollTo({ top: 0, behavior: 'smooth' });
});

const initialTab = window.location.hash.slice(1);
activateTab(initialTab || 'catalogo');

function createProductCard(product, index) {
  const card = document.createElement('article');
  card.className = 'product-card';

  const art = document.createElement('div');
  art.className = 'product-art';
  art.setAttribute('aria-hidden', 'true');
  art.textContent = ['◈', '◉', '◇', '▧'][index % 4];

  const info = document.createElement('div');
  info.className = 'product-info';
  const category = document.createElement('p');
  category.className = 'product-category';
  category.textContent = product.category;
  const name = document.createElement('h3');
  name.textContent = product.name;
  const bottom = document.createElement('div');
  bottom.className = 'product-bottom';
  const price = document.createElement('span');
  price.className = 'product-price';
  price.textContent = `$${Number(product.price).toFixed(2)}`;
  const link = document.createElement('a');
  link.className = 'product-cta';
  link.href = '/portal#auth';
  link.textContent = 'Solicitar →';
  bottom.append(price, link);
  info.append(category, name, bottom);
  card.append(art, info);
  return card;
}

async function loadProducts() {
  try {
    const response = await fetch('/api/public/products');
    if (!response.ok) throw new Error('El catálogo de productos no está disponible por el momento.');
    const { products } = await response.json();
    productGrid.replaceChildren();
    if (!Array.isArray(products) || products.length === 0) {
      catalogNote.textContent = 'Pronto encontrarás nuevos productos aquí.';
      return;
    }

    products.forEach((product, index) => {
      productGrid.appendChild(createProductCard(product, index));
    });
    catalogNote.textContent = 'Consulta el catálogo completo de productos y su disponibilidad al iniciar sesión.';
  } catch (error) {
    catalogNote.textContent = error.message;
    const emptyState = document.createElement('p');
    emptyState.className = 'catalog-empty';
    emptyState.textContent = 'Estamos actualizando el catálogo. Vuelve a intentarlo más tarde.';
    productGrid.replaceChildren(emptyState);
  }
}

document.getElementById('current-year').textContent = String(new Date().getFullYear());
loadProducts();
