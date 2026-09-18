const API = '';
let state = {
  token: localStorage.getItem('mvp_token') || null,
  user: JSON.parse(localStorage.getItem('mvp_user') || 'null'),
  tab: 'dashboard',
  period: currentPeriod(),
  childrenCache: [],
};

function currentPeriod() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ---- API helper --------------------------------------------------------

async function api(path, options = {}) {
  const headers = options.headers || {};
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  if (options.body && !(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  const res = await fetch(API + path, { ...options, headers });
  if (res.status === 401) {
    logout();
    throw new Error('Сессия истекла, войдите снова');
  }
  if (!res.ok) {
    let message = `Ошибка ${res.status}`;
    try {
      const body = await res.json();
      message = Array.isArray(body.message) ? body.message.join(', ') : body.message || message;
    } catch (_) {}
    throw new Error(message);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) return res.json();
  return res;
}

function showToast(message, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = message;
  toast.style.background = isError ? '#d6483f' : '#1c2430';
  toast.classList.remove('hidden');
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => toast.classList.add('hidden'), 3500);
}

function money(n) {
  return `${Number(n).toLocaleString('ru-RU')} сом`;
}

// ---- Auth ---------------------------------------------------------------

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  const errorBox = document.getElementById('login-error');
  errorBox.textContent = '';
  try {
    const result = await api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    state.token = result.accessToken;
    state.user = result.user;
    localStorage.setItem('mvp_token', state.token);
    localStorage.setItem('mvp_user', JSON.stringify(state.user));
    showApp();
  } catch (err) {
    errorBox.textContent = err.message;
  }
});

document.getElementById('logout-btn').addEventListener('click', logout);

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('mvp_token');
  localStorage.removeItem('mvp_user');
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById('login-screen').classList.remove('hidden');
}

