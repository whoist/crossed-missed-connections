# Crossed

A small, US-focused missed-connections web app. MIT application code; third-party licenses are in [NOTICE.md](NOTICE.md).

[Live app](https://crossed-missed-connections.vercel.app/) · [Source code](https://github.com/whoist/crossed-missed-connections) · [MIT license](LICENSE)

## Features

- Public browsing without ChatGPT, a responsive pastel interface, a US-centered OpenFreeMap map and a toggleable note-density heatmap.
- Email/password registration, verified email sign-in, Google sign-in, and Firebase password-reset emails. No recovery code, Resend account or purchased sender domain is required.
- Public notes with place/date/category and an optional 200-character recognition question. Reply writing is available before login; sending requires a verified adult account. Drafts survive the in-page sign-in flow, remain private in tab memory, and are not automatically sent after login. Closing/reloading the tab discards unsent drafts.
- Private conversations, saved notes, own-note removal, reports, blocking and account deletion.
- 500 clearly labeled fictional examples adapted from Bul Beni seed texts at 232 real mapped venues across ten US metro areas: 302 cafe notes, 150 campus notes and 48 other settings. No fake accounts or activity are inserted into the database. Examples cannot receive replies; hide them in Filters. Source-to-adaptation records and editorial rules are in docs/demo-adaptations.json and docs/DEMO-EDITORIAL.md. No real user submissions were transferred.
- Open source: [GitHub repository](https://github.com/whoist/crossed-missed-connections), with a downloadable source archive at `/source`.

## Architecture

Standard Next.js + React + TypeScript on Vercel, Firebase Authentication, Firestore Standard. Firestore clients are denied direct access; server routes use the Firebase Admin SDK and enforce ownership and conversation membership. Authentication and MapLibre are loaded separately. Fonts are local. No video/photo storage or third-party analytics.

Crossed is separate from Bul Beni. No Bul Beni domain, code, users, credentials or database is reused. The historical Sites/Cloudflare files are retained only as migration reference; this public repository starts from the current Next.js application snapshot. Current API routes require Firebase and do not run on the old Sites Worker.

## Local setup

Use Node 24 LTS, npm and Java 17+ for Firebase emulators (firebase-tools 14; newer tools may require Java 21).

```sh
npm ci
npx firebase-tools@14.22.0 emulators:start --only auth,firestore --project demo-crossed
```

In another terminal:

```sh
FIREBASE_PROJECT_ID=demo-crossed \
FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099 \
FIRESTORE_EMULATOR_HOST=127.0.0.1:8085 \
FIREBASE_WEB_API_KEY=fake \
FIREBASE_WEB_APP_ID=local-crossed \
npm run dev -- --hostname 127.0.0.1 --port 3181
```

The browser connects to emulators only on loopback hosts. Hosted Vercel execution rejects emulator configuration. No production key is needed for local work. Firebase emulator email links appear in its terminal; no real email is sent.

## Checks

```sh
npm run test
npm run typecheck
npm run lint
npm run build
# Start the built app with the same emulator environment and port 3181:
npm start -- --hostname 127.0.0.1 --port 3181
node tests/api.integration.mjs
```

Do not run the development and built servers together or rebuild a running built server. The integration runner is LOCAL ONLY, creates synthetic identities, verifies email/password reset links against the emulator, tests authorization/privacy/ownership and removes its fixtures. Never run it against hosted data.

## Firebase and Vercel deployment

1. Create a Firebase Spark project and a web app. Enable Email/Password and Google sign-in, set the public app name/support email, and authorize the exact Vercel production hostname.
2. Create one Firestore **Standard** database in a US region, in production mode. Apply `firestore.rules` (deny all client access) and `firestore.indexes.json`. Wait for required indexes before enabling production inbox/deletion.
3. Configure these Vercel production environment variables:

| Variable | Purpose |
|---|---|
| `FIREBASE_PROJECT_ID` | Project ID |
| `FIREBASE_WEB_API_KEY` | Public Firebase web API key |
| `FIREBASE_WEB_APP_ID` | Public web app ID |
| `FIREBASE_AUTH_DOMAIN` | Firebase-provided auth domain |
| `FIREBASE_SERVICE_ACCOUNT` | **Secret** JSON service-account credential, server only |
| `APP_ORIGIN` | Exact HTTPS production origin for request validation |
| `PHOTON_URL` | Optional licensed/self-hosted Photon endpoint |

4. Deploy with Vercel's Next.js framework. `vercel.json` sets the framework and US function region. Server keys must not use `NEXT_PUBLIC_`, be committed, or be included in the source archive. The `/api/auth/config` response contains only the public client configuration.
5. Confirm anonymous browsing, Google login, verification/reset mail delivery and private messaging with real authorized test users before a public launch. Local emulators cannot prove inbox delivery or provider-specific browser behavior.

## Security

Firebase manages passwords, email action links and Google identity. Verified short-lived ID tokens are exchanged for five-day HttpOnly, Secure, SameSite=Lax `__Host-` session cookies. Server verification checks revocation; logout revokes Firebase sessions. Browser Firebase state uses memory persistence, not localStorage. Session creation requires a recent login and is rate-limited. Mutations require exact-origin JSON and enforce size limits. Public APIs omit email/UID fields. Account deletion requires a recent login and explicit confirmation, removes associated conversations and notes, then the Firebase identity. Clients cannot write Firestore directly.

Google first sign-in still asks for an alias and 18+ confirmation. A question is a conversational prompt, not automatic identity verification. Do not ask for sensitive identification in a public note. 18+ is self-attested; messages are access-controlled, not end-to-end encrypted.

## Map, email and hosting limits

OpenFreeMap and Photon derive from OSM but differ in updates and visible labels. Complete POI coverage is not promised. Users may refine a selected public location's name. No closed-provider scraping or paid fallback is used.

Search waits for three characters and one second of inactivity (or Enter), cancels stale responses, restricts US results, and uses a bounded 15-minute/200-entry warm-instance cache. App-owned safeguards allow 30 uncached searches per IP-derived daily hash/hour, one global uncached request/second and 1,500 global uncached requests/day. These are **our safeguards**, not Photon quotas or an SLA. Zooming never calls the search API. Public Photon is a reasonable-use demo service, not unlimited production search.

Firebase Spark and the current Vercel plan have quotas. Spark email quotas include 1,000 verification emails/day and 150 password-reset emails/day; normal password login does not send an email. Firestore's free database includes 1 GiB storage, 50,000 reads/day, 20,000 writes/day and 20,000 deletes/day. No Firebase billing account, Blaze upgrade, SMS authentication or paid backups are enabled. Do not promise unlimited free hosting or availability after quotas are exhausted.

Sources: [Firebase Auth limits](https://firebase.google.com/docs/auth/limits), [Firestore quotas](https://firebase.google.com/docs/firestore/quotas), [OpenFreeMap](https://openfreemap.org/), [Photon usage](https://github.com/komoot/photon#usage).

## Operational boundaries

Reports are stored and hidden for the reporter. A staffed moderation/contact process, jurisdiction-specific terms/privacy review and capacity monitoring remain operator responsibilities. The feed reads the latest 250 records; threads list the latest 100 and show the latest 200 messages. Add pagination and capacity testing before a large launch. No notification email/push service is connected; Firebase emails cover account verification/reset only. Crossed is a working title, not a trademark-clearance claim.

## Source export

```sh
python3 scripts/export-source.py
```

The archive excludes environment files, service-account keys, local databases, dependencies and build output. Firebase configuration templates/rules/indexes are included. User content is not covered by the app's MIT license.
