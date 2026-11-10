import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Phase 12: Security Verification (Headers, Injection, Privilege Escalation)', () => {
  it('sets Helmet security headers and strips NoSQL operator injection payloads', async () => {
    const healthRes = await request(app).get('/api/v1/health');
    expect(healthRes.headers['x-content-type-options']).toBe('nosniff');
    expect(healthRes.headers['x-dns-prefetch-control']).toBe('off');

    // NoSQL operator injection on login must be sanitized and fail validation/auth
    const injectionRes = await request(app).post('/api/v1/auth/login').send({
      email: { $gt: '' },
      password: { $ne: null },
    });
    expect(injectionRes.status).toBe(400);
  });

  it('prevents privilege escalation to super_admin via public registration and never leaks secrets', async () => {
    const escalationRes = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Attacker',
      lastName: 'Test',
      email: 'attacker@sec.test',
      password: 'Password123',
      role: 'super_admin',
    });
    expect(escalationRes.status).toBe(400);

    const normalRes = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Safe',
      lastName: 'User',
      email: 'safe@sec.test',
      password: 'Password123',
      role: 'member',
    });
    expect(normalRes.status).toBe(201);
    expect(normalRes.body.data.user.passwordHash).toBeUndefined();
    expect(normalRes.body.data.user.emailVerificationTokenHash).toBeUndefined();
  });
});

