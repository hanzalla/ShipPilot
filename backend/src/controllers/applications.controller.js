import db from '../config/db.js';

export async function list(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT a.id, a.name, a.description, a.created_at,
              r.full_name AS repo_full_name, r.default_branch
       FROM applications a
       JOIN repositories r ON r.id = a.repository_id
       WHERE a.user_id = ?
       ORDER BY a.created_at DESC`,
      [req.session.userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function get(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT a.id, a.name, a.description, a.created_at,
              r.full_name AS repo_full_name, r.clone_url, r.default_branch
       FROM applications a
       JOIN repositories r ON r.id = a.repository_id
       WHERE a.id = ? AND a.user_id = ?`,
      [req.params.id, req.session.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { name, description, repository_id } = req.body;

    if (!name || !repository_id) {
      return res.status(400).json({ error: 'Name and repository_id are required' });
    }

    const [result] = await db.query(
      'INSERT INTO applications (user_id, repository_id, name, description) VALUES (?, ?, ?, ?)',
      [req.session.userId, repository_id, name, description || null]
    );

    res.status(201).json({ id: result.insertId, name, description, repository_id });
  } catch (err) {
    next(err);
  }
}

export async function update(req, res, next) {
  try {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    const [result] = await db.query(
      'UPDATE applications SET name = ?, description = ? WHERE id = ? AND user_id = ?',
      [name, description || null, req.params.id, req.session.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.json({ id: req.params.id, name, description });
  } catch (err) {
    next(err);
  }
}

export async function remove(req, res, next) {
  try {
    const [result] = await db.query(
      'DELETE FROM applications WHERE id = ? AND user_id = ?',
      [req.params.id, req.session.userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    res.status(204).send();
  } catch (err) {
    next(err);
  }
}
