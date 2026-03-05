import { PrismaClient, UserRole, PermissionModule, PermissionAction, LedgerType, PaymentMethod } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting database seed...');

  // Clean existing data
  await prisma.paymentAllocation.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.cycleCharge.deleteMany({});
  await prisma.recharge.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.plan.deleteMany({});
  await prisma.ledgerCategory.deleteMany({});
  await prisma.ledgerEntry.deleteMany({});
  await prisma.partnerShare.deleteMany({});
  await prisma.monthlyClose.deleteMany({});
  await prisma.partnerPayout.deleteMany({});
  await prisma.partner.deleteMany({});
  await prisma.auditLog.deleteMany({});
  await prisma.rolePermission.deleteMany({});
  await prisma.user.deleteMany({});
  await prisma.setting.deleteMany({});

  console.log('Cleaned existing data');

  // Create default admin user
  const adminPassword = await bcrypt.hash('admin123', 10);
  const admin = await prisma.user.create({
    data: {
      email: 'admin@isp.com',
      name: 'System Administrator',
      password: adminPassword,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  console.log('Created admin user:', admin.email);

  // Create sample partner user
  const partnerPassword = await bcrypt.hash('partner123', 10);
  const partnerUser = await prisma.user.create({
    data: {
      email: 'partner@isp.com',
      name: 'Business Partner',
      password: partnerPassword,
      role: UserRole.PARTNER,
      isActive: true,
    },
  });

  const partner = await prisma.partner.create({
    data: {
      userId: partnerUser.id,
      sharePercent: 40,
      isActive: true,
    },
  });

  console.log('Created partner:', partnerUser.email);

  // Create sample agent user
  const agentPassword = await bcrypt.hash('agent123', 10);
  const agent = await prisma.user.create({
    data: {
      email: 'agent@isp.com',
      name: 'Sales Agent',
      password: agentPassword,
      role: UserRole.AGENT,
      isActive: true,
    },
  });

  console.log('Created agent:', agent.email);

  // Create default role permissions
  const rolePermissions = [
    // Admin - full access
    { role: UserRole.ADMIN, module: PermissionModule.CUSTOMERS, actions: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT, PermissionAction.DELETE] },
    { role: UserRole.ADMIN, module: PermissionModule.RECHARGES, actions: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT, PermissionAction.DELETE, PermissionAction.APPROVE] },
    { role: UserRole.ADMIN, module: PermissionModule.PAYMENTS, actions: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT, PermissionAction.DELETE] },
    { role: UserRole.ADMIN, module: PermissionModule.FINANCE_LEDGER, actions: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT, PermissionAction.DELETE] },
    { role: UserRole.ADMIN, module: PermissionModule.REPORTS, actions: [PermissionAction.VIEW] },
    { role: UserRole.ADMIN, module: PermissionModule.SETTINGS, actions: [PermissionAction.VIEW, PermissionAction.EDIT] },
    { role: UserRole.ADMIN, module: PermissionModule.AUDIT_LOGS, actions: [PermissionAction.VIEW] },

    // Partner - limited access
    { role: UserRole.PARTNER, module: PermissionModule.CUSTOMERS, actions: [PermissionAction.VIEW] },
    { role: UserRole.PARTNER, module: PermissionModule.REPORTS, actions: [PermissionAction.VIEW] },
    { role: UserRole.PARTNER, module: PermissionModule.FINANCE_LEDGER, actions: [PermissionAction.VIEW] },

    // Agent - customer management
    { role: UserRole.AGENT, module: PermissionModule.CUSTOMERS, actions: [PermissionAction.VIEW, PermissionAction.CREATE, PermissionAction.EDIT] },
    { role: UserRole.AGENT, module: PermissionModule.RECHARGES, actions: [PermissionAction.VIEW, PermissionAction.CREATE] },
    { role: UserRole.AGENT, module: PermissionModule.PAYMENTS, actions: [PermissionAction.VIEW, PermissionAction.CREATE] },

    // Employee - configurable
    { role: UserRole.EMPLOYEE, module: PermissionModule.CUSTOMERS, actions: [PermissionAction.VIEW] },
    { role: UserRole.EMPLOYEE, module: PermissionModule.RECHARGES, actions: [PermissionAction.VIEW] },
    { role: UserRole.EMPLOYEE, module: PermissionModule.PAYMENTS, actions: [PermissionAction.VIEW] },
  ];

  for (const rp of rolePermissions) {
    await prisma.rolePermission.create({
      data: rp,
    });
  }

  console.log('Created role permissions');

  // Create sample plans
  const plans = [
    { name: '5Mbps', speedLabel: '5 Mbps', monthlyPrice: 500, description: 'Basic residential package' },
    { name: '10Mbps', speedLabel: '10 Mbps', monthlyPrice: 800, description: 'Standard residential package' },
    { name: '20Mbps', speedLabel: '20 Mbps', monthlyPrice: 1200, description: 'Premium residential package' },
    { name: '50Mbps', speedLabel: '50 Mbps', monthlyPrice: 2500, description: 'Business package' },
    { name: '100Mbps', speedLabel: '100 Mbps', monthlyPrice: 5000, description: 'Enterprise package' },
  ];

  for (const plan of plans) {
    await prisma.plan.create({
      data: {
        ...plan,
        isActive: true,
      },
    });
  }

  console.log('Created sample plans');

  // Create default ledger categories
  const expenseCategories = [
    'Bandwidth/Upstream',
    'Salaries',
    'Rent',
    'Electricity',
    'Equipment',
    'Maintenance',
    'Marketing',
    'Transport',
    'Misc',
  ];

  const incomeCategories = [
    'Installation Fees',
    'Router Sales',
    'Other Service Income',
    'Misc',
  ];

  for (const category of expenseCategories) {
    await prisma.ledgerCategory.create({
      data: {
        type: LedgerType.EXPENSE,
        name: category,
        isActive: true,
      },
    });
  }

  for (const category of incomeCategories) {
    await prisma.ledgerCategory.create({
      data: {
        type: LedgerType.INCOME,
        name: category,
        isActive: true,
      },
    });
  }

  console.log('Created ledger categories');

  // Create default settings
  const settings = [
    { key: 'CYCLE_LENGTH_DAYS', value: '30', description: 'Billing cycle length in days' },
    { key: 'GRACE_PERIOD_DAYS', value: '3', description: 'Grace period after cycle end before suspension' },
    { key: 'CURRENCY_SYMBOL', value: '৳', description: 'Currency symbol for display' },
    { key: 'COMPANY_NAME', value: 'ISP Admin System', description: 'Company name for reports' },
    { key: 'COMPANY_ADDRESS', value: '', description: 'Company address' },
    { key: 'COMPANY_PHONE', value: '', description: 'Company contact phone' },
    { key: 'COMPANY_EMAIL', value: '', description: 'Company contact email' },
  ];

  for (const setting of settings) {
    await prisma.setting.create({
      data: setting,
    });
  }

  console.log('Created default settings');

  // Create sample customers
  const sampleCustomers = [
    {
      customerId: 'CUST-001',
      name: 'John Doe',
      phone: '01711111111',
      email: 'john@example.com',
      address: 'House 1, Road 1, Gulshan',
      area: 'Gulshan',
      zone: 'Dhaka North',
      planName: '20Mbps',
    },
    {
      customerId: 'CUST-002',
      name: 'Jane Smith',
      phone: '01722222222',
      email: 'jane@example.com',
      address: 'House 2, Road 2, Banani',
      area: 'Banani',
      zone: 'Dhaka North',
      planName: '10Mbps',
    },
    {
      customerId: 'CUST-003',
      name: 'Bob Johnson',
      phone: '01733333333',
      email: 'bob@example.com',
      address: 'House 3, Road 3, Dhanmondi',
      area: 'Dhanmondi',
      zone: 'Dhaka South',
      planName: '5Mbps',
    },
  ];

  for (const customerData of sampleCustomers) {
    const plan = await prisma.plan.findFirst({
      where: { name: customerData.planName },
    });

    if (plan) {
      await prisma.customer.create({
        data: {
          customerId: customerData.customerId,
          name: customerData.name,
          phone: customerData.phone,
          email: customerData.email,
          address: customerData.address,
          area: customerData.area,
          zone: customerData.zone,
          planId: plan.id,
          assignedAgentId: agent.id,
          status: 'ACTIVE',
          firstRechargeAt: new Date('2026-01-01'),
        },
      });
    }
  }

  console.log('Created sample customers');

  console.log('\n✅ Seed completed successfully!');
  console.log('\nDefault login credentials:');
  console.log('Admin: admin@isp.com / admin123');
  console.log('Partner: partner@isp.com / partner123');
  console.log('Agent: agent@isp.com / agent123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });