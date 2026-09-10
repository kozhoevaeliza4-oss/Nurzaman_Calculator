'use strict';

const TOKEN_KEY = 'kms_token';
const USER_KEY = 'kms_user';

const ROLE_LABELS = {
  director: 'Директор',
  admin: 'Администратор',
  accountant: 'Бухгалтер',
  teacher: 'Воспитатель',
  medic: 'Медработник',
  parent: 'Родитель',
};

const STAFF_ROLES = ['director', 'admin', 'accountant', 'teacher', 'medic'];

const STATUS_LABELS = {
  active: 'Активен',
  left: 'Выбыл',
  academic_leave: 'Академ. отпуск',
};

const MEAL_LABELS = {
  breakfast: 'Завтрак',
  lunch: 'Обед',
  snack: 'Полдник',
};

const loginScreen = document.getElementById('login-screen');
const appShell = document.getElementById('app-shell');
const loginForm = document.getElementById('login-form');
const loginError = document.getElementById('login-error');
const mainContent = document.getElementById('main-content');
const whoName = document.getElementById('who-name');
const whoRole = document.getElementById('who-role');
const logoutBtn = document.getElementById('logout-btn');

function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

function getUser() {
  const raw = localStorage.getItem(USER_KEY);
  return raw ? JSON.parse(raw) : null;
}

function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

// Every protected call goes through here so a 401 (expired/invalid token)
// always drops back to the login screen instead of showing a broken page.
async function api(path, options = {}) {
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getToken()}`,
      ...(options.headers || {}),
    },
  });
  if (res.status === 401) {
    clearSession();
    showLogin('Сессия истекла — войдите снова.');
    throw new Error('unauthorized');
  }
  const body = await res.json().catch(() => null);
  if (!res.ok) {
    const message = Array.isArray(body?.message) ? body.message.join(', ') : body?.message;
    throw new Error(message || `Ошибка ${res.status}`);
  }
  return body;
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('ru-RU');
}

function fmtDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

// ---------- Login ----------

function showLogin(message) {
  loginScreen.hidden = false;
  appShell.hidden = true;
  if (message) {
    loginError.textContent = message;
    loginError.hidden = false;
  }
}

function showApp() {
  loginScreen.hidden = true;
  appShell.hidden = false;
}

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.hidden = true;
  const email = document.getElementById('email').value.trim();
  const password = document.getElementById('password').value;
  const submitBtn = loginForm.querySelector('button[type=submit]');
  submitBtn.disabled = true;
  submitBtn.textContent = 'Входим…';
  try {
    const res = await fetch('/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const body = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(body?.message || 'Неверный email или пароль');
    }
    setSession(body.accessToken, body.user);
    boot();
  } catch (err) {
    loginError.textContent = err.message;
    loginError.hidden = false;
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = 'Войти';
  }
});

logoutBtn.addEventListener('click', () => {
  clearSession();
  loginForm.reset();
  showLogin();
});

// ---------- Boot / routing ----------

function boot() {
  const token = getToken();
  const user = getUser();
  if (!token || !user) {
    showLogin();
    return;
  }
  showApp();
  whoName.textContent = user.fullName;
  whoRole.textContent = ROLE_LABELS[user.role] || user.role;

  if (user.role === 'parent') {
    renderParentView();
  } else if (STAFF_ROLES.includes(user.role)) {
    renderStaffView(user);
  } else {
    mainContent.innerHTML = '<div class="error-block">Неизвестная роль аккаунта.</div>';
  }
}

// ---------- Staff view ----------

async function renderStaffView(user) {
  mainContent.innerHTML = '<div class="loading">Загрузка…</div>';

  const canSeeDashboard = user.role === 'director' || user.role === 'admin';
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + '01';

  try {
    const [summary, childrenPage, groups] = await Promise.all([
      canSeeDashboard ? api(`/dashboard/summary?from=${monthStart}&to=${today}`) : Promise.resolve(null),
      api('/children?pageSize=50'),
      api('/groups'),
    ]);

    const groupNameById = new Map(groups.map((g) => [g.id, g.name]));

    const statsHtml = summary
      ? `
        <section>
          <h2 class="section-title">Сводка за месяц</h2>
          <div class="stats">
            <div class="stat"><div class="n mono">${summary.income} сом</div><div class="l">Доходы</div></div>
            <div class="stat"><div class="n mono">${summary.expenses} сом</div><div class="l">Расходы</div></div>
            <div class="stat"><div class="n mono">${summary.profit} сом</div><div class="l">Прибыль</div></div>
            <div class="stat"><div class="n mono">${summary.debt.total} сом</div><div class="l">Задолженность (${summary.debt.debtorCount} чел.)</div></div>
            <div class="stat"><div class="n mono">${summary.attendance.present}/${summary.attendance.total}</div><div class="l">Присутствует сегодня</div></div>
            <div class="stat"><div class="n mono">${summary.freeSpots.reduce((s, g) => s + g.freeSpots, 0)}</div><div class="l">Свободных мест всего</div></div>
          </div>
        </section>
      `
      : '';

    const rows = childrenPage.items
      .map((child) => {
        const allergyBadges = child.allergies.length
          ? child.allergies.map((a) => `<span class="badge allergy">${escapeHtml(a)}</span>`).join('')
          : '<span class="badge">нет</span>';
        return `
          <tr>
            <td>${escapeHtml(child.fullName)}</td>
            <td>${escapeHtml(groupNameById.get(child.groupId) || '—')}</td>
            <td>${fmtDate(child.dateOfBirth)}</td>
            <td><span class="badge status-${child.status}">${STATUS_LABELS[child.status] || child.status}</span></td>
            <td>${allergyBadges}</td>
          </tr>
        `;
      })
      .join('');

    mainContent.innerHTML = `
      ${statsHtml}
      <section>
        <h2 class="section-title">Дети (${childrenPage.total})</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>ФИО</th><th>Группа</th><th>Дата рождения</th><th>Статус</th><th>Аллергии</th></tr>
            </thead>
            <tbody>
              ${rows || '<tr><td colspan="5" class="empty-note">Пока нет ни одного ребёнка</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    `;
  } catch (err) {
    if (err.message !== 'unauthorized') {
      mainContent.innerHTML = `<div class="error-block">Не удалось загрузить данные: ${escapeHtml(err.message)}</div>`;
    }
  }
}

