import { api, clearSession, saveSession, session, showMessage, createBadge } from '../core/api.js';

function showAuthError(message) {
  const feedback = document.getElementById('auth-feedback');
  feedback.textContent = message;
}

function persistAuthenticatedUser(payload) {
  saveSession(payload.token, payload.user);
  showAuthError('');
}

export function initializeAuth(onAuthenticated, onSessionChanged) {
  const loginForm = document.getElementById('login-form');
  const registerForm = document.getElementById('register-form');
  const showRegisterButton = document.getElementById('show-register-button');
  const showLoginButton = document.getElementById('show-login-button');
  const logoutButton = document.getElementById('logout-button');

  showRegisterButton.addEventListener('click', () => {
    loginForm.hidden = true;
    showRegisterButton.hidden = true;
    showRegisterButton.setAttribute('aria-expanded', 'true');
    registerForm.hidden = false;
    registerForm.querySelector('input[name="name"]').focus();
    showAuthError('');
  });

  showLoginButton.addEventListener('click', () => {
    registerForm.hidden = true;
    loginForm.hidden = false;
    showRegisterButton.hidden = false;
    showRegisterButton.setAttribute('aria-expanded', 'false');
    loginForm.querySelector('input[name="email"]').focus();
    showAuthError('');
  });

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(loginForm);
    try {
      const payload = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          email: formData.get('email'),
          password: formData.get('password'),
        }),
      });
      persistAuthenticatedUser(payload);
      loginForm.reset();
      onAuthenticated();
    } catch (error) {
      showAuthError(error.message);
    }
  });

  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(registerForm);
    try {
      const payload = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          password: formData.get('password'),
        }),
      });
      persistAuthenticatedUser(payload);
      registerForm.reset();
      onAuthenticated();
    } catch (error) {
      showAuthError(error.message);
    }
  });

  logoutButton.addEventListener('click', () => {
    clearSession();
    onSessionChanged();
  });

  document.getElementById('password-reset-button').addEventListener('click', () => {
    showMessage('La recuperación por correo necesita un proveedor de correo y un almacén persistente de tokens configurados.');
  });
}

export async function restoreSession(onAuthenticated, onSessionChanged) {
  if (!session.token) {
    onSessionChanged();
    return;
  }
  try {
    const payload = await api('/api/auth/me');
    session.user = payload.user;
    localStorage.setItem('rioClaroUser', JSON.stringify(payload.user));
    onAuthenticated();
  } catch (error) {
    clearSession();
    onSessionChanged();
    if (error.status !== 401) showMessage(error.message);
  }
}

export async function loadUsers() {
  const list = document.getElementById('users-list');
  const recipient = document.getElementById('notification-recipient');
  if (!list || !recipient) return;

  const { users } = await api('/api/users');
  list.replaceChildren();
  recipient.replaceChildren();
  const adminOption = document.createElement('option');
  adminOption.value = '';
  adminOption.textContent = 'Administradores';
  recipient.appendChild(adminOption);

  users.forEach((user) => {
    const row = document.createElement('div');
    row.className = 'user-list-item';
    const identity = document.createElement('span');
    identity.textContent = `${user.name} · ${user.email}`;
    const role = createBadge(user.role);
    const id = document.createElement('code');
    id.textContent = user.id;
    row.append(identity, role, id);
    list.appendChild(row);

    if (user.role === 'CUSTOMER') {
      const option = document.createElement('option');
      option.value = user.id;
      option.textContent = `${user.name} (${user.email})`;
      recipient.appendChild(option);
    }
  });
}

export function initializeUserAdministration(onChanged) {
  const userForm = document.getElementById('user-form');
  const roleForm = document.getElementById('role-form');

  userForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(userForm);
    try {
      await api('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.get('name'),
          email: formData.get('email'),
          password: formData.get('password'),
          role: formData.get('role'),
        }),
      });
      userForm.reset();
      await onChanged();
      showMessage('Usuario creado correctamente.');
    } catch (error) {
      showMessage(error.message);
    }
  });

  roleForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const formData = new FormData(roleForm);
    try {
      await api('/api/roles', {
        method: 'POST',
        body: JSON.stringify({
          userId: formData.get('userId'),
          role: formData.get('role'),
        }),
      });
      roleForm.reset();
      await onChanged();
      showMessage('Rol actualizado correctamente.');
    } catch (error) {
      showMessage(error.message);
    }
  });
}