function showApp() {
  document.getElementById('login-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.remove('hidden');
  document.getElementById('period-select').value = state.period;
  renderTab();
}

document.getElementById('period-select').addEventListener('change', (e) => {
  state.period = e.target.value;
  renderTab();
});

document.getElementById('tabs').addEventListener('click', (e) => {
  const btn = e.target.closest('.tab');
  if (!btn) return;
  document.querySelectorAll('.tab').forEach((t) => t.classList.remove('active'));
  btn.classList.add('active');
  state.tab = btn.dataset.tab;
  renderTab();
});

// ---- Tab router -----------------------------------------------------------

const content = document.getElementById('content');

async function renderTab() {
  content.innerHTML = '<div class="empty-state">Загрузка…</div>';
  try {
    if (state.tab === 'dashboard') return renderDashboard();
    if (state.tab === 'children') return renderChildren();
    if (state.tab === 'payments') return renderPayments();
    if (state.tab === 'bank') return renderBankOperations();
    if (state.tab === 'expenses') return renderExpenses();
    if (state.tab === 'imports') return renderImportHistory();
  } catch (err) {
    content.innerHTML = `<div class="panel"><p class="error-text">${escapeHtml(err.message)}</p></div>`;
  }
}

function escapeHtml(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// ---- Dashboard --------------------------------------------------------

async function renderDashboard() {
  const [summary, debtors] = await Promise.all([
    api(`/dashboard/summary?period=${state.period}`),
    api(`/payments/debtors?period=${state.period}`),
  ]);

  content.innerHTML = `
    <div class="stats-grid">
      ${statCard('Детей', summary.childrenCount)}
      ${statCard('План поступлений', money(summary.plan))}
      ${statCard('Получено', money(summary.received), 'accent-green')}
      ${statCard('Не оплачено', money(summary.unpaid), 'accent-red')}
      ${statCard('Расходы', money(summary.expenses))}
      ${statCard('Остаток', money(summary.balance), summary.balance >= 0 ? 'accent-blue' : 'accent-red')}
      ${statCard('% собираемости', `${summary.collectionRate}%`)}
      ${statCard('Должников', summary.debtorsCount, summary.debtorsCount > 0 ? 'accent-red' : '')}
      ${statCard('Средний платёж', money(summary.averagePayment))}
    </div>
    <div class="panel">
      <div class="panel-row">
        <h2>Не оплатили (${state.period})</h2>
        <a class="btn-small secondary" href="/exports/pdf/summary?period=${state.period}&token=${state.token}" target="_blank">Скачать PDF-отчёт</a>
      </div>
      ${debtors.length === 0 ? '<div class="empty-state">Все оплатили — должников нет.</div>' : debtorsTable(debtors)}
    </div>
  `;
  wireExportLinks();
}

function statCard(label, value, accent = '') {
  return `<div class="stat-card ${accent}"><div class="label">${label}</div><div class="value">${value}</div></div>`;
}

function debtorsTable(rows) {
  return `<table><thead><tr><th>Ребёнок</th><th>Группа</th><th>Родитель</th><th>Начислено</th><th>Оплачено</th><th>Долг</th></tr></thead><tbody>
    ${rows.map((r) => `<tr><td>${escapeHtml(r.fullName)}</td><td>${escapeHtml(r.groupName || '—')}</td><td>${escapeHtml(r.parentName || '—')}</td><td>${money(r.expected)}</td><td>${money(r.paid)}</td><td>${money(r.remaining)}</td></tr>`).join('')}
  </tbody></table>`;
}

// ---- Children -----------------------------------------------------------

async function renderChildren() {
  const result = await api('/children?pageSize=200');
  state.childrenCache = result.items;

  content.innerHTML = `
    <div class="panel">
      <div class="panel-row">
        <h2>Загрузка списка детей</h2>
      </div>
      <p class="empty-state" style="text-align:left;padding:0 0 10px">Загрузите файл (.xlsx, .xls, .csv, .docx) со списком детей — колонки распознаются автоматически.</p>
      <input type="file" id="children-file-input" accept=".xlsx,.xls,.csv,.docx" />
      <div id="children-import-preview"></div>
    </div>

    <div class="panel">
      <div class="panel-row"><h2>Добавить ребёнка вручную</h2></div>
      <form id="child-form" class="form-grid">
        <label>ФИО<input name="fullName" required /></label>
        <label>Группа<input name="groupName" /></label>
        <label>Оплата в месяц<input name="monthlyFee" type="number" step="0.01" required /></label>
        <label>Родитель<input name="parentName" /></label>
        <label>Телефон<input name="parentPhone" /></label>
      </form>
      <button class="btn" id="child-submit">Добавить</button>
    </div>

    <div class="panel">
      <div class="panel-row">
        <h2>Дети (${state.childrenCache.length})</h2>
        <a class="btn-small secondary" href="/exports/excel/children?token=${state.token}" target="_blank">Скачать Excel</a>
      </div>
      ${childrenTable(state.childrenCache)}
    </div>
  `;
  wireExportLinks();

  document.getElementById('children-file-input').addEventListener('change', handleChildrenFile);
  document.getElementById('child-submit').addEventListener('click', async (e) => {
    e.preventDefault();
    const form = document.getElementById('child-form');
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await api('/children', { method: 'POST', body: JSON.stringify(data) });
      showToast('Ребёнок добавлен');
      renderChildren();
    } catch (err) {
      showToast(err.message, true);
    }
  });

  content.querySelectorAll('[data-remove-child]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Удалить ребёнка из списка?')) return;
      await api(`/children/${btn.dataset.removeChild}`, { method: 'DELETE' });
      renderChildren();
    });
  });
}

function childrenTable(children) {
  if (children.length === 0) return '<div class="empty-state">Список пуст. Загрузите файл или добавьте вручную.</div>';
  return `<table><thead><tr><th>ФИО</th><th>Группа</th><th>Оплата</th><th>Родитель</th><th>Телефон</th><th>Статус</th><th></th></tr></thead><tbody>
    ${children.map((c) => `<tr>
      <td>${escapeHtml(c.fullName)}</td>
      <td>${escapeHtml(c.groupName || '—')}</td>
      <td>${money(c.monthlyFee)}</td>
      <td>${escapeHtml(c.parentName || '—')}</td>
      <td>${escapeHtml(c.parentPhone || '—')}</td>
      <td>${c.status === 'active' ? '<span class="badge badge-green">Активен</span>' : '<span class="badge badge-red">Неактивен</span>'}</td>
      <td><button class="btn-small danger" data-remove-child="${c.id}">Удалить</button></td>
    </tr>`).join('')}
  </tbody></table>`;
}

