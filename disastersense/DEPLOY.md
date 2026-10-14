# Deploying DisasterSense

DisasterSense is a Next.js 15 app. It deploys cleanly to any Node 20+ host.
Two supported targets are configured in this repo: **Vercel** and **Render**.

> ⚠️ **Read the persistence note below before choosing a host.**
> The demo keeps all state in memory (`src/lib/db/store.ts`). It is only shared
> within a **single long-running Node process**. That makes **Render the host
> where the full demo works**, and Vercel a UI-only preview unless you add a
> database.

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

Vercel deploys the UI to a global edge, but the app runs as **serverless
functions**, so the in-memory store is **not shared between requests** — a
report created in one request will not appear in the next. Treat this
deployment as a UI preview unless you plug in a database.

### Deploy by importing the repo (recommended)

1. Open <https://vercel.com/new> and import
   `nadirrrr070324/disastersense`.
2. Accept the defaults. Next.js is auto-detected and no environment variables
   are required.

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

All optional; the app runs with none set.

| Variable | Default | Purpose |
| --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | host URL / `http://localhost:3000` | Absolute URL for metadata |
| `PIPELINE_STEP_DELAY_MS` | `650` | Delay between agent steps (`0` = instant) |
| `SIMULATION_REPORT_GAP_MS` | `400` | Gap between generated simulation reports |

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
