import request from 'supertest';
import app from '../src/app.js';

describe('GET /health', () => {
  it('returns status ok', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.service).toBe('shippilot-demo-app');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('GET /api/greet', () => {
  it('greets with default name when none provided', async () => {
    const res = await request(app).get('/api/greet');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Hello, World!');
  });

  it('greets with provided name', async () => {
    const res = await request(app).get('/api/greet?name=Hanzalla');
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Hello, Hanzalla!');
  });

  it('returns 400 for empty name', async () => {
    const res = await request(app).get('/api/greet?name=');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});

describe('GET /api/add', () => {
  it('adds two numbers', async () => {
    const res = await request(app).get('/api/add?a=5&b=3');
    expect(res.status).toBe(200);
    expect(res.body.result).toBe(8);
  });

  it('returns 400 for non-numeric input', async () => {
    const res = await request(app).get('/api/add?a=foo&b=3');
    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
