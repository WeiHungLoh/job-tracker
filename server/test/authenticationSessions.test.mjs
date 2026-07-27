import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { readFile } from 'node:fs/promises';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { createApp } from '../dist/app.js';
import {
    deleteExpiredAuthenticationSessions,
    insertAuthenticationSession,
} from '../dist/db/queries/authenticationSessions.js';
import { pool } from '../dist/db/connectDB.js';
import { hashRefreshToken, refreshTokenHashesMatch } from '../dist/auth/refreshTokenHash.js';
import { createAccessToken, createRefreshToken } from '../dist/auth/tokens.js';
import { REFRESH_TOKEN_DURATION_SECONDS } from '../dist/config/auth.js';

process.env.ACCESS_TOKEN_SECRET = 'authentication-session-access-secret';
process.env.REFRESH_TOKEN_SECRET = 'authentication-session-refresh-secret';

const TEST_SESSION_ID = '1f455c18-27d1-4bd4-9e0d-b79b503f6f75';
const SECOND_SESSION_ID = 'dab40456-67f9-4bd0-a4f7-c32381245d0c';
const TEST_USER = { id: 42, email: 'sessions@example.com', sessionId: TEST_SESSION_ID };

const getSetCookieHeader = (response) => response.headers.get('set-cookie') ?? '';

const getCookieValue = (setCookieHeader, cookieName) => {
    return setCookieHeader.match(new RegExp(`${cookieName}=([^;,]+)`))?.[1];
};

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

test('declares the authentication session table after users with cascade deletion and idempotent indexes', async () => {
    const source = await readFile(new URL('../src/db/queries/createTables.ts', import.meta.url), 'utf8');
    const usersPosition = source.indexOf('CREATE TABLE IF NOT EXISTS users');
    const sessionsPosition = source.indexOf('CREATE TABLE IF NOT EXISTS authentication_sessions');

    assert.ok(usersPosition >= 0);
    assert.ok(sessionsPosition > usersPosition);
    assert.match(source, /session_id UUID PRIMARY KEY/);
    assert.match(source, /user_id INTEGER NOT NULL\s+REFERENCES users\(user_id\)\s+ON DELETE CASCADE/);
    assert.match(source, /refresh_token_hash TEXT NOT NULL/);
    assert.match(source, /expires_at TIMESTAMPTZ NOT NULL/);
    assert.doesNotMatch(source, /session_id UUID[^,\n]*DEFAULT/);
    assert.match(
        source,
        /CREATE INDEX IF NOT EXISTS authentication_sessions_user_id_idx\s+ON authentication_sessions \(user_id\)/
    );
    assert.match(
        source,
        /CREATE INDEX IF NOT EXISTS authentication_sessions_expires_at_idx\s+ON authentication_sessions \(expires_at\)/
    );
});

test('uses parameterized authentication session insertion and expired-session cleanup queries', async () => {
    const originalQuery = pool.query;
    const calls = [];
    pool.query = async (sql, values) => {
        calls.push({ sql: String(sql), values });
        return { rows: [], rowCount: 1 };
    };

    try {
        const expiresAt = new Date('2030-01-02T03:04:05.000Z');
        await insertAuthenticationSession(TEST_SESSION_ID, TEST_USER.id, 'a'.repeat(64), expiresAt);
        await deleteExpiredAuthenticationSessions();

        assert.deepEqual(calls[0].values, [TEST_SESSION_ID, TEST_USER.id, 'a'.repeat(64), expiresAt]);
        assert.match(calls[0].sql, /INSERT INTO authentication_sessions/);
        assert.match(calls[0].sql, /VALUES \(\$1, \$2, \$3, \$4\)/);
        assert.match(calls[1].sql, /DELETE FROM authentication_sessions/);
        assert.match(calls[1].sql, /expires_at <= CURRENT_TIMESTAMP/);
        assert.equal(calls[1].values, undefined);
    } finally {
        pool.query = originalQuery;
    }
});

