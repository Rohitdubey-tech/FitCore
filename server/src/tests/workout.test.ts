import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Phase 6: Exercise Library, Workout Plans & Session PR Tracking', () => {
  it('lists and filters seeded exercises and creates custom exercises', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Coach',
      lastName: 'Leo',
      email: 'coach@workout.test',
      password: 'Password123',
      role: 'gym_admin',
      gymName: 'Barbell Forge',
    });
    const token = reg.body.data.tokens.accessToken as string;

    const allRes = await request(app)
      .get('/api/v1/exercises')
      .set('Authorization', `Bearer ${token}`);
    expect(allRes.status).toBe(200);
    expect(allRes.body.data.exercises.length).toBeGreaterThanOrEqual(10);

    const chestRes = await request(app)
      .get('/api/v1/exercises?muscleGroup=chest&search=Bench')
      .set('Authorization', `Bearer ${token}`);
    expect(chestRes.status).toBe(200);
    expect(chestRes.body.data.exercises).toHaveLength(1);
    expect(chestRes.body.data.exercises[0].slug).toBe('barbell-bench-press');

    const customRes = await request(app)
      .post('/api/v1/exercises')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Paused Larsen Press',
        muscleGroup: 'chest',
        equipment: 'barbell',
        difficulty: 'advanced',
        description: 'Feet-up paused barbell bench press variation.',
        instructions: ['Lift feet off the floor and pause bar on chest for 2 seconds.'],
      });
    expect(customRes.status).toBe(201);
    expect(customRes.body.data.exercise.isSystem).toBe(false);
  });

  it('creates workout plans, logs sessions, detects Personal Records, and computes streak stats', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Aarav',
      lastName: 'Lifts',
      email: 'aarav@lifts.test',
      password: 'Password123',
      role: 'member',
    });
    const token = reg.body.data.tokens.accessToken as string;

    const exRes = await request(app)
      .get('/api/v1/exercises?search=Barbell%20Bench%20Press')
      .set('Authorization', `Bearer ${token}`);
    const bench = exRes.body.data.exercises[0];

    // Create workout plan
    const planRes = await request(app)
      .post('/api/v1/workouts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        name: 'Upper Power Split',
        goal: 'strength',
        difficulty: 'intermediate',
        daysPerWeek: 4,
        days: [
          {
            dayNumber: 1,
            title: 'Upper A',
            exercises: [
              {
                exerciseId: bench.id,
                sets: 3,
                reps: '5',
                restSeconds: 120,
                targetWeightKg: 80,
              },
            ],
          },
        ],
      });
    expect(planRes.status).toBe(201);
    const planId = planRes.body.data.workout.id as string;

    // Log first workout session: 2 sets x 5 reps x 80 kg = 800 kg volume, 1 PR (80kg)
    const session1 = await request(app)
      .post('/api/v1/workout-sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        workoutPlanId: planId,
        title: 'Upper A — Week 1',
        durationMinutes: 50,
        status: 'completed',
        exercises: [
          {
            exerciseId: bench.id,
            exerciseName: bench.name,
            sets: [
              { setNumber: 1, reps: 5, weightKg: 80, isCompleted: true },
              { setNumber: 2, reps: 5, weightKg: 80, isCompleted: true },
            ],
          },
        ],
      });

    expect(session1.status).toBe(201);
    expect(session1.body.data.session.totalVolumeKg).toBe(800);
    expect(session1.body.data.session.personalRecordsHit).toBe(1);
    expect(session1.body.data.session.exercises[0].sets[0].isPersonalRecord).toBe(true);

    // Log progressive overload session: 85 kg -> triggers new PR!
    const session2 = await request(app)
      .post('/api/v1/workout-sessions')
      .set('Authorization', `Bearer ${token}`)
      .send({
        workoutPlanId: planId,
        title: 'Upper A — Week 2',
        durationMinutes: 55,
        status: 'completed',
        exercises: [
          {
            exerciseId: bench.id,
            exerciseName: bench.name,
            sets: [
              { setNumber: 1, reps: 5, weightKg: 80, isCompleted: true },
              { setNumber: 2, reps: 5, weightKg: 85, isCompleted: true },
            ],
          },
        ],
      });

    expect(session2.status).toBe(201);
    expect(session2.body.data.session.totalVolumeKg).toBe(825);
    expect(session2.body.data.session.personalRecordsHit).toBe(1);
    expect(session2.body.data.session.exercises[0].sets[0].isPersonalRecord).toBe(false);
    expect(session2.body.data.session.exercises[0].sets[1].isPersonalRecord).toBe(true);

    // History & Stats
    const historyRes = await request(app)
      .get('/api/v1/workout-sessions/history')
      .set('Authorization', `Bearer ${token}`);

    expect(historyRes.status).toBe(200);
    expect(historyRes.body.data.stats.totalCompletedSessions).toBe(2);
    expect(historyRes.body.data.stats.totalVolumeKg).toBe(1625);
    expect(historyRes.body.data.stats.totalPersonalRecords).toBe(2);
    expect(historyRes.body.data.stats.currentStreakDays).toBeGreaterThanOrEqual(1);
  });
});

