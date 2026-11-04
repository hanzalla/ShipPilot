import db from '../config/db.js';

export async function list(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT e.id, e.name, e.deployment_target, e.health_check_url, e.created_at
       FROM environments e
       JOIN applications a ON a.id = e.application_id
       WHERE e.application_id = ? AND a.user_id = ?`,
      [req.params.appId, req.session.userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, deployment_target, health_check_url } = req.body;
    const { appId } = req.params;

    if (!name) {
      return res.status(400).json({ error: 'Environment name is required' });
    }

    const allowed = ['development', 'staging', 'production'];
    if (!allowed.includes(name)) {
      return res.status(400).json({ error: 'Name must be development, staging, or production' });
    }

    const [app] = await db.query(
      'SELECT id FROM applications WHERE id = ? AND user_id = ?',
      [appId, req.session.userId]
    );
    if (app.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const [result] = await db.query(
      'INSERT INTO environments (application_id, name, deployment_target, health_check_url) VALUES (?, ?, ?, ?)',
      [appId, name, deployment_target || null, health_check_url || null]
    );

    res.status(201).json({ id: result.insertId, name, deployment_target, health_check_url });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { deployment_target, health_check_url } = req.body;

    const [result] = await db.query(
      `UPDATE environments e
       JOIN applications a ON a.id = e.application_id
       SET e.deployment_target = ?, e.health_check_url = ?
       WHERE e.id = ? AND e.application_id = ? AND a.user_id = ?`,
      [deployment_target || null, health_check_url || null, req.params.envId, req.params.appId, req.session.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Environment not found' });
    }

    res.json({ message: 'Updated' });
  } catch (err) {
    next(err);
  }
}