test('logs expired-session cleanup failures without preventing startup', async () => {
    const originalQuery = pool.query;
    const originalConsoleError = console.error;
    const loggedMessages = [];
    pool.query = async () => {
        throw new Error('database detail');
    };
    console.error = (...values) => {
        loggedMessages.push(values);
    };

    try {
        await assert.doesNotReject(deleteExpiredAuthenticationSessions());
        assert.deepEqual(loggedMessages, [['Unable to clean up expired authentication sessions.']]);
    } finally {
        pool.query = originalQuery;
        console.error = originalConsoleError;
    }
});

test('runs expired-session cleanup once during server startup', async () => {
    const source = await readFile(new URL('../src/server.ts', import.meta.url), 'utf8');

    assert.match(source, /await createTables\(\);\s+await deleteExpiredAuthenticationSessions\(\);/);
    assert.equal(source.match(/deleteExpiredAuthenticationSessions\(\)/g)?.length, 1);
});

test('creates matching session-bound JWT payloads and rejects invalid session IDs', () => {
    const accessToken = createAccessToken(TEST_USER, process.env.ACCESS_TOKEN_SECRET);
    const refreshToken = createRefreshToken(TEST_USER, process.env.REFRESH_TOKEN_SECRET);
    const accessPayload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
    const refreshPayload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

    assert.equal(accessPayload.sessionId, TEST_SESSION_ID);
    assert.equal(refreshPayload.sessionId, TEST_SESSION_ID);
    assert.equal(accessPayload.tokenType, 'access');
    assert.equal(refreshPayload.tokenType, 'refresh');
    assert.throws(
        () =>
            createAccessToken(
                { id: TEST_USER.id, email: TEST_USER.email, sessionId: 'not-a-uuid' },
                process.env.ACCESS_TOKEN_SECRET
            ),
        /session/i
    );
});

test('compares fixed-format refresh-token hashes without throwing for malformed stored data', () => {
    const hash = hashRefreshToken('refresh-token');

    assert.equal(refreshTokenHashesMatch(hash, hash), true);
    assert.equal(refreshTokenHashesMatch(hash, hashRefreshToken('different-token')), false);
    assert.equal(refreshTokenHashesMatch(hash, 'malformed'), false);
});

test('successful login stores one hashed refresh-token session before issuing unchanged cookies', async () => {
    const originalQuery = pool.query;
    const hashedPassword = await bcrypt.hash('correct password', 4);
    const calls = [];
    pool.query = async (sql, values) => {
        calls.push({ sql: String(sql), values });
        if (String(sql).includes('FROM users')) {
            return {
                rows: [{ user_id: TEST_USER.id, email: TEST_USER.email, hashed_password: hashedPassword }],
            };
        }
        return { rows: [], rowCount: 1 };
    };

    try {
        const response = await fetch(`${baseUrl}/authentication/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: TEST_USER.email, password: 'correct password' }),
        });

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { message: 'Successfully signed in.' });

        const setCookieHeader = getSetCookieHeader(response);
        const [accessCookieHeader, refreshCookieHeader] = setCookieHeader.split(/, (?=refresh_token=)/);
        const accessToken = getCookieValue(setCookieHeader, 'access_token');
        const refreshToken = getCookieValue(setCookieHeader, 'refresh_token');
        assert.ok(accessToken);
        assert.ok(refreshToken);
        assert.match(
            accessCookieHeader,
            /access_token=[^;]+; Max-Age=900; Path=\/api; Expires=[^;]+; HttpOnly; SameSite=Strict/
        );
        assert.match(
            refreshCookieHeader,
            /refresh_token=[^;]+; Max-Age=604800; Path=\/api\/authentication; Expires=[^;]+; HttpOnly; SameSite=Strict/
        );

        const accessPayload = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
        const refreshPayload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
        assert.match(accessPayload.sessionId, /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
        assert.equal(refreshPayload.sessionId, accessPayload.sessionId);

        const insertCall = calls.find((call) => call.sql.includes('INSERT INTO authentication_sessions'));
        assert.ok(insertCall);
        assert.equal(insertCall.values[0], accessPayload.sessionId);
        assert.equal(insertCall.values[1], TEST_USER.id);
        assert.equal(insertCall.values[2], hashRefreshToken(refreshToken));
        assert.notEqual(insertCall.values[2], refreshToken);
        assert.ok(insertCall.values[3] instanceof Date);
        assert.ok(Math.abs(insertCall.values[3].getTime() - (Date.now() + 7 * 24 * 60 * 60 * 1000)) < 1500);
        assert.ok(Math.abs(insertCall.values[3].getTime() - refreshPayload.exp * 1000) < 1500);
    } finally {
        pool.query = originalQuery;
    }
});

test('session insertion failure does not report login success or issue authentication cookies', async () => {
    const originalQuery = pool.query;
    const originalConsoleError = console.error;
    const hashedPassword = await bcrypt.hash('correct password', 4);
    console.error = () => undefined;
    pool.query = async (sql) => {
        if (String(sql).includes('FROM users')) {
            return {
                rows: [{ user_id: TEST_USER.id, email: TEST_USER.email, hashed_password: hashedPassword }],
            };
        }
        throw new Error('session insert failed');
    };

    try {
        const response = await fetch(`${baseUrl}/authentication/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: TEST_USER.email, password: 'correct password' }),
        });

        assert.equal(response.status, 500);
        assert.deepEqual(await response.json(), { message: 'Unable to sign in.' });
        assert.equal(getSetCookieHeader(response), '');
    } finally {
        pool.query = originalQuery;
        console.error = originalConsoleError;
    }
});

