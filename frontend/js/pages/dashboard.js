import { api } from '../api.js';
import { requireAuth } from '../auth.js';
import { statusBadge, timeAgo, shortSha, initTheme, initUserDisplay, getGreeting } from '../utils.js';

initTheme();

const user = await requireAuth();
if (!user) throw new Error('Not authenticated');

initUserDisplay(user);
document.getElementById('greeting').textContent = `${getGreeting()}, ${user.name.split(' ')[0]}`;

async function loadStats() {
  try {
    const apps = await api.getApps();
    document.getElementById('stat-apps').textContent = apps.length;

    // Gather deployments from all apps
    let all = [];
    for (const app of apps) {
      try {
        const deps = await api.getDeployments(app.id);
        all = all.concat(deps.map(d => ({ ...d, app_name: app.name })));
      } catch { /* skip */ }
    }

    const now   = new Date();
    const today = all.filter(d => new Date(d.created_at).toDateString() === now.toDateString());
    const weekAgo = new Date(now - 7 * 86400000);
    const thisWeek = all.filter(d => new Date(d.created_at) >= weekAgo);

    document.getElementById('stat-today').textContent   = today.length;
    document.getElementById('stat-success').textContent = thisWeek.filter(d => d.status === 'succeeded').length;
    document.getElementById('stat-failed').textContent  = thisWeek.filter(d => d.status === 'failed').length;

    renderDeployments(all.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 10));
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

function renderDeployments(deployments) {
  const tbody = document.getElementById('deployments-body');

  if (!deployments.length) {
    tbody.innerHTML = `
      <tr><td colspan="6">
        <div class="empty-state">
          <div class="empty-state__icon">↑</div>
          <div class="empty-state__title">No deployments yet</div>
          <div class="empty-state__desc">Create an application and trigger your first deployment.</div>
        </div>
      </td></tr>`;
    return;
  }

  tbody.innerHTML = deployments.map(d => `
    <tr>
      <td><span class="font-medium">${d.app_name || '—'}</span></td>
      <td><span class="badge badge-neutral">${d.environment}</span></td>
      <td><code class="text-mono text-sm">${shortSha(d.commit_sha)}</code></td>
      <td class="text-muted">${d.triggered_by_name || '—'}</td>
      <td>${statusBadge(d.status)}</td>
      <td class="text-muted text-sm">${timeAgo(d.created_at)}</td>
    </tr>
  `).join('');
}

loadStats();
