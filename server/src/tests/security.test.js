"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../app");
const app = (0, app_1.createApp)();
describe('Phase 12: Security Verification (Headers, Injection, Privilege Escalation)', () => {
    it('sets Helmet security headers and strips NoSQL operator injection payloads', async () => {
        const healthRes = await (0, supertest_1.default)(app).get('/api/v1/health');
        expect(healthRes.headers['x-content-type-options']).toBe('nosniff');
        expect(healthRes.headers['x-dns-prefetch-control']).toBe('off');
        // NoSQL operator injection on login must be sanitized and fail validation/auth
        const injectionRes = await (0, supertest_1.default)(app).post('/api/v1/auth/login').send({
            email: { $gt: '' },
            password: { $ne: null },
        });
        expect(injectionRes.status).toBe(400);
    });
    it('prevents privilege escalation to super_admin via public registration and never leaks secrets', async () => {
        const escalationRes = await (0, supertest_1.default)(app).post('/api/v1/auth/register').send({
            firstName: 'Attacker',
            lastName: 'Test',
            email: 'attacker@sec.test',
            password: 'Password123',
            role: 'super_admin',
        });
        expect(escalationRes.status).toBe(400);
        const normalRes = await (0, supertest_1.default)(app).post('/api/v1/auth/register').send({
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
