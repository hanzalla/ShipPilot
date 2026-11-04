import { api } from '../api.js';
import { requireAuth } from '../auth.js';
import { statusBadge, timeAgo, formatDate, shortSha, initTheme, initUserDisplay, showAlert, setButtonLoading } from '../utils.js';

initTheme();

const user = await requireAuth();
if (!user) throw new Error('Not authenticated');
initUserDisplay(user);

const params = new URLSearchParams(location.search);
const appId = params.get('id');
if (!appId) { location.href = 'applications.html'; }

let currentApp = null;

// ── Tabs ──────────────────────────────────────────────
const tabBtns   = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.dataset.tab;
    tabBtns.forEach(b => b.classList.toggle('active', b.dataset.tab === target));
    tabPanels.forEach(p => p.classList.toggle('active', p.id === `tab-${target}`));

    if (target === 'environments') loadEnvs();
    if (target === 'deployments')  loadDeployments();
  });
});

// ── Load app ─────────────────────────────────────────
async function loadApp() {
  try {
    const app = await api.getApp(appId);
    currentApp = app;

    document.title = `ShipPilot — ${app.name}`;
    document.getElementById('topbar-app-name').textContent = app.name;
    document.getElementById('app-title').textContent = app.name;
    document.getElementById('app-repo').textContent = app.repo_full_name || '';
    document.getElementById('app-header').style.display = 'flex';

    if (app.description) {
      document.getElementById('app-desc-text').innerHTML =
        `<span style="font-size:0.875rem; color: var(--color-text-muted)">${app.description}</span>`;
    }

    // Overview
    document.getElementById('ov-repo-name').textContent   = app.repo_full_name || '—';
    document.getElementById('ov-branch').textContent      = app.default_branch || '—';
    document.getElementById('ov-clone-url').textContent   = app.clone_url || '—';
    document.getElementById('ov-created-at').textContent  = formatDate(app.created_at);

    // Settings pre-fill
    document.getElementById('settings-name').value = app.name;
    document.getElementById('settings-desc').value = app.description || '';
    document.getElementById('delete-app-name').textContent = app.name;

    loadOverviewStats();
  } catch (err) {
    showAlert('alert-area', `Failed to load application: ${err.message}`);
  }
}

async function loadOverviewStats() {
  const [envs, deploys] = await Promise.allSettled([
    api.getEnvs(appId),
    api.getDeployments(appId),
  ]);

  document.getElementById('stat-envs').textContent =
    envs.status === 'fulfilled' ? envs.value.length : '—';

  if (deploys.status === 'fulfilled') {
    const list = deploys.value;
    document.getElementById('stat-deploys').textContent = list.length;
    document.getElementById('stat-last').textContent =
      list.length ? timeAgo(list[0].created_at) : 'Never';
  }
}

// ── Environments ──────────────────────────────────────
async function loadEnvs() {
  const container = document.getElementById('env-list-container');
  container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const envs = await api.getEnvs(appId);
    if (!envs.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">◎</div>
          <div class="empty-state__title">No environments</div>
          <div class="empty-state__desc">Add a development, staging, or production environment.</div>
        </div>`;
      return;
    }

    const colorClass = { production: 'env-name-prod', staging: 'env-name-staging', development: 'env-name-dev' };

    container.innerHTML = `<div class="env-list">${envs.map(e => `
      <div class="env-card">
        <div>
          <div class="env-card__name ${colorClass[e.name] || ''}">${e.name}</div>
          <div class="env-card__target">${e.deployment_target || '—'}</div>
          ${e.health_check_url ? `<div class="env-card__target" style="margin-top:2px">${e.health_check_url}</div>` : ''}
        </div>
        <span class="text-xs text-faint">Added ${timeAgo(e.created_at)}</span>
      </div>`).join('')}
    </div>`;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">Failed to load environments: ${err.message}</div>`;
  }
}

// Add environment modal
const envModal     = document.getElementById('env-modal');
const addEnvBtn    = document.getElementById('add-env-btn');
const closeEnvBtn  = document.getElementById('close-env-modal');
const cancelEnvBtn = document.getElementById('cancel-env-modal');
const submitEnvBtn = document.getElementById('submit-env-btn');

addEnvBtn.addEventListener('click', () => envModal.classList.add('open'));
closeEnvBtn.addEventListener('click', () => envModal.classList.remove('open'));
cancelEnvBtn.addEventListener('click', () => envModal.classList.remove('open'));
envModal.addEventListener('click', e => { if (e.target === envModal) envModal.classList.remove('open'); });

