import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Phase 11: QR Attendance & Notifications', () => {
  it('generates QR token, checks in/out member, creates attendance notification, and enforces notification ownership', async () => {
    const adminReg = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Owner',
      lastName: 'QR',
      email: 'owner@qr.test',
      password: 'Password123',
      role: 'gym_admin',
      gymName: 'QR Pulse Gym',
    });
    const adminToken = adminReg.body.data.tokens.accessToken as string;
    const gymId = adminReg.body.data.user.activeGymId as string;

    await request(app)
      .post(`/api/v1/gyms/${gymId}/members`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        firstName: 'Nikhil',
        lastName: 'Member',
        email: 'nikhil@qr.test',
        password: 'Password123',
      });

    const memberLogin = await request(app).post('/api/v1/auth/login').send({
      email: 'nikhil@qr.test',
      password: 'Password123',
    });
    const memberToken = memberLogin.body.data.tokens.accessToken as string;

    // Generate QR token
    const qrRes = await request(app)
      .post('/api/v1/attendance/qr-token')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ gymId, ttlMinutes: 10 });
    expect(qrRes.status).toBe(200);
    const qrToken = qrRes.body.data.qrToken as string;

    // Member checks in via QR token
    const checkInRes = await request(app)
      .post('/api/v1/attendance/check-in')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ qrToken });
    expect(checkInRes.status).toBe(201);
    expect(checkInRes.body.data.attendance.method).toBe('qr');

    // Duplicate check-in while already checked in -> 409
    const dupCheckIn = await request(app)
      .post('/api/v1/attendance/check-in')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ qrToken });
    expect(dupCheckIn.status).toBe(409);

    // Check out
    const checkOutRes = await request(app)
      .post('/api/v1/attendance/check-out')
      .set('Authorization', `Bearer ${memberToken}`)
      .send({ gymId });
    expect(checkOutRes.status).toBe(200);
    expect(checkOutRes.body.data.attendance.status).toBe('checked_out');

    // Notification was automatically dispatched to Nikhil
    const notifRes = await request(app)
      .get('/api/v1/notifications')
      .set('Authorization', `Bearer ${memberToken}`);
    expect(notifRes.status).toBe(200);
    expect(notifRes.body.data.unreadCount).toBe(1);
    const notifId = notifRes.body.data.notifications[0].id as string;

    // Another user cannot mark Nikhil's notification read
    expect(
      (
        await request(app)
          .patch(`/api/v1/notifications/${notifId}/read`)
          .set('Authorization', `Bearer ${adminToken}`)
      ).status
    ).toBe(403);

    // Nikhil marks notification read
    const readRes = await request(app)
      .patch(`/api/v1/notifications/${notifId}/read`)
      .set('Authorization', `Bearer ${memberToken}`);
    expect(readRes.status).toBe(200);
    expect(readRes.body.data.notification.isRead).toBe(true);
  });
});

