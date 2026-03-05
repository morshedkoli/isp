import { PrismaClient, UserRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function parseArg(name: string): string | undefined {
  const index = process.argv.findIndex((arg) => arg === `--${name}`);
  if (index === -1) return undefined;
  return process.argv[index + 1];
}

function printUsage() {
  console.log('Usage: npm run user:create -- --email user@example.com --password secret123 --name "Full Name" --role EMPLOYEE');
  console.log('Roles: ADMIN, PARTNER, AGENT, EMPLOYEE');
}

async function main() {
  const email = parseArg('email');
  const password = parseArg('password');
  const name = parseArg('name') || 'User';
  const roleInput = (parseArg('role') || 'EMPLOYEE').toUpperCase();
  const phone = parseArg('phone');

  if (!email || !password) {
    printUsage();
    process.exit(1);
  }

  if (password.length < 6) {
    console.error('Password must be at least 6 characters.');
    process.exit(1);
  }

  const validRoles = Object.values(UserRole);
  if (!validRoles.includes(roleInput as UserRole)) {
    console.error(`Invalid role: ${roleInput}`);
    printUsage();
    process.exit(1);
  }

  const role = roleInput as UserRole;
  const passwordHash = await bcrypt.hash(password, 10);

  const existing = await prisma.user.findUnique({ where: { email } });

  if (existing) {
    await prisma.user.update({
      where: { email },
      data: {
        name,
        role,
        phone: phone || existing.phone,
        password: passwordHash,
        isActive: true,
      },
    });
    console.log(`Updated existing user: ${email}`);
  } else {
    await prisma.user.create({
      data: {
        email,
        name,
        role,
        phone,
        password: passwordHash,
        isActive: true,
      },
    });
    console.log(`Created new user: ${email}`);
  }

  console.log('Done. You can now login with the provided email/password.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