async function handleChildrenFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const form = new FormData();
  form.append('file', file);
  const preview = document.getElementById('children-import-preview');
  preview.innerHTML = '<div class="empty-state">Разбираю файл…</div>';
  try {
    const result = await api('/children/import/preview', { method: 'POST', body: form });
    renderImportPreview(preview, result.rows, ['fullName', 'groupName', 'monthlyFee', 'parentName', 'parentPhone'], async (rows) => {
      await api('/children/import/commit', { method: 'POST', body: JSON.stringify({ fileName: file.name, rows }) });
      showToast('Список детей сохранён');
      e.target.value = '';
      preview.innerHTML = '';
      renderChildren();
    });
  } catch (err) {
    preview.innerHTML = `<p class="error-text">${escapeHtml(err.message)}</p>`;
  }
}

function renderImportPreview(container, rows, fields, onCommit) {
  const withWarnings = rows.filter((r) => r.warnings && r.warnings.length > 0).length;
  container.innerHTML = `
    <p style="font-size:13px;color:var(--ink-muted)">Найдено строк: ${rows.length}, с предупреждениями: ${withWarnings}</p>
    <table><thead><tr>${fields.map((f) => `<th>${f}</th>`).join('')}<th>Предупреждения</th></tr></thead><tbody>
      ${rows.map((r) => `<tr>${fields.map((f) => `<td>${escapeHtml(r[f])}</td>`).join('')}<td>${(r.warnings || []).length ? `<ul class="warning-list">${r.warnings.map((w) => `<li>${escapeHtml(w)}</li>`).join('')}</ul>` : ''}</td></tr>`).join('')}
    </tbody></table>
    <div class="btn-row" style="margin-top:12px">
      <button class="btn" id="commit-import-btn">Подтвердить и сохранить</button>
    </div>
  `;
  container.querySelector('#commit-import-btn').addEventListener('click', async () => {
    try {
      await onCommit(rows);
    } catch (err) {
      showToast(err.message, true);
    }
  });
}

// ---- Payments -----------------------------------------------------------

async function renderPayments() {
  const [table, needsReview] = await Promise.all([
    api(`/payments/table?period=${state.period}`),
    api('/payments/matches?status=needs_review'),
  ]);

  content.innerHTML = `
    <div class="panel">
      <div class="panel-row"><h2>Загрузка банковской выписки</h2></div>
      <p class="empty-state" style="text-align:left;padding:0 0 10px">Загрузите выписку (.xlsx, .xls, .csv, .docx, .pdf) — платежи будут автоматически сопоставлены с детьми.</p>
      <input type="file" id="bank-file-input" accept=".xlsx,.xls,.csv,.docx,.pdf" />
      <div id="bank-import-preview"></div>
    </div>

    ${needsReview.length > 0 ? `
    <div class="panel">
      <h2>Требуют подтверждения (${needsReview.length})</h2>
      ${needsReview.map(matchReviewRow).join('')}
    </div>` : ''}

    <div class="panel">
      <div class="panel-row">
        <h2>Таблица оплат (${state.period})</h2>
        <a class="btn-small secondary" href="/exports/excel/payments?period=${state.period}&token=${state.token}" target="_blank">Скачать Excel</a>
      </div>
      ${paymentsTableHtml(table)}
    </div>
  `;
  wireExportLinks();

  document.getElementById('bank-file-input').addEventListener('change', handleBankFile);

  content.querySelectorAll('[data-confirm-match]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api(`/payments/matches/${btn.dataset.confirmMatch}`, { method: 'PUT', body: JSON.stringify({ action: 'confirm' }) });
      showToast('Оплата подтверждена');
      renderPayments();
    });
  });
  content.querySelectorAll('[data-reject-match]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      await api(`/payments/matches/${btn.dataset.rejectMatch}`, { method: 'PUT', body: JSON.stringify({ action: 'not_a_payment' }) });
      showToast('Отмечено как «не является оплатой»');
      renderPayments();
    });
  });
  content.querySelectorAll('[data-pick-child]').forEach((select) => {
    select.addEventListener('change', async (e) => {
      const childId = e.target.value;
      if (!childId) return;
      await api(`/payments/matches/${select.dataset.pickChild}`, { method: 'PUT', body: JSON.stringify({ action: 'confirm', childId }) });
      showToast('Ребёнок выбран, оплата подтверждена');
      renderPayments();
    });
  });
}

