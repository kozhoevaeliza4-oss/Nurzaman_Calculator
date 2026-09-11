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
const FINANCE_ROLES = ['director', 'admin', 'accountant'];
const DOCS_VIEW_ROLES = ['director', 'admin', 'teacher', 'medic'];
const DOCS_EDIT_ROLES = ['director', 'admin'];
const ATTENDANCE_VIEW_ROLES = ['director', 'admin', 'teacher', 'accountant', 'medic'];
const ATTENDANCE_SCAN_ROLES = ['director', 'admin', 'teacher'];
const MENU_EDIT_ROLES = ['director', 'admin', 'medic'];
const EXPENSES_ROLES = ['director', 'admin', 'accountant'];
const REPORTS_ROLES = ['director', 'admin', 'accountant'];
const BROADCAST_ROLES = ['director', 'admin'];

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

const CHARGE_TYPE_LABELS = {
  monthly_tariff: 'Ежемесячный тариф',
  one_time: 'Разовое начисление',
  discount: 'Скидка',
};

const PAYMENT_METHOD_LABELS = {
  bank_qr: 'QR-оплата',
  cash: 'Наличные',
  bank_transfer: 'Банковский перевод',
};

const DOCUMENT_TYPE_LABELS = {
  birth_certificate: 'Свидетельство о рождении',
  medical_clearance: 'Медицинская справка',
  contract: 'Договор',
  other: 'Другое',
};

const RELATION_LABELS = {
  mother: 'Мать',
  father: 'Отец',
  guardian: 'Опекун',
  other: 'Другое',
};

const TABS = [
  { id: 'overview', label: 'Обзор' },
  { id: 'menu', label: 'Меню' },
  { id: 'expenses', label: 'Расходы', roles: EXPENSES_ROLES },
  { id: 'reports', label: 'Отчёты', roles: REPORTS_ROLES },
  { id: 'notifications', label: 'Уведомления', roles: BROADCAST_ROLES },
];

const state = {
  tab: 'overview',
  childId: null,
  childrenSearch: '',
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

// GET endpoints that stream a file (document download, CSV export) need the
// auth header attached manually — a plain <a href> can't carry it.
async function downloadFile(path, fallbackName = 'file') {
  const res = await fetch(path, { headers: { Authorization: `Bearer ${getToken()}` } });
  if (res.status === 401) {
    clearSession();
    showLogin('Сессия истекла — войдите снова.');
    throw new Error('unauthorized');
  }
  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.message || `Ошибка ${res.status}`);
  }
  const blob = await res.blob();
  let filename = fallbackName;
  const cd = res.headers.get('Content-Disposition');
  if (cd) {
    const m = /filename="?([^"]+)"?/.exec(cd);
    if (m) filename = decodeURIComponent(m[1]);
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
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
// Renders `bodyHtml` inside a modal. Either pass `path` + `buildPayload` for
// a single JSON POST, or `onSubmit(formData)` for anything more involved
// (multiple requests, file uploads, etc.).
function openModal({ title, bodyHtml, path, method = 'POST', buildPayload, onSubmit, onDone, submitLabel = 'Сохранить' }) {
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
        await api(path, { method, body: JSON.stringify(payload) });
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
  state.tab = 'overview';
  state.childId = null;
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
    renderStaffShell(user);
  } else {
    mainContent.innerHTML = '<div class="error-block">Неизвестная роль аккаунта.</div>';
  }
}

// ---------- Staff shell (tabs) ----------

function renderStaffShell(user) {
  const visibleTabs = TABS.filter((t) => !t.roles || t.roles.includes(user.role));
  const tabsHtml = `
    <nav class="tabs">
      ${visibleTabs
        .map((t) => `<button class="tab-btn ${state.tab === t.id ? 'active' : ''}" data-tab="${t.id}">${escapeHtml(t.label)}</button>`)
        .join('')}
    </nav>
    <div id="tab-content"></div>
  `;
  mainContent.innerHTML = tabsHtml;
  mainContent.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      state.tab = btn.dataset.tab;
      state.childId = null;
      renderStaffShell(user);
    });
  });

  const tabContent = document.getElementById('tab-content');
  if (state.childId) {
    renderChildDetail(user, tabContent);
    return;
  }
  if (state.tab === 'menu') renderMenuTab(user, tabContent);
  else if (state.tab === 'expenses') renderExpensesTab(user, tabContent);
  else if (state.tab === 'reports') renderReportsTab(user, tabContent);
  else if (state.tab === 'notifications') renderNotificationsTab(user, tabContent);
  else renderOverviewTab(user, tabContent);
}

// ---------- Overview tab ----------

