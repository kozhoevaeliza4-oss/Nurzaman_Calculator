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

function showToast(message) {
  const el = document.createElement('div');
  el.className = 'toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2600);
}

// ---------- Modal helper ----------
// Renders `bodyHtml` inside a modal and wires up a form submit handler that
// posts JSON to `path`; on success it closes the modal, toasts, and calls
// onDone() (typically a re-render of the current view).
function openModal({ title, bodyHtml, path, buildPayload, onSubmit, onDone, submitLabel = 'Сохранить' }) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.innerHTML = `
    <div class="modal">
      <h3>${escapeHtml(title)}</h3>
      <div class="modal-error" hidden></div>
      <form>
        ${bodyHtml}
        <div class="modal-actions">
          <button type="submit" class="btn">${escapeHtml(submitLabel)}</button>
          <button type="button" class="btn secondary" data-close>Отмена</button>
        </div>
      </form>
    </div>
  `;
  document.body.appendChild(backdrop);

  const close = () => backdrop.remove();
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
  backdrop.querySelector('[data-close]').addEventListener('click', close);

  const form = backdrop.querySelector('form');
  const errorEl = backdrop.querySelector('.modal-error');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errorEl.hidden = true;
    const submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    try {
      if (onSubmit) {
        await onSubmit(new FormData(form));
      } else {
        const payload = buildPayload(new FormData(form));
        await api(path, { method: 'POST', body: JSON.stringify(payload) });
      }
      close();
      showToast('Сохранено');
      onDone?.();
    } catch (err) {
      if (err.message !== 'unauthorized') {
        errorEl.textContent = err.message;
        errorEl.hidden = false;
        submitBtn.disabled = false;
      }
    }
  });

  return backdrop;
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
  const canManage = user.role === 'director' || user.role === 'admin';
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + '01';

  try {
    const [summary, childrenPage, groups, parentsPage] = await Promise.all([
      canSeeDashboard ? api(`/dashboard/summary?from=${monthStart}&to=${today}`) : Promise.resolve(null),
      api('/children?pageSize=50'),
      api('/groups'),
      canManage ? api('/parents?pageSize=50') : Promise.resolve(null),
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

    const groupRows = groups
      .map(
        (g) => `
          <tr>
            <td>${escapeHtml(g.name)}</td>
            <td>${g.capacity}</td>
          </tr>
        `,
      )
      .join('');

    const parentRows = parentsPage
      ? parentsPage.items
          .map(
            (p) => `
              <tr>
                <td>${escapeHtml(p.fullName)}</td>
                <td>${escapeHtml(p.phone || '—')}</td>
                <td>${escapeHtml(p.email || '—')}</td>
              </tr>
            `,
          )
          .join('')
      : '';

    const groupsHtml = `
      <section>
        <div class="section-header">
          <h2 class="section-title">Группы (${groups.length})</h2>
          ${canManage ? '<button class="btn-small" data-action="add-group">+ Добавить группу</button>' : ''}
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Название</th><th>Вместимость</th></tr></thead>
            <tbody>${groupRows || '<tr><td colspan="2" class="empty-note">Групп пока нет</td></tr>'}</tbody>
          </table>
        </div>
      </section>
    `;

    const childrenHtml = `
      <section>
        <div class="section-header">
          <h2 class="section-title">Дети (${childrenPage.total})</h2>
          ${canManage ? '<button class="btn-small" data-action="add-child">+ Добавить ребёнка</button>' : ''}
        </div>
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

    const parentsHtml = parentsPage
      ? `
        <section>
          <div class="section-header">
            <h2 class="section-title">Родители (${parentsPage.total})</h2>
            <button class="btn-small" data-action="add-parent">+ Добавить родителя</button>
          </div>
          <div class="table-wrap">
            <table>
              <thead><tr><th>ФИО</th><th>Телефон</th><th>Email</th></tr></thead>
              <tbody>${parentRows || '<tr><td colspan="3" class="empty-note">Родителей пока нет</td></tr>'}</tbody>
            </table>
          </div>
        </section>
      `
      : '';

    mainContent.innerHTML = `${statsHtml}${groupsHtml}${childrenHtml}${parentsHtml}`;

    mainContent.querySelector('[data-action="add-group"]')?.addEventListener('click', () => openAddGroupModal(user));
    mainContent.querySelector('[data-action="add-child"]')?.addEventListener('click', () => openAddChildModal(user, groups));
    mainContent.querySelector('[data-action="add-parent"]')?.addEventListener('click', () => openAddParentModal(user, childrenPage.items));
  } catch (err) {
    if (err.message !== 'unauthorized') {
      mainContent.innerHTML = `<div class="error-block">Не удалось загрузить данные: ${escapeHtml(err.message)}</div>`;
    }
  }
}

function openAddGroupModal(user) {
  openModal({
    title: 'Новая группа',
    path: '/groups',
    submitLabel: 'Создать группу',
    bodyHtml: `
      <div class="field">
        <label>Название группы</label>
        <input name="name" required placeholder="Например: Ромашка" />
      </div>
      <div class="field">
        <label>Вместимость (мест)</label>
        <input name="capacity" type="number" min="1" required placeholder="20" />
      </div>
    `,
    buildPayload: (fd) => ({
      name: fd.get('name').trim(),
      capacity: Number(fd.get('capacity')),
    }),
    onDone: () => renderStaffView(user),
  });
}

function openAddChildModal(user, groups) {
  const groupOptions = groups.map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');
  openModal({
    title: 'Новый ребёнок',
    path: '/children',
    submitLabel: 'Добавить ребёнка',
    bodyHtml: `
      <div class="field">
        <label>ФИО ребёнка</label>
        <input name="fullName" required placeholder="Иванов Алихан Бекович" />
      </div>
      <div class="field">
        <label>Дата рождения</label>
        <input name="dateOfBirth" type="date" required />
      </div>
      <div class="field">
        <label>Дата зачисления</label>
        <input name="enrollmentDate" type="date" required value="${new Date().toISOString().slice(0, 10)}" />
      </div>
      <div class="field">
        <label>Группа</label>
        <select name="groupId">
          <option value="">— без группы —</option>
          ${groupOptions}
        </select>
      </div>
      <div class="field">
        <label>Аллергии (через запятую)</label>
        <input name="allergies" placeholder="орехи, мёд" />
        <div class="hint-small">Оставьте пустым, если аллергий нет</div>
      </div>
    `,
    buildPayload: (fd) => {
      const allergiesRaw = fd.get('allergies').trim();
      const payload = {
        fullName: fd.get('fullName').trim(),
        dateOfBirth: fd.get('dateOfBirth'),
        enrollmentDate: fd.get('enrollmentDate'),
        allergies: allergiesRaw ? allergiesRaw.split(',').map((a) => a.trim()).filter(Boolean) : [],
      };
      const groupId = fd.get('groupId');
      if (groupId) payload.groupId = groupId;
      return payload;
    },
    onDone: () => renderStaffView(user),
  });
}

const RELATION_LABELS = {
  mother: 'Мать',
  father: 'Отец',
  guardian: 'Опекун',
  other: 'Другое',
};

function openAddParentModal(user, children) {
  const childOptions = children.map((c) => `<option value="${c.id}">${escapeHtml(c.fullName)}</option>`).join('');
  const relationOptions = Object.entries(RELATION_LABELS)
    .map(([value, label]) => `<option value="${value}">${label}</option>`)
    .join('');

  openModal({
    title: 'Новый родитель',
    submitLabel: 'Добавить родителя',
    bodyHtml: `
      <div class="field">
        <label>ФИО родителя</label>
        <input name="fullName" required placeholder="Иванова Айгуль Сериковна" />
      </div>
      <div class="field">
        <label>Телефон</label>
        <input name="phone" placeholder="+996 700 000 000" />
      </div>
      <div class="field">
        <label>Email (для входа в личный кабинет)</label>
        <input name="email" type="email" placeholder="parent@example.com" />
      </div>
      <div class="field">
        <label>Пароль для входа</label>
        <input name="password" type="password" minlength="8" placeholder="Не менее 8 символов" />
        <div class="hint-small">Заполните вместе с email, если хотите сразу выдать родителю доступ в личный кабинет</div>
      </div>
      <div class="field">
        <label>Ребёнок</label>
        <select name="childId">
          <option value="">— не привязывать сейчас —</option>
          ${childOptions}
        </select>
      </div>
      <div class="field">
        <label>Кем приходится ребёнку</label>
        <select name="relationType">${relationOptions}</select>
      </div>
    `,
    onSubmit: async (fd) => {
      const parent = await api('/parents', {
        method: 'POST',
        body: JSON.stringify({
          fullName: fd.get('fullName').trim(),
          phone: fd.get('phone').trim() || undefined,
          email: fd.get('email').trim() || undefined,
        }),
      });

      const childId = fd.get('childId');
      if (childId) {
        await api(`/parents/${parent.id}/children`, {
          method: 'POST',
          body: JSON.stringify({ childId, relationType: fd.get('relationType') }),
        });
      }

      const loginEmail = fd.get('email').trim();
      const loginPassword = fd.get('password');
      if (loginEmail && loginPassword) {
        await api(`/parents/${parent.id}/create-login`, {
          method: 'POST',
          body: JSON.stringify({ email: loginEmail, password: loginPassword }),
        });
      }
    },
    onDone: () => renderStaffView(user),
  });
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