// ---------- Parent view ----------

async function renderParentView() {
  mainContent.innerHTML = '<div class="loading">Загрузка…</div>';
  try {
    const data = await api('/me/dashboard');

    if (data.children.length === 0) {
      mainContent.innerHTML = '<div class="empty-note">К вашему аккаунту пока не привязан ни один ребёнок.</div>';
      return;
    }

    const cards = data.children
      .map((child) => {
        const balance = child.balance;
        const lastEvent = child.recentAttendance[0];
        const attendanceLine = lastEvent
          ? `<div class="attendance-line"><span>${lastEvent.eventType === 'check_in' ? 'Пришёл' : 'Ушёл'}</span><span class="mono">${fmtDateTime(lastEvent.occurredAt)}</span></div>`
          : '<div class="attendance-line"><span>Сегодня отметок ещё нет</span></div>';

        const menuLines = data.todayMenu.length
          ? data.todayMenu
              .map(
                (m) =>
                  `<div class="menu-line"><span class="meal">${MEAL_LABELS[m.mealType] || m.mealType}</span><span>${escapeHtml(m.dishName)}</span></div>`,
              )
              .join('')
          : '<div class="menu-line"><span>Меню на сегодня ещё не опубликовано</span></div>';

        const notifLines = data.notifications.length
          ? data.notifications
              .slice(0, 5)
              .map((n) => `<div class="notif-line"><span>${escapeHtml(n.message)}</span><span class="mono">${fmtDateTime(n.createdAt)}</span></div>`)
              .join('')
          : '<div class="notif-line"><span>Пока нет уведомлений</span></div>';

        return `
          <div class="child-card">
            <div class="head">
              <div class="name">${escapeHtml(child.fullName || 'Ребёнок')}</div>
              ${child.allergies && child.allergies.length ? child.allergies.map((a) => `<span class="badge allergy">${escapeHtml(a)}</span>`).join('') : ''}
            </div>
            <div class="balance-row">
              <div><div class="n">${balance.charged} сом</div><div class="l">Начислено</div></div>
              <div><div class="n">${balance.paid} сом</div><div class="l">Оплачено</div></div>
              <div><div class="n ${Number(balance.debt) > 0 ? 'debt' : ''}">${balance.debt} сом</div><div class="l">Задолженность</div></div>
            </div>
            <div class="sub-block">
              <h4>Посещаемость</h4>
              ${attendanceLine}
            </div>
            <div class="sub-block">
              <h4>Меню сегодня</h4>
              ${menuLines}
            </div>
            <div class="sub-block">
              <h4>Уведомления</h4>
              ${notifLines}
            </div>
          </div>
        `;
      })
      .join('');

    mainContent.innerHTML = `
      <section>
        <h2 class="section-title">Личный кабинет</h2>
        ${cards}
      </section>
    `;
  } catch (err) {
    if (err.message !== 'unauthorized') {
      mainContent.innerHTML = `<div class="error-block">Не удалось загрузить данные: ${escapeHtml(err.message)}</div>`;
    }
  }
}

boot();
