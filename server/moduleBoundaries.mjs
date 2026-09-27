// Cross-module dependencies must use the target module's api.ts.
export const moduleDependencies = {
    applications: [],
    offers: ['applications'],
    interviews: ['applications', 'offers'],
    userPreferences: ['applications', 'interviews', 'offers'],
    authentication: ['userPreferences'],
};
