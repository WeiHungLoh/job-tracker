export type AuthenticatedUser = {
    id: number;
    email: string;
    sessionId: string;
};

export type AuthenticationSecrets = {
    accessTokenSecret: string;
    refreshTokenSecret: string;
};
