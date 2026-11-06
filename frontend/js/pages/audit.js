import { api }         from '../api.js';
import { requireAuth } from '../auth.js';
import { showAlert, timeAgo, initTheme, initUserDisplay } from '../utils.js';

initTheme();
const user = await requireAuth();
if (!user) throw new Error('Not authenticated');
initUserDisplay(user);

let currentPage = 1;
let totalPages  = 1;
const filters   = { action: '', resource_type: '' };

const tbody        = document.getElementById('audit-body');
const pageInfo     = document.getElementById('page-info');
const pagination   = document.getElementById('pagination');
const prevBtn      = document.getElementById('prev-btn');
const nextBtn      = document.getElementById('next-btn');
const filterAction = document.getElementById('filter-action');
const filterRes    = document.getElementById('filter-resource');
const resetBtn     = document.getElementById('reset-filters');
const refreshBtn   = document.getElementById('refresh-btn');

// ── Action badge ──────────────────────────────────────
function actionTag(action) {
  let cls = 'action-default';
  if (action.startsWith('auth'))       cls = 'action-auth';
  else if (action.startsWith('app'))   cls = 'action-create';
  else if (action.includes('delete'))  cls = 'action-delete';
  else if (action.includes('update'))  cls = 'action-update';
  else if (action.startsWith('github'))cls = 'action-github';
  else if (action.startsWith('deploy'))cls = 'action-deploy';
  return `<span class="action-tag ${cls}">${escHtml(action)}</span>`;
}

// ── Meta summary ─────────────────────────────────────
function metaSummary(meta) {
  if (!meta) return '—';
  try {
    const obj = typeof meta === 'string' ? JSON.parse(meta) : meta;
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${v}`)
      .join(' · ');
  } catch {
    return String(meta);
  }
}

// ── Render rows ───────────────────────────────────────
function renderRows(rows) {
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="5">
      <div class="empty-state">
        <div class="empty-state__icon">≡</div>
        <div class="empty-state__title">No audit events</div>
        <div class="empty-state__sub">Actions you take will be recorded here.</div>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td>${actionTag(r.action)}</td>
      <td style="font-size:0.82rem">
        ${r.resource_type
          ? `<span style="color:var(--color-text-muted)">${escHtml(r.resource_type)}</span>${r.resource_id ? ` <span class="sha">#${r.resource_id}</span>` : ''}`
          : '—'}
      </td>
      <td><span class="meta-cell" title="${escHtml(metaSummary(r.meta))}">${escHtml(metaSummary(r.meta))}</span></td>
      <td><span class="ip-cell">${escHtml(r.ip_address || '—')}</span></td>
      <td style="font-size:0.82rem; color:var(--color-text-muted); white-space:nowrap">${timeAgo(r.occurred_at)}</td>
    </tr>
  `).join('');
}

// ── Pagination ────────────────────────────────────────
function updatePagination(pag) {
  totalPages = pag.totalPages;
  if (pag.total === 0) { pagination.style.display = 'none'; return; }
  pagination.style.display = 'flex';
  pageInfo.textContent = `Page ${pag.page} of ${pag.totalPages} · ${pag.total} total`;
  prevBtn.disabled = pag.page <= 1;
  nextBtn.disabled = pag.page >= pag.totalPages;
}

// ── Fetch ─────────────────────────────────────────────
async function load() {
  tbody.innerHTML = `<tr><td colspan="5"><div class="empty-state"><div class="spinner"></div></div></td></tr>`;
  try {
    const res = await api.getAuditLogs({ ...filters, page: currentPage });
    renderRows(res.data);
    updatePagination(res.pagination);
  } catch (err) {
    showAlert('alert-area', err.message, 'error');
    tbody.innerHTML = '';
  }
}

// ── Filter events ─────────────────────────────────────
filterAction.addEventListener('change', () => { filters.action = filterAction.value; currentPage = 1; load(); });
filterRes.addEventListener('change',    () => { filters.resource_type = filterRes.value; currentPage = 1; load(); });

resetBtn.addEventListener('click', () => {
  filters.action = filters.resource_type = '';
  filterAction.value = filterRes.value = '';
  currentPage = 1;
  load();
});

refreshBtn.addEventListener('click', () => load());

prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; load(); } });
nextBtn.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; load(); } });

// ── Helpers ───────────────────────────────────────────
function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Init ──────────────────────────────────────────────
load();
