import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { test } from 'node:test';

test('app startup preserves when CORS and cookies read environment configuration', async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), 'job-tracker-startup-'));
    const appURL = new URL('../dist/app.js', import.meta.url).href;
    const serverConfigURL = new URL('../dist/shared/config/server.js', import.meta.url).href;
    const authenticationConfigURL = new URL('../dist/modules/authentication/config.js', import.meta.url).href;
    const probe = `
        await import(${JSON.stringify(appURL)});
        const { isAllowedOrigin } = await import(${JSON.stringify(serverConfigURL)});
        const { ACCESS_TOKEN_COOKIE_OPTIONS } = await import(${JSON.stringify(authenticationConfigURL)});
        console.log(JSON.stringify({
            allowsLocalOrigin: isAllowedOrigin('http://localhost:5173'),
            secureCookies: ACCESS_TOKEN_COOKIE_OPTIONS.secure,
        }));
    `;

    try {
        await writeFile(path.join(directory, '.env'), 'NODE_ENV=production\n');
        const environment = { ...process.env };
        delete environment.NODE_ENV;

        const readConfiguration = (env) =>
            JSON.parse(
                execFileSync(process.execPath, ['--input-type=module', '--eval', probe], {
                    cwd: directory,
                    env,
                    encoding: 'utf8',
                })
            );

        // CORS historically reads the process environment before modules load .env.
        assert.deepEqual(readConfiguration(environment), { allowsLocalOrigin: true, secureCookies: true });
        assert.deepEqual(readConfiguration({ ...environment, NODE_ENV: 'production' }), {
            allowsLocalOrigin: false,
            secureCookies: true,
        });
    } finally {
        await rm(directory, { recursive: true, force: true });
    }
});
