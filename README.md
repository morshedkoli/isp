# ISP Admin Panel

A comprehensive web-based admin panel for managing Internet Service Provider (ISP) business operations including customers, billing cycles, recharges, payments, partner profit sharing, and financial reporting.

## Features

### Core Modules
- **Customer Management**: Add, edit, and track customers with full billing history
- **Billing Cycles**: 30-day billing cycles anchored to customer's first recharge
- **Recharge Management**: Track customer recharges and service activations
- **Payment Collection**: Record and allocate payments to billing cycles
- **Finance Ledger**: Track income and expenses with categorization
- **Partner Profit Sharing**: Calculate and distribute profits among partners
- **Reports & Analytics**: Monthly reports, agent performance, due aging analysis
- **Audit Logging**: Complete audit trail for all financial transactions

### Security & Access Control
- Role-Based Access Control (RBAC) with 4 roles: Admin, Partner, Agent, Employee
- Secure authentication with NextAuth
- Audit logs for all create/update/delete operations
- Session management and secure cookies

### Business Logic
- **Billing Cycle Calculation**: Cycles start from first recharge date
- **Payment Allocation**: Auto-allocate payments to oldest unpaid cycles first
- **Profit Calculation**: Monthly revenue minus expenses
- **Partner Shares**: Configurable percentage-based profit distribution

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: MongoDB
- **ORM**: Prisma
- **Authentication**: NextAuth.js
- **Styling**: Tailwind CSS
- **UI Components**: shadcn/ui patterns
- **Charts**: Recharts
- **Forms**: React Hook Form + Zod

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

5. Run database seed (creates default users, plans, and categories):
```bash
npm run db:seed
```

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:3000](http://localhost:3000) in your browser

### Default Login Credentials

After running the seed script, you can log in with these accounts:

- **Admin**: `admin@isp.com` / `admin123`
- **Partner**: `partner@isp.com` / `partner123`
- **Agent**: `agent@isp.com` / `agent123`

## Project Structure

```
isp-admin/
├── prisma/
│   ├── schema.prisma       # Database schema
│   └── seed.ts            # Database seed script
├── src/
│   ├── app/               # Next.js app router
│   │   ├── (dashboard)/   # Dashboard routes
│   │   ├── api/auth/      # NextAuth configuration
│   │   ├── login/         # Login page
│   │   ├── layout.tsx     # Root layout
│   │   └── page.tsx       # Home redirect
│   ├── components/        # React components
│   ├── lib/              # Utilities & helpers
│   │   ├── prisma.ts     # Prisma client
│   │   ├── billing.ts    # Billing cycle calculations
│   │   ├── payment-allocation.ts
│   │   ├── rbac.ts       # Role-based access control
│   │   └── audit.ts      # Audit logging
│   ├── types/            # TypeScript types & schemas
│   └── middleware.ts     # Next.js middleware
├── .env                  # Environment variables
├── package.json
└── README.md
```

## Billing Cycle Logic

The billing system follows these rules:

1. **First Recharge Anchor**: A customer's billing cycle starts from their first confirmed recharge date
2. **30-Day Cycles**: Each billing cycle is exactly 30 days
3. **Cycle Calculation**:
   - Cycle 1: firstRechargeAt → firstRechargeAt + 30 days
   - Cycle 2: firstRechargeAt + 30 → firstRechargeAt + 60 days
   - And so on...
4. **Payment Allocation**: Payments are automatically allocated to the oldest unpaid cycle first
5. **Due Calculation**: Due = Total cycle charges - Total allocated payments

## API Routes & Server Actions

The application uses Next.js Server Actions for data mutations:

- `/customers/actions.ts` - Customer CRUD operations
- `/recharges/actions.ts` - Recharge and payment operations
- `/ledger/actions.ts` - Finance ledger operations
- `/reports/actions.ts` - Reporting operations

## Database Schema

Key collections:
- **users** - Staff accounts (admin, partners, agents, employees)
- **customers** - Customer profiles and billing info
- **recharges** - Recharge transactions
- **payments** - Payment collections
- **cycleCharges** - Billing cycle charges
- **ledgerEntries** - Income and expense records
- **partners** - Partner profit share configuration
- **auditLogs** - Audit trail

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

## Key Features Explained

### Customer Billing Cycle
When a customer makes their first recharge:
1. The `firstRechargeAt` timestamp is set
2. Cycle charges are automatically generated for future billing cycles
3. Each 30-day cycle creates a charge equal to the customer's plan price
4. Customers can view their current cycle status and due amounts

### Payment Allocation
When a payment is recorded:
1. System finds all unpaid cycle charges (oldest first)
2. Allocates payment amount to each charge until payment is fully allocated
3. Updates cycle charge status (paid/unpaid)
4. Creates allocation records for tracking

### Partner Profit Sharing
At month end:
1. Calculate total revenue (payments + recharges + other income)
2. Subtract total expenses
3. Calculate net profit
4. Distribute to partners based on their share percentage
5. Generate partner share reports

## License

MIT License - feel free to use for your ISP business!

## Support

For issues or questions:
- Create an issue on GitHub
- Email: support@yourisp.com

## Roadmap

### Phase 1 (MVP) - Complete ✓
- [x] Customer management
- [x] Recharge & payment tracking
- [x] Billing cycle calculations
- [x] Finance ledger
- [x] Monthly profit reporting
- [x] Basic RBAC

### Phase 2 (Coming Soon)
- [ ] Commission calculation for agents
- [ ] Monthly closing with locking
- [ ] Customer statement PDF generation
- [ ] File attachments support
- [ ] SMS/WhatsApp notifications
- [ ] Advanced audit features
- [ ] Multi-currency support

## Contributing

Contributions are welcome! Please:
1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

Built with ❤️ for ISP businesses worldwide