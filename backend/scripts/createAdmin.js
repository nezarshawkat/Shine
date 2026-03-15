require("dotenv").config();
const bcrypt = require("bcrypt");
const prisma = require("../prisma");

async function main() {
  const email = (process.env.ADMIN_SEED_EMAIL || "admin@shine.local").toLowerCase();
  const password = process.env.ADMIN_SEED_PASSWORD || "ChangeMe123!";

  const existing = await prisma.admin.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.admin.create({
    data: {
      email,
      password: passwordHash,
      role: "SUPER_ADMIN",
      permissions: ["users", "posts", "events", "communities", "reports", "analytics"],
    },
  });

  console.log(`Created admin ${email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
