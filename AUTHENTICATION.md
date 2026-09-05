# Authentication and Data Flow

## Current state: no application authentication

LAST CALL is a static browser game. It has no account system, login screen, identity provider, backend, database, protected API, multiplayer service, commerce integration, session cookie, authorization header, password, API key, access token, refresh token, or token exchange.

The GitHub credential used by a developer or connector to read this repository is outside the game. It is not present in the source and is not part of the player's request flow.

## Components

| Component | Responsibility | Trusted for security? |
| --- | --- | --- |
| Static web host | Returns HTML, CSS, and JavaScript | Only for delivering the build over HTTPS |
| `index.html` | Defines the interface | No |
| `game.js` | Runs interaction state and local statistics | No; players control their browser |
| `game-core.js` | Resolves deck, recipes, AI, and match results | No; it is client code |
| Browser `localStorage` | Stores non-sensitive aggregate progress | No; editable and clearable by the player |
| Node tests/simulation | Development-only verification | Not part of runtime |

## Current request flow

```text
Browser ── GET /index.html ──────▶ Static host
Browser ── GET /styles.css ──────▶ Static host
Browser ── GET /game-core.js ────▶ Static host
Browser ── GET /game.js ─────────▶ Static host

Player action
   │
   ▼
game.js controller ──▶ game-core.js rules ──▶ DOM update
   │
   └───────────────▶ localStorage statistics
```

There are no runtime `fetch`, XMLHttpRequest, WebSocket, EventSource, or form-submission calls. The redesign also removes the original Google Fonts dependency, so the repository declares no third-party runtime request.

## Credentials and tokens

The current application:

- accepts no credential;
- issues no identity or session;
- stores no credential or token;
- transmits no credential or token;
- performs no refresh or revocation;
- has no logout because there is no login.

The only persisted object is `last-call-meta-v2` in browser `localStorage`. It contains aggregate nights, wins, draws, discovered recipe names, and the sound preference. It is not secret, authoritative, or portable. Clearing site data erases it; editing it in developer tools changes it. It must never gate purchases, achievements with value, competitive rankings, or paid content.

Because this is a public browser repository, any value bundled into HTML or JavaScript is visible to every player. Client code may contain public application identifiers. Provider secrets, signing keys, publisher API keys, database credentials, webhook secrets, and service-account tokens must never be committed or shipped to the browser.

## Security implications

Traditional authenticated-web findings such as CSRF, session fixation, token refresh, and logout revocation do not currently apply: there is no authenticated state or state-changing server request.

The important limitation is the absent trust boundary. A player can change health, wins, discoveries, AI decisions, or any future client-only entitlement. This is acceptable for an offline prototype; it is not acceptable for authoritative commerce, cloud saves, leaderboards, cross-device achievements, moderation, or multiplayer.

Hosting should still provide baseline web defenses:

- HTTPS and HSTS;
- a Content Security Policy that allows scripts and styles only from the same origin;
- `X-Content-Type-Options: nosniff`;
- a restrictive `Referrer-Policy`;
- frame restrictions using CSP `frame-ancestors`;
- cache-busted immutable assets plus a no-cache entry document.

Inline event handlers and third-party fonts are absent, making a strict CSP practical.

## Recommended paid/online architecture

Do not retrofit authority into browser globals. Add a small backend-for-frontend when the first feature needs identity:

```text
Game client
   │  platform ticket or OAuth authorization code + PKCE
   ▼
Authentication endpoint
   │  validates directly with platform/identity provider
   ▼
Short-lived game session
   │
   ├──▶ entitlement service ──▶ platform/server commerce API
   ├──▶ versioned cloud-save service
   └──▶ leaderboard/achievement service
```

### Session rules

- Prefer a platform-native session ticket for a packaged Steam build. Validate it server-side before creating a game session.
- For browser OAuth, use Authorization Code with PKCE, exact redirect URIs, and `state`/nonce validation.
- Send game sessions over HTTPS only. For a browser build, prefer `Secure`, `HttpOnly`, `SameSite` cookies so JavaScript cannot read the session token. Add CSRF protection to state-changing requests when cookie authentication is used.
- Keep access sessions short-lived and rotate refresh credentials. Store refresh tokens only in protected server storage or appropriately protected native platform storage—not `localStorage`.
- Revoke sessions on logout, account unlink, compromise, password reset where applicable, and platform entitlement changes.
- Rate-limit authentication, recovery, save, and leaderboard endpoints. Log security events without recording raw tokens.
- Store only hashed opaque session tokens where possible. Encrypt sensitive account links at rest and separate identity data from gameplay analytics.

### Entitlements and saves

- Ask the platform from the server whether the player owns the product or downloadable content. Never trust a client boolean such as `ownsDlc: true`.
- Sign and version cloud-save records, resolve conflicts explicitly, and retain a recoverable prior version.
- Treat leaderboard submissions as claims. Recompute or validate authoritative run events server-side; a final score alone is forgeable.
- Support guest play, then migrate local progress to an account only after an explicit link and conflict-resolution step.
- Document retention, export, deletion, parental/age handling, and account recovery before collecting personal data.

## Secret-management checklist

Future server secrets belong in a managed secret store supplied at deployment time. Use separate development, staging, and production values; scope each credential to the minimum API and environment; rotate it; audit access; and scan commits and build artifacts. If a secret is ever committed, revoke it first—deleting it from the latest commit is not sufficient because Git history and clones retain it.

## Decision trigger

Keep the current no-account model while all progress is personal and offline. Introduce authentication only when a concrete feature requires portable identity or server authority. The first likely triggers are platform entitlements and cloud saves; build those around a backend contract before adding social or competitive systems.
