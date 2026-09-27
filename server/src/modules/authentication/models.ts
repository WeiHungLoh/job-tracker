import type { ErrorResponse, MessageResponse } from '../../shared/http/models.js';

export type AuthenticatedUser = {
    id: number;
    email: string;
    sessionId: string;
};

export type AuthenticationSecrets = {
    accessTokenSecret: string;
    refreshTokenSecret: string;
};

export type AuthenticationTokens = {
    accessToken: string;
    refreshToken: string;
};

export type User = {
    user_id: number;
    email: string;
    hashed_password: string;
};

export type AuthenticationSession = {
    session_id: string;
    user_id: number;
    refresh_token_hash: string;
    created_at: Date;
    expires_at: Date;
};

export type CredentialsRequest = {
    email: string;
    password: string;
};

export type AuthenticationResponse = MessageResponse | ErrorResponse;

export type RefreshAuthenticationResponse = AuthenticationResponse;

export type SignUpResponse = string | ErrorResponse;
