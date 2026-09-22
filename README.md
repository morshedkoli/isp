# 📶 GrameenWiFi ISP Management — Broadband Billing & MikroTik CRM Platform

[![Next.js](https://img.shields.io/badge/Next.js-15.0-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748?style=for-the-badge&logo=prisma)](https://www.prisma.io/)
[![MikroTik](https://img.shields.io/badge/Router-MikroTik_RouterOS-2E7D32?style=for-the-badge)](https://mikrotik.com/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4.0-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)

An ISP billing, customer relationship management (CRM), and network operations platform engineered for Internet Service Providers with automated MikroTik RouterOS API provisioning.

---

## 🌟 Key Features

- **🌐 MikroTik RouterOS API Synchronization**: Automatically enable, disable, and throttle PPPoE / Hotspot subscriber queues upon bill payment or expiration.
- **💳 Automated Subscriber Invoicing**: Recurring monthly billing, SMS payment reminders, and digital receipt generation.
- **📊 Bandwidth & Traffic Analytics**: Monitor live client throughput, active sessions, and network health.
- **🛡️ Role-Based Staff Access**: Dedicated portals for billing agents, field technicians, and network administrators.

---

## 🛠️ Technology Stack

- **Frontend & API**: Next.js 15, React 19, TypeScript
- **Database & ORM**: Prisma ORM, PostgreSQL
- **Network Interface**: MikroTik RouterOS API Client
- **Styling**: Tailwind CSS v4, Lucide Icons

---

## 🚀 Setup & Installation

```bash
git clone https://github.com/morshedkoli/isp.git
cd isp
npm install
npx prisma db push
npm run dev
```

---

## 📄 License

Licensed under the [MIT License](LICENSE).
