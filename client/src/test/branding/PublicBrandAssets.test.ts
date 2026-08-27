import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const clientRoot = process.cwd();
const productionOrigin = 'https://jobtracker.weihungloh.com';

const readIndexDocument = () => {
    const index = readFileSync(resolve(clientRoot, 'index.html'), 'utf8');

    return new DOMParser().parseFromString(index, 'text/html');
};

const getPngDimensions = (publicPath: string) => {
    const assetPath = resolve(clientRoot, 'public', publicPath.replace(/^\//, ''));
    const asset = readFileSync(assetPath);
    const pngSignature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

    expect(asset.subarray(0, pngSignature.length)).toEqual(pngSignature);

    return {
        width: asset.readUInt32BE(16),
        height: asset.readUInt32BE(20),
    };
};

describe('public Job Tracker brand assets', () => {
    test('serves the declared 1200 by 630 image to Open Graph and Twitter consumers', () => {
        const document = readIndexDocument();
        const openGraphImage = document.querySelector<HTMLMetaElement>('meta[property="og:image"]')?.content;
        const twitterImage = document.querySelector<HTMLMetaElement>('meta[name="twitter:image"]')?.content;
        const socialImagePath = '/job-tracker-social-preview.png';

        expect(openGraphImage).toBe(`${productionOrigin}${socialImagePath}`);
        expect(twitterImage).toBe(openGraphImage);
        expect(getPngDimensions(socialImagePath)).toEqual({ width: 1200, height: 630 });
    });

    test('publishes a scalable browser icon and a correctly sized home-screen icon', () => {
        const document = readIndexDocument();
        const browserIcon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
        const touchIcon = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');

        expect(browserIcon?.type).toBe('image/svg+xml');
        expect(browserIcon?.getAttribute('href')).toBe('/favicon.svg');
        expect(existsSync(resolve(clientRoot, 'public/favicon.svg'))).toBe(true);

        expect(touchIcon?.sizes.value).toBe('180x180');
        expect(touchIcon?.getAttribute('href')).toBe('/apple-touch-icon.png');
        expect(getPngDimensions('/apple-touch-icon.png')).toEqual({ width: 180, height: 180 });
    });
});
