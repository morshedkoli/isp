# GrameenWiFi Admin — Android app

A native Flutter app for the same MongoDB database the Next.js website uses.
It has no web wrapper and no API in between: it reads and writes the Prisma
collections directly.

## What it does

| Tab | Matches the website's | Can change |
|---|---|---|
| Overview | Dashboard (all-time totals, partners, month-by-month) | — |
| Monthly | Monthly page + Commissions calculator | Enter or edit the month's commission sources and agent amounts; give money to a partner |
| Hotspot | Hotspot page | Add, edit and delete sales (priced from the 7-day/30-day package table) |
| Expenses | Expenses page | Add, edit and delete expenses in all 7 categories |
| Balances | Balances & partner/agent profiles | Record, edit and delete payments; credit/debit adjustments |

Managing partners, agents and users (create, rename, change %) stays on the website.

The ledger, settlement and overview math in `lib/domain/` is a line-by-line
port of `src/lib/partner-ledger.ts`, `agent-ledger.ts` and `settlement.ts`.
Every write also adds an `audit_logs` row, the same as the website
(`userAgent: isp_admin_android`).

## First run

1. Install `build/app/outputs/flutter-apk/app-release.apk` on the phone.
2. Paste the MongoDB connection string (the website's `DATABASE_URL`). It is
   stored in Android encrypted storage on that phone only. It is never
   compiled into the APK.
3. Sign in with an **ADMIN** account, the same email and password as the website.

## Security note

The phone holds the full database credentials. Anyone who has the unlocked
phone, or who extracts that string from it, gets full read/write access to the
database. Use a dedicated Atlas database user with a strong password for the
app, so you can revoke it on its own. Also restrict Atlas Network Access where
you can.

## Develop

```powershell
flutter pub get
flutter analyze
flutter test
flutter build apk --release --obfuscate --split-debug-info=build/debug-info
```

Read-only check against a real database. It prints balances and monthly
settlements as JSON and writes nothing:

```powershell
$env:MONGO_URL = "<connection string>"; dart run tool/smoke_check.dart
```
