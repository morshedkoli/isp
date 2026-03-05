const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    const r = await prisma.hotspotSale.deleteMany({});
    console.log('Deleted', r.count, 'orphaned hotspot sale(s).');
}

main()
    .catch(e => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
