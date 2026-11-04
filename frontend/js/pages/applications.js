import { api } from '../api.js';
import { requireAuth } from '../auth.js';
import { timeAgo, initTheme, initUserDisplay, showAlert, setButtonLoading } from '../utils.js';

initTheme();

const user = await requireAuth();
if (!user) throw new Error('Not authenticated');
initUserDisplay(user);

// ── GitHub status ─────────────────────────────────────
let githubConnected = false;
let repoCache       = [];

async function checkGithub() {
  try {
    const s = await api.githubStatus();
    githubConnected = s.connected;
  } catch {
    githubConnected = false;
  }
  renderDrawerRepoSection();
}

// ── Drawer ────────────────────────────────────────────
const drawer         = document.getElementById('new-app-drawer');
const overlay        = document.getElementById('drawer-overlay');
const newAppBtn      = document.getElementById('new-app-btn');
const closeDrawerBtn = document.getElementById('close-drawer');
const cancelBtn      = document.getElementById('cancel-drawer');
const submitBtn      = document.getElementById('submit-app');
const repoSection    = document.getElementById('repo-section');

function openDrawer()  { drawer.classList.add('open'); overlay.classList.add('open'); }
function closeDrawer() { drawer.classList.remove('open'); overlay.classList.remove('open'); }

newAppBtn.addEventListener('click', openDrawer);
closeDrawerBtn.addEventListener('click', closeDrawer);
cancelBtn.addEventListener('click', closeDrawer);
overlay.addEventListener('click', closeDrawer);

function renderDrawerRepoSection() {
  if (githubConnected) {
    repoSection.innerHTML = `
      <h4 style="color:var(--color-text-muted);font-size:0.78rem;text-transform:uppercase;letter-spacing:0.06em">GitHub Repository</h4>
      <div class="form-group">
        <label class="form-label" for="repo-select">Repository</label>
        <select class="form-input" id="repo-select">
          <option value="">— Select a repository —</option>
        </select>
        <span class="form-hint" id="repo-load-hint">Loading your repos…</span>
      </div>
      <div class="form-group" id="branch-group" style="display:none">
        <label class="form-label" for="branch-select">Branch</label>
        <select class="form-input" id="branch-select">
          <option value="">— Select a branch —</option>
        </select>
      </div>`;

    loadRepos();
    document.getElementById('repo-select').addEventListener('change', onRepoChange);
  } else {
    repoSection.innerHTML = `
      <h4 style="color:var(--color-text-muted);font-size:0.78rem;text-transform:uppercase;letter-spacing:0.06em">GitHub Repository</h4>
      <div class="alert" style="font-size:0.85rem;padding:var(--space-3) var(--space-4);background:var(--color-bg-elevated);border:1px solid var(--color-border);border-radius:var(--radius-sm);margin-bottom:var(--space-3)">
        GitHub not connected — <a href="github.html" style="color:var(--color-primary)">connect your account</a> for repo/branch dropdowns, or enter details manually.
      </div>
      <div class="form-group">
        <label class="form-label" for="repo-owner">Owner / Organization</label>
        <input class="form-input" type="text" id="repo-owner" placeholder="e.g. hanzalla" />
      </div>
      <div class="form-group">
        <label class="form-label" for="repo-name">Repository name</label>
        <input class="form-input" type="text" id="repo-name" placeholder="e.g. my-api" />
      </div>
      <div class="form-group">
        <label class="form-label" for="default-branch">Default branch</label>
        <input class="form-input" type="text" id="default-branch" placeholder="main" value="main" />
      </div>`;
  }
}

async function loadRepos() {
  try {
    repoCache = await api.githubRepos();
    const select = document.getElementById('repo-select');
    document.getElementById('repo-load-hint').textContent = '';
    repoCache.forEach(r => {
      const opt = document.createElement('option');
      opt.value = JSON.stringify({ owner: r.owner, name: r.name, default_branch: r.default_branch });
      opt.textContent = `${r.full_name}${r.private ? ' 🔒' : ''}`;
      select.appendChild(opt);
    });
  } catch (err) {
    document.getElementById('repo-load-hint').textContent = `Failed to load repos: ${err.message}`;
  }
}

