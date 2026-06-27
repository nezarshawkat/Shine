const bcrypt = require("bcrypt");
const local = require("../db/local");

const DEFAULT_ADMIN_EMAIL = "nezarrrshawkattt@gmail.com";
const DEFAULT_ADMIN_PASSWORD_HASH = "$2b$12$NZgNaaQkxuhlhVq.QsczYOnYM3OZbPutrQJEuR2.QWKmHEpXCkIdy";
const localOnly =
  process.env.DATABASE_MODE === "local" ||
  process.env.LOCAL_ONLY_DB === "true" ||
  !process.env.DATABASE_URL;

async function ensureDefaultAdmin(prisma = null) {
  const permissions = {
    canManageUsers: true,
    canManageContent: true,
    canViewAnalytics: true,
  };

  if (localOnly) {
    const db = local.getDb();
    const now = local.nowIso();
    db.prepare(`
      INSERT INTO Admin (id, email, password, role, permissionsJson, isActive, createdAt, updatedAt)
      VALUES (?, ?, ?, 'SUPER_ADMIN', ?, 1, ?, ?)
      ON CONFLICT(email) DO UPDATE SET
        password = excluded.password,
        role = 'SUPER_ADMIN',
        permissionsJson = excluded.permissionsJson,
        isActive = 1,
        updatedAt = excluded.updatedAt
    `).run(local.newId(), DEFAULT_ADMIN_EMAIL, DEFAULT_ADMIN_PASSWORD_HASH, JSON.stringify(permissions), now, now);
    return;
  }

  if (!prisma) return;
  await prisma.admin.upsert({
    where: { email: DEFAULT_ADMIN_EMAIL },
    update: { password: DEFAULT_ADMIN_PASSWORD_HASH, role: "SUPER_ADMIN", permissions, isActive: true },
    create: {
      email: DEFAULT_ADMIN_EMAIL,
      password: DEFAULT_ADMIN_PASSWORD_HASH,
      role: "SUPER_ADMIN",
      permissions,
    },
  });
}

async function verifyLocalAdmin(email, password) {
  const db = local.getDb();
  const admin = db.prepare("SELECT * FROM Admin WHERE lower(email) = lower(?) AND isActive = 1").get(email);
  if (!admin || !(await bcrypt.compare(password, admin.password))) return null;
  return {
    id: admin.id,
    email: admin.email,
    role: admin.role,
    permissions: JSON.parse(admin.permissionsJson || "{}"),
  };
}

module.exports = { ensureDefaultAdmin, verifyLocalAdmin };
