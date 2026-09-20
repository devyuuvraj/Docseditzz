# 🚀 DOCSEDITZ — Deployment Guide

## Open the app (production)

**Bookmark this:** [https://docseditzz.vercel.app/dashboard](https://docseditzz.vercel.app/dashboard)

No login — the app creates a private guest workspace in your browser automatically.

| Service | URL |
|--------|-----|
| **App (use in browser)** | `https://docseditzz.vercel.app/dashboard` |
| **API (Railway)** | `https://docseditzz-production.up.railway.app/api/v1` |

After every push to `main`, **redeploy Railway** ([your service](https://railway.com/project/af6ed9e5-e15e-46b5-a9c8-652b17c4493a/service/fd29bcc3-05a4-4682-a794-769dd9186b70) → **Deployments** → **Redeploy**).  
When the backend is current, health includes `"apiVersion": "2026.09-guest"` and `POST /api/v1/auth/guest` works.

Vercel redeploys automatically from `main` (root directory **`client`**, env `VITE_API_URL` = Railway API above).

---

## 0. Third-party services (one-time setup)

### MongoDB Atlas
1. Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. **Database Access** → create a user with password auth.
3. **Network Access** → allow `0.0.0.0/0` (or your server's IP).
4. Copy the connection string into `MONGODB_URI`, e.g.
   `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/docseditz?retryWrites=true&w=majority`.

### Cloudinary
1. Sign up at [cloudinary.com](https://cloudinary.com) → Dashboard.
2. Copy **Cloud name**, **API Key**, **API Secret** into `CLOUDINARY_*`.

### Google OAuth
1. [console.cloud.google.com](https://console.cloud.google.com) → APIs & Services → Credentials.
2. **Create Credentials → OAuth client ID → Web application**.
3. Authorized JavaScript origins: `http://localhost:5173`, plus your production domain.
4. Copy the Client ID into both `GOOGLE_CLIENT_ID` (server) and `VITE_GOOGLE_CLIENT_ID` (client).

### SMTP (OTP + password reset emails)
Any SMTP provider works: Gmail (app password), Resend, SendGrid, Mailtrap (testing).
Fill `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `EMAIL_FROM`.

### OpenAI
Create a key at [platform.openai.com](https://platform.openai.com/api-keys) → `OPENAI_API_KEY`.
`gpt-4o-mini` (default) is fast and cheap; change with `OPENAI_MODEL`.

---

## Option A — Single VPS with Docker (recommended)

Works on any Ubuntu/Debian VPS (Hetzner, DigitalOcean, EC2…).

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh

# 2. Clone and configure
git clone <your-repo> docseditz && cd docseditz
cp server/.env.example server/.env
nano server/.env        # fill in production values, set NODE_ENV=production

# 3. Launch
VITE_GOOGLE_CLIENT_ID=<your-client-id> docker compose up -d --build

# 4. Seed an admin
docker compose exec api npm run seed:admin -- admin@yourdomain.com StrongPass123 "Admin"
```

Put a reverse proxy with TLS in front (Caddy is the easiest):

```bash
sudo apt install caddy
# /etc/caddy/Caddyfile
#   yourdomain.com {
#       reverse_proxy localhost:8080
#   }
sudo systemctl reload caddy
```

Then set in `server/.env`: `CLIENT_URL=https://yourdomain.com` and restart:
`docker compose up -d`.

> The API container bundles **LibreOffice**, so Office→PDF conversion works out of the box.

---

## Option B — Managed platforms (Render + Vercel)

### Backend on Render
1. New → **Web Service** → connect your repo, root directory `server`.
2. Environment: **Docker** (uses `server/Dockerfile`, which includes LibreOffice).
3. Add all variables from `server/.env.example` (set `NODE_ENV=production`,
   `CLIENT_URL=https://<your-vercel-domain>`).
4. Deploy → note the URL, e.g. `https://docseditz-api.onrender.com`.

### Frontend on Vercel (with Railway API)

**Backend URL (already deployed):** `https://docseditzz-production.up.railway.app`

1. [vercel.com/new](https://vercel.com/new) → Import **`devyuuvraj/Docseditzz`**.
2. **Root Directory:** `client` · Framework: **Vite** (auto-detected).
3. **Environment variables** (Production):
   - `VITE_API_URL` = `https://docseditzz-production.up.railway.app/api/v1`
   - `VITE_GOOGLE_CLIENT_ID` = same as Railway `GOOGLE_CLIENT_ID`
4. Deploy → copy the production URL, e.g. `https://docseditzz.vercel.app`.
5. On **Railway** (API service), set:
   - `CLIENT_URL` = `https://docseditzz.vercel.app` (your exact Vercel URL, no trailing slash)
   - `CORS_ORIGINS` = same URL (optional if using latest server — Vercel origins are auto-allowed)
6. Redeploy the Railway service after every backend change.
7. On **Vercel**, confirm `VITE_API_URL` = `https://docseditzz-production.up.railway.app/api/v1` (not a custom domain unless DNS is live).

Open the **Vercel URL** in a browser — that is the public Docseditzz app. The Railway URL is API-only unless you use the root Dockerfile full-stack image.

> Cross-site cookies: the refresh cookie is issued with `SameSite=None; Secure` in
> production, which works across Vercel ↔ Render domains. Make sure `CLIENT_URL`
> on the backend exactly matches your frontend origin (no trailing slash).

### Option C — Railway (one URL for app + API)

The repo root **`Dockerfile`** builds the React client and Express API into a
single container. Railway serves the site at `/` and the API at `/api/v1/*`.

1. In [Railway](https://railway.com) → your project → **Docseditzz** service.
2. **Settings → Source**: connect `https://github.com/devyuuvraj/Docseditzz`.
3. **Settings → Build**:
   - **Root directory**: leave empty (repository root, not `server/`).
   - **Builder**: Dockerfile (`Dockerfile` at repo root; `railway.toml` is included).
4. **Variables** (required):
   - `NODE_ENV=production`
   - `DATABASE_URL` — Neon/Postgres connection string (Prisma)
   - `CLIENT_URL=https://docseditzz-production.up.railway.app` (your public Railway URL, no trailing slash)
   - `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` — long random strings
   - `GEMINI_API_KEY` (or your AI key as configured in `server/src/config`)
   - `SMTP_*`, `EMAIL_FROM` for OTP email
   - `GOOGLE_CLIENT_ID` and build arg / var `VITE_GOOGLE_CLIENT_ID` for Google sign-in
   - `CLOUDINARY_*` for file storage in production
5. **Networking → Public domain**: generate or attach `docseditzz-production.up.railway.app`.
6. Redeploy. Verify:
   - `https://<your-domain>/` → landing page
   - `https://<your-domain>/api/v1/health` → JSON `{ "status": "ok" }`

If you only deploy `server/` (API-only), the root URL returns JSON/API 404 — use
`/api/v1/health` to test, or switch to the root Dockerfile as above.

### Notes for Fly.io
Deploy `server/` as Docker or use the root Dockerfile. Fly: `fly launch` at repo root.

---

## Production checklist

- [ ] Strong, unique `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` (32+ random chars)
- [ ] `NODE_ENV=production`
- [ ] `CLIENT_URL` set to the exact frontend origin (CORS + cookies + emails depend on it)
- [ ] Atlas network access restricted to your server IPs
- [ ] HTTPS everywhere (required for Secure cookies and Google OAuth)
- [ ] Google OAuth origins updated with the production domain
- [ ] Admin account seeded (`npm run seed:admin`)
- [ ] Cloudinary usage alerts configured
- [ ] OpenAI usage limits set in the OpenAI dashboard
- [ ] Health endpoint monitored: `GET /api/v1/health`

## Scaling notes

- The API is stateless (JWT + Cloudinary + Atlas) — scale horizontally behind a load balancer.
  The only local state is temporary chunk-upload files; use sticky sessions or a shared
  volume if you run multiple replicas.
- OCR and `compress: strong/extreme` are CPU-heavy — consider a worker queue (BullMQ + Redis)
  if they become hot paths.
- Add a CDN (Cloudflare) in front of the frontend for global latency.
