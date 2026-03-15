# Admin API Module

This module isolates privileged endpoints under `/api/admin/*`.

## Security model
- Dedicated `Admin` table with hashed passwords.
- JWT tokens include `scope: "admin"` and are required by `adminAuth` middleware.
- All privileged write operations emit `AdminAuditLog` entries.

## Endpoints
- `POST /api/admin/login`
- `POST /api/admin/seed` (protected by `x-admin-setup-key`)
- `GET /api/admin/dashboard`
- `GET /api/admin/analytics`
- `GET/PUT/PATCH/DELETE /api/admin/users/*`
- `GET/PUT/DELETE /api/admin/posts|events|communities/*`
- `GET /api/admin/reports`
- `PATCH /api/admin/reports/:id/resolve`
