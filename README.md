# ISP Admin Panel

A web-based admin panel for managing a small ISP's commission-based business: agent commissions received from the upstream ISP company, hotspot cash voucher sales, business expenses, and partner profit sharing.

## Features

### Core Modules
- **Dashboard**: Monthly snapshot of commission pool, expenses, hotspot revenue, and partner settlement status
- **Expenses**: Track monthly salary and miscellaneous business expenses
- **Hotspot Sales**: Record cash voucher sales (7-day / 30-day passes) with quick-add shortcuts
- **Commissions**: Enter the monthly commission pool received from the upstream ISP, allocate payouts to field agents, and see the net amount distributable to partners
- **Partners**: Manage partner profiles and share percentages, and settle each partner's monthly commission share (either one calculated payout, or one-by-one per month)
- **Reports**: Monthly revenue/expense/profit summary, agent performance, and partner due aging, with CSV export
- **Settings**: View configured plans and system settings
- **Audit Logging**: Create/update/delete actions on expenses, hotspot sales, commission records, agents, and partners are recorded in the audit log

### Security & Access Control
- Login is restricted to `ADMIN` role accounts only (single-operator tool)
- A role/permission model (Partner, Agent, Employee + module permissions) exists in the schema for future multi-user access, but is not yet wired into login
- Secure authentication with NextAuth (JWT sessions)
- Audit logs for create/update/delete operations on the modules above

### Business Logic
- **Monthly Commission**: `netCommission = commissionPool − agentPayouts − (salary + misc expenses)`
- **Partner Shares**: `partnerDue = netCommission × sharePercent / 100`, tracked against actual settlement payouts so remaining due is always accurate
- **Hotspot Revenue**: Tracked separately as cash voucher sales, not split with partners

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **Forms**: React Hook Form + Zod (login only)

## Getting Started

### Prerequisites
- Node.js 18+
- MongoDB Atlas account or local MongoDB instance
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd isp-admin
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables:
Create a `.env` file in the root directory:
```env
# Database
DATABASE_URL="mongodb+srv://username:password@cluster.mongodb.net/isp-admin?retryWrites=true&w=majority"

# NextAuth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="your-super-secret-key-change-this-in-production"

# App Settings
APP_NAME="ISP Admin Panel"
APP_TIMEZONE="Asia/Dhaka"
APP_CURRENCY="BDT"
```

4. Generate Prisma client:
```bash
npx prisma generate
```

5. Run database seed (creates default admin user, plans, and categories):
```bash
npm run db:seed
```

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

### Default Login Credentials

After running the seed script, you can log in with:

- **Admin**: `admin@isp.com` / `admin123`

Only `ADMIN` role accounts can sign in — Partner/Agent/Employee accounts exist in the schema but are not login-capable today.

## Project Structure

```
isp-admin/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts             # Database seed script
├── src/
│   ├── app/
│   │   ├── (dashboard)/    # Dashboard, Expenses, Hotspot, Commissions, Partners, Reports, Settings
│   │   ├── api/auth/       # NextAuth configuration
│   │   ├── api/reports/    # CSV export routes
│   │   ├── login/          # Login page
│   │   ├── layout.tsx      # Root layout
│   │   └── page.tsx        # Home redirect
│   ├── components/ui/      # Shared UI primitives (toast)
│   ├── lib/                 # Utilities & helpers
│   │   ├── prisma.ts       # Prisma client
│   │   ├── settlement.ts   # Monthly partner commission settlement calculation
│   │   ├── billing.ts      # Date/currency formatting + unused billing-cycle math (see note below)
│   │   ├── rbac.ts         # Role-based permission lookup
│   │   ├── authz.ts        # Session + permission guards for server actions
│   │   ├── audit.ts        # Audit logging
│   │   └── errors.ts       # Shared error message helper
│   ├── types/               # TypeScript types & Zod schemas
│   └── proxy.ts             # Auth-gating middleware
├── .env                     # Environment variables
├── package.json
└── README.md
```

Each dashboard module follows the same pattern: `page.tsx` (server component, data fetching), `*Client.tsx` (client component, UI/state), `actions.ts` (server actions, mutations).

### Note on the Prisma schema

The schema also defines a `Customer` / `Recharge` / `Payment` / `CycleCharge` / `LedgerEntry` model set for a traditional per-customer subscription billing flow (30-day cycles anchored to first recharge, oldest-cycle-first payment allocation). This logic is implemented and unit-tested (`src/lib/billing.ts`, `src/lib/payment-allocation.ts`, `tests/`), but there is currently no UI or server action that creates or reads this data — the app's live business model is the commission/hotspot flow described above. Treat these models as reserved for a future customer-management feature, not as active functionality.

## Monthly Commission & Settlement Logic

1. Each month, the total commission pool received from the upstream ISP is entered on the Commissions page, broken into named sources
2. Payouts to field agents (`CommissionAgent`) are entered or auto-calculated from each agent's commission percentage
3. `netCommission = pool − agentPayouts − salaryExpenses − miscExpenses`
4. Each active partner's due share = `netCommission × sharePercent / 100`
5. Partners are settled via `PartnerPayout` records, tagged with the settlement period so remaining-due amounts stay accurate across repeated visits (see `src/lib/settlement.ts`)

## API Routes & Server Actions

The application uses Next.js Server Actions for data mutations, one `actions.ts` per dashboard module:

- `(dashboard)/expenses/actions.ts` — Expense CRUD
- `(dashboard)/hotspot/actions.ts` — Hotspot sale CRUD + monthly summary
- `(dashboard)/commissions/actions.ts` — Commission agent CRUD + monthly commission record
- `(dashboard)/partners/actions.ts` — Partner CRUD, payouts, monthly settlement
- `(dashboard)/reports/actions.ts` — Reporting

CSV export API routes:
- `/api/reports/monthly-csv` — Monthly revenue/expense/partner-share export
- `/api/reports/due-list-csv` — Partner due aging export

## Database Schema

Actively used collections:
- **users** — Staff accounts (currently admin-only login)
- **partners** — Partner profit share configuration
- **partner_payouts** — Partner payout/settlement records
- **expenses** — Salary and misc business expenses
- **hotspot_sales** — Cash voucher sales
- **commission_records** / **commission_sources** / **commission_agents** / **agent_commission_entries** — Monthly commission pool and agent payouts
- **audit_logs** — Audit trail

Reserved (not yet exposed in the UI — see note above): **customers**, **recharges**, **payments**, **cycle_charges**, **payment_allocations**, **ledger_entries**, **monthly_closes**, **partner_shares**, **plans**, **role_permissions**, **ledger_categories**.

## Development

### Running Tests
```bash
npm test
```

### Building for Production
```bash
npm run build
```

### Linting
```bash
npm run lint
```

## Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Add environment variables in Vercel dashboard
4. Deploy

### VPS/Dedicated Server
1. Build the application: `npm run build`
2. Set environment variables
3. Start the server: `npm start`
4. Use PM2 or similar for process management

### MongoDB Atlas Setup
1. Create a new cluster
2. Configure network access (IP whitelist)
3. Create a database user
4. Get connection string
5. Add to `DATABASE_URL` environment variable

## License

MIT License

## Support

For issues or questions, open an issue on the repository.
