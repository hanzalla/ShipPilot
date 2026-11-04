const BASE_URL = 'http://localhost:3009';

async function request(method, path, body = null) {
  const opts = {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${path}`, opts);
  const data = res.status !== 204 ? await res.json() : null;

  if (!res.ok) {
    const err = new Error(data?.error || 'Request failed');
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  // Auth
  login: (body) => request('POST', '/api/auth/login', body),
  register: (body) => request('POST', '/api/auth/register', body),
  logout: () => request('POST', '/api/auth/logout'),
  me: () => request('GET', '/api/auth/me'),

  // Repositories + App combined
  createAppWithRepo: (body) => request('POST', '/api/repositories/with-app', body),

  // Applications
  getApps: () => request('GET', '/api/applications'),
  getApp: (id) => request('GET', `/api/applications/${id}`),
  createApp: (body) => request('POST', '/api/applications', body),
  updateApp: (id, body) => request('PATCH', `/api/applications/${id}`, body),
  deleteApp: (id) => request('DELETE', `/api/applications/${id}`),

  // GitHub
  githubStatus: () => request('GET', '/api/github/status'),
  githubConnect: () => { window.location.href = 'http://localhost:3009/api/github/connect'; },
  githubDisconnect: () => request('DELETE', '/api/github/disconnect'),
  githubRepos: () => request('GET', '/api/github/repos'),
  githubBranches: (owner, repo) => request('GET', `/api/github/repos/${owner}/${repo}/branches`),

  // Environments
  getEnvs: (appId) => request('GET', `/api/applications/${appId}/environments`),
  createEnv: (appId, body) =>
    request('POST', `/api/applications/${appId}/environments`, body),
  updateEnv: (appId, envId, body) =>
    request('PATCH', `/api/applications/${appId}/environments/${envId}`, body),

  // Deployments
  getDeployments: (appId) =>
    request('GET', `/api/applications/${appId}/deployments`),
  getDeployment: (appId, id) =>
    request('GET', `/api/applications/${appId}/deployments/${id}`),
  createDeployment: (appId, body) =>
    request('POST', `/api/applications/${appId}/deployments`, body),
};
