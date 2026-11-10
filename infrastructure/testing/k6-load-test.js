import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  stages: [
    { duration: '20s', target: 25 },
    { duration: '40s', target: 100 },
    { duration: '20s', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(95)<400'],
    http_req_failed: ['rate<0.01'],
  },
};

const BASE_URL = __ENV.API_URL || 'http://127.0.0.1:5001/api/v1';

export default function () {
  const health = http.get(`${BASE_URL}/health`);
  check(health, { 'health 200': (r) => r.status === 200 });

  const loginRes = http.post(
    `${BASE_URL}/auth/login`,
    JSON.stringify({
      email: __ENV.TEST_EMAIL || 'owner@ironpulse.dev',
      password: __ENV.TEST_PASSWORD || 'FitCore@2026',
    }),
    { headers: { 'Content-Type': 'application/json' } }
  );

  check(loginRes, { 'login 200': (r) => r.status === 200 });

  const token = loginRes.json('data.tokens.accessToken');
  if (token) {
    const exercises = http.get(`${BASE_URL}/exercises`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    check(exercises, { 'exercises 200': (r) => r.status === 200 });
  }

  sleep(1);
}

