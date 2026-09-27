import type { AuthenticatedUser } from '../modules/authentication/api.js';

declare global {
    namespace Express {
        interface Request {
            user: AuthenticatedUser;
        }
    }
}

export {};
