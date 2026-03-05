/**
 * Wipes all collections in the MongoDB database.
 * Run with: npx ts-node --compiler-options '{"module":"CommonJS"}' scripts/wipe-db.ts
 * Or: node -r @swc-node/register scripts/wipe-db.ts
 */
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('⚠️  Wiping all collections…');

    // Order matters — delete children before parents to avoid FK issues
    await prisma.expense.deleteMany({});
    console.log('✓ expenses');

    await prisma.hotspotSale.deleteMany({});
    console.log('✓ hotspot_sales');

    await prisma.commissionRecord.deleteMany({});
    console.log('✓ commission_records');

    await prisma.commissionAgent.deleteMany({});
    console.log('✓ commission_agents');

    await prisma.partnerPayout.deleteMany({});
    console.log('✓ partner_payouts');

    await prisma.partner.deleteMany({});
    console.log('✓ partners');

    await prisma.auditLog.deleteMany({});
    console.log('✓ audit_logs');

    await prisma.ledgerEntry.deleteMany({});
    console.log('✓ ledger_entries');

    await prisma.payment.deleteMany({});
    console.log('✓ payments');

    await prisma.recharge.deleteMany({});
    console.log('✓ recharges');

    await prisma.customer.deleteMany({});
    console.log('✓ customers');

    await prisma.plan.deleteMany({});
    console.log('✓ plans');

    await prisma.rolePermission.deleteMany({});
    console.log('✓ role_permissions');

    // Keep admin user — only wipe non-admin users
    const adminEmail = process.env.ADMIN_EMAIL || 'murshedkoli@gmail.com';
    await prisma.user.deleteMany({ where: { email: { not: adminEmail } } });
    console.log('✓ users (kept admin)');

    console.log('\n✅ Database wiped successfully. Admin account preserved.');
}

main()
    .catch(e => { console.error('❌ Error:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