submitEnvBtn.addEventListener('click', async () => {
  const name   = document.getElementById('env-name-select').value;
  const target = document.getElementById('env-target').value.trim();
  const health = document.getElementById('env-health').value.trim();

  setButtonLoading(submitEnvBtn, true);
  try {
    await api.createEnv(appId, { name, deployment_target: target || undefined, health_check_url: health || undefined });
    envModal.classList.remove('open');
    document.getElementById('env-target').value = '';
    document.getElementById('env-health').value = '';
    loadEnvs();
    loadOverviewStats();
  } catch (err) {
    showAlert('env-modal-alert', err.message || 'Failed to add environment.');
    setButtonLoading(submitEnvBtn, false);
  }
});

// ── Deployments ───────────────────────────────────────
async function loadDeployments() {
  const container = document.getElementById('deployments-container');
  container.innerHTML = '<div class="empty-state"><div class="spinner"></div></div>';
  try {
    const list = await api.getDeployments(appId);
    if (!list.length) {
      container.innerHTML = `
        <div class="empty-state">
          <div class="empty-state__icon">↑</div>
          <div class="empty-state__title">No deployments yet</div>
          <div class="empty-state__desc">Deployments will appear here once your CI pipeline triggers them.</div>
        </div>`;
      return;
    }

    container.innerHTML = `
      <div style="overflow-x:auto">
        <table class="deploy-table">
          <thead>
            <tr>
              <th>Status</th>
              <th>Environment</th>
              <th>Branch</th>
              <th>Commit</th>
              <th>Triggered by</th>
              <th>When</th>
            </tr>
          </thead>
          <tbody>
            ${list.map(d => `
              <tr>
                <td>${statusBadge(d.status)}</td>
                <td>${d.environment}</td>
                <td><span class="sha">${d.branch}</span></td>
                <td><span class="sha">${shortSha(d.commit_sha)}</span></td>
                <td>${d.triggered_by_name}</td>
                <td class="text-faint text-xs">${timeAgo(d.created_at)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>`;
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">Failed to load deployments: ${err.message}</div>`;
  }
}

// ── Settings ──────────────────────────────────────────
document.getElementById('save-settings-btn').addEventListener('click', async () => {
  const name = document.getElementById('settings-name').value.trim();
  const desc = document.getElementById('settings-desc').value.trim();

  if (!name) {
    showAlert('settings-alert', 'Application name is required.');
    return;
  }

  const btn = document.getElementById('save-settings-btn');
  setButtonLoading(btn, true);
  try {
    await api.updateApp(appId, { name, description: desc || null });
    document.getElementById('app-title').textContent = name;
    document.getElementById('topbar-app-name').textContent = name;
    document.getElementById('delete-app-name').textContent = name;
    currentApp.name = name;
    showAlert('settings-alert', 'Changes saved.', 'success');
  } catch (err) {
    showAlert('settings-alert', err.message || 'Failed to save changes.');
  } finally {
    setButtonLoading(btn, false);
  }
});

// ── Delete app ────────────────────────────────────────
const deleteModal     = document.getElementById('delete-modal');
const deleteAppBtn    = document.getElementById('delete-app-btn');
const closeDeleteBtn  = document.getElementById('close-delete-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete-modal');
const confirmDeleteBtn= document.getElementById('confirm-delete-btn');
const deleteInput     = document.getElementById('delete-confirm-input');

deleteAppBtn.addEventListener('click', () => deleteModal.classList.add('open'));
closeDeleteBtn.addEventListener('click',  () => deleteModal.classList.remove('open'));
cancelDeleteBtn.addEventListener('click', () => deleteModal.classList.remove('open'));

deleteInput.addEventListener('input', () => {
  confirmDeleteBtn.disabled = deleteInput.value !== currentApp?.name;
});

confirmDeleteBtn.addEventListener('click', async () => {
  setButtonLoading(confirmDeleteBtn, true);
  try {
    await api.deleteApp(appId);
    location.href = 'applications.html';
  } catch (err) {
    showAlert('alert-area', err.message || 'Failed to delete application.');
    deleteModal.classList.remove('open');
    setButtonLoading(confirmDeleteBtn, false);
  }
});

// ── Init ──────────────────────────────────────────────
loadApp();
