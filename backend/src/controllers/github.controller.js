import db from '../config/db.js';

const GH_API = 'https://api.github.com';

// ── OAuth helpers ─────────────────────────────────────
async function getToken(userId) {
  const [rows] = await db.query(
    'SELECT access_token FROM github_connections WHERE user_id = ? LIMIT 1',
    [userId]
  );
  return rows[0]?.access_token || null;
}

async function ghFetch(path, token, opts = {}) {
  const res = await fetch(`${GH_API}${path}`, {
    ...opts,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...opts.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    const err = new Error(body.message || `GitHub API error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// ── Status ────────────────────────────────────────────
export async function status(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT gc.github_username, gc.github_avatar_url, gc.created_at
       FROM github_connections gc
       WHERE gc.user_id = ? LIMIT 1`,
      [req.session.userId]
    );
    if (rows.length === 0) return res.json({ connected: false });
    res.json({ connected: true, ...rows[0] });
  } catch (err) {
    next(err);
  }
}

// ── Connect: redirect to GitHub OAuth ─────────────────
export function connect(req, res) {
  const { GITHUB_CLIENT_ID, GITHUB_CALLBACK_URL } = process.env;
  const params = new URLSearchParams({
    client_id:    GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_CALLBACK_URL,
    scope:        'repo read:user',
    state:        String(req.session.userId),
  });
  res.redirect(`https://github.com/login/oauth/authorize?${params}`);
}

// ── Callback: exchange code for token ─────────────────
export async function callback(req, res, next) {
  const { code, state } = req.query;
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, FRONTEND_URL } = process.env;

  if (!code) {
    return res.redirect(`${FRONTEND_URL}/github.html?error=no_code`);
  }

  try {
    // Exchange code for access token
    const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id:     GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri:  process.env.GITHUB_CALLBACK_URL,
      }),
    });
    const tokenData = await tokenRes.json();

    if (tokenData.error || !tokenData.access_token) {
      return res.redirect(`${FRONTEND_URL}/github.html?error=token_exchange`);
    }

    // Fetch GitHub user info
    const ghUser = await ghFetch('/user', tokenData.access_token);

    // Upsert connection (one per user)
    await db.query(
      `INSERT INTO github_connections (user_id, github_user_id, github_username, github_avatar_url, access_token, scope)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         github_user_id = VALUES(github_user_id),
         github_username = VALUES(github_username),
         github_avatar_url = VALUES(github_avatar_url),
         access_token = VALUES(access_token),
         scope = VALUES(scope)`,
      [
        req.session.userId,
        String(ghUser.id),
        ghUser.login,
        ghUser.avatar_url || null,
        tokenData.access_token,
        tokenData.scope || null,
      ]
    );

    res.redirect(`${FRONTEND_URL}/github.html?connected=true`);
  } catch (err) {
    console.error('GitHub callback error:', err);
    res.redirect(`${FRONTEND_URL}/github.html?error=server_error`);
  }
}

// ── Repos ─────────────────────────────────────────────
export async function repos(req, res, next) {
  try {
    const token = await getToken(req.session.userId);
    if (!token) return res.status(401).json({ error: 'GitHub not connected' });

    const page    = Number(req.query.page) || 1;
    const perPage = 100;

    const data = await ghFetch(
      `/user/repos?sort=updated&per_page=${perPage}&page=${page}&affiliation=owner,collaborator`,
      token
    );

    res.json(data.map(r => ({
      id:             r.id,
      full_name:      r.full_name,
      owner:          r.owner.login,
      name:           r.name,
      private:        r.private,
      default_branch: r.default_branch,
      description:    r.description,
    })));
  } catch (err) {
    next(err);
  }
}

// ── Branches ──────────────────────────────────────────
export async function branches(req, res, next) {
  try {
    const token = await getToken(req.session.userId);
    if (!token) return res.status(401).json({ error: 'GitHub not connected' });

    const { owner, repo } = req.params;
    const data = await ghFetch(`/repos/${owner}/${repo}/branches?per_page=100`, token);
    res.json(data.map(b => ({ name: b.name })));
  } catch (err) {
    next(err);
  }
}

// ── Disconnect ────────────────────────────────────────
export async function disconnect(req, res, next) {
  try {
    await db.query('DELETE FROM github_connections WHERE user_id = ?', [req.session.userId]);
    res.json({ message: 'Disconnected' });
  } catch (err) {
    next(err);
  }
}
