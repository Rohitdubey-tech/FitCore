import request from 'supertest';
import { createApp } from '../app';

const app = createApp();

describe('Phase 8: Nutrition Tracking & Verified Food Database', () => {
  it('searches verified Indian & vegetarian foods, logs meals & water, and aggregates daily summary', async () => {
    const reg = await request(app).post('/api/v1/auth/register').send({
      firstName: 'Meera',
      lastName: 'Fit',
      email: 'meera@nutrition.test',
      password: 'Password123',
      role: 'member',
    });
    const token = reg.body.data.tokens.accessToken as string;

    const foodsRes = await request(app)
      .get('/api/v1/nutrition/foods?cuisine=indian&dietaryTag=vegetarian&search=Paneer')
      .set('Authorization', `Bearer ${token}`);
    expect(foodsRes.status).toBe(200);
    expect(foodsRes.body.data.foods).toHaveLength(1);
    const paneer = foodsRes.body.data.foods[0];
    expect(paneer.proteinGrams).toBe(20);

    // Create diet plan referencing verified Paneer
    const planRes = await request(app)
      .post('/api/v1/nutrition/diet-plans')
      .set('Authorization', `Bearer ${token}`)
      .send({
        title: 'Vegetarian Lean Bulk',
        dietaryPreference: 'vegetarian',
        dailyTargets: {
          calories: 2500,
          proteinGrams: 150,
          carbsGrams: 280,
          fatsGrams: 75,
          waterMl: 3500,
        },
        meals: {
          breakfast: [],
          lunch: [{ foodItemId: paneer.id, name: paneer.name, servings: 1.5 }],
          dinner: [],
          snacks: [],
        },
      });
    expect(planRes.status).toBe(201);
    expect(planRes.body.data.dietPlan.meals.lunch[0].proteinGrams).toBe(30);

    // Log 1.5 servings of Paneer + 500ml water
    const log1 = await request(app)
      .post('/api/v1/nutrition/food-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        mealType: 'lunch',
        foodItemId: paneer.id,
        servings: 1.5,
      });
    expect(log1.status).toBe(201);
    expect(log1.body.data.foodLog.calories).toBe(381);

    const logWater = await request(app)
      .post('/api/v1/nutrition/food-logs')
      .set('Authorization', `Bearer ${token}`)
      .send({
        mealType: 'water',
        waterMl: 500,
      });
    expect(logWater.status).toBe(201);

    const summaryRes = await request(app)
      .get('/api/v1/nutrition/daily-summary')
      .set('Authorization', `Bearer ${token}`);
    expect(summaryRes.status).toBe(200);
    expect(summaryRes.body.data.summary.consumed.calories).toBe(381);
    expect(summaryRes.body.data.summary.consumed.proteinGrams).toBe(30);
    expect(summaryRes.body.data.summary.consumed.waterMl).toBe(500);
    expect(summaryRes.body.data.summary.targets.calories).toBe(2500);
  });
});

