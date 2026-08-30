export type CredentialsRequest = {
    email: string;
    password: string;
};

export type AuthenticationMessageResponse = {
    message: string;
};

export type SignInRequest = CredentialsRequest;
export type SignInResponse = AuthenticationMessageResponse;

export type SignUpRequest = CredentialsRequest;
export type SignUpResponse = string;

export type VerifyAuthenticationRequest = null;
export type VerifyAuthenticationResponse = AuthenticationMessageResponse;

export type RefreshAuthenticationRequest = null;
export type RefreshAuthenticationResponse = AuthenticationMessageResponse;

export type LogoutRequest = null;
export type LogoutResponse = null;

export type AuthenticationNavigationState = {
    fromLogout?: boolean;
    returnTo?: string;
};
