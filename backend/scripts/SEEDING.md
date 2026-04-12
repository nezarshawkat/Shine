# Seeding / Reset Guide

## Quick commands

From repository root:

```bash
npm run seed:reset
```

From backend folder:

```bash
npm run seed:reset
```

Both commands execute `backend/scripts/reset_and_seed_from_json.js`.

## If you see `Missing script: seed:reset`

1. Confirm you are on the branch/commit that contains seeding changes.
2. Re-open `backend/package.json` and ensure this exists:

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
- This operation **deletes all current public table data** before inserting seed rows.
