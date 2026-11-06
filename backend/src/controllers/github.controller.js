import { randomUUID } from 'crypto';
import db from '../config/db.js';
import { encrypt, decrypt } from '../utils/crypto.js';
import { logAudit } from '../utils/audit.js';

const GH_API    = 'https://api.github.com';
const SAFE_PARAM = /^[a-zA-Z0-9._-]+$/; // owner / repo names may only use these chars

// ── Helpers ───────────────────────────────────────────
async function getToken(userId) {
  const [rows] = await db.query(
    'SELECT access_token FROM github_connections WHERE user_id = ? LIMIT 1',
    [userId]
  );
  if (!rows[0]) return null;
  try {
    return decrypt(rows[0].access_token);
  } catch {
    // token is from before encryption was added — force reconnect
    return null;
  }
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
    const err  = new Error(body.message || `GitHub API error ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

// ── Status ────────────────────────────────────────────
export async function status(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT github_username, github_avatar_url, created_at
       FROM github_connections WHERE user_id = ? LIMIT 1`,
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

  // Random nonce stored in session — verified on callback (CSRF protection)
  const state = randomUUID();
  req.session.oauthState = state;

  const params = new URLSearchParams({
    client_id:    GITHUB_CLIENT_ID,
    redirect_uri: GITHUB_CALLBACK_URL,
    scope:        'repo read:user',
    state,
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

  // Verify CSRF state nonce
  if (!state || !req.session.oauthState || state !== req.session.oauthState) {
    return res.redirect(`${FRONTEND_URL}/github.html?error=invalid_state`);
  }
  delete req.session.oauthState; // consume — cannot be replayed

  try {
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

    const ghUser = await ghFetch('/user', tokenData.access_token);

    // Encrypt token before storing
    const encryptedToken = encrypt(tokenData.access_token);

    await db.query(
      `INSERT INTO github_connections (user_id, github_user_id, github_username, github_avatar_url, access_token, scope)
       VALUES (?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         github_user_id    = VALUES(github_user_id),
         github_username   = VALUES(github_username),
         github_avatar_url = VALUES(github_avatar_url),
         access_token      = VALUES(access_token),
         scope             = VALUES(scope)`,
      [
        req.session.userId,
        String(ghUser.id),
        ghUser.login,
        ghUser.avatar_url || null,
        encryptedToken,
        tokenData.scope || null,
      ]
    );

    await logAudit(req, { action: 'github.connect', meta: { username: ghUser.login } });

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

    const page    = Math.max(1, Number(req.query.page) || 1);
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
    const { owner, repo } = req.params;

    // Reject path-traversal or unexpected characters
    if (!SAFE_PARAM.test(owner) || !SAFE_PARAM.test(repo)) {
      return res.status(400).json({ error: 'Invalid repository parameters' });
    }

    const token = await getToken(req.session.userId);
    if (!token) return res.status(401).json({ error: 'GitHub not connected' });

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
    await logAudit(req, { action: 'github.disconnect' });
    res.json({ message: 'Disconnected' });
  } catch (err) {
    next(err);
  }
}