function matchReviewRow(m) {
  const tx = m.transaction;
  const tierBadge = { green: 'badge-green', yellow: 'badge-yellow', red: 'badge-red' }[m.confidenceTier] || 'badge-red';
  const suggested = m.childName ? `Предполагаемый ребёнок: <b>${escapeHtml(m.childName)}</b>` : 'Ребёнок не определён';
  const options = state.childrenCache.length
    ? state.childrenCache.map((c) => `<option value="${c.id}">${escapeHtml(c.fullName)}</option>`).join('')
    : '';
  return `
    <div class="panel" style="background:#fafbfc;margin-bottom:10px">
      <p>Найден платёж ${money(tx.amount)} от «${escapeHtml(tx.payerName)}» <span class="badge ${tierBadge}">${m.confidenceScore}%</span></p>
      <p style="color:var(--ink-muted);font-size:13px">${suggested}${tx.purpose ? ` · Назначение: ${escapeHtml(tx.purpose)}` : ''}</p>
      <div class="btn-row">
        ${m.childId ? `<button class="btn-small" data-confirm-match="${m.id}">Подтвердить</button>` : ''}
        <select data-pick-child="${m.id}" style="min-width:180px">
          <option value="">Выбрать другого ребёнка…</option>
          ${options}
        </select>
        <button class="btn-small danger" data-reject-match="${m.id}">Не является оплатой</button>
      </div>
    </div>
  `;
}

function paymentsTableHtml(rows) {
  if (rows.length === 0) return '<div class="empty-state">Нет данных за этот период. Сначала добавьте детей.</div>';
  const statusBadge = { paid: 'badge-green', partial: 'badge-yellow', unpaid: 'badge-red', overpaid: 'badge-blue' };
  const statusLabel = { paid: 'Оплачено', partial: 'Частично оплачено', unpaid: 'Не оплачено', overpaid: 'Переплата' };
  return `<table><thead><tr><th>Ребёнок</th><th>Группа</th><th>Начислено</th><th>Оплачено</th><th>Остаток</th><th>Статус</th></tr></thead><tbody>
    ${rows.map((r) => `<tr>
      <td>${escapeHtml(r.fullName)}</td>
      <td>${escapeHtml(r.groupName || '—')}</td>
      <td>${money(r.expected)}</td>
      <td>${money(r.paid)}</td>
      <td>${money(r.remaining)}</td>
      <td><span class="badge ${statusBadge[r.paymentStatus]}">${statusLabel[r.paymentStatus]}</span></td>
    </tr>`).join('')}
  </tbody></table>`;
}

async function handleBankFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const form = new FormData();
  form.append('file', file);
  const preview = document.getElementById('bank-import-preview');
  preview.innerHTML = '<div class="empty-state">Разбираю файл…</div>';
  try {
    const result = await api('/payments/import/preview', { method: 'POST', body: form });
    const rows = result.rows.map((r) => ({
      ...r,
      warnings: [...(r.warnings || []), r.isDuplicate ? 'Эта операция уже импортирована' : null, r.suggestedChildName ? `Похоже на оплату: ${r.suggestedChildName} (${r.score}%)` : null].filter(Boolean),
    }));
    renderImportPreview(preview, rows, ['date', 'amount', 'payerName', 'purpose'], async (rows) => {
      const result = await api('/payments/import/commit', { method: 'POST', body: JSON.stringify({ fileName: file.name, rows }) });
      showToast(`Загружено: ${result.imported}, авто-подтверждено: ${result.autoConfirmed}, на проверку: ${result.needsReview}, пропущено дублей: ${result.skippedDuplicates}`);
      e.target.value = '';
      preview.innerHTML = '';
      renderPayments();
    });
  } catch (err) {
    preview.innerHTML = `<p class="error-text">${escapeHtml(err.message)}</p>`;
  }
}