test('two successful logins create distinct coexisting sessions', async () => {
    const originalQuery = pool.query;
    const hashedPassword = await bcrypt.hash('correct password', 4);
    const insertedSessionIds = [];
    pool.query = async (sql, values) => {
        if (String(sql).includes('FROM users')) {
            return {
                rows: [{ user_id: TEST_USER.id, email: TEST_USER.email, hashed_password: hashedPassword }],
            };
        }
        if (String(sql).includes('INSERT INTO authentication_sessions')) {
            insertedSessionIds.push(values[0]);
        }
        return { rows: [], rowCount: 1 };
    };

    try {
        for (let loginNumber = 0; loginNumber < 2; loginNumber += 1) {
            const response = await fetch(`${baseUrl}/authentication/sessions`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: TEST_USER.email, password: 'correct password' }),
            });
            assert.equal(response.status, 200);
        }

        assert.equal(insertedSessionIds.length, 2);
        assert.notEqual(insertedSessionIds[0], insertedSessionIds[1]);
    } finally {
        pool.query = originalQuery;
    }
});

test('valid refresh validates the database session and replaces only the access cookie', async () => {
    const originalQuery = pool.query;
    const refreshToken = createRefreshToken(TEST_USER, process.env.REFRESH_TOKEN_SECRET);
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_DURATION_SECONDS * 1000);
    const calls = [];
    pool.query = async (sql, values) => {
        calls.push({ sql: String(sql), values });
        return {
            rows: [
                {
                    session_id: TEST_SESSION_ID,
                    user_id: TEST_USER.id,
                    refresh_token_hash: hashRefreshToken(refreshToken),
                    created_at: new Date(),
                    expires_at: expiresAt,
                },
            ],
        };
    };

    try {
        const response = await fetch(`${baseUrl}/authentication/sessions/refresh`, {
            method: 'POST',
            headers: { Cookie: `refresh_token=${refreshToken}` },
        });

        assert.equal(response.status, 200);
        assert.deepEqual(await response.json(), { message: 'Access token refreshed.' });
        const setCookieHeader = getSetCookieHeader(response);
        const accessToken = getCookieValue(setCookieHeader, 'access_token');
        assert.ok(accessToken);
        assert.doesNotMatch(setCookieHeader, /refresh_token=/);
        assert.equal(jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET).sessionId, TEST_SESSION_ID);
        assert.equal(calls.length, 1);
        assert.match(calls[0].sql, /FROM authentication_sessions/);
        assert.deepEqual(calls[0].values, [TEST_SESSION_ID]);
    } finally {
        pool.query = originalQuery;
    }
});

