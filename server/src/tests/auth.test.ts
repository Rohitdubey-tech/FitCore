import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Health & Auth API (/api/v1)', () => {
  it('GET /api/v1/health returns ok with connected mongodb', async () => {
    const res = await request(app).get('/api/v1/health');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBe('ok');
    expect(res.body.data.dependencies.mongodb.status).toBe('connected');
  });

  it('registers a gym_admin with an initial gym, prevents duplicate email, and logs in', async () => {
    const registerRes = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Vikram',
      lastName: 'Sharma',
      email: 'vikram@fitcore.test',
      password: 'Password123',
      role: 'gym_admin',
      gymName: 'Apex Strength Studio',
    });

    expect(registerRes.status).toBe(201);
    expect(registerRes.body.success).toBe(true);
    expect(registerRes.body.data.user.email).toBe('vikram@fitcore.test');
    expect(registerRes.body.data.user.role).toBe('gym_admin');
    expect(registerRes.body.data.user.gymIds).toHaveLength(1);
    expect(registerRes.body.data.tokens.accessToken).toBeDefined();
    expect(registerRes.body.data.tokens.refreshToken).toBeDefined();

    // Duplicate email rejected
    const duplicateRes = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Vikram',
      lastName: 'Sharma',
      email: 'vikram@fitcore.test',
      password: 'Password123',
      role: 'member',
    });
    expect(duplicateRes.status).toBe(409);

    // Login succeeds
    const loginRes = await request(app).post('/api/v1/auth/login').send({
      email: 'vikram@fitcore.test',
      password: 'Password123',
    });
    expect(loginRes.status).toBe(200);
    expect(loginRes.body.data.user.email).toBe('vikram@fitcore.test');

    // /me works with bearer token
    const meRes = await request(app)
      .get('/api/v1/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.data.tokens.accessToken}`);
    expect(meRes.status).toBe(200);
    expect(meRes.body.data.user.email).toBe('vikram@fitcore.test');
  });

  it('rotates refresh tokens and revokes the token family on reuse', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Ananya',
      lastName: 'Nair',
      email: 'ananya@fitcore.test',
      password: 'Password123',
      role: 'member',
    });

    const firstRefresh = reg.body.data.tokens.refreshToken;

    const rotated = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: firstRefresh,
    });
    expect(rotated.status).toBe(200);
    const secondRefresh = rotated.body.data.tokens.refreshToken;
    expect(secondRefresh).not.toBe(firstRefresh);

    // Replay the already-rotated firstRefresh token -> triggers family revocation
    const replay = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: firstRefresh,
    });
    expect(replay.status).toBe(401);

    // Second refresh token should now also be revoked
    const afterFamilyRevoke = await request(app).post('/api/v1/auth/refresh').send({
      refreshToken: secondRefresh,
    });
    expect(afterFamilyRevoke.status).toBe(401);
  });

  it('supports forgot-password, reset-password, and profile update', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Rohan',
      lastName: 'Kapoor',
      email: 'rohan@fitcore.test',
      password: 'Password123',
      role: 'member',
    });

    const accessToken = reg.body.data.tokens.accessToken;

    const patchRes = await request(app)
      .patch('/api/v1/auth/me')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ firstName: 'RohanUpdated' });
    expect(patchRes.status).toBe(200);
    expect(patchRes.body.data.user.firstName).toBe('RohanUpdated');

    const forgotRes = await request(app).post('/api/v1/auth/forgot-password').send({
      email: 'rohan@fitcore.test',
    });
    expect(forgotRes.status).toBe(200);
    const resetToken = forgotRes.body.data.resetToken;
    expect(resetToken).toBeDefined();

    const resetRes = await request(app).post('/api/v1/auth/reset-password').send({
      token: resetToken,
      newPassword: 'NewPassword456',
    });
    expect(resetRes.status).toBe(200);

    // Old password fails, new password succeeds
    const failLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'rohan@fitcore.test',
      password: 'Password123',
    });
    expect(failLogin.status).toBe(401);

    const okLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'rohan@fitcore.test',
      password: 'NewPassword456',
    });
    expect(okLogin.status).toBe(200);
  });
});