async function renderOverviewTab(user, root) {
  root.innerHTML = '<div class="loading">Загрузка…</div>';

  const canSeeDashboard = user.role === 'director' || user.role === 'admin';
  const canManage = user.role === 'director' || user.role === 'admin';
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + '01';

  try {
    const searchParam = state.childrenSearch ? `&search=${encodeURIComponent(state.childrenSearch)}` : '';
    const [summary, childrenPage, groups, parentsPage, forecast] = await Promise.all([
      canSeeDashboard ? api(`/dashboard/summary?from=${monthStart}&to=${today}`) : Promise.resolve(null),
      api(`/children?pageSize=50${searchParam}`),
      api('/groups'),
      canManage ? api('/parents?pageSize=50') : Promise.resolve(null),
      user.role === 'director' ? api('/analytics/forecast?months=3').catch(() => null) : Promise.resolve(null),
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

    const forecastHtml = forecast
      ? `
        <section>
          <h2 class="section-title">AI-прогноз (следующие 3 месяца)</h2>
          <div class="ai-box">${escapeHtml(forecast.analysis)}</div>
        </section>
      `
      : '';

    const rows = childrenPage.items
      .map((child) => {
        const allergyBadges = child.allergies.length
          ? child.allergies.map((a) => `<span class="badge allergy">${escapeHtml(a)}</span>`).join('')
          : '<span class="badge">нет</span>';
        return `
          <tr class="row-click" data-child-id="${child.id}">
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
      .map((g) => `<tr><td>${escapeHtml(g.name)}</td><td>${g.capacity}</td></tr>`)
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
        <div class="field" style="max-width:320px;margin-bottom:10px">
          <input id="children-search" type="search" placeholder="Поиск по ФИО…" value="${escapeHtml(state.childrenSearch)}" />
        </div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>ФИО</th><th>Группа</th><th>Дата рождения</th><th>Статус</th><th>Аллергии</th></tr>
            </thead>
            <tbody>
              ${rows || `<tr><td colspan="5" class="empty-note">${state.childrenSearch ? 'Ничего не найдено' : 'Пока нет ни одного ребёнка'}</td></tr>`}
            </tbody>
          </table>
        </div>
        <div class="hint-small" style="margin-top:8px">Нажмите на строку, чтобы открыть карточку ребёнка (оплаты, посещаемость, документы, редактирование)</div>
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

    const staffHtml = canManage
      ? `
        <section>
          <div class="section-header">
            <h2 class="section-title">Сотрудники</h2>
            <button class="btn-small" data-action="add-staff">+ Добавить сотрудника</button>
          </div>
          <div class="hint-small">Заведите учётные записи для администратора, бухгалтера, воспитателя или медработника, чтобы попробовать вход под разными ролями</div>
        </section>
      `
      : '';

    root.innerHTML = `${statsHtml}${forecastHtml}${groupsHtml}${childrenHtml}${parentsHtml}${staffHtml}`;

    root.querySelector('[data-action="add-group"]')?.addEventListener('click', () => openAddGroupModal(user));
    root.querySelector('[data-action="add-child"]')?.addEventListener('click', () => openAddChildModal(user, groups));
    root.querySelector('[data-action="add-parent"]')?.addEventListener('click', () => openAddParentModal(user, childrenPage.items));
    root.querySelector('[data-action="add-staff"]')?.addEventListener('click', () => openAddStaffModal(user, groups));
    root.querySelectorAll('tr[data-child-id]').forEach((tr) => {
      tr.addEventListener('click', () => {
        state.childId = tr.dataset.childId;
        renderStaffShell(user);
      });
    });

    const searchInput = root.querySelector('#children-search');
    searchInput?.addEventListener('input', () => {
      clearTimeout(state._searchDebounce);
      const value = searchInput.value;
      const cursor = searchInput.selectionStart;
      state._searchDebounce = setTimeout(() => {
        state.childrenSearch = value;
        renderOverviewTab(user, root).then(() => {
          const refocused = root.querySelector('#children-search');
          if (refocused) {
            refocused.focus();
            refocused.setSelectionRange(cursor, cursor);
          }
        });
      }, 350);
    });
  } catch (err) {
    if (err.message !== 'unauthorized') {
      root.innerHTML = `<div class="error-block">Не удалось загрузить данные: ${escapeHtml(err.message)}</div>`;
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
    onDone: () => renderStaffShell(user),
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
    onDone: () => renderStaffShell(user),
  });
}

// Same fields as "new child", pre-filled and PUT instead of POST — also the
// place a director marks a child as left/academic leave (archiving) without
// losing their history, since the backend never hard-deletes via this path.
function openEditChildModal(user, child, groups, onDone) {
  const groupOptions = groups
    .map((g) => `<option value="${g.id}" ${g.id === child.groupId ? 'selected' : ''}>${escapeHtml(g.name)}</option>`)
    .join('');
  const statusOptions = Object.entries(STATUS_LABELS)
    .map(([v, l]) => `<option value="${v}" ${v === child.status ? 'selected' : ''}>${l}</option>`)
    .join('');
  openModal({
    title: `Редактировать: ${child.fullName}`,
    path: `/children/${child.id}`,
    method: 'PUT',
    submitLabel: 'Сохранить изменения',
    bodyHtml: `
      <div class="field">
        <label>ФИО ребёнка</label>
        <input name="fullName" required value="${escapeHtml(child.fullName)}" />
      </div>
      <div class="field">
        <label>Дата рождения</label>
        <input name="dateOfBirth" type="date" required value="${child.dateOfBirth}" />
      </div>
      <div class="field">
        <label>Группа</label>
        <select name="groupId">
          <option value="">— без группы —</option>
          ${groupOptions}
        </select>
      </div>
      <div class="field">
        <label>Статус</label>
        <select name="status">${statusOptions}</select>
        <div class="hint-small">«Выбыл» или «Академ. отпуск» — это архивирование без потери истории посещений и платежей</div>
      </div>
      <div class="field">
        <label>Аллергии (через запятую)</label>
        <input name="allergies" value="${escapeHtml((child.allergies || []).join(', '))}" placeholder="орехи, мёд" />
      </div>
    `,
    buildPayload: (fd) => {
      const allergiesRaw = fd.get('allergies').trim();
      const payload = {
        fullName: fd.get('fullName').trim(),
        dateOfBirth: fd.get('dateOfBirth'),
        status: fd.get('status'),
        allergies: allergiesRaw ? allergiesRaw.split(',').map((a) => a.trim()).filter(Boolean) : [],
      };
      const groupId = fd.get('groupId');
      payload.groupId = groupId || null;
      return payload;
    },
    onDone,
  });
}

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
    onDone: () => renderStaffShell(user),
  });
}

function openAddStaffModal(user, groups) {
  const staffRoles = ['admin', 'accountant', 'teacher', 'medic'];
  const roleOptions = staffRoles.map((r) => `<option value="${r}">${ROLE_LABELS[r]}</option>`).join('');
  const groupOptions = groups.map((g) => `<option value="${g.id}">${escapeHtml(g.name)}</option>`).join('');

  openModal({
    title: 'Новый сотрудник',
    path: '/users',
    submitLabel: 'Создать учётную запись',
    bodyHtml: `
      <div class="field">
        <label>ФИО</label>
        <input name="fullName" required placeholder="Асанова Жамиля Токтосуновна" />
      </div>
      <div class="field">
        <label>Роль</label>
        <select name="role">${roleOptions}</select>
      </div>
      <div class="field">
        <label>Email (логин)</label>
        <input name="email" type="email" required placeholder="teacher@asyl-amanat.kg" />
      </div>
      <div class="field">
        <label>Пароль</label>
        <input name="password" type="password" minlength="8" required placeholder="Не менее 8 символов" />
      </div>
      <div class="field">
        <label>Группа (для воспитателя)</label>
        <select name="groupId">
          <option value="">— не привязывать —</option>
          ${groupOptions}
        </select>
      </div>
    `,
    buildPayload: (fd) => {
      const payload = {
        fullName: fd.get('fullName').trim(),
        role: fd.get('role'),
        email: fd.get('email').trim(),
        password: fd.get('password'),
      };
      const groupId = fd.get('groupId');
      if (groupId) payload.groupId = groupId;
      return payload;
    },
    onDone: () => renderStaffShell(user),
  });
}

// ---------- Child detail ----------

async function renderChildDetail(user, root) {
  root.innerHTML = '<div class="loading">Загрузка…</div>';
  const childId = state.childId;

  try {
    const child = await api(`/children/${childId}`);

    const canFinance = FINANCE_ROLES.includes(user.role);
    const canDocsView = DOCS_VIEW_ROLES.includes(user.role);
    const canDocsEdit = DOCS_EDIT_ROLES.includes(user.role);
    const canAttendanceView = ATTENDANCE_VIEW_ROLES.includes(user.role);
    const canScan = ATTENDANCE_SCAN_ROLES.includes(user.role);
    const canManage = user.role === 'director' || user.role === 'admin';

    const [balance, history, attendance, documents, groups] = await Promise.all([
      canFinance ? api(`/finance/children/${childId}/balance`) : Promise.resolve(null),
      canFinance ? api(`/finance/children/${childId}/history`) : Promise.resolve(null),
      canAttendanceView ? api(`/attendance/children/${childId}/history`) : Promise.resolve(null),
      canDocsView ? api(`/documents/children/${childId}`) : Promise.resolve(null),
      canManage ? api('/groups') : Promise.resolve([]),
    ]);

    const allergyBadges = child.allergies.length
      ? child.allergies.map((a) => `<span class="badge allergy">${escapeHtml(a)}</span>`).join('')
      : '<span class="badge">нет аллергий</span>';

    const headerHtml = `
      <button class="btn-small" data-action="back">← Назад к списку</button>
      <section>
        <div class="child-head">
          <div>
            <h2 class="child-title">${escapeHtml(child.fullName)} <span class="badge status-${child.status}">${STATUS_LABELS[child.status] || child.status}</span></h2>
            <div class="hint-small">Дата рождения: ${fmtDate(child.dateOfBirth)} · Зачислен: ${fmtDate(child.enrollmentDate)}</div>
          </div>
          <div class="btn-row">
            ${allergyBadges}
            ${canManage ? '<button class="btn-small" data-action="edit-child">Редактировать</button>' : ''}
          </div>
        </div>
      </section>
    `;

    let financeHtml = '';
    if (canFinance && balance) {
      const chargeRows = history.charges
        .map(
          (c) => `
            <tr>
              <td>${fmtDate(c.dueDate)}</td>
              <td>${CHARGE_TYPE_LABELS[c.type] || c.type}</td>
              <td class="mono">${c.amount} сом</td>
              <td>${escapeHtml(c.description || '—')}</td>
            </tr>
          `,
        )
        .join('');
      const paymentRows = history.payments
        .map(
          (p) => `
            <tr>
              <td>${fmtDate(p.paidAt)}</td>
              <td>${PAYMENT_METHOD_LABELS[p.method] || p.method}</td>
              <td class="mono">${p.amount} сом</td>
              <td><button class="btn-link" data-action="receipt" data-payment-id="${p.id}">квитанция</button></td>
            </tr>
          `,
        )
        .join('');

      financeHtml = `
        <section>
          <div class="section-header">
            <h2 class="section-title">Финансы</h2>
            <div class="btn-row">
              <button class="btn-small" data-action="add-charge">+ Начислить</button>
              <button class="btn-small" data-action="add-payment">+ Принять оплату</button>
            </div>
          </div>
          <div class="stats">
            <div class="stat"><div class="n mono">${balance.charged} сом</div><div class="l">Начислено</div></div>
            <div class="stat"><div class="n mono">${balance.paid} сом</div><div class="l">Оплачено</div></div>
            <div class="stat"><div class="n mono ${Number(balance.debt) > 0 ? 'debt' : ''}">${balance.debt} сом</div><div class="l">Задолженность</div></div>
          </div>
          <div class="two-col">
            <div>
              <h4 class="mini-title">Начисления</h4>
              <div class="table-wrap"><table><thead><tr><th>Срок</th><th>Тип</th><th>Сумма</th><th>Комментарий</th></tr></thead>
                <tbody>${chargeRows || '<tr><td colspan="4" class="empty-note">Нет начислений</td></tr>'}</tbody></table></div>
            </div>
            <div>
              <h4 class="mini-title">Оплаты</h4>
              <div class="table-wrap"><table><thead><tr><th>Дата</th><th>Способ</th><th>Сумма</th><th></th></tr></thead>
                <tbody>${paymentRows || '<tr><td colspan="4" class="empty-note">Нет оплат</td></tr>'}</tbody></table></div>
            </div>
          </div>
        </section>
      `;
    }

    let attendanceHtml = '';
    if (canAttendanceView && attendance) {
      const rows = attendance
        .slice(0, 10)
        .map(
          (r) => `
            <tr>
              <td>${fmtDateTime(r.occurredAt)}</td>
              <td>${r.eventType === 'check_in' ? 'Пришёл' : 'Ушёл'}</td>
            </tr>
          `,
        )
        .join('');
      attendanceHtml = `
        <section>
          <div class="section-header">
            <h2 class="section-title">Посещаемость</h2>
            ${
              canScan
                ? `<div class="btn-row">
                    <button class="btn-small" data-action="mark-in">Отметить приход</button>
                    <button class="btn-small" data-action="mark-out">Отметить уход</button>
                  </div>`
                : ''
            }
          </div>
          <div class="table-wrap">
            <table><thead><tr><th>Время</th><th>Событие</th></tr></thead>
              <tbody>${rows || '<tr><td colspan="2" class="empty-note">Записей пока нет</td></tr>'}</tbody></table>
          </div>
        </section>
      `;
    }

    let documentsHtml = '';
    if (canDocsView && documents) {
      const docRows = documents
        .map(
          (d) => `
            <tr>
              <td>${escapeHtml(d.fileName)}</td>
              <td>${DOCUMENT_TYPE_LABELS[d.type] || d.type}</td>
              <td>
                <button class="btn-link" data-action="download-doc" data-doc-id="${d.id}" data-doc-name="${escapeHtml(d.fileName)}">скачать</button>
                ${canDocsEdit ? `<button class="btn-link danger" data-action="delete-doc" data-doc-id="${d.id}">удалить</button>` : ''}
              </td>
            </tr>
          `,
        )
        .join('');
      documentsHtml = `
        <section>
          <div class="section-header">
            <h2 class="section-title">Документы</h2>
          </div>
          <div class="table-wrap">
            <table><thead><tr><th>Файл</th><th>Тип</th><th></th></tr></thead>
              <tbody>${docRows || '<tr><td colspan="3" class="empty-note">Документов пока нет</td></tr>'}</tbody></table>
          </div>
          ${
            canDocsEdit
              ? `
              <form id="upload-form" class="upload-form">
                <select name="type">
                  ${Object.entries(DOCUMENT_TYPE_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}
                </select>
                <input type="file" name="file" required />
                <button type="submit" class="btn-small">Загрузить</button>
              </form>
              <div id="upload-error" class="modal-error" hidden></div>
            `
              : ''
          }
        </section>
      `;
    }

    root.innerHTML = `${headerHtml}${financeHtml}${attendanceHtml}${documentsHtml}`;

    root.querySelector('[data-action="back"]').addEventListener('click', () => {
      state.childId = null;
      renderStaffShell(user);
    });

    root.querySelector('[data-action="edit-child"]')?.addEventListener('click', () =>
      openEditChildModal(user, child, groups, () => renderChildDetail(user, root)),
    );

    root.querySelector('[data-action="add-charge"]')?.addEventListener('click', () => openAddChargeModal(user, child));
    root.querySelector('[data-action="add-payment"]')?.addEventListener('click', () => openAddPaymentModal(user, child));

    root.querySelectorAll('[data-action="receipt"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await downloadFile(`/finance/payments/${btn.dataset.paymentId}/receipt`, 'receipt.json');
        } catch (err) {
          if (err.message !== 'unauthorized') showToast(`Ошибка: ${err.message}`);
        }
      });
    });

    root.querySelector('[data-action="mark-in"]')?.addEventListener('click', () => scanChild(user, child));
    root.querySelector('[data-action="mark-out"]')?.addEventListener('click', () => scanChild(user, child));

    root.querySelectorAll('[data-action="download-doc"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        try {
          await downloadFile(`/documents/${btn.dataset.docId}/download`, btn.dataset.docName || 'document');
        } catch (err) {
          if (err.message !== 'unauthorized') showToast(`Ошибка: ${err.message}`);
        }
      });
    });

    root.querySelectorAll('[data-action="delete-doc"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Удалить документ?')) return;
        try {
          await api(`/documents/${btn.dataset.docId}`, { method: 'DELETE' });
          showToast('Удалено');
          renderChildDetail(user, root);
        } catch (err) {
          if (err.message !== 'unauthorized') showToast(`Ошибка: ${err.message}`);
        }
      });
    });

    const uploadForm = root.querySelector('#upload-form');
    uploadForm?.addEventListener('submit', async (e) => {
      e.preventDefault();
      const uploadError = root.querySelector('#upload-error');
      uploadError.hidden = true;
      const fd = new FormData(uploadForm);
      try {
        const res = await fetch(`/documents/children/${childId}`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${getToken()}` },
          body: fd,
        });
        if (res.status === 401) {
          clearSession();
          showLogin('Сессия истекла — войдите снова.');
          return;
        }
        const body = await res.json().catch(() => null);
        if (!res.ok) throw new Error(body?.message || `Ошибка ${res.status}`);
        showToast('Документ загружен');
        renderChildDetail(user, root);
      } catch (err) {
        uploadError.textContent = err.message;
        uploadError.hidden = false;
      }
    });
  } catch (err) {
    if (err.message !== 'unauthorized') {
      root.innerHTML = `<div class="error-block">Не удалось загрузить карточку ребёнка: ${escapeHtml(err.message)}</div>`;
    }
  }
}

