import { api } from '../api.js';
import { requireAuth } from '../auth.js';
import { formatDate, initTheme, initUserDisplay, showAlert } from '../utils.js';

initTheme();

const user = await requireAuth();
if (!user) throw new Error('Not authenticated');
initUserDisplay(user);

const params = new URLSearchParams(location.search);
const container = document.getElementById('gh-content');

// Show result of OAuth redirect
if (params.get('connected') === 'true') {
  showAlert('alert-area', 'GitHub connected successfully!', 'success');
  history.replaceState({}, '', 'github.html');
} else if (params.get('error')) {
  const msgs = {
    no_code:       'GitHub did not return an authorization code.',
    token_exchange:'Failed to exchange code for access token.',
    server_error:  'Server error during GitHub OAuth flow.',
  };
  showAlert('alert-area', msgs[params.get('error')] || 'GitHub connection failed.');
  history.replaceState({}, '', 'github.html');
}

async function render() {
  try {
    const status = await api.githubStatus();

    if (status.connected) {
      renderConnected(status);
    } else {
      renderDisconnected();
    }
  } catch (err) {
    container.innerHTML = `<div class="alert alert-error">Failed to load GitHub status: ${err.message}</div>`;
  }
}

function renderConnected(status) {
  container.innerHTML = `
    <div class="gh-card">
      <div class="gh-connected">
        ${status.github_avatar_url
          ? `<img class="gh-avatar" src="${status.github_avatar_url}" alt="avatar" />`
          : `<div class="gh-avatar" style="display:flex;align-items:center;justify-content:center;font-weight:700">GH</div>`
        }
        <div style="flex:1">
          <div class="gh-connected__name">@${status.github_username}</div>
          <div class="gh-connected__sub">Connected ${formatDate(status.created_at)}</div>
        </div>
        <span class="badge badge-success">Connected</span>
      </div>

      <p>Your GitHub account is linked. ShipPilot can now read your repositories and branches when you register a new application.</p>

      <button class="btn btn-secondary btn-sm" id="disconnect-btn">Disconnect GitHub</button>
    </div>`;

  document.getElementById('disconnect-btn').addEventListener('click', async () => {
    if (!confirm('Disconnect GitHub? Existing applications will not be affected.')) return;
    try {
      await api.githubDisconnect();
      render();
    } catch (err) {
      showAlert('alert-area', err.message || 'Failed to disconnect.');
    }
  });
}

function renderDisconnected() {
  container.innerHTML = `
    <div class="gh-card">
      <div class="gh-icon">◎</div>
      <h2>Connect GitHub</h2>
      <p>Allow ShipPilot to access your repositories so you can select them from a dropdown when registering an application.</p>

      <div class="permissions-list">
        <div class="permission-item">Read repository list and metadata</div>
        <div class="permission-item">Read branches for selected repositories</div>
        <div class="permission-item">Trigger GitHub Actions workflows (for deployments)</div>
      </div>

      <button class="btn btn-primary" id="connect-btn">Connect GitHub Account</button>
    </div>`;

  document.getElementById('connect-btn').addEventListener('click', () => {
    api.githubConnect();
  });
}

render();
