# Backend architecture

Job Tracker runs as one Express application with one PostgreSQL database. Its code is organized into five business modules; they are not separately deployed services.

| Module            | Responsibilities                                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `authentication`  | Accounts, password verification, access/refresh tokens, persisted refresh sessions, authentication cookies and sign-in/sign-up limits |
| `applications`    | Application lifecycle, duplicates, status changes, follow-ups, pins, archiving and application summaries                              |
| `interviews`      | Scheduling, conflict warnings, interview follow-ups, notes, pins and archiving                                                        |
| `offers`          | Offer evaluations, counteroffer plans, comparison data and offer-deadline warnings                                                    |
| `userPreferences` | Saved filters, views, sorting and Needs Attention settings                                                                            |

Archiving belongs to the module that owns the record. It is not a separate business module. Offers include both evaluations and counteroffer plans because their rules and updates are closely related.

## File responsibilities

Module folders are flat. Each contains only the files its behavior needs:

-   `routes.ts` validates and normalizes HTTP input, invokes the relevant operation and sends the existing response.
-   `archivedRoutes.ts`, where present, handles that module's archived-resource endpoints.
-   `service.ts` coordinates multi-step business workflows: duplicate checks before application creation, scheduling warnings before interview creation, authentication sessions, and offer-save rules and transactions. Simple reads and mutations can call their repository directly; preferences do not need a pass-through service.
-   `repository.ts` and focused `*Repository.ts` files contain parameterized SQL and database result mapping. Existing atomic archive/status operations remain together in their repositories.
-   `models.ts` contains named domain, input, result and response types. Types specific to a single query can remain beside it.
-   `validation.ts` and `config.ts` contain the module's validators and constants. Small specialized files such as authentication token and cookie handling stay within their module.
-   `api.ts` exposes only the functions, types and constants needed outside the module. Other modules must not import its routes, services or repositories directly.

`api.ts` is an internal TypeScript interface: callers import functions and call them in the same process. It does not make an HTTP request. For example, the interview service imports `getInterviewOfferDeadlineWarnings` from `offers/api.ts` before inserting an interview.

`app.ts` is the composition root: it mounts module routers and shared HTTP middleware. `server.ts` connects to the database, runs `schema.ts`, cleans up expired authentication sessions and starts listening. The shared folder contains the database pool, generic HTTP parsing/responses and application-wide middleware/configuration.

## Dependency boundaries

The permitted cross-module dependencies, including types and constants, are:

```text
authentication  -> userPreferences
userPreferences -> applications, interviews, offers
interviews      -> applications, offers
offers          -> applications
applications    -> shared infrastructure only
```

Every module can use shared infrastructure. Shared code cannot import business modules. Application startup imports public APIs, with `app.ts` additionally allowed to mount routers. Authentication initializes preferences through their public API using the same transaction client as account creation.

`moduleBoundaries.mjs` declares the allowed dependencies. ESLint rejects direct imports of another module's internals and prohibited dependency directions. The architecture test also resolves source imports, checks startup/shared boundaries and rejects circular dependencies, including type-only cycles.

## Database coupling

These are enforced source-code boundaries, not isolated database schemas. Some existing SQL deliberately spans domains:

-   Application archive/restore operations update related interviews atomically. Application status checks and summaries read interview and offer data.
-   Interview queries join applications for ownership, eligibility and display fields; insertion retains its application-row lock and single SQL statement.
-   Offer queries join and lock applications with evaluations to validate and save against consistent state.
-   Foreign keys preserve ownership relationships and cascading deletion across related tables.

These operations retain their existing queries and transaction ordering. Splitting them into independent calls would change concurrency behavior. Future changes to these shared relationships require reviewing both affected modules. This design does not claim independent module databases or effortless extraction into microservices.

## Local development with Docker

Configure `server/.env` with your existing Neon `PG_URI`, `ACCESS_TOKEN_SECRET` and a different `REFRESH_TOKEN_SECRET`. For backend-only development, run from `server/`:

```sh
docker compose up --build   # First build and start
docker compose up           # Later starts
docker compose down         # Stop
```

Backend: http://localhost:5005

Compose loads `.env`, uses the existing hosted Neon database and runs `npm run dev` (`tsx watch ./src/server.ts`). Source bind mounts let normal TypeScript edits restart Express automatically without restarting Compose. A separate volume preserves container `node_modules`.

Use [root Compose](../README.md#local-development-with-docker) to run both services, or for dependency rebuild and environment-change instructions. Backend production deployment remains Render; the existing Dockerfile is unchanged.

## API documentation

Swagger UI documents all 51 endpoints and runs with the same Express backend, locally and on Render.

Open http://localhost:5173/api-docs/ locally, or https://jobtracker.weihungloh.com/api-docs/ after deployment. Both cookies and Bearer tokens work through the existing `/api` proxy. Run the frontend and backend together locally with root Compose.

For cookie authentication, sign in normally or execute `POST /authentication/sessions` in the frontend docs. The browser sends the HttpOnly cookies; only Bearer tokens appear in the Authorize dialog. Direct backend requests do not match the cookies' `/api` path.

For Bearer authentication, click **Authorize** and paste an access token without the `Bearer` prefix. The header takes precedence over the access cookie; an invalid header returns `401`. Tokens entered in Swagger are not persisted across reloads. Refresh and sign-out continue to use cookies; Swagger does not automatically refresh expired tokens or retry requests.

The OpenAPI document is at `/api-docs/openapi.json`, and also at `/openapi.json` on the backend. Direct Render docs use unprefixed endpoints and support Bearer access tokens; use the frontend docs for cookie authentication. Deploy the backend on Render and the frontend on Netlify to publish documentation changes.

## Verification

```sh
npm test
npm run typecheck
npm run format:check
```

`npm test` runs lint, the TypeScript build, existing query/HTTP regression tests and module-boundary checks. HTTP tests need permission to bind localhost. Query tests use mocked database clients; passing them does not replace testing against a real PostgreSQL deployment.
