import db from '../config/db.js';

export async function createWithApp(req, res, next) {
  const conn = await db.getConnection();
  try {
    const { app_name, app_description, repo_owner, repo_name, default_branch } = req.body;

    if (!app_name || !repo_owner || !repo_name) {
      return res.status(400).json({ error: 'app_name, repo_owner, and repo_name are required' });
    }

    const full_name   = `${repo_owner}/${repo_name}`;
    const clone_url   = `https://github.com/${full_name}.git`;
    const branch      = default_branch || 'main';

    await conn.beginTransaction();

    // Upsert repository
    const [existing] = await conn.query(
      'SELECT id FROM repositories WHERE full_name = ?', [full_name]
    );

    let repoId;
    if (existing.length > 0) {
      repoId = existing[0].id;
    } else {
      const [r] = await conn.query(
        `INSERT INTO repositories (github_repo_id, owner, name, full_name, clone_url, default_branch)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [full_name, repo_owner, repo_name, full_name, clone_url, branch]
      );
      repoId = r.insertId;
    }

    // Create application
    const [app] = await conn.query(
      'INSERT INTO applications (user_id, repository_id, name, description) VALUES (?, ?, ?, ?)',
      [req.session.userId, repoId, app_name, app_description || null]
    );

    await conn.commit();

    res.status(201).json({
      id: app.insertId,
      name: app_name,
      repo_full_name: full_name,
      default_branch: branch,
    });
  } catch (err) {
    await conn.rollback();
    next(err);
  } finally {
    conn.release();
  }
}
