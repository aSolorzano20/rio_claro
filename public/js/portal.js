import { api, clearSession, session, showMessage } from './core/api.js';
import { initializeAuth, initializeUserAdministration, loadUsers, restoreSession } from './modules/auth.js';
import { initializeCatalog, loadProducts } from './modules/catalog.js';
import { initializeOrders, loadOrders } from './modules/orders.js';
import { initializeInvoiceForm, loadInsights } from './modules/insights.js';
import { initializeChat } from './modules/chat.js';

const views = document.querySelectorAll('.view-panel');
const navigationButtons = document.querySelectorAll('button.nav-button');
const userBadge = document.getElementById('user-badge');
const logoutButton = document.getElementById('logout-button');
const runtimeNotice = document.getElementById('runtime-notice');
const initialView = window.location.hash === '#auth' ? 'auth' : window.location.hash === '#chat' ? 'chat' : 'home';
let restoringSession = true;

const savedTheme = localStorage.getItem('rioClaroTheme');
const initialTheme = savedTheme === 'light' || savedTheme === 'dark'
  ? savedTheme
  : (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
document.documentElement.dataset.theme = initialTheme;

function setView(name) {
  views.forEach((view) => view.classList.toggle('active', view.id === `${name}-view`));
  navigationButtons.forEach((button) => button.classList.toggle('active', button.dataset.view === name));
}

function updateRoleVisibility() {
  const role = session.user?.role || '';
  document.body.dataset.role = role;
  userBadge.textContent = session.user ? `${session.user.name} · ${role}` : 'Visitante';
  logoutButton.hidden = !session.user;
  document.querySelectorAll('.admin-only').forEach((element) => { element.hidden = role !== 'ADMIN'; });
  document.querySelectorAll('.customer-only').forEach((element) => { element.hidden = role !== 'CUSTOMER'; });
  document.querySelectorAll('.sales-only').forEach((element) => { element.hidden = !['ADMIN', 'SALES_AGENT'].includes(role); });
  document.querySelectorAll('.logistics-only').forEach((element) => { element.hidden = !['ADMIN', 'LOGISTICS'].includes(role); });
}

async function loadPortalData() {
  if (!session.user) return;
  updateRoleVisibility();
  const tasks = [loadProducts()];
  if (['ADMIN', 'CUSTOMER', 'SALES_AGENT', 'LOGISTICS'].includes(session.user.role)) tasks.push(loadOrders());
  if (['ADMIN', 'CUSTOMER', 'SALES_AGENT', 'LOGISTICS'].includes(session.user.role)) tasks.push(loadInsights());
  if (session.user.role === 'ADMIN') tasks.push(loadUsers());
  try {
    await Promise.all(tasks);
  } catch (error) {
    showMessage(error.message);
  }
}

function handleSessionChanged() {
  updateRoleVisibility();
  setView(restoringSession ? (initialView === 'chat' ? 'auth' : initialView) : 'home');
}

function handleAuthenticated() {
  updateRoleVisibility();
  if (initialView === 'chat') {
    setView('chat');
    return;
  }
  setView('dashboard');
  loadPortalData();
}

navigationButtons.forEach((button) => {
  button.addEventListener('click', () => {
    const target = button.dataset.view;
    if (['dashboard', 'chat'].includes(target) && !session.user) {
      setView('auth');
      return;
    }
    setView(target);
    if (target === 'dashboard') loadPortalData();
  });
});

document.getElementById('show-auth-button').addEventListener('click', () => setView('auth'));
initializeAuth(handleAuthenticated, handleSessionChanged);
initializeCatalog(loadPortalData);
initializeOrders(loadPortalData);
initializeInvoiceForm(loadPortalData);
initializeUserAdministration(loadPortalData);
initializeChat();

api('/api/status')
  .then((status) => {
    const notices = [];
    if (status.mode === 'demo') notices.push('Modo demo: los datos se borran al reiniciar.');
    if (!status.commerceDataConnected) notices.push('El almacén comercial productivo aún no está conectado.');
    if (!status.foundryConfigured) notices.push('El chat con Foundry no está configurado.');
    runtimeNotice.textContent = notices.join(' ');
    runtimeNotice.hidden = !notices.length;
  })
  .catch((error) => {
    runtimeNotice.textContent = error.message;
    runtimeNotice.hidden = false;
  });

setView(initialView);
updateRoleVisibility();
restoreSession(handleAuthenticated, handleSessionChanged).finally(() => {
  restoringSession = false;
});
