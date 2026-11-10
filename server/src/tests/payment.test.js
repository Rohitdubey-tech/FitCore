"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../app");
const payment_service_1 = require("../modules/payments/payment.service");
const app = (0, app_1.createApp)();
async function setupGymMemberAndPlan(email, gymName) {
    const adminRes = await (0, supertest_1.default)(app).post('/api/v1/auth/register').send({
        firstName: 'Owner',
        lastName: 'Pay',
        email,
        password: 'Password123',
        role: 'gym_admin',
        gymName,
    });
    const token = adminRes.body.data.tokens.accessToken;
    const gymId = adminRes.body.data.user.activeGymId;
    const memberRes = await (0, supertest_1.default)(app)
        .post(`/api/v1/gyms/${gymId}/members`)
        .set('Authorization', `Bearer ${token}`)
        .send({
        firstName: 'Riya',
        lastName: 'Das',
        email: `riya.${gymId}@pay.test`,
    });
    const memberId = memberRes.body.data.member.id;
    const planRes = await (0, supertest_1.default)(app)
        .post('/api/v1/membership-plans')
        .set('Authorization', `Bearer ${token}`)
        .send({
        gymId,
        name: 'Annual Pro',
        durationType: 'annual',
        price: 12000,
    });
    const planId = planRes.body.data.plan.id;
    return { token, gymId, memberId, planId };
}
describe('Phase 5: Razorpay Payments, Webhooks, Refunds & Invoices', () => {
    it('creates an order, verifies HMAC signature, activates subscription, and issues invoice', async () => {
        const ctx = await setupGymMemberAndPlan('owner@pay1.test', 'Iron Pay Studio');
        const orderRes = await (0, supertest_1.default)(app)
            .post('/api/v1/payments/orders')
            .set('Authorization', `Bearer ${ctx.token}`)
            .send({
            gymId: ctx.gymId,
            memberId: ctx.memberId,
            planId: ctx.planId,
        });
        expect(orderRes.status).toBe(201);
        const orderId = orderRes.body.data.razorpay.orderId;
        const paymentId = orderRes.body.data.payment.id;
        expect(orderRes.body.data.razorpay.amountPaise).toBe(1200000);
        // Forged signature rejected
        const badVerify = await (0, supertest_1.default)(app)
            .post('/api/v1/payments/verify')
            .set('Authorization', `Bearer ${ctx.token}`)
            .send({
            razorpayOrderId: orderId,
            razorpayPaymentId: 'pay_forged_123',
            razorpaySignature: '0'.repeat(64),
        });
        expect(badVerify.status).toBe(400);
        // Valid signature succeeds
        const rzpPaymentId = 'pay_valid_999';
        const validSignature = (0, payment_service_1.computeRazorpayCheckoutSignature)(orderId, rzpPaymentId);
        const verifyRes = await (0, supertest_1.default)(app)
            .post('/api/v1/payments/verify')
            .set('Authorization', `Bearer ${ctx.token}`)
            .send({
            razorpayOrderId: orderId,
            razorpayPaymentId: rzpPaymentId,
            razorpaySignature: validSignature,
        });
        expect(verifyRes.status).toBe(200);
        expect(verifyRes.body.data.payment.status).toBe('paid');
        expect(verifyRes.body.data.payment.invoiceNumber).toMatch(/^INV-/);
        expect(verifyRes.body.data.payment.subscriptionId).toBeDefined();
        // Invoice endpoint works
        const invoiceRes = await (0, supertest_1.default)(app)
            .get(`/api/v1/payments/${paymentId}/invoice`)
            .set('Authorization', `Bearer ${ctx.token}`);
        expect(invoiceRes.status).toBe(200);
        expect(invoiceRes.body.data.invoice.amount).toBe(12000);
        expect(invoiceRes.body.data.invoice.plan.durationDays).toBe(365);
        // Partial refund & full refund
        const partialRefund = await (0, supertest_1.default)(app)
            .post(`/api/v1/payments/${paymentId}/refund`)
            .set('Authorization', `Bearer ${ctx.token}`)
            .send({ amount: 2000, reason: 'Promo adjustment' });
        expect(partialRefund.status).toBe(200);
        expect(partialRefund.body.data.payment.status).toBe('partially_refunded');
        const fullRefund = await (0, supertest_1.default)(app)
            .post(`/api/v1/payments/${paymentId}/refund`)
            .set('Authorization', `Bearer ${ctx.token}`)
            .send({ reason: 'Member relocated' });
        expect(fullRefund.status).toBe(200);
        expect(fullRefund.body.data.payment.status).toBe('refunded');
    });
    it('verifies raw-body webhook signature, prevents replay duplicates, and isolates tenants', async () => {
        const ctxA = await setupGymMemberAndPlan('ownerA@webhook.test', 'Gym A Pay');
        const ctxB = await setupGymMemberAndPlan('ownerB@webhook.test', 'Gym B Pay');
        const orderRes = await (0, supertest_1.default)(app)
            .post('/api/v1/payments/orders')
            .set('Authorization', `Bearer ${ctxA.token}`)
            .send({
            gymId: ctxA.gymId,
            memberId: ctxA.memberId,
            planId: ctxA.planId,
        });
        const orderId = orderRes.body.data.razorpay.orderId;
        const paymentId = orderRes.body.data.payment.id;
        const webhookPayload = {
            event: 'payment.captured',
            payload: {
                payment: {
                    entity: {
                        id: 'pay_webhook_123',
                        order_id: orderId,
                        method: 'upi',
                    },
                },
            },
        };
        const rawBody = JSON.stringify(webhookPayload);
        const validWebhookSig = (0, payment_service_1.computeRazorpayWebhookSignature)(rawBody);
        // Forged webhook signature -> 401
        const forgedWebhook = await (0, supertest_1.default)(app)
            .post('/api/v1/payments/webhook')
            .set('Content-Type', 'application/json')
            .set('x-razorpay-signature', 'bad_signature')
            .set('x-razorpay-event-id', 'evt_001')
            .send(rawBody);
        expect(forgedWebhook.status).toBe(401);
        // Valid webhook -> processes payment
        const okWebhook = await (0, supertest_1.default)(app)
            .post('/api/v1/payments/webhook')
            .set('Content-Type', 'application/json')
            .set('x-razorpay-signature', validWebhookSig)
            .set('x-razorpay-event-id', 'evt_001')
            .send(rawBody);
        expect(okWebhook.status).toBe(200);
        expect(okWebhook.body.data.duplicate).toBe(false);
        // Replayed eventId -> deduplicated
        const replayWebhook = await (0, supertest_1.default)(app)
            .post('/api/v1/payments/webhook')
            .set('Content-Type', 'application/json')
            .set('x-razorpay-signature', validWebhookSig)
            .set('x-razorpay-event-id', 'evt_001')
            .send(rawBody);
        expect(replayWebhook.status).toBe(200);
        expect(replayWebhook.body.data.duplicate).toBe(true);
        // Payment history & summary reflect captured payment
        const historyRes = await (0, supertest_1.default)(app)
            .get(`/api/v1/payments/history?gymId=${ctxA.gymId}`)
            .set('Authorization', `Bearer ${ctxA.token}`);
        expect(historyRes.status).toBe(200);
        expect(historyRes.body.data.summary.totalCollected).toBe(12000);
        expect(historyRes.body.data.summary.paidCount).toBe(1);
        // Cross-tenant admin B cannot view Gym A payment history or invoice
        expect((await (0, supertest_1.default)(app)
            .get(`/api/v1/payments/history?gymId=${ctxA.gymId}`)
            .set('Authorization', `Bearer ${ctxB.token}`)).status).toBe(403);
        expect((await (0, supertest_1.default)(app)
            .get(`/api/v1/payments/${paymentId}/invoice`)
            .set('Authorization', `Bearer ${ctxB.token}`)).status).toBe(403);
    });
});
