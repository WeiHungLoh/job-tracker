import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const readClientFile = (path: string): string => {
    return readFileSync(resolve(process.cwd(), path), 'utf8');
};

describe('Netlify production configuration', () => {
    test('uses valid all-route security-header syntax with a strict script policy', () => {
        const headers = readClientFile('public/_headers');
        const lines = headers.trimEnd().split('\n');

        expect(lines[0]).toBe('/*');
        expect(lines.slice(1).every((line) => /^ {2}[A-Za-z-]+: .+/.test(line))).toBe(true);
        expect(headers).toContain('X-Content-Type-Options: nosniff');
        expect(headers).toContain('X-Frame-Options: DENY');
        expect(headers).toContain("script-src 'self'");
        expect(headers).not.toMatch(/script-src [^;]*'unsafe-inline'/);
        expect(headers).toContain("frame-ancestors 'none'");
        expect(headers).toContain("connect-src 'self' https://job-tracker-300j.onrender.com");
        expect(headers).not.toContain('interest-cohort');
        expect(headers).not.toMatch(/Strict-Transport-Security:.*preload/);
    });

    test('loads the theme bootstrap from the same origin without an inline script', () => {
        const index = readClientFile('index.html');

        expect(index).toContain('<script src="/theme-init.js"></script>');
        expect(index).not.toMatch(/<script(?![^>]*\bsrc=)[^>]*>/);
        expect(index).not.toContain('/manifest.json');
        const themeInit = readClientFile('public/theme-init.js');
        expect(themeInit).toContain("localStorage.getItem('theme')");
        expect(themeInit).toContain("window.matchMedia('(prefers-color-scheme: dark)')");
    });

    test('keeps the API and documentation proxies before the SPA fallback', () => {
        const redirects = readClientFile('public/_redirects')
            .trim()
            .split('\n')
            .map((line) => line.trim());

        expect(redirects).toEqual([
            '/api/* https://job-tracker-300j.onrender.com/:splat 200',
            '/api-docs /api-docs/ 301',
            '/api-docs/* https://job-tracker-300j.onrender.com/api-docs/:splat 200',
            '/* /index.html 200',
        ]);
    });
});