test('refresh rejects a missing session without issuing an access token and clears both cookies', async () => {
    const originalQuery = pool.query;
    const refreshToken = createRefreshToken(TEST_USER, process.env.REFRESH_TOKEN_SECRET);
    pool.query = async () => ({ rows: [] });

    try {
        const response = await fetch(`${baseUrl}/authentication/sessions/refresh`, {
            method: 'POST',
            headers: { Cookie: `refresh_token=${refreshToken}` },
        });

        assert.equal(response.status, 401);
        assert.deepEqual(await response.json(), { message: 'Invalid or expired refresh token. Please sign in.' });
        const setCookieHeader = getSetCookieHeader(response);
        assert.match(setCookieHeader, /access_token=;/);
        assert.match(setCookieHeader, /refresh_token=;/);
        assert.doesNotMatch(setCookieHeader, /access_token=[^;]/);
    } finally {
        pool.query = originalQuery;
    }
});

test('refresh rejects wrong ownership, mismatched hashes, malformed hashes, and expired database sessions', async () => {
    const originalQuery = pool.query;
    const refreshToken = createRefreshToken(TEST_USER, process.env.REFRESH_TOKEN_SECRET);
    const validSession = {
        session_id: TEST_SESSION_ID,
        user_id: TEST_USER.id,
        refresh_token_hash: hashRefreshToken(refreshToken),
        created_at: new Date(),
        expires_at: new Date(Date.now() + 60_000),
    };
    const invalidSessions = [
        { ...validSession, user_id: TEST_USER.id + 1 },
        { ...validSession, refresh_token_hash: hashRefreshToken('different-token') },
        { ...validSession, refresh_token_hash: 'malformed' },
        { ...validSession, expires_at: new Date(Date.now() - 1_000) },
    ];

    try {
        for (const session of invalidSessions) {
            pool.query = async (sql) => {
                if (String(sql).includes('SELECT session_id')) {
                    return { rows: [session] };
                }
                return { rows: [], rowCount: 0 };
            };

            const response = await fetch(`${baseUrl}/authentication/sessions/refresh`, {
                method: 'POST',
                headers: { Cookie: `refresh_token=${refreshToken}` },
            });

            assert.equal(response.status, 401);
            assert.deepEqual(await response.json(), {
                message: 'Invalid or expired refresh token. Please sign in.',
            });
            const setCookieHeader = getSetCookieHeader(response);
            assert.match(setCookieHeader, /access_token=;/);
            assert.match(setCookieHeader, /refresh_token=;/);
        }
    } finally {
        pool.query = originalQuery;
    }
});

test('a tampered refresh token does not query or delete an authentication session', async () => {
    const originalQuery = pool.query;
    let queryCount = 0;
    pool.query = async () => {
        queryCount += 1;
        return { rows: [], rowCount: 1 };
    };
    const refreshToken = createRefreshToken(TEST_USER, process.env.REFRESH_TOKEN_SECRET);
    const tamperedToken = `${refreshToken.slice(0, -1)}${refreshToken.endsWith('a') ? 'b' : 'a'}`;

    try {
        const response = await fetch(`${baseUrl}/authentication/sessions/refresh`, {
            method: 'POST',
            headers: { Cookie: `refresh_token=${tamperedToken}` },
        });

        assert.equal(response.status, 401);
        assert.equal(queryCount, 0);
    } finally {
        pool.query = originalQuery;
    }
});

test('protected access validates the session payload without querying authentication sessions', async () => {
    const originalQuery = pool.query;
    let queryCount = 0;
    pool.query = async () => {
        queryCount += 1;
        throw new Error('Protected validation should not query the database.');
    };
    const validAccessToken = createAccessToken(TEST_USER, process.env.ACCESS_TOKEN_SECRET);
    const invalidTokens = [
        jwt.sign({ id: TEST_USER.id, email: TEST_USER.email, tokenType: 'access' }, process.env.ACCESS_TOKEN_SECRET, {
            algorithm: 'HS256',
        }),
        jwt.sign({ ...TEST_USER, sessionId: 'not-a-uuid', tokenType: 'access' }, process.env.ACCESS_TOKEN_SECRET, {
            algorithm: 'HS256',
        }),
        jwt.sign({ ...TEST_USER, tokenType: 'refresh' }, process.env.ACCESS_TOKEN_SECRET, {
            algorithm: 'HS256',
        }),
    ];

    try {
        const validResponse = await fetch(`${baseUrl}/job-applications?jobStatuses=Unknown`, {
            headers: { Cookie: `access_token=${validAccessToken}` },
        });
        assert.equal(validResponse.status, 422);
        assert.equal(queryCount, 0);

        for (const token of invalidTokens) {
            const response = await fetch(`${baseUrl}/job-applications`, {
                headers: { Cookie: `access_token=${token}` },
            });
            assert.equal(response.status, 401);
        }
        assert.equal(queryCount, 0);
    } finally {
        pool.query = originalQuery;
    }
});