async function onRepoChange() {
  const select = document.getElementById('repo-select');
  const val    = select.value;
  const branchGroup = document.getElementById('branch-group');

  if (!val) { branchGroup.style.display = 'none'; return; }

  branchGroup.style.display = 'block';
  const { owner, name } = JSON.parse(val);
  const branchSelect = document.getElementById('branch-select');
  branchSelect.innerHTML = '<option value="">Loading branches…</option>';

  try {
    const list = await api.githubBranches(owner, name);
    const { default_branch } = JSON.parse(val);
    branchSelect.innerHTML = list.map(b =>
      `<option value="${b.name}" ${b.name === default_branch ? 'selected' : ''}>${b.name}</option>`
    ).join('');
  } catch (err) {
    branchSelect.innerHTML = `<option value="">Failed to load branches</option>`;
  }
}

// ── Create application ────────────────────────────────
submitBtn.addEventListener('click', async () => {
  const appName = document.getElementById('app-name').value.trim();
  const appDesc = document.getElementById('app-desc').value.trim();

  let repoOwner, repoName, branch;

  if (githubConnected) {
    const repoVal = document.getElementById('repo-select')?.value;
    if (!repoVal) {
      showAlert('drawer-alert', 'Please select a repository.');
      return;
    }
    const parsed = JSON.parse(repoVal);
    repoOwner = parsed.owner;
    repoName  = parsed.name;
    branch    = document.getElementById('branch-select')?.value || parsed.default_branch || 'main';
  } else {
    repoOwner = document.getElementById('repo-owner')?.value.trim();
    repoName  = document.getElementById('repo-name')?.value.trim();
    branch    = document.getElementById('default-branch')?.value.trim() || 'main';
  }

  if (!appName || !repoOwner || !repoName) {
    showAlert('drawer-alert', 'Application name, repo owner, and repo name are required.');
    return;
  }

  setButtonLoading(submitBtn, true);
  try {
    await api.createAppWithRepo({
      app_name: appName,
      app_description: appDesc,
      repo_owner: repoOwner,
      repo_name: repoName,
      default_branch: branch,
    });
    closeDrawer();
    loadApps();
  } catch (err) {
    showAlert('drawer-alert', err.message || 'Failed to create application.');
    setButtonLoading(submitBtn, false);
  }
});

// ── Load & render apps ────────────────────────────────
async function loadApps() {
  const grid = document.getElementById('apps-grid');
  try {
    const apps = await api.getApps();
    if (!apps.length) {
      grid.innerHTML = `
        <div style="grid-column:1/-1">
          <div class="empty-state">
            <div class="empty-state__icon">◫</div>
            <div class="empty-state__title">No applications yet</div>
            <div class="empty-state__desc">Connect a GitHub repository to register your first application.</div>
            <button class="btn btn-primary" onclick="document.getElementById('new-app-btn').click()">+ New Application</button>
          </div>
        </div>`;
      return;
    }
    grid.innerHTML = apps.map(app => `
      <a class="app-card" href="app-detail.html?id=${app.id}">
        <div style="flex:1; overflow:hidden">
          <div class="app-card__name">${app.name}</div>
          <div class="app-card__repo">${app.repo_full_name || '—'}</div>
          <div class="app-card__meta">
            <span class="badge badge-neutral">${app.default_branch || 'main'}</span>
            <span class="text-xs text-faint">Added ${timeAgo(app.created_at)}</span>
          </div>
        </div>
        <span style="color: var(--color-text-faint); font-size:1.1rem">›</span>
      </a>
    `).join('');
  } catch (err) {
    grid.innerHTML = `<div style="grid-column:1/-1"><div class="alert alert-error">Failed to load applications: ${err.message}</div></div>`;
  }
}

// ── Init ──────────────────────────────────────────────
checkGithub();
loadApps();