// ---- Bank operations ------------------------------------------------------

async function renderBankOperations() {
  const operations = await api('/payments/bank-operations');
  const statusLabel = {
    auto_confirmed: 'Авто-подтверждено',
    confirmed: 'Подтверждено вручную',
    needs_review: 'Требует проверки',
    not_a_payment: 'Не является оплатой',
    rejected: 'Отклонено',
  };
  const statusBadge = { auto_confirmed: 'badge-green', confirmed: 'badge-blue', needs_review: 'badge-yellow', not_a_payment: 'badge-red', rejected: 'badge-red' };

  content.innerHTML = `
    <div class="panel">
      <div class="panel-row">
        <h2>Банковские операции (${operations.length})</h2>
        <a class="btn-small secondary" href="/exports/excel/bank-operations?token=${state.token}" target="_blank">Скачать Excel</a>
      </div>
      ${operations.length === 0 ? '<div class="empty-state">Нет загруженных операций.</div>' : `
      <table><thead><tr><th>Дата</th><th>Сумма</th><th>Плательщик</th><th>Назначение</th><th>Статус</th><th>Ребёнок</th></tr></thead><tbody>
        ${operations.map((op) => `<tr>
          <td>${escapeHtml(op.date)}</td>
          <td>${money(op.amount)}</td>
          <td>${escapeHtml(op.payerName)}</td>
          <td>${escapeHtml(op.purpose || '—')}</td>
          <td>${op.match ? `<span class="badge ${statusBadge[op.match.status]}">${statusLabel[op.match.status]}</span>` : '<span class="badge badge-red">Не обработано</span>'}</td>
          <td>${escapeHtml(op.match?.childName || '—')}</td>
        </tr>`).join('')}
      </tbody></table>`}
    </div>
  `;
  wireExportLinks();
}

// ---- Expenses -------------------------------------------------------------

async function renderExpenses() {
  const [expenses, categories] = await Promise.all([api('/expenses'), api('/expenses/categories')]);

  content.innerHTML = `
    <div class="panel">
      <div class="panel-row"><h2>Загрузка расходов из файла</h2></div>
      <input type="file" id="expenses-file-input" accept=".xlsx,.xls,.csv,.docx" />
      <div id="expenses-import-preview"></div>
    </div>

    <div class="panel">
      <div class="panel-row"><h2>Добавить расход</h2></div>
      <form id="expense-form" class="form-grid">
        <label>Дата<input name="date" type="date" required /></label>
        <label>Категория<select name="category" required>${categories.map((c) => `<option value="${c}">${c}</option>`).join('')}</select></label>
        <label>Сумма<input name="amount" type="number" step="0.01" required /></label>
        <label>Описание<input name="description" /></label>
        <label>Способ оплаты<input name="paymentMethod" /></label>
      </form>
      <button class="btn" id="expense-submit">Добавить</button>
    </div>

    <div class="panel">
      <div class="panel-row">
        <h2>Расходы (${expenses.length})</h2>
        <a class="btn-small secondary" href="/exports/excel/expenses?token=${state.token}" target="_blank">Скачать Excel</a>
      </div>
      ${expenses.length === 0 ? '<div class="empty-state">Расходов пока нет.</div>' : `
      <table><thead><tr><th>Дата</th><th>Категория</th><th>Сумма</th><th>Описание</th><th>Способ оплаты</th><th></th></tr></thead><tbody>
        ${expenses.map((e) => `<tr>
          <td>${escapeHtml(e.date)}</td>
          <td>${escapeHtml(e.category)}</td>
          <td>${money(e.amount)}</td>
          <td>${escapeHtml(e.description || '—')}</td>
          <td>${escapeHtml(e.paymentMethod || '—')}</td>
          <td><button class="btn-small danger" data-remove-expense="${e.id}">Удалить</button></td>
        </tr>`).join('')}
      </tbody></table>`}
    </div>
  `;
  wireExportLinks();

  document.getElementById('expenses-file-input').addEventListener('change', handleExpensesFile);
  document.getElementById('expense-submit').addEventListener('click', async (e) => {
    e.preventDefault();
    const form = document.getElementById('expense-form');
    const data = Object.fromEntries(new FormData(form).entries());
    try {
      await api('/expenses', { method: 'POST', body: JSON.stringify(data) });
      showToast('Расход добавлен');
      renderExpenses();
    } catch (err) {
      showToast(err.message, true);
    }
  });
  content.querySelectorAll('[data-remove-expense]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (!confirm('Удалить расход?')) return;
      await api(`/expenses/${btn.dataset.removeExpense}`, { method: 'DELETE' });
      renderExpenses();
    });
  });
}

