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
2. Sign in with an **ADMIN** account, the same email and password as the website.

The release APK has the MongoDB connection string built in, so there's no setup
step. A build made without `build-secrets.json` shows a setup screen instead,
and the string typed there is kept in Android encrypted storage.

## View-only logins for partners and agents

PARTNER and AGENT accounts can sign in to the app as **view-only** users: they
see every tab, but all add, edit, delete and pay controls are hidden, and the
app refuses any write from them. The website stays admin-only.

To give someone a login (or a new password), run this from `mobile/`:

```powershell
dart run tool/viewer_logins.dart Halim Tanzina Sourab Tushar
```

Each name must match a partner or a commission agent. The script prints each
person's email and a new password once; it stores only the bcrypt hash and
writes the change to `audit_logs`. Running it again for someone replaces
their password.

View-only is enforced by the app, not by the database: the APK contains the
full connection string, so a technical person could still change data
directly. Only give the APK to people you trust with that.

## Security note

**The release APK contains the full database credentials.** Obfuscation does
not hide them: anyone who gets the APK file can pull the connection string out
and read or change the whole database, skipping the admin login. So:

- Share the APK only with the admins, never publicly.
- Give the app its own Atlas database user, so you can revoke it on its own
  without touching the website. If an APK leaks, change that user's password
  and rebuild.

## Develop

```powershell
flutter pub get
flutter analyze
flutter test
flutter build apk --release --obfuscate --split-debug-info=build/debug-info --dart-define-from-file=build-secrets.json
```

`build-secrets.json` (git-ignored) holds the connection string that gets built in:

```json
{ "MONGO_URL": "mongodb+srv://..." }
```

### Release signing

Release builds are signed with `android/upload-keystore.jks`, using the
passwords in `android/key.properties`. Git ignores both files. Keep a backup of
both somewhere safe: an update must be signed with the same key, or it won't
install over the existing app. If `key.properties` is missing, the build falls
back to the debug key and prints a warning.

Read-only check against a real database. It prints balances and monthly
settlements as JSON and writes nothing:

```powershell
$env:MONGO_URL = "<connection string>"; dart run tool/smoke_check.dart
```