function openAddChargeModal(user, child) {
  const typeOptions = Object.entries(CHARGE_TYPE_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  openModal({
    title: `Начисление — ${child.fullName}`,
    path: '/finance/charges',
    submitLabel: 'Начислить',
    bodyHtml: `
      <div class="field"><label>Тип</label><select name="type">${typeOptions}</select></div>
      <div class="field"><label>Сумма (сом)</label><input name="amount" type="number" step="0.01" min="0" required /></div>
      <div class="field"><label>Срок оплаты</label><input name="dueDate" type="date" required value="${new Date().toISOString().slice(0, 10)}" /></div>
      <div class="field"><label>Комментарий</label><input name="description" placeholder="Необязательно" /></div>
    `,
    buildPayload: (fd) => ({
      childId: child.id,
      type: fd.get('type'),
      amount: fd.get('amount'),
      dueDate: fd.get('dueDate'),
      description: fd.get('description').trim() || undefined,
    }),
    onDone: () => renderChildDetail(user, document.getElementById('tab-content')),
  });
}

function openAddPaymentModal(user, child) {
  const methodOptions = Object.entries(PAYMENT_METHOD_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  openModal({
    title: `Оплата — ${child.fullName}`,
    path: '/finance/payments',
    submitLabel: 'Принять оплату',
    bodyHtml: `
      <div class="field"><label>Способ оплаты</label><select name="method">${methodOptions}</select></div>
      <div class="field"><label>Сумма (сом)</label><input name="amount" type="number" step="0.01" min="0" required /></div>
      <div class="field"><label>Дата оплаты</label><input name="paidAt" type="date" required value="${new Date().toISOString().slice(0, 10)}" /></div>
      <div class="field"><label>Комментарий</label><input name="note" placeholder="Необязательно" /></div>
    `,
    buildPayload: (fd) => ({
      childId: child.id,
      method: fd.get('method'),
      amount: fd.get('amount'),
      paidAt: fd.get('paidAt'),
      note: fd.get('note').trim() || undefined,
    }),
    onDone: () => renderChildDetail(user, document.getElementById('tab-content')),
  });
}

async function scanChild(user, child) {
  try {
    const record = await api('/attendance/scan', { method: 'POST', body: JSON.stringify({ code: child.qrCode }) });
    showToast(record.eventType === 'check_in' ? 'Отмечен приход' : 'Отмечен уход');
    renderChildDetail(user, document.getElementById('tab-content'));
  } catch (err) {
    if (err.message !== 'unauthorized') showToast(`Ошибка: ${err.message}`);
  }
}

// ---------- Menu tab ----------

function weekRange() {
  const now = new Date();
  const day = now.getDay() || 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - day + 1);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: monday.toISOString().slice(0, 10), to: sunday.toISOString().slice(0, 10) };
}