async function handleExpensesFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  const form = new FormData();
  form.append('file', file);
  const preview = document.getElementById('expenses-import-preview');
  preview.innerHTML = '<div class="empty-state">Разбираю файл…</div>';
  try {
    const result = await api('/expenses/import/preview', { method: 'POST', body: form });
    renderImportPreview(preview, result.rows, ['date', 'category', 'amount', 'description'], async (rows) => {
      await api('/expenses/import/commit', { method: 'POST', body: JSON.stringify({ fileName: file.name, rows }) });
      showToast('Расходы сохранены');
      e.target.value = '';
      preview.innerHTML = '';
      renderExpenses();
    });
  } catch (err) {
    preview.innerHTML = `<p class="error-text">${escapeHtml(err.message)}</p>`;
  }
}

// ---- Import history -------------------------------------------------------

async function renderImportHistory() {
  const batches = await api('/payments/import-history');
  const typeLabel = { children: 'Список детей', bank_statement: 'Банковская выписка', expenses: 'Расходы' };

  content.innerHTML = `
    <div class="panel">
      <h2>История загрузок</h2>
      ${batches.length === 0 ? '<div class="empty-state">Загрузок ещё не было.</div>' : `
      <table><thead><tr><th>Файл</th><th>Тип</th><th>Дата</th><th>Строк</th><th>Обработано</th><th>На проверке</th><th>Пропущено дублей</th></tr></thead><tbody>
        ${batches.map((b) => `<tr>
          <td>${escapeHtml(b.fileName)}</td>
          <td>${typeLabel[b.type] || b.type}</td>
          <td>${new Date(b.createdAt).toLocaleString('ru-RU')}</td>
          <td>${b.totalRows}</td>
          <td>${b.matchedRows}</td>
          <td>${b.needsReviewRows}</td>
          <td>${b.skippedDuplicateRows}</td>
        </tr>`).join('')}
      </tbody></table>`}
    </div>
  `;
}

// ---- Export links (auth via query token, since <a> can't send headers) ----

function wireExportLinks() {
  // Files served through /exports require a Bearer token; anchors can't set
  // headers, so pull the file with fetch and hand the browser a blob URL.
  content.querySelectorAll('a[href^="/exports/"]').forEach((a) => {
    a.addEventListener('click', async (e) => {
      e.preventDefault();
      const url = new URL(a.href);
      url.searchParams.delete('token');
      try {
        const res = await fetch(url.pathname + url.search, { headers: { Authorization: `Bearer ${state.token}` } });
        if (!res.ok) throw new Error('Не удалось скачать файл');
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = url.pathname.split('/').pop() + (url.pathname.includes('pdf') ? '.pdf' : '.xlsx');
        link.click();
        URL.revokeObjectURL(blobUrl);
      } catch (err) {
        showToast(err.message, true);
      }
    });
  });
}

// ---- Boot ------------------------------------------------------------------

if (state.token && state.user) {
  showApp();
} else {
  document.getElementById('login-screen').classList.remove('hidden');
}
