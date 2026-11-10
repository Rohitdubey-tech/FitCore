"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../app");
const app = (0, app_1.createApp)();
async function registerGymAdmin(email, gymName) {
    const res = await (0, supertest_1.default)(app).post('/api/v1/auth/register').send({
        firstName: 'Owner',
        lastName: 'User',
        email,
        password: 'Password123',
        role: 'gym_admin',
        gymName,
    });
    return {
        token: res.body.data.tokens.accessToken,
        gymId: res.body.data.user.activeGymId,
        userId: res.body.data.user.id,
    };
}
describe('Phase 3: Gyms & Members API with Tenant Isolation', () => {
    it('supports gym creation, branch management, listing, and soft deletion', async () => {
        const admin = await registerGymAdmin('gym1@fitcore.test', 'Iron Pulse HQ');
        // Create a second gym with branches
        const createRes = await (0, supertest_1.default)(app)
            .post('/api/v1/gyms')
            .set('Authorization', `Bearer ${admin.token}`)
            .send({
            name: 'Iron Pulse Koramangala',
            contactEmail: 'koramangala@ironpulse.test',
            contactPhone: '+919876543211',
            branches: [
                {
                    name: 'Koramangala 4th Block',
                    address: '80 Feet Road',
                    city: 'Bengaluru',
                    state: 'Karnataka',
                    postalCode: '560034',
                    isPrimary: true,
                },
            ],
        });
        expect(createRes.status).toBe(201);
        const secondGymId = createRes.body.data.gym.id;
        expect(createRes.body.data.gym.branches).toHaveLength(1);
        // List authorized gyms -> should see 2 gyms
        const listRes = await (0, supertest_1.default)(app)
            .get('/api/v1/gyms')
            .set('Authorization', `Bearer ${admin.token}`);
        expect(listRes.status).toBe(200);
        expect(listRes.body.data.gyms).toHaveLength(2);
        // Add a second branch via PATCH
        const existingBranch = createRes.body.data.gym.branches[0];
        const patchRes = await (0, supertest_1.default)(app)
            .patch(`/api/v1/gyms/${secondGymId}`)
            .set('Authorization', `Bearer ${admin.token}`)
            .send({
            branches: [
                existingBranch,
                {
                    name: 'HSR Layout Branch',
                    address: '27th Main Road',
                    city: 'Bengaluru',
                    state: 'Karnataka',
                    postalCode: '560102',
                    isPrimary: false,
                },
            ],
        });
        expect(patchRes.status).toBe(200);
        expect(patchRes.body.data.gym.branches).toHaveLength(2);
        // Soft-delete the second gym
        const delRes = await (0, supertest_1.default)(app)
            .delete(`/api/v1/gyms/${secondGymId}`)
            .set('Authorization', `Bearer ${admin.token}`);
        expect(delRes.status).toBe(200);
        const afterDelList = await (0, supertest_1.default)(app)
            .get('/api/v1/gyms')
            .set('Authorization', `Bearer ${admin.token}`);
        expect(afterDelList.body.data.gyms).toHaveLength(1);
    });
    it('registers, searches, filters, updates, and soft-deletes gym members', async () => {
        const admin = await registerGymAdmin('owner@fitcore.test', 'Titan Barbell');
        const m1 = await (0, supertest_1.default)(app)
            .post(`/api/v1/gyms/${admin.gymId}/members`)
            .set('Authorization', `Bearer ${admin.token}`)
            .send({
            firstName: 'Ananya',
            lastName: 'Nair',
            email: 'ananya@member.test',
            fitnessGoal: 'muscle_gain',
            experienceLevel: 'intermediate',
            status: 'active',
        });
        expect(m1.status).toBe(201);
        const m1Id = m1.body.data.member.id;
        const m2 = await (0, supertest_1.default)(app)
            .post(`/api/v1/gyms/${admin.gymId}/members`)
            .set('Authorization', `Bearer ${admin.token}`)
            .send({
            firstName: 'Kabir',
            lastName: 'Verma',
            email: 'kabir@member.test',
            fitnessGoal: 'fat_loss',
            experienceLevel: 'beginner',
            status: 'suspended',
        });
        expect(m2.status).toBe(201);
        // Search by name
        const searchRes = await (0, supertest_1.default)(app)
            .get(`/api/v1/gyms/${admin.gymId}/members?search=Ananya`)
            .set('Authorization', `Bearer ${admin.token}`);
        expect(searchRes.status).toBe(200);
        expect(searchRes.body.data.members).toHaveLength(1);
        expect(searchRes.body.data.members[0].user.email).toBe('ananya@member.test');
        // Filter by status
        const filterRes = await (0, supertest_1.default)(app)
            .get(`/api/v1/gyms/${admin.gymId}/members?status=suspended`)
            .set('Authorization', `Bearer ${admin.token}`);
        expect(filterRes.status).toBe(200);
        expect(filterRes.body.data.members).toHaveLength(1);
        expect(filterRes.body.data.members[0].user.firstName).toBe('Kabir');
        // Update member
        const patchRes = await (0, supertest_1.default)(app)
            .patch(`/api/v1/members/${m1Id}`)
            .set('Authorization', `Bearer ${admin.token}`)
            .send({
            fitnessGoal: 'strength',
            notes: 'Preparing for powerlifting meet',
        });
        expect(patchRes.status).toBe(200);
        expect(patchRes.body.data.member.fitnessGoal).toBe('strength');
        // Soft-delete member
        const delRes = await (0, supertest_1.default)(app)
            .delete(`/api/v1/members/${m1Id}`)
            .set('Authorization', `Bearer ${admin.token}`);
        expect(delRes.status).toBe(200);
        const listAfterDel = await (0, supertest_1.default)(app)
            .get(`/api/v1/gyms/${admin.gymId}/members`)
            .set('Authorization', `Bearer ${admin.token}`);
        expect(listAfterDel.body.data.members).toHaveLength(1);
    });
    it('enforces strict cross-tenant gym isolation and member IDOR protection', async () => {
        const adminA = await registerGymAdmin('ownerA@fitcore.test', 'Gym Alpha');
        const adminB = await registerGymAdmin('ownerB@fitcore.test', 'Gym Beta');
        const memberRes = await (0, supertest_1.default)(app)
            .post(`/api/v1/gyms/${adminA.gymId}/members`)
            .set('Authorization', `Bearer ${adminA.token}`)
            .send({
            firstName: 'Meera',
            lastName: 'Rao',
            email: 'meera@alpha.test',
            password: 'Password123',
        });
        const memberAId = memberRes.body.data.member.id;
        const member2Res = await (0, supertest_1.default)(app)
            .post(`/api/v1/gyms/${adminA.gymId}/members`)
            .set('Authorization', `Bearer ${adminA.token}`)
            .send({
            firstName: 'Dev',
            lastName: 'Patel',
            email: 'dev@alpha.test',
            password: 'Password123',
        });
        const memberA2Id = member2Res.body.data.member.id;
        // Cross-tenant access by Admin B on Gym A & Member A must fail with 403
        expect((await (0, supertest_1.default)(app)
            .get(`/api/v1/gyms/${adminA.gymId}`)
            .set('Authorization', `Bearer ${adminB.token}`)).status).toBe(403);
        expect((await (0, supertest_1.default)(app)
            .get(`/api/v1/gyms/${adminA.gymId}/members`)
            .set('Authorization', `Bearer ${adminB.token}`)).status).toBe(403);
        expect((await (0, supertest_1.default)(app)
            .get(`/api/v1/members/${memberAId}`)
            .set('Authorization', `Bearer ${adminB.token}`)).status).toBe(403);
        expect((await (0, supertest_1.default)(app)
            .patch(`/api/v1/members/${memberAId}`)
            .set('Authorization', `Bearer ${adminB.token}`)
            .send({ status: 'suspended' })).status).toBe(403);
        // Member Meera logs in: can read own record, cannot list gym members or read Dev's record
        const meeraLogin = await (0, supertest_1.default)(app).post('/api/v1/auth/login').send({
            email: 'meera@alpha.test',
            password: 'Password123',
        });
        const meeraToken = meeraLogin.body.data.tokens.accessToken;
        expect((await (0, supertest_1.default)(app)
            .get(`/api/v1/members/${memberAId}`)
            .set('Authorization', `Bearer ${meeraToken}`)).status).toBe(200);
        expect((await (0, supertest_1.default)(app)
            .get(`/api/v1/members/${memberA2Id}`)
            .set('Authorization', `Bearer ${meeraToken}`)).status).toBe(403);
        expect((await (0, supertest_1.default)(app)
            .get(`/api/v1/gyms/${adminA.gymId}/members`)
            .set('Authorization', `Bearer ${meeraToken}`)).status).toBe(403);
    });
});
