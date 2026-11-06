import { createHmac, timingSafeEqual } from 'crypto';

/**
 * Validates GitHub webhook payload signature.
 * GitHub signs every request with HMAC-SHA256 using GITHUB_WEBHOOK_SECRET.
 * We MUST verify this before trusting any webhook data.
 *
 * Raw body is required for signature verification — express.json() must NOT
 * have already consumed the stream. This middleware reads the raw buffer itself.
 */
export function verifyGithubWebhook(req, res, next) {
  const secret = process.env.GITHUB_WEBHOOK_SECRET;
  if (!secret) {
    console.error('GITHUB_WEBHOOK_SECRET is not set — rejecting webhook');
    return res.status(500).json({ error: 'Webhook secret not configured' });
  }

  const signature = req.headers['x-hub-signature-256'];
  if (!signature) {
    return res.status(401).json({ error: 'Missing webhook signature' });
  }

  // Collect raw body chunks before JSON parsing
  const chunks = [];
  req.on('data', chunk => chunks.push(chunk));
  req.on('end', () => {
    const rawBody = Buffer.concat(chunks);

    const expected = `sha256=${createHmac('sha256', secret).update(rawBody).digest('hex')}`;

    // timingSafeEqual prevents timing attacks
    try {
      const sigBuf      = Buffer.from(signature);
      const expectedBuf = Buffer.from(expected);
      if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
        return res.status(401).json({ error: 'Invalid webhook signature' });
      }
    } catch {
      return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    // Attach parsed body for the controller
    try {
      req.body = JSON.parse(rawBody.toString('utf8'));
    } catch {
      return res.status(400).json({ error: 'Invalid JSON payload' });
    }

    next();
  });
}
