function readUser() {
  try {
    return JSON.parse(localStorage.getItem('rioClaroUser') || 'null');
  } catch {
    localStorage.removeItem('rioClaroUser');
    return null;
  }
}

export const session = {
  token: localStorage.getItem('rioClaroToken') || '',
  user: readUser(),
};

export async function api(url, options = {}) {
  const { headers: extraHeaders = {}, ...requestOptions } = options;
  const headers = { ...extraHeaders };
  if (session.token) headers.Authorization = `Bearer ${session.token}`;
  if (requestOptions.body && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }

  const response = await fetch(url, { ...requestOptions, headers });
  if (response.status === 204) return {};

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(payload.error || 'La operación no pudo completarse.');
    error.status = response.status;
    throw error;
  }
  return payload;
}

export function saveSession(token, user) {
  session.token = token;
  session.user = user;
  localStorage.setItem('rioClaroToken', token);
  localStorage.setItem('rioClaroUser', JSON.stringify(user));
}

export function clearSession() {
  session.token = '';
  session.user = null;
  localStorage.removeItem('rioClaroToken');
  localStorage.removeItem('rioClaroUser');
}

export function showMessage(message) {
  const dialog = document.getElementById('message-dialog');
  const dialogMessage = document.getElementById('dialog-message');
  if (!dialog || !dialogMessage) return;
  dialogMessage.textContent = message;
  if (!dialog.open) dialog.showModal();
}

export function createCell(text) {
  const cell = document.createElement('td');
  cell.textContent = String(text);
  return cell;
}

export function createBadge(text, tone = 'neutral') {
  const badge = document.createElement('span');
  badge.className = `status-badge ${tone}`;
  badge.textContent = String(text);
  return badge;
}
