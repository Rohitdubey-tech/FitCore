import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

async function registerGymAdmin(email: string, gymName: string) {
  const res = await request(app).post('/api/v1/auth/register').send({
    firstName: 'Owner',
    lastName: 'Admin',
    email,
    password: 'Password123',
    role: 'gym_admin',
    gymName,
  });
  return {
    token: res.body.data.tokens.accessToken as string,
    gymId: res.body.data.user.activeGymId as string,
  };
}

describe('Phase 4: Trainers, Membership Plans & Subscriptions', () => {
  it('onboards trainers, assigns members, and enforces trainer-level member isolation', async () => {
    const admin = await registerGymAdmin('owner@gympro.test', 'Pro Athletics');

    // Add Trainer A
    const trainerRes = await request(app)
      .post(`/api/v1/gyms/${admin.gymId}/trainers`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        firstName: 'Rohan',
        lastName: 'Kapoor',
        email: 'rohan.trainer@gympro.test',
        password: 'Password123',
        specializations: ['Strength', 'Hypertrophy'],
        experienceYears: 5,
      });
    expect(trainerRes.status).toBe(201);
    const trainerId = trainerRes.body.data.trainer.id as string;

    // Register two members
    const m1 = await request(app)
      .post(`/api/v1/gyms/${admin.gymId}/members`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        firstName: 'Assigned',
        lastName: 'Member',
        email: 'assigned@gympro.test',
      });
    const assignedMemberId = m1.body.data.member.id as string;

    const m2 = await request(app)
      .post(`/api/v1/gyms/${admin.gymId}/members`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({
        firstName: 'Unassigned',
        lastName: 'Member',
        email: 'unassigned@gympro.test',
      });
    const unassignedMemberId = m2.body.data.member.id as string;

    // Assign only m1 to Trainer A
    const assignRes = await request(app)
      .post(`/api/v1/trainers/${trainerId}/assign-members`)
      .set('Authorization', `Bearer ${admin.token}`)
      .send({ memberIds: [assignedMemberId] });
    expect(assignRes.status).toBe(200);
    expect(assignRes.body.data.assignedCount).toBe(1);

    // Trainer A logs in
    const trainerLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'rohan.trainer@gympro.test',
      password: 'Password123',
    });
    const trainerToken = trainerLogin.body.data.tokens.accessToken as string;

    // Trainer A lists members -> sees ONLY assignedMemberId
    const listRes = await request(app)
      .get(`/api/v1/gyms/${admin.gymId}/members`)
      .set('Authorization', `Bearer ${trainerToken}`);
    expect(listRes.status).toBe(200);
    expect(listRes.body.data.members).toHaveLength(1);
    expect(listRes.body.data.members[0].id).toBe(assignedMemberId);

    // Trainer A can read assigned member, but gets 403 on unassigned member
    expect(
      (
        await request(app)
          .get(`/api/v1/members/${assignedMemberId}`)
          .set('Authorization', `Bearer ${trainerToken}`)
      ).status
    ).toBe(200);

    expect(
      (
        await request(app)
          .get(`/api/v1/members/${unassignedMemberId}`)
          .set('Authorization', `Bearer ${trainerToken}`)
      ).status
    ).toBe(403);
  });

  it('creates membership plans, activates subscriptions, handles renewals/suspensions, and isolates tenants', async () => {
    const adminA = await registerGymAdmin('ownerA@plans.test', 'Alpha Gym');
    const adminB = await registerGymAdmin('ownerB@plans.test', 'Beta Gym');

    // Create monthly & custom plans
    const planRes = await request(app)
      .post('/api/v1/membership-plans')
      .set('Authorization', `Bearer ${adminA.token}`)
      .send({
        gymId: adminA.gymId,
        name: 'Pro Monthly',
        durationType: 'monthly',
        price: 2499,
        features: ['All-day floor access', 'Locker room'],
      });
    expect(planRes.status).toBe(201);
    expect(planRes.body.data.plan.durationDays).toBe(30);
    const planId = planRes.body.data.plan.id as string;

    // Custom plan without durationDays fails validation
    const badCustom = await request(app)
      .post('/api/v1/membership-plans')
      .set('Authorization', `Bearer ${adminA.token}`)
      .send({
        gymId: adminA.gymId,
        name: '45-Day Boot Camp',
        durationType: 'custom',
        price: 3999,
      });
    expect(badCustom.status).toBe(400);

    // Register member & create subscription
    const memberRes = await request(app)
      .post(`/api/v1/gyms/${adminA.gymId}/members`)
      .set('Authorization', `Bearer ${adminA.token}`)
      .send({
        firstName: 'Diya',
        lastName: 'Sen',
        email: 'diya@plans.test',
      });
    const memberId = memberRes.body.data.member.id as string;

    const subRes = await request(app)
      .post('/api/v1/subscriptions')
      .set('Authorization', `Bearer ${adminA.token}`)
      .send({
        gymId: adminA.gymId,
        memberId,
        planId,
        autoRenew: true,
      });
    expect(subRes.status).toBe(201);
    const subId = subRes.body.data.subscription.id as string;
    const initialEnd = new Date(subRes.body.data.subscription.endDate).getTime();

    // Expiring within 35 days filter finds it
    const expiringRes = await request(app)
      .get(`/api/v1/subscriptions?gymId=${adminA.gymId}&expiringWithinDays=35`)
      .set('Authorization', `Bearer ${adminA.token}`);
    expect(expiringRes.status).toBe(200);
    expect(expiringRes.body.data.subscriptions).toHaveLength(1);

    // Renew extends endDate by 30 days & increments renewalCount
    const renewRes = await request(app)
      .patch(`/api/v1/subscriptions/${subId}`)
      .set('Authorization', `Bearer ${adminA.token}`)
      .send({ action: 'renew' });
    expect(renewRes.status).toBe(200);
    expect(renewRes.body.data.subscription.renewalCount).toBe(1);
    expect(new Date(renewRes.body.data.subscription.endDate).getTime()).toBeGreaterThan(
      initialEnd
    );

    // Suspend & resume
    const suspendRes = await request(app)
      .patch(`/api/v1/subscriptions/${subId}`)
      .set('Authorization', `Bearer ${adminA.token}`)
      .send({ action: 'suspend', reason: 'Travel freeze' });
    expect(suspendRes.status).toBe(200);
    expect(suspendRes.body.data.subscription.status).toBe('suspended');

    const resumeRes = await request(app)
      .patch(`/api/v1/subscriptions/${subId}`)
      .set('Authorization', `Bearer ${adminA.token}`)
      .send({ action: 'resume' });
    expect(resumeRes.status).toBe(200);
    expect(resumeRes.body.data.subscription.status).toBe('active');

    // Cross-tenant admin B cannot read or modify Gym A's plans/subscriptions
    expect(
      (
        await request(app)
          .get(`/api/v1/subscriptions?gymId=${adminA.gymId}`)
          .set('Authorization', `Bearer ${adminB.token}`)
      ).status
    ).toBe(403);
    expect(
      (
        await request(app)
          .patch(`/api/v1/subscriptions/${subId}`)
          .set('Authorization', `Bearer ${adminB.token}`)
          .send({ action: 'cancel' })
      ).status
    ).toBe(403);
  });
});

