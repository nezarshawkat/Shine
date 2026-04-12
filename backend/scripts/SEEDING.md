# Seeding / Reset Guide

## Quick commands

From repository root:

```bash
npm run seed:reset
npm run seed:check
```

From backend folder:

```bash
npm run seed:reset
npm run seed:check
```

- `seed:reset` runs `backend/scripts/reset_and_seed_from_json.js` (destructive reset + import).
- `seed:check` prints live DB counts (`users`, `communities`, `posts`, `comments`, `articles`).

## If you see old posts in UI after seeding

Most common reason: your frontend points to a different backend/database.

In this repo, default frontend env uses a hosted backend URL:

```env
VITE_BACKEND_URL="https://shine-a77g.onrender.com"
```

So if you seed local DB, but frontend still points to Render, UI will still show old hosted data.

### Fix

1. Set frontend to your local backend, for example:

```env
VITE_BACKEND_URL="http://localhost:5000"
```

2. Restart frontend dev server.
3. Run `npm run seed:check` to confirm local DB counts changed.

## If you see `Missing script: seed:reset`

1. Confirm you are on the branch/commit that contains seeding changes.
2. Verify `backend/package.json` includes:

```json
"seed:reset": "node scripts/reset_and_seed_from_json.js"
```

3. Run `npm run` inside `backend/` to list scripts.
4. If still missing, pull latest changes and reinstall dependencies:

```bash
git pull
npm install
cd backend && npm install
```

## Requirements

- `backend/.env` must include a valid `DATABASE_URL`.
- Reset operation **deletes all current public table data** before inserting seed rows.
