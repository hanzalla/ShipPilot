import db from '../config/db.js';

/**
 * Write an audit log entry. Never throws — audit failure must not break the main request.
 *
 * @param {import('express').Request} req
 * @param {{ action: string, resourceType?: string, resourceId?: number, meta?: object }} opts
 */
export async function logAudit(req, { action, resourceType = null, resourceId = null, meta = null }) {
  try {
    const userId = req.session?.userId || null;
    const ip     = req.ip || req.socket?.remoteAddress || null;
    await db.query(
      `INSERT INTO audit_logs (user_id, action, resource_type, resource_id, meta, ip_address)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [userId, action, resourceType, resourceId || null, meta ? JSON.stringify(meta) : null, ip]
    );
  } catch {
    // intentionally swallowed — audit log failure must not affect the response
  }
}
