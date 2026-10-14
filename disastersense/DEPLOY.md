# Deploying DisasterSense

DisasterSense is a Next.js 15 app. It deploys cleanly to any Node 20+ host.
Two supported targets are configured in this repo: **Vercel** and **Render**.

> ⚠️ **Read the persistence note below before choosing a host.**
> The demo keeps all state in an in-memory singleton (`src/lib/db/store.ts`).
> That state is only shared within a **single long-running Node process**. On
> serverless hosts (Vercel) each request can hit a different instance, so you
> **must connect a KV store** (see Option B) or reports won't persist across
> requests. On Render the single long-lived instance keeps state in memory
> without any extra setup.

---

## Option A — Render (recommended for this demo)

Render runs the app as one long-lived Node web service, so the report →
pipeline → dashboard flow behaves exactly like it does locally.

### Deploy from the blueprint

1. Push this repo to GitHub (see "Publish to GitHub" below).
2. In the Render Dashboard: **New → Blueprint**.
3. Pick the repo. Render reads `render.yaml` and creates the `disastersense`
   web service:
   - **Build:** `npm ci --include=dev && npm run build`
   - **Start:** `npm start`
   - **Health check:** `/api/health`
4. Click **Apply**. When the first deploy finishes, open the service URL.

`NEXT_PUBLIC_SITE_URL` is optional on Render — the app automatically uses
Render's `RENDER_EXTERNAL_URL` for metadata links.

> The `free` plan spins the service down after ~15 minutes of inactivity and
> resets memory on wake. Use a paid instance (or add a database) for durable data.

### Run locally the same way Render does

```bash
npm ci --include=dev
npm run build
npm start
```

---

## Option B — Vercel

Vercel runs the app as **serverless functions**, so the in-memory store is
**not shared between requests**. To make the full demo work (reports persist and
appear in the Government / Rescue / Admin views) you **must connect a Vercel KV
store**, which injects `KV_REST_API_URL` + `KV_REST_API_TOKEN`. With those set,
`src/lib/db/persistence.ts` snapshots the dataset to Redis on every DB-backed
request so all instances share one state. Without a KV store, treat the Vercel
deployment as a UI preview.

### 1. Create and connect a KV store (required for persistence)

1. In your Vercel project: **Storage → Create → KV** (Upstash Redis). Accept the
   defaults and create it.
2. **Connect** the store to the `disastersense` project. This automatically adds
   `KV_REST_API_URL` and `KV_REST_API_TOKEN` to the project's environment
   variables (Production, Preview and Development).
3. **Redeploy** so the new env vars are picked up. After this, submitting a
   report on `/report` shows up across all role views.

> The KV REST API is called via `fetch`, so no new npm dependency is added and
> the production build is unchanged. Persistence fails open: if Redis is briefly
> unreachable the app keeps serving from the in-memory store instead of erroring.

### 2. Deploy by importing the repo (recommended)

1. Open <https://vercel.com/new> and import
   `nadirrrr070324/disastersense`.
2. Accept the defaults. Next.js is auto-detected. No environment variables are
   required to build; add the KV store (step 1) for durable data.

### Deploy with the CLI

```bash
npm i -g vercel
vercel login
vercel deploy --prod --yes
```

### Or connect the repo

Import the GitHub repo at <https://vercel.com/new>. Next.js is auto-detected;
no environment variables are required.

### Important: do not re-run `npm ci` in the build command

If a build fails with module-not-found errors like
`Can't resolve '@/components/ui'`, the build command is pruning devDependencies.
Vercel builds with `NODE_ENV=production`, and a bare `npm ci` then **omits
devDependencies** — removing `typescript`, which Next.js needs to read the
`@/*` path aliases from `tsconfig.json`.

Keep the build command as `npm run build` (Vercel installs dependencies,
including devDependencies, in its own install step first).

### Note on Vercel CLI 63+

CLI 63 introduces an experimental "services" mode that rewrites the project
into a `services` block in `vercel.json`. In a folder whose path contains
spaces/parentheses this can fail with an invalid project-name error, or the
project can be removed shortly after creation. If that happens, deploy with
Vercel CLI 50 (`npx vercel@50 deploy --prod --yes`) or import the repo in the
dashboard instead.

---

## Environment variables

The app runs with none set. On serverless hosts (Vercel) you **must** set the KV
pair below so reports persist across requests.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | host URL / `http://localhost:3000` | Absolute URL for metadata |
| `PIPELINE_STEP_DELAY_MS` | `650` | Delay between agent steps (`0` = instant) |
| `SIMULATION_REPORT_GAP_MS` | `400` | Gap between generated simulation reports |
| `KV_REST_API_URL` | — | Vercel KV / Upstash REST URL. **Required on Vercel** for persistence |
| `KV_REST_API_TOKEN` | — | Vercel KV / Upstash token. **Required on Vercel** for persistence |

`UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` are accepted as aliases.
When the KV pair is present, `src/lib/db/persistence.ts` snapshots the dataset to
Redis on every DB-backed request; when absent (local dev, tests, a single Render
instance) persistence is a no-op and the app behaves as before.

On Vercel the app falls back to `VERCEL_URL`; on Render to `RENDER_EXTERNAL_URL`.

---

## Making the deployment fully persistent (optional)

To keep data across restarts and across serverless instances, replace the
in-memory store behind `src/lib/db/repository.ts` with a real database. A
reference PostgreSQL schema is provided in [`sql/schema.sql`](sql/schema.sql):

1. Provision PostgreSQL (Render Postgres, Neon, Supabase, Vercel Postgres, …).
2. Add a driver (e.g. `pg` or an ORM) and implement the repository methods.
3. Set `DATABASE_URL` on the host.
4. Run `psql "$DATABASE_URL" -f sql/schema.sql`.

---

## Local development (Windows / OneDrive warning)

If the dev server crashes with:

```
Error: EINVAL: invalid argument, readlink '...\.next\...'
```

the project is inside a OneDrive-synced folder and `.next` has been turned into
cloud placeholder files. Fix it by deleting the cache and restarting:

```powershell
Remove-Item -Recurse -Force .next
npm run dev
```

To stop it recurring, keep the cache outside OneDrive. Redirect `.next` to a
folder that OneDrive does not sync:

```powershell
Remove-Item -Recurse -Force .next
New-Item -ItemType Directory -Force "$env:LOCALAPPDATA\disastersense-next" | Out-Null
New-Item -ItemType Junction -Path .next -Target "$env:LOCALAPPDATA\disastersense-next"
```

`.next` is already git-ignored, so the junction is never committed or uploaded.
(Alternatively, exclude the project folder from OneDrive sync.)

---

## Verify a deployment

```bash
curl https://<your-host>/api/health      # {"status":"ok",...}
curl -I https://<your-host>/             # 200 + security headers
```
