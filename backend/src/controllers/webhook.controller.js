import db from '../config/db.js';
import { logAudit } from '../utils/audit.js';

// Map GitHub Actions conclusion → ShipPilot status
const CONCLUSION_MAP = {
  success:   'succeeded',
  failure:   'failed',
  cancelled: 'cancelled',
  skipped:   'cancelled',
  timed_out: 'failed',
  action_required: 'failed',
};

export async function handleGithubEvent(req, res) {
  const event = req.headers['x-github-event'];

  // Acknowledge immediately — GitHub expects a 2xx within 10 seconds
  res.status(200).json({ received: true });

  try {
    if (event === 'workflow_run') {
      await processWorkflowRun(req.body);
    }
    // Future: handle push, pull_request, deployment events here
  } catch (err) {
    console.error('[webhook] processing error:', err.message);
  }
}

async function processWorkflowRun(payload) {
  const run    = payload.workflow_run;
  const action = payload.action; // 'requested' | 'in_progress' | 'completed'

  if (!run) return;

  const githubRunId = String(run.id);

  // Find deployment record linked to this GitHub run ID
  const [rows] = await db.query(
    'SELECT id, status FROM deployments WHERE github_run_id = ? LIMIT 1',
    [githubRunId]
  );

  if (rows.length === 0) {
    // No deployment record found — workflow ran outside ShipPilot, ignore
    return;
  }

  const deployment = rows[0];

  let newStatus  = null;
  let startedAt  = null;
  let finishedAt = null;
  let eventStage = null;
  let eventStatus = null;
  let message    = null;

  if (action === 'in_progress') {
    newStatus  = 'running';
    startedAt  = run.run_started_at || new Date().toISOString();
    eventStage  = 'run';
    eventStatus = 'started';
    message     = `Workflow "${run.name}" started`;
  } else if (action === 'completed') {
    newStatus   = CONCLUSION_MAP[run.conclusion] || 'failed';
    finishedAt  = run.updated_at || new Date().toISOString();
    eventStage  = 'run';
    eventStatus = newStatus === 'succeeded' ? 'completed' : 'failed';
    message     = `Workflow "${run.name}" ${run.conclusion}`;
  }

  if (!newStatus) return; // 'requested' — nothing to update yet

  // Update deployment status
  await db.query(
    `UPDATE deployments
     SET status = ?,
         started_at  = COALESCE(started_at, ?),
         finished_at = COALESCE(?, finished_at)
     WHERE id = ?`,
    [newStatus, startedAt, finishedAt, deployment.id]
  );

  // Append an event to the deployment timeline
  await db.query(
    `INSERT INTO deployment_events (deployment_id, stage, status, message)
     VALUES (?, ?, ?, ?)`,
    [deployment.id, eventStage, eventStatus, message]
  );

  // Fake req object for audit log (webhook has no session)
  const fakeReq = { session: {}, ip: 'github-webhook', socket: {} };
  await logAudit(fakeReq, {
    action: `deployment.${newStatus}`,
    resourceType: 'deployment',
    resourceId: deployment.id,
    meta: { github_run_id: githubRunId, conclusion: run.conclusion },
  });
}