async function renderMenuTab(user, root) {
  root.innerHTML = '<div class="loading">Загрузка…</div>';
  const canEdit = MENU_EDIT_ROLES.includes(user.role);
  const { from, to } = weekRange();

  try {
    const items = await api(`/menu?from=${from}&to=${to}`);
    const byDate = new Map();
    items.forEach((item) => {
      const key = item.date.slice(0, 10);
      if (!byDate.has(key)) byDate.set(key, []);
      byDate.get(key).push(item);
    });

    const days = [];
    const cursor = new Date(from);
    for (let i = 0; i < 7; i++) {
      days.push(cursor.toISOString().slice(0, 10));
      cursor.setDate(cursor.getDate() + 1);
    }

    const dayCards = days
      .map((date) => {
        const dayItems = (byDate.get(date) || []).sort((a, b) => a.mealType.localeCompare(b.mealType));
        const rows = dayItems
          .map(
            (item) => `
              <div class="menu-line">
                <span class="meal">${MEAL_LABELS[item.mealType] || item.mealType}</span>
                <span>${escapeHtml(item.dishName)}${item.allergens.length ? ` <span class="hint-small">(${item.allergens.map(escapeHtml).join(', ')})</span>` : ''}</span>
                ${canEdit ? `<button class="btn-link danger" data-action="delete-menu" data-id="${item.id}">×</button>` : ''}
              </div>
            `,
          )
          .join('');
        return `
          <div class="day-card">
            <div class="day-card-head">${fmtDate(date)}</div>
            ${rows || '<div class="menu-line"><span>Меню не заполнено</span></div>'}
          </div>
        `;
      })
      .join('');

    root.innerHTML = `
      <section>
        <div class="section-header">
          <h2 class="section-title">Меню на неделю</h2>
          ${canEdit ? '<button class="btn-small" data-action="add-menu-item">+ Добавить блюдо</button>' : ''}
        </div>
        <div class="day-grid">${dayCards}</div>
      </section>
    `;

    root.querySelector('[data-action="add-menu-item"]')?.addEventListener('click', () => openAddMenuItemModal(user));
    root.querySelectorAll('[data-action="delete-menu"]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('Удалить блюдо из меню?')) return;
        try {
          await api(`/menu/${btn.dataset.id}`, { method: 'DELETE' });
          renderMenuTab(user, root);
        } catch (err) {
          if (err.message !== 'unauthorized') showToast(`Ошибка: ${err.message}`);
        }
      });
    });
  } catch (err) {
    if (err.message !== 'unauthorized') {
      root.innerHTML = `<div class="error-block">Не удалось загрузить меню: ${escapeHtml(err.message)}</div>`;
    }
  }
}

