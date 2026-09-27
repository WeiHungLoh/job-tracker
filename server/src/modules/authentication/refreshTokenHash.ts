import crypto from 'node:crypto';

export const hashRefreshToken = (refreshToken: string): string => {
    return crypto.createHash('sha256').update(refreshToken).digest('hex');
};

export const refreshTokenHashesMatch = (receivedHash: string, storedHash: string): boolean => {
    if (!/^[0-9a-f]{64}$/i.test(receivedHash) || !/^[0-9a-f]{64}$/i.test(storedHash)) {
        return false;
    }

    const receivedBuffer = Buffer.from(receivedHash, 'hex');
    const storedBuffer = Buffer.from(storedHash, 'hex');
    return receivedBuffer.length === storedBuffer.length && crypto.timingSafeEqual(receivedBuffer, storedBuffer);
};
