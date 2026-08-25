require("dotenv").config();

const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!email || !password) {
    throw new Error("SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD must be set.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      firstName: process.env.SEED_ADMIN_FIRST_NAME || "System",
      lastName: process.env.SEED_ADMIN_LAST_NAME || "Admin",
      email,
      passwordHash,
      phoneNumber: process.env.SEED_ADMIN_PHONE || "0000000000",
      address: process.env.SEED_ADMIN_ADDRESS || "N/A",
      zipCode: process.env.SEED_ADMIN_ZIP || "00000",
      roles: ["Administrator"],
      builtIn: true,
    },
  });

  console.log(`Seeded admin user: ${admin.email}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
