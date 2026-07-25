import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { createAccessToken } from '../dist/auth/tokens.js';
import { createApp } from '../dist/app.js';
import {
    AUTHENTICATED_API_RATE_LIMIT,
    AUTHENTICATED_API_RATE_LIMIT_WINDOW_MS,
    SIGN_IN_EMAIL_IP_LIMIT,
    SIGN_IN_IP_LIMIT,
    SIGN_IN_RATE_LIMIT_WINDOW_MS,
    SIGN_UP_DAILY_IP_LIMIT,
    SIGN_UP_DAILY_RATE_LIMIT_WINDOW_MS,
    SIGN_UP_HOURLY_IP_LIMIT,
    SIGN_UP_HOURLY_RATE_LIMIT_WINDOW_MS,
} from '../dist/config/server.js';

process.env.ACCESS_TOKEN_SECRET = 'test-only-secret';

let baseUrl;
let server;

before(async () => {
    server = createApp().listen(0, '127.0.0.1');
    await new Promise((resolve, reject) => {
        server.once('listening', resolve);
        server.once('error', reject);
    });
    const address = server.address();
    baseUrl = `http://127.0.0.1:${address.port}`;
});

after(async () => {
    await new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
    });
});

const getProtectedResponse = async (userId, ip) => {
    const token = createAccessToken(
        { id: userId, email: `user-${userId}@example.com` },
        process.env.ACCESS_TOKEN_SECRET
    );
    return fetch(`${baseUrl}/job-applications?jobStatuses=Unknown`, {
        headers: {
            Cookie: `access_token=${token}`,
            'X-Forwarded-For': ip,
        },
    });
};

test('uses the documented rate-limit configuration without changing sign-in values', () => {
    assert.equal(AUTHENTICATED_API_RATE_LIMIT, 400);
    assert.equal(AUTHENTICATED_API_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
    assert.equal(SIGN_IN_IP_LIMIT, 50);
    assert.equal(SIGN_IN_EMAIL_IP_LIMIT, 10);
    assert.equal(SIGN_IN_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000);
    assert.equal(SIGN_UP_HOURLY_IP_LIMIT, 5);
    assert.equal(SIGN_UP_HOURLY_RATE_LIMIT_WINDOW_MS, 60 * 60 * 1000);
    assert.equal(SIGN_UP_DAILY_IP_LIMIT, 10);
    assert.equal(SIGN_UP_DAILY_RATE_LIMIT_WINDOW_MS, 24 * 60 * 60 * 1000);
});

test('keys protected API requests by authenticated user instead of IP', async () => {
    for (let requestNumber = 0; requestNumber < AUTHENTICATED_API_RATE_LIMIT; requestNumber += 1) {
        const response = await getProtectedResponse(101, '198.51.100.10');
        assert.equal(response.status, 422);
    }

    const sameUserDifferentIpResponse = await getProtectedResponse(101, '198.51.100.11');
    assert.equal(sameUserDifferentIpResponse.status, 429);

    const differentUserSameIpResponse = await getProtectedResponse(102, '198.51.100.10');
    assert.equal(differentUserSameIpResponse.status, 422);
});

test('authenticates protected requests before applying the authenticated API limiter', async () => {
    const response = await fetch(`${baseUrl}/job-applications?jobStatuses=Unknown`, {
        headers: { 'X-Forwarded-For': '198.51.100.12' },
    });

    assert.equal(response.status, 401);
    assert.deepEqual(await response.json(), { message: 'No authentication token found. Please sign in.' });
});

test('counts every sign-up request toward the hourly IP limit', async () => {
    const ip = '198.51.100.20';

    for (let requestNumber = 0; requestNumber < SIGN_UP_HOURLY_IP_LIMIT; requestNumber += 1) {
        const response = await fetch(`${baseUrl}/authentication/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
            body: JSON.stringify({ email: 'invalid-email', password: 'short' }),
        });
        assert.equal(response.status, 422);
    }

    const response = await fetch(`${baseUrl}/authentication/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
        body: JSON.stringify({ email: 'invalid-email', password: 'short' }),
    });
    assert.equal(response.status, 429);
});

test('keeps enforcing the daily sign-up limit after the hourly window resets', async () => {
    const ip = '198.51.100.21';
    const originalDateNow = Date.now;
    let currentTime = originalDateNow();
    Date.now = () => currentTime;

    try {
        for (let requestNumber = 0; requestNumber < SIGN_UP_HOURLY_IP_LIMIT; requestNumber += 1) {
            const response = await fetch(`${baseUrl}/authentication/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
                body: JSON.stringify({ email: 'invalid-email', password: 'short' }),
            });
            assert.equal(response.status, 422);
        }

        currentTime += SIGN_UP_HOURLY_RATE_LIMIT_WINDOW_MS + 1;

        for (let requestNumber = SIGN_UP_HOURLY_IP_LIMIT; requestNumber < SIGN_UP_DAILY_IP_LIMIT; requestNumber += 1) {
            const response = await fetch(`${baseUrl}/authentication/users`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
                body: JSON.stringify({ email: 'invalid-email', password: 'short' }),
            });
            assert.equal(response.status, 422);
        }

        const response = await fetch(`${baseUrl}/authentication/users`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
            body: JSON.stringify({ email: 'invalid-email', password: 'short' }),
        });
        assert.equal(response.status, 429);
    } finally {
        Date.now = originalDateNow;
    }
});
