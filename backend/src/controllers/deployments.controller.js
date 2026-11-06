import db from '../config/db.js';
import { logAudit } from '../utils/audit.js';

const COMMIT_SHA_REGEX = /^[0-9a-f]{7,40}$/i;
const ALLOWED_STATUSES = ['queued', 'running', 'succeeded', 'failed', 'cancelled'];

export async function list(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT d.id, d.branch, d.commit_sha, d.commit_message, d.status,
              d.created_at, d.started_at, d.finished_at,
              e.name AS environment, u.name AS triggered_by_name
       FROM deployments d
       JOIN environments e ON e.id = d.environment_id
       JOIN applications a ON a.id = d.application_id
       JOIN users u ON u.id = d.triggered_by
       WHERE d.application_id = ? AND a.user_id = ?
       ORDER BY d.created_at DESC
       LIMIT 50`,
      [req.params.appId, req.session.userId]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

export async function get(req, res, next) {
  try {
    const [rows] = await db.query(
      `SELECT d.id, d.branch, d.commit_sha, d.commit_message, d.status,
              d.github_run_id, d.release_note,
              d.created_at, d.started_at, d.finished_at,
              e.name AS environment, e.health_check_url,
              u.name AS triggered_by_name,
              a.name AS application_name,
              r.full_name AS repo_full_name
       FROM deployments d
       JOIN environments e ON e.id = d.environment_id
       JOIN applications a ON a.id = d.application_id
       JOIN repositories r ON r.id = a.repository_id
       JOIN users u ON u.id = d.triggered_by
       WHERE d.id = ? AND a.user_id = ?`,
      [req.params.id, req.session.userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    const [events] = await db.query(
      'SELECT stage, status, message, occurred_at FROM deployment_events WHERE deployment_id = ? ORDER BY occurred_at ASC',
      [req.params.id]
    );

    res.json({ ...rows[0], events });
  } catch (err) {
    next(err);
  }
}

export async function create(req, res, next) {
  try {
    const { environment_id, branch, commit_sha, commit_message, release_note } = req.body;
    const { appId } = req.params;

    if (!environment_id || !branch || !commit_sha) {
      return res.status(400).json({ error: 'environment_id, branch, and commit_sha are required' });
    }
    if (!COMMIT_SHA_REGEX.test(commit_sha)) {
      return res.status(400).json({ error: 'Invalid commit SHA format' });
    }
    if (branch.length > 255) {
      return res.status(400).json({ error: 'Branch name too long' });
    }
    if (commit_message && commit_message.length > 500) {
      return res.status(400).json({ error: 'Commit message too long' });
    }

    const [app] = await db.query(
      'SELECT id FROM applications WHERE id = ? AND user_id = ?',
      [appId, req.session.userId]
    );
    if (app.length === 0) {
      return res.status(404).json({ error: 'Application not found' });
    }

    const [result] = await db.query(
      `INSERT INTO deployments
       (application_id, environment_id, triggered_by, branch, commit_sha, commit_message, release_note, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'queued')`,
      [appId, environment_id, req.session.userId, branch, commit_sha, commit_message || null, release_note || null]
    );

    await logAudit(req, {
      action: 'deployment.create',
      resourceType: 'deployment',
      resourceId: result.insertId,
      meta: { branch, commit_sha, environment_id },
    });

    res.status(201).json({ id: result.insertId, status: 'queued' });
  } catch (err) {
    next(err);
  }
}

// PATCH /:appId/deployments/:id/status
// Called by GitHub Actions to report progress back to ShipPilot
export async function updateStatus(req, res, next) {
  try {
    const { status, github_run_id } = req.body;
    const { appId, id } = req.params;

    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({ error: `status must be one of: ${ALLOWED_STATUSES.join(', ')}` });
    }

    // Verify deployment belongs to this user's app
    const [rows] = await db.query(
      `SELECT d.id FROM deployments d
       JOIN applications a ON a.id = d.application_id
       WHERE d.id = ? AND d.application_id = ? AND a.user_id = ?`,
      [id, appId, req.session.userId]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Deployment not found' });
    }

    const now = new Date();
    await db.query(
      `UPDATE deployments
       SET status = ?,
           github_run_id = COALESCE(?, github_run_id),
           started_at    = CASE WHEN ? = 'running'  AND started_at  IS NULL THEN ? ELSE started_at  END,
           finished_at   = CASE WHEN ? IN ('succeeded','failed','cancelled') THEN ? ELSE finished_at END
       WHERE id = ?`,
      [status, github_run_id || null, status, now, status, now, id]
    );

    // Append timeline event
    const eventStatusMap = { running: 'started', succeeded: 'completed', failed: 'failed', cancelled: 'failed' };
    if (eventStatusMap[status]) {
      await db.query(
        'INSERT INTO deployment_events (deployment_id, stage, status, message) VALUES (?, ?, ?, ?)',
        [id, 'pipeline', eventStatusMap[status], `Status updated to ${status}`]
      );
    }

    await logAudit(req, {
      action: `deployment.${status}`,
      resourceType: 'deployment',
      resourceId: Number(id),
    });

    res.json({ id, status });
  } catch (err) {
    next(err);
  }
}
