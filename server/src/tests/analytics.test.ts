import request from 'supertest';
import { createApp } from '../app';
import { UserModel } from '../modules/users/user.model';

const app = createApp();

describe('Phase 10: Analytics, Body Progress & Super Admin Controls', () => {
  it('logs body metrics with automatic BMI, calculates weight delta, and secures revenue analytics', async () => {
    const memberReg = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Tara',
      lastName: 'Metrics',
      email: 'tara@metrics.test',
      password: 'Password123',
      role: 'member',
    });
    const memberToken = memberReg.body.data.tokens.accessToken as string;

    // Log initial metric: 75kg @ 175cm -> BMI = 24.5
    const m1 = await request(app)
      .post('/api/v1/analytics/body-metrics')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({
        weightKg: 75,
        heightCm: 175,
        waistCm: 84,
        recordedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
      });
    expect(m1.status).toBe(201);
    expect(m1.body.data.metric.bmi).toBe(24.5);

    // Log latest metric: 73.2kg @ 175cm -> delta = -1.8 kg
    const m2 = await request(app)
      .post('/api/v1/analytics/body-metrics')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ weightKg: 73.2, heightCm: 175, waistCm: 82 });
    expect(m2.status).toBe(201);

    const progressRes = await request(app)
      .get('/api/v1/analytics/body-progress')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(progressRes.status).toBe(200);
    expect(progressRes.body.data.weightDeltaKg).toBe(-1.8);
    expect(progressRes.body.data.series).toHaveLength(2);

    // Member cannot access gym revenue analytics or super admin routes
    expect(
      (
        await request(app)
          .get('/api/v1/analytics/revenue')
          .set('Authorization', `Bearer ${memberToken}`)
      ).status
    ).toBe(403);

    expect(
      (
        await request(app)
          .get('/api/v1/admin/overview')
          .set('Authorization', `Bearer ${memberToken}`)
      ).status
    ).toBe(403);
  });

  it('provides Super Admin platform overview and gym suspension controls', async () => {
    const ownerReg = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Owner',
      lastName: 'Gym',
      email: 'owner@admin.test',
      password: 'Password123',
      role: 'gym_admin',
      gymName: 'Metro Barbell',
    });
    const gymId = ownerReg.body.data.user.activeGymId as string;

    const adminReg = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Root',
      lastName: 'Admin',
      email: 'root@admin.test',
      password: 'Password123',
      role: 'member',
    });
    await UserModel.updateOne(
      { _id: adminReg.body.data.user.id },
      { $set: { role: 'super_admin' } }
    );
    const adminLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'root@admin.test',
      password: 'Password123',
    });
    const adminToken = adminLogin.body.data.tokens.accessToken as string;

    const overviewRes = await request(app)
      .get('/api/v1/admin/overview')
      .set('Authorization', `Bearer ${adminToken}`);
    expect(overviewRes.status).toBe(200);
    expect(overviewRes.body.data.metrics.totalGyms).toBe(1);

    const suspendRes = await request(app)
      .patch(`/api/v1/admin/gyms/${gymId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'suspended' });
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.status).toBe('suspended');
  });
});

