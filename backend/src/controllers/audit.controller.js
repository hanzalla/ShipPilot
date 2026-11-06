import db from '../config/db.js';

const PAGE_SIZE = 50;

export async function list(req, res, next) {
  try {
    const userId     = req.session.userId;
    const page       = Math.max(1, Number(req.query.page) || 1);
    const offset     = (page - 1) * PAGE_SIZE;
    const action     = req.query.action     || null;
    const resource   = req.query.resource_type || null;

    // Build dynamic WHERE conditions
    const conditions = ['al.user_id = ?'];
    const params     = [userId];

    if (action) {
      conditions.push('al.action LIKE ?');
      params.push(`${action}%`);
    }
    if (resource) {
      conditions.push('al.resource_type = ?');
      params.push(resource);
    }

    const where = conditions.join(' AND ');

    const [rows] = await db.query(
      `SELECT al.id, al.action, al.resource_type, al.resource_id,
              al.meta, al.ip_address, al.occurred_at,
              u.name AS user_name
       FROM audit_logs al
       LEFT JOIN users u ON u.id = al.user_id
       WHERE ${where}
       ORDER BY al.occurred_at DESC
       LIMIT ? OFFSET ?`,
      [...params, PAGE_SIZE, offset]
    );

    const [[{ total }]] = await db.query(
      `SELECT COUNT(*) AS total FROM audit_logs al WHERE ${where}`,
      params
    );

    res.json({
      data: rows,
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