function openAddMenuItemModal(user) {
  const mealOptions = Object.entries(MEAL_LABELS).map(([v, l]) => `<option value="${v}">${l}</option>`).join('');
  openModal({
    title: 'Новое блюдо в меню',
    path: '/menu',
    submitLabel: 'Добавить',
    bodyHtml: `
      <div class="field"><label>Дата</label><input name="date" type="date" required value="${new Date().toISOString().slice(0, 10)}" /></div>
      <div class="field"><label>Приём пищи</label><select name="mealType">${mealOptions}</select></div>
      <div class="field"><label>Название блюда</label><input name="dishName" required placeholder="Суп овощной" /></div>
      <div class="field"><label>Аллергены (через запятую)</label><input name="allergens" placeholder="орехи, молоко" /></div>
    `,
    buildPayload: (fd) => ({
      date: fd.get('date'),
      mealType: fd.get('mealType'),
      dishName: fd.get('dishName').trim(),
      allergens: fd.get('allergens').trim() ? fd.get('allergens').trim().split(',').map((a) => a.trim()).filter(Boolean) : [],
    }),
    onDone: () => renderStaffShell(user),
  });
}

// ---------- Expenses tab ----------

async function renderExpensesTab(user, root) {
  root.innerHTML = '<div class="loading">Загрузка…</div>';
  const period = new Date().toISOString().slice(0, 7);
  const canCreateCategory = user.role === 'director' || user.role === 'admin';

  try {
    const [categories, planVsFact] = await Promise.all([
      api('/expenses/categories'),
      api(`/expenses/plan-vs-fact?period=${period}`),
    ]);

    const rows = planVsFact
      .map(
        (r) => `
          <tr>
            <td>${escapeHtml(r.categoryName)}</td>
            <td class="mono">${r.planned} сом</td>
            <td class="mono">${r.actual} сом</td>
            <td class="mono ${Number(r.deviation) > 0 ? 'debt' : ''}">${r.deviation} сом</td>
          </tr>
        `,
      )
      .join('');

    root.innerHTML = `
      <section>
        <div class="section-header">
          <h2 class="section-title">Расходы за ${period}</h2>
          <div class="btn-row">
            ${canCreateCategory ? '<button class="btn-small" data-action="add-category">+ Категория</button>' : ''}
            <button class="btn-small" data-action="set-plan">План на месяц</button>
            <button class="btn-small" data-action="add-fact">+ Расход</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Категория</th><th>План</th><th>Факт</th><th>Отклонение</th></tr></thead>
            <tbody>${rows || '<tr><td colspan="4" class="empty-note">Категорий расходов пока нет</td></tr>'}</tbody>
          </table>
        </div>
      </section>
    `;

    root.querySelector('[data-action="add-category"]')?.addEventListener('click', () =>
      openModal({
        title: 'Новая категория расходов',
        path: '/expenses/categories',
        submitLabel: 'Создать',
        bodyHtml: `<div class="field"><label>Название</label><input name="name" required placeholder="Питание" /></div>`,
        buildPayload: (fd) => ({ name: fd.get('name').trim() }),
        onDone: () => renderExpensesTab(user, root),
      }),
    );

    root.querySelector('[data-action="set-plan"]')?.addEventListener('click', () => {
      const options = categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
      openModal({
        title: 'Плановая сумма на месяц',
        path: '/expenses/plans',
        submitLabel: 'Сохранить план',
        bodyHtml: `
          <div class="field"><label>Категория</label><select name="categoryId">${options || '<option disabled>Сначала создайте категорию</option>'}</select></div>
          <div class="field"><label>Месяц (ГГГГ-ММ)</label><input name="period" required value="${period}" pattern="\\d{4}-\\d{2}" /></div>
          <div class="field"><label>Плановая сумма (сом)</label><input name="plannedAmount" type="number" step="0.01" min="0" required /></div>
        `,
        buildPayload: (fd) => ({
          categoryId: fd.get('categoryId'),
          period: fd.get('period'),
          plannedAmount: fd.get('plannedAmount'),
        }),
        onDone: () => renderExpensesTab(user, root),
      });
    });

    root.querySelector('[data-action="add-fact"]')?.addEventListener('click', () => {
      const options = categories.map((c) => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('');
      openModal({
        title: 'Новый расход',
        path: '/expenses/facts',
        submitLabel: 'Добавить расход',
        bodyHtml: `
          <div class="field"><label>Категория</label><select name="categoryId">${options || '<option disabled>Сначала создайте категорию</option>'}</select></div>
          <div class="field"><label>Сумма (сом)</label><input name="amount" type="number" step="0.01" min="0" required /></div>
          <div class="field"><label>Дата</label><input name="spentAt" type="date" required value="${new Date().toISOString().slice(0, 10)}" /></div>
          <div class="field"><label>Комментарий</label><input name="description" placeholder="Необязательно" /></div>
        `,
        buildPayload: (fd) => ({
          categoryId: fd.get('categoryId'),
          amount: fd.get('amount'),
          spentAt: fd.get('spentAt'),
          description: fd.get('description').trim() || undefined,
        }),
        onDone: () => renderExpensesTab(user, root),
      });
    });
  } catch (err) {
    if (err.message !== 'unauthorized') {
      root.innerHTML = `<div class="error-block">Не удалось загрузить расходы: ${escapeHtml(err.message)}</div>`;
    }
  }
}

// ---------- Reports tab ----------

async function renderReportsTab(user, root) {
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = today.slice(0, 8) + '01';

  root.innerHTML = `
    <section>
      <h2 class="section-title">Отчёты</h2>
      <div class="report-cards">
        <div class="report-card">
          <h4>Финансовый отчёт</h4>
          <div id="finance-report-result" class="hint-small">Загрузка…</div>
        </div>
        <div class="report-card">
          <h4>Должники</h4>
          <div class="btn-row">
            <button class="btn-small" data-action="debt-json">Показать</button>
            <button class="btn-small" data-action="debt-csv">Скачать CSV</button>
          </div>
          <div id="debt-report-result"></div>
        </div>
        <div class="report-card">
          <h4>Посещаемость за месяц</h4>
          <button class="btn-small" data-action="attendance-csv">Скачать CSV</button>
        </div>
      </div>
    </section>
  `;

  try {
    const finance = await api(`/reports/finance?from=${monthStart}&to=${today}`);
    root.querySelector('#finance-report-result').innerHTML = `
      <div class="stats">
        <div class="stat"><div class="n mono">${finance.income} сом</div><div class="l">Доходы</div></div>
        <div class="stat"><div class="n mono">${finance.charged} сом</div><div class="l">Начислено</div></div>
      </div>
    `;
  } catch (err) {
    if (err.message !== 'unauthorized') {
      root.querySelector('#finance-report-result').innerHTML = `<span class="error-block">${escapeHtml(err.message)}</span>`;
    }
  }

  root.querySelector('[data-action="debt-json"]').addEventListener('click', async () => {
    const target = root.querySelector('#debt-report-result');
    target.innerHTML = '<div class="loading">Загрузка…</div>';
    try {
      const debtors = await api('/reports/debt');
      const rows = debtors
        .map((d) => `<tr><td>${escapeHtml(d.fullName)}</td><td class="mono debt">${d.debt} сом</td></tr>`)
        .join('');
      target.innerHTML = `
        <div class="table-wrap">
          <table><thead><tr><th>Ребёнок</th><th>Долг</th></tr></thead>
          <tbody>${rows || '<tr><td colspan="2" class="empty-note">Должников нет</td></tr>'}</tbody></table>
        </div>
      `;
    } catch (err) {
      if (err.message !== 'unauthorized') target.innerHTML = `<span class="error-block">${escapeHtml(err.message)}</span>`;
    }
  });

  root.querySelector('[data-action="debt-csv"]').addEventListener('click', async () => {
    try {
      await downloadFile('/reports/debt?format=csv', 'debt.csv');
    } catch (err) {
      if (err.message !== 'unauthorized') showToast(`Ошибка: ${err.message}`);
    }
  });

  root.querySelector('[data-action="attendance-csv"]').addEventListener('click', async () => {
    try {
      await downloadFile(`/reports/attendance?from=${monthStart}&to=${today}&format=csv`, 'attendance.csv');
    } catch (err) {
      if (err.message !== 'unauthorized') showToast(`Ошибка: ${err.message}`);
    }
  });
}

// ---------- Notifications tab ----------

function renderNotificationsTab(user, root) {
  root.innerHTML = `
    <section>
      <h2 class="section-title">Новости сада для родителей</h2>
      <form id="broadcast-form" class="field-form">
        <div class="field">
          <label>Текст сообщения</label>
          <textarea name="message" rows="4" required placeholder="Например: завтра родительское собрание в 18:00"></textarea>
        </div>
        <button type="submit" class="btn">Отправить всем родителям</button>
        <div id="broadcast-result" class="hint-small"></div>
      </form>
    </section>
  `;

  const form = root.querySelector('#broadcast-form');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const result = root.querySelector('#broadcast-result');
    const submitBtn = form.querySelector('button[type=submit]');
    submitBtn.disabled = true;
    try {
      const fd = new FormData(form);
      const res = await api('/notifications/broadcast', {
        method: 'POST',
        body: JSON.stringify({ message: fd.get('message').trim() }),
      });
      result.textContent = `Отправлено получателям: ${res.recipientCount}`;
      form.reset();
    } catch (err) {
      if (err.message !== 'unauthorized') result.textContent = `Ошибка: ${err.message}`;
    } finally {
      submitBtn.disabled = false;
    }
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
          <div class="child-card" data-child-id="${child.childId}">
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
              <h4>Документы</h4>
              <div class="docs-list" data-docs-for="${child.childId}"><div class="hint-small">Загрузка…</div></div>
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
      <section>
        <h2 class="section-title">Спросить у ассистента сада</h2>
        <div class="ai-chat">
          <div id="ai-chat-log" class="ai-chat-log"></div>
          <form id="ai-chat-form" class="ai-chat-form">
            <input name="message" required placeholder="Например: когда в следующий раз нужно оплатить?" />
            <button type="submit" class="btn-small">Спросить</button>
          </form>
        </div>
      </section>
    `;

    // Load documents per child (parent-scoped endpoint).
    for (const child of data.children) {
      api(`/documents/me/children/${child.childId}`)
        .then((docs) => {
          const el = mainContent.querySelector(`[data-docs-for="${child.childId}"]`);
          if (!el) return;
          el.innerHTML = docs.length
            ? docs
                .map(
                  (d) =>
                    `<div class="notif-line"><span>${escapeHtml(d.fileName)}</span><button class="btn-link" data-download-doc="${d.id}" data-download-name="${escapeHtml(d.fileName)}">скачать</button></div>`,
                )
                .join('')
            : '<div class="hint-small">Документов пока нет</div>';
          el.querySelectorAll('[data-download-doc]').forEach((btn) => {
            btn.addEventListener('click', async () => {
              try {
                await downloadFile(`/documents/${btn.dataset.downloadDoc}/download`, btn.dataset.downloadName);
              } catch (err) {
                if (err.message !== 'unauthorized') showToast(`Ошибка: ${err.message}`);
              }
            });
          });
        })
        .catch(() => {
          const el = mainContent.querySelector(`[data-docs-for="${child.childId}"]`);
          if (el) el.innerHTML = '<div class="hint-small">Не удалось загрузить документы</div>';
        });
    }

    const chatLog = document.getElementById('ai-chat-log');
    const chatForm = document.getElementById('ai-chat-form');
    chatForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      const input = chatForm.querySelector('input[name=message]');
      const message = input.value.trim();
      if (!message) return;
      chatLog.insertAdjacentHTML('beforeend', `<div class="chat-msg user">${escapeHtml(message)}</div>`);
      input.value = '';
      chatLog.scrollTop = chatLog.scrollHeight;
      try {
        const res = await api('/assistant/chat', { method: 'POST', body: JSON.stringify({ message }) });
        chatLog.insertAdjacentHTML('beforeend', `<div class="chat-msg bot">${escapeHtml(res.reply)}</div>`);
      } catch (err) {
        if (err.message !== 'unauthorized') {
          chatLog.insertAdjacentHTML('beforeend', `<div class="chat-msg bot error">Ошибка: ${escapeHtml(err.message)}</div>`);
        }
      }
      chatLog.scrollTop = chatLog.scrollHeight;
    });
  } catch (err) {
    if (err.message !== 'unauthorized') {
      mainContent.innerHTML = `<div class="error-block">Не удалось загрузить данные: ${escapeHtml(err.message)}</div>`;
    }
  }
}

boot();
