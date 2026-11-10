import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Phase 9: AI Diet, AI Workout, Meal Analyzer & Fitness Assistant', () => {
  it('generates verified AI diet & workout plans, grounds AI chat in real telemetry, and includes safety disclosures', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Karan',
      lastName: 'AI',
      email: 'karan@ai.test',
      password: 'Password123',
      role: 'member',
    });
    const token = reg.body.data.tokens.accessToken as string;

    // Diet generation respecting vegetarian & peanut allergy
    const dietRes = await request(app)
      .post('/api/v1/ai/diet/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        age: 25,
        weightKg: 72,
        heightCm: 175,
        fitnessGoal: 'muscle_gain',
        dietaryPreference: 'vegetarian',
        cuisine: 'indian',
        allergies: ['peanut'],
      });
    expect(dietRes.status).toBe(201);
    expect(dietRes.body.data.plan.dailyTargets.calories).toBeGreaterThan(1800);
    expect(dietRes.body.data.plan.safety.medical_disclaimer).toMatch(/not medical advice/i);
    expect(JSON.stringify(dietRes.body.data.plan.meals).toLowerCase()).not.toContain('peanut');

    // Workout generation
    const workoutRes = await request(app)
      .post('/api/v1/ai/workout/generate')
      .set('Authorization', `Bearer ${token}`)
      .send({
        fitnessGoal: 'strength',
        experienceLevel: 'intermediate',
        workoutDays: 4,
      });
    expect(workoutRes.status).toBe(201);
    expect(workoutRes.body.data.workout.days).toHaveLength(4);

    // Chat grounded in user stats
    const chatRes = await request(app)
      .post('/api/v1/ai/chat')
      .set('Authorization', `Bearer ${token}`)
      .send({ message: 'Analyze my workout performance' });
    expect(chatRes.status).toBe(200);
    expect(chatRes.body.data.groundedStatsUsed.totalCompletedSessions).toBe(0);
    expect(chatRes.body.data.reply).toContain('0 completed workout(s)');

    // Meal analyzer includes uncertainty disclosure
    const mealRes = await request(app)
      .post('/api/v1/ai/meal/analyze')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Paneer bowl with rice' });
    expect(mealRes.status).toBe(200);
    expect(mealRes.body.data.estimates.calories).toBeGreaterThan(0);
    expect(mealRes.body.data.uncertaintyDisclosure).toMatch(/approximate/i);

    // Saved recommendations history
    const recsRes = await request(app)
      .get('/api/v1/ai/recommendations')
      .set('Authorization', `Bearer ${token}`);
    expect(recsRes.status).toBe(200);
    expect(recsRes.body.data.recommendations.length).toBeGreaterThanOrEqual(3);
  });
});