test('logout deletes only the verified current session and still clears cookies', async () => {
    const originalQuery = pool.query;
    const refreshToken = createRefreshToken(TEST_USER, process.env.REFRESH_TOKEN_SECRET);
    const calls = [];
    pool.query = async (sql, values) => {
        calls.push({ sql: String(sql), values });
        return { rows: [], rowCount: 1 };
    };

    try {
        const response = await fetch(`${baseUrl}/authentication/sessions/current`, {
            method: 'DELETE',
            headers: { Cookie: `refresh_token=${refreshToken}` },
        });

        assert.equal(response.status, 204);
        assert.equal(calls.length, 1);
        assert.match(calls[0].sql, /DELETE FROM authentication_sessions/);
        assert.match(calls[0].sql, /session_id = \$1/);
        assert.match(calls[0].sql, /user_id = \$2/);
        assert.deepEqual(calls[0].values, [TEST_SESSION_ID, TEST_USER.id]);
        const setCookieHeader = getSetCookieHeader(response);
        assert.match(setCookieHeader, /access_token=;/);
        assert.match(setCookieHeader, /refresh_token=;/);
    } finally {
        pool.query = originalQuery;
    }
});

test('a malformed logout token cannot delete another session', async () => {
    const originalQuery = pool.query;
    let queryCount = 0;
    pool.query = async () => {
        queryCount += 1;
        return { rows: [], rowCount: 1 };
    };

    try {
        const response = await fetch(`${baseUrl}/authentication/sessions/current`, {
            method: 'DELETE',
            headers: { Cookie: 'refresh_token=malformed-token' },
        });

        assert.equal(response.status, 204);
        assert.equal(queryCount, 0);
        const setCookieHeader = getSetCookieHeader(response);
        assert.match(setCookieHeader, /access_token=;/);
        assert.match(setCookieHeader, /refresh_token=;/);
    } finally {
        pool.query = originalQuery;
    }
});

test('logout clears cookies when current-session deletion fails', async () => {
    const originalQuery = pool.query;
    const originalConsoleError = console.error;
    const refreshToken = createRefreshToken(TEST_USER, process.env.REFRESH_TOKEN_SECRET);
    console.error = () => undefined;
    pool.query = async () => {
        throw new Error('delete failed');
    };

    try {
        const response = await fetch(`${baseUrl}/authentication/sessions/current`, {
            method: 'DELETE',
            headers: { Cookie: `refresh_token=${refreshToken}` },
        });

        assert.equal(response.status, 204);
        const setCookieHeader = getSetCookieHeader(response);
        assert.match(setCookieHeader, /access_token=;/);
        assert.match(setCookieHeader, /refresh_token=;/);
    } finally {
        pool.query = originalQuery;
        console.error = originalConsoleError;
    }
});

test('separate sessions receive different IDs', () => {
    const firstToken = createRefreshToken(TEST_USER, process.env.REFRESH_TOKEN_SECRET);
    const secondToken = createRefreshToken(
        { id: TEST_USER.id, email: TEST_USER.email, sessionId: SECOND_SESSION_ID },
        process.env.REFRESH_TOKEN_SECRET
    );

    assert.notEqual(
        jwt.verify(firstToken, process.env.REFRESH_TOKEN_SECRET).sessionId,
        jwt.verify(secondToken, process.env.REFRESH_TOKEN_SECRET).sessionId
    );
});
