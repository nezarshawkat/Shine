# Shine Local / Hybrid DB Setup

Shine can now run in two backend database modes.

## Mode 1: Fully Local SQLite

Use this when you do not want Neon at all.

- Render backend owns the SQLite database file.
- Vercel remains frontend-only.
- No Neon sync runs.
- No `DATABASE_URL` is required.

Set:

```env
DATABASE_MODE="local"
DATABASE_URL=""
LOCAL_DATABASE_PATH="./data/shine-local.db"
LOCAL_UPLOAD_DIR="./public/uploads"
PUBLIC_BACKEND_URL="http://localhost:5000"
```

Important for Render: SQLite is just a file. For production, attach a Render persistent disk and set `LOCAL_DATABASE_PATH` to a path inside that disk, for example:

```env
LOCAL_DATABASE_PATH="/var/data/shine-local.db"
LOCAL_UPLOAD_DIR="/var/data/uploads"
PUBLIC_BACKEND_URL="https://your-render-service.onrender.com"
```

Without persistent storage, the SQLite file and local uploads can be lost when the service restarts, redeploys, or moves.

## Mode 2: Hybrid SQLite + Neon

Use this when Neon remains the shared cloud database.

- Neon Postgres is the shared source of truth.
- SQLite stores cached posts, comments, counts, likes, saves, shares, views, and a sync queue.
- `sync/syncEngine.js` sends queued local changes to Neon in the background.

Set:

```env
DATABASE_MODE="hybrid"
DATABASE_URL="your-neon-postgres-url"
LOCAL_DATABASE_PATH="./data/shine-local.db"
```

## Install on your device

Install these once:

1. Node.js LTS from https://nodejs.org
2. VS Code from https://code.visualstudio.com
3. Git from https://git-scm.com

Check in PowerShell:

```powershell
node -v
npm -v
git --version
```

Use Node 20 or newer. The SQLite native driver used by the backend requires modern Node.

## Setup in GitHub Codespaces or locally

From the project root:

```bash
cd backend
npm install
```

Important: use `npm install` after pulling this change so the native SQLite dependency is installed for your machine or Render build.

Create `backend/.env` from `backend/.env.example`:

```bash
cp .env.example .env
```

For fully local mode, use:

```env
DATABASE_MODE="local"
DATABASE_URL=""
LOCAL_DATABASE_PATH="./data/shine-local.db"
LOCAL_UPLOAD_DIR="./public/uploads"
PUBLIC_BACKEND_URL="http://localhost:5000"
```

Start the backend:

```bash
npm start
```

The backend creates the SQLite file automatically at:

```text
backend/data/shine-local.db
backend/public/uploads/
```

Do not commit the generated database or uploaded files. They are ignored by `.gitignore`.

## Render + Vercel setup

Vercel:

- Deploy only the frontend.
- Set the frontend API URL to your Render backend URL.

Render:

- Deploy the backend.
- Add environment variables:

```env
DATABASE_MODE=local
DATABASE_URL=
LOCAL_DATABASE_PATH=/var/data/shine-local.db
LOCAL_UPLOAD_DIR=/var/data/uploads
PUBLIC_BACKEND_URL=https://your-render-service.onrender.com
JWT_SECRET=your-long-secret
```

- Add a persistent disk mounted at `/var/data` for real production use.
- Keep Vercel pointing to the Render backend URL. Vercel does not own the SQLite file.
- Build command:

```bash
npm install
```

- Start command:

```bash
npm start
```

## Check hybrid status

Open:

```text
http://localhost:5000/health/db
```

You should see:

```json
{
  "database": "local-sqlite",
  "localDatabase": {
    "enabled": true,
    "ready": true
  }
}
```

## Manual sync

Only hybrid mode syncs to Neon. Fully local mode does not sync anywhere.

In hybrid mode, the server syncs automatically every 15 seconds. You can also run:

```bash
npm run hybrid:sync
```

## How it works

For posts, comments, and basic users:

1. Reads try SQLite first.
2. In local mode, SQLite is the only database.
3. In hybrid mode, an empty cache can fetch from Neon and then store a local copy.
4. In local mode, writes stay in SQLite.
5. In hybrid mode, writes are added to `SyncQueue` and sent to Neon.

Fully local mode removes Neon usage completely, but you must protect the SQLite file with persistent storage and backups.
