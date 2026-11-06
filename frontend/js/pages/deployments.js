import { api }         from '../api.js';
import { requireAuth, initUser } from '../auth.js';
import { showAlert, formatRelative, statusBadge } from '../utils.js';

requireAuth();
initUser();

let currentPage   = 1;
let totalPages    = 1;
const filters     = { app_id: '', environment: '', status: '' };

const tbody       = document.getElementById('deployments-body');
const pageInfo    = document.getElementById('page-info');
const pagination  = document.getElementById('pagination');
const prevBtn     = document.getElementById('prev-btn');
const nextBtn     = document.getElementById('next-btn');
const filterApp   = document.getElementById('filter-app');
const filterEnv   = document.getElementById('filter-env');
const filterSts   = document.getElementById('filter-status');
const resetBtn    = document.getElementById('reset-filters');

// ── Load apps into filter dropdown ────────────────────
async function loadAppFilter() {
  try {
    const apps = await api.getApps();
    apps.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = a.name;
      filterApp.appendChild(opt);
    });
  } catch { /* non-critical */ }
}

// ── Render summary counts ─────────────────────────────
function renderCounts(counts) {
  document.getElementById('count-total').textContent     = counts?.total     ?? '—';
  document.getElementById('count-succeeded').textContent = counts?.succeeded ?? '—';
  document.getElementById('count-failed').textContent    = counts?.failed    ?? '—';
  document.getElementById('count-progress').textContent  = counts?.in_progress ?? '—';
}

// ── Render table rows ─────────────────────────────────
function renderRows(rows) {
  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="8">
      <div class="empty-state">
        <div class="empty-state__icon">↑</div>
        <div class="empty-state__title">No deployments yet</div>
        <div class="empty-state__sub">Deployments will appear here once triggered.</div>
      </div>
    </td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(d => `
    <tr>
      <td><a class="app-link" href="app-detail.html?id=${d.application_id}">${escHtml(d.application_name)}</a></td>
      <td>${envBadge(d.environment)}</td>
      <td><span class="sha">${escHtml(d.branch)}</span></td>
      <td><span class="sha">${d.commit_sha ? d.commit_sha.slice(0, 7) : '—'}</span></td>
      <td><span class="commit-msg" title="${escHtml(d.commit_message || '')}">${escHtml(d.commit_message || '—')}</span></td>
      <td>${statusBadge(d.status)}</td>
      <td style="font-size:0.82rem; color: var(--color-text-muted)">${escHtml(d.triggered_by_name)}</td>
      <td style="font-size:0.82rem; color: var(--color-text-muted); white-space:nowrap">${formatRelative(d.created_at)}</td>
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

// ── Fetch + render ────────────────────────────────────
async function load() {
  tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="spinner"></div></div></td></tr>`;
  try {
    const res = await api.getAllDeployments({ ...filters, page: currentPage });
    renderCounts(res.counts);
    renderRows(res.data);
    updatePagination(res.pagination);
  } catch (err) {
    showAlert('alert-area', err.message, 'error');
    tbody.innerHTML = '';
  }
}

// ── Filter events ─────────────────────────────────────
filterApp.addEventListener('change', () => { filters.app_id = filterApp.value; currentPage = 1; load(); });
filterEnv.addEventListener('change', () => { filters.environment = filterEnv.value; currentPage = 1; load(); });
filterSts.addEventListener('change', () => { filters.status = filterSts.value; currentPage = 1; load(); });

resetBtn.addEventListener('click', () => {
  filters.app_id = filters.environment = filters.status = '';
  filterApp.value = filterEnv.value = filterSts.value = '';
  currentPage = 1;
  load();
});

prevBtn.addEventListener('click', () => { if (currentPage > 1) { currentPage--; load(); } });
nextBtn.addEventListener('click', () => { if (currentPage < totalPages) { currentPage++; load(); } });

// ── Helpers ───────────────────────────────────────────
function envBadge(env) {
  const colors = { production: '#f85149', staging: 'var(--color-primary)', development: '#3fb950' };
  const c = colors[env] || 'var(--color-text-muted)';
  return `<span style="color:${c}; font-size:0.8rem; font-weight:600; text-transform:capitalize">${escHtml(env)}</span>`;
}

function escHtml(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ── Init ──────────────────────────────────────────────
loadAppFilter();
load();
