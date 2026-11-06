import db from '../config/db.js';

const PAGE_SIZE = 50;

export async function listAll(req, res, next) {
  try {
    const userId  = req.session.userId;
    const page    = Math.max(1, Number(req.query.page) || 1);
    const offset  = (page - 1) * PAGE_SIZE;

    const conditions = ['a.user_id = ?'];
    const params     = [userId];

    if (req.query.app_id) {
      conditions.push('d.application_id = ?');
      params.push(req.query.app_id);
    }
    if (req.query.environment) {
      conditions.push('e.name = ?');
      params.push(req.query.environment);
    }
    if (req.query.status) {
      conditions.push('d.status = ?');
      params.push(req.query.status);
    }

    const where = conditions.join(' AND ');

    const [rows] = await db.query(
      `SELECT d.id, d.branch, d.commit_sha, d.commit_message, d.status,
              d.created_at, d.started_at, d.finished_at,
              e.name   AS environment,
              a.id     AS application_id,
              a.name   AS application_name,
              u.name   AS triggered_by_name
       FROM deployments d
       JOIN environments e  ON e.id  = d.environment_id
       JOIN applications a  ON a.id  = d.application_id
       JOIN users        u  ON u.id  = d.triggered_by
       WHERE ${where}
       ORDER BY d.created_at DESC
       LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total
       FROM deployments d
       JOIN environments e ON e.id = d.environment_id
       JOIN applications a ON a.id = d.application_id
       WHERE ${where}`,
      params
    );

    // Summary counts (always scoped to this user)
    const [[counts]] = await db.query(
      `SELECT
         COUNT(*)                                        AS total,
         SUM(d.status = 'succeeded')                    AS succeeded,
         SUM(d.status = 'failed')                       AS failed,
         SUM(d.status IN ('queued', 'running'))         AS in_progress
       FROM deployments d
       JOIN applications a ON a.id = d.application_id
       WHERE a.user_id = ?`,
      [userId]
    );

    res.json({
      data: rows,
      counts,
      pagination: {
        page,
        pageSize: PAGE_SIZE,
        total,
        totalPages: Math.ceil(total / PAGE_SIZE),
      },
    });
  } catch (err) {
    next(err);
  }
}
