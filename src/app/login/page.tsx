'use client';

import { Suspense, useState } from 'react';
import Image from 'next/image';
import { signIn } from 'next-auth/react';
import { useRouter, useSearchParams } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { loginSchema, LoginInput } from '@/types/schemas';
import { safeCallbackUrl } from '@/lib/auth-redirect';
import {
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Sparkles,
  Calculator,
  Users,
  Wifi,
  Receipt,
} from 'lucide-react';

/**
 * The brand asset is neon artwork on a near-black plate baked into the PNG, not
 * a transparent background — at 28px in the old header it read as a smudge, and
 * at any usable size it drew a visible square. `brand-plate-fade` feathers that
 * plate away against the matching page tone (see globals.css), so the mark reads
 * as glowing on the surface. `mix-blend-screen` was tried first and does not
 * work here: an ancestor stacking context isolates the blend from the page
 * background, and the plate is not pure black anyway.
 */
function BrandLockup({ className = '' }: { className?: string }) {
  return (
    <Image
      src="/logo.png"
      alt="GrameenWifi"
      // Fixed intrinsic size with the display size set in CSS, so the rail and
      // the in-card copy share one optimized variant instead of fetching the
      // 600KB source at two different widths.
      width={256}
      height={256}
      sizes="256px"
      priority
      className={`brand-plate-fade h-auto select-none ${className}`}
    />
  );
}

const CAPABILITIES = [
  { icon: Calculator, label: 'Monthly commission settlement', hint: 'Agent payouts and company share' },
  { icon: Users, label: 'Partner equity ledgers', hint: 'Dues, payouts and aging' },
  { icon: Wifi, label: 'Hotspot voucher sales', hint: '7-day and 30-day packages' },
  { icon: Receipt, label: 'ব্যবসায়িক খরচের হিসাব', hint: 'Expense tracking by category' },
] as const;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [filledDemo, setFilledDemo] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const handleFillDemo = () => {
    setValue('email', 'admin@isp.com', { shouldValidate: true });
    setValue('password', 'admin123', { shouldValidate: true });
    setFilledDemo(true);
    setTimeout(() => setFilledDemo(false), 2500);
  };

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setError('');

    try {
      const result = await signIn('credentials', {
        email: data.email.trim(),
        password: data.password,
        redirect: false,
      });

      if (!result) {
        setError('Could not reach the sign-in service. Please try again.');
        return;
      }

      if (result.error) {
        setError(
          result.error === 'CredentialsSignin'
            ? 'Invalid admin credentials. Please verify your email and password.'
            : 'Sign-in failed. Please try again.'
        );
        return;
      }

      const target = safeCallbackUrl(searchParams.get('callbackUrl'));
      router.replace(target);
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#090f1b] text-slate-100 selection:bg-emerald-500 selection:text-white">
      {/* ── Atmosphere ───────────────────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {/* Anchored behind the brand rail so the logo sits in its own pool of light. */}
        <div className="absolute -left-32 top-1/4 h-[560px] w-[560px] rounded-full bg-emerald-500/12 blur-[140px]" />
        <div className="absolute -right-40 -top-32 h-[520px] w-[520px] rounded-full bg-teal-400/10 blur-[150px]" />
        <div className="absolute bottom-0 left-1/3 h-[400px] w-[600px] rounded-full bg-emerald-700/8 blur-[160px]" />
        <div
          className="absolute inset-0 opacity-[0.045]"
          style={{
            backgroundImage: 'radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)',
            backgroundSize: '26px 26px',
          }}
        />
        {/* Vignette keeps the eye on the centre column. */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_35%,rgba(3,6,12,0.85)_100%)]" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-6xl flex-col px-5 sm:px-8">
        {/* ── Slim top bar ───────────────────────────────────────────────── */}
        <header className="flex items-center justify-between py-5">
          <span className="whitespace-nowrap text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-500">
            Management Portal
          </span>
          <span className="hidden items-center gap-2 whitespace-nowrap rounded-full border border-emerald-500/20 bg-emerald-950/40 px-3 py-1.5 text-[11px] font-medium text-emerald-300 backdrop-blur-md sm:inline-flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-400" />
            </span>
            Sarail core system active
          </span>
        </header>

        <main className="grid flex-1 items-center gap-10 py-6 lg:grid-cols-[1.05fr_minmax(0,420px)] lg:gap-16 lg:py-10">
          {/* ── Brand rail ───────────────────────────────────────────────── */}
          <section className="hidden lg:block" aria-labelledby="brand-heading">
            <BrandLockup className="-ml-2 w-56 drop-shadow-[0_0_45px_rgba(16,185,129,0.28)]" />

            <h2
              id="brand-heading"
              className="mt-5 max-w-md text-[2.25rem] font-bold leading-[1.08] tracking-tight text-white xl:text-[2.6rem]"
            >
              Network operations,
              <span className="block bg-gradient-to-r from-emerald-300 via-teal-200 to-emerald-400 bg-clip-text text-transparent">
                one console.
              </span>
            </h2>
            <p className="mt-3.5 max-w-sm text-sm leading-relaxed text-slate-400">
              Billing cycles, partner settlements and field expenses for the Kalikaccha network —
              tracked month by month.
            </p>

            <ul className="mt-7 max-w-md space-y-0.5">
              {CAPABILITIES.map(({ icon: Icon, label, hint }) => (
                <li
                  key={label}
                  className="group flex items-center gap-3.5 rounded-xl px-3 py-2 transition-colors hover:bg-white/[0.03]"
                >
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-emerald-500/15 bg-emerald-500/[0.07] text-emerald-400 transition-colors group-hover:border-emerald-400/35 group-hover:text-emerald-300">
                    <Icon size={16} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-slate-200">{label}</span>
                    <span className="block text-xs text-slate-500">{hint}</span>
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* ── Auth card ────────────────────────────────────────────────── */}
          <section aria-labelledby="signin-heading" className="mx-auto w-full max-w-md lg:mx-0">
            <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-slate-950/60 p-7 shadow-[0_30px_80px_-20px_rgba(0,0,0,0.8)] backdrop-blur-2xl sm:p-9">
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/50 to-transparent" />

              {/* The rail is hidden below lg, so the card carries the brand there.
                  Inside the card the surface is darker than the page, so the
                  feathered plate would show a seam — this tile is painted the
                  plate colour, turning it into a deliberate brand block. */}
              <div className="mb-6 flex justify-center lg:hidden">
                <span className="inline-flex items-center justify-center rounded-2xl border border-emerald-500/15 bg-[#090f1b] p-1.5 shadow-[0_0_34px_rgba(16,185,129,0.2)]">
                  <BrandLockup className="w-[124px]" />
                </span>
              </div>

              <div className="mb-7">
                <h1
                  id="signin-heading"
                  className="text-2xl font-bold tracking-tight text-white sm:text-[1.75rem]"
                >
                  Administrator sign in
                </h1>
                <p className="mt-1.5 text-sm text-slate-400">
                  Authorized ISP staff and accounting access only.
                </p>
              </div>

              {error && (
                <div
                  role="alert"
                  className="mb-6 flex items-start gap-3 rounded-xl border border-rose-500/25 bg-rose-950/40 p-3.5 text-sm text-rose-200"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-400" />
                  <p className="flex-1 font-medium">{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                <div>
                  <label
                    htmlFor="email"
                    className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                  >
                    Admin email
                  </label>
                  <div className="group relative">
                    <Mail
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-emerald-400"
                    />
                    <input
                      {...register('email')}
                      id="email"
                      type="email"
                      autoComplete="email"
                      placeholder="admin@isp.com"
                      aria-invalid={Boolean(errors.email)}
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 pl-11 pr-4 text-sm text-white placeholder-slate-600 outline-none transition-all duration-200 focus:border-emerald-400/60 focus:bg-white/[0.05] focus:ring-4 focus:ring-emerald-500/15"
                    />
                  </div>
                  {errors.email && (
                    <p className="mt-1.5 text-xs font-medium text-rose-400">{errors.email.message}</p>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="mb-2 block text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-400"
                  >
                    Security password
                  </label>
                  <div className="group relative">
                    <Lock
                      size={17}
                      className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500 transition-colors group-focus-within:text-emerald-400"
                    />
                    <input
                      {...register('password')}
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      aria-invalid={Boolean(errors.password)}
                      className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-3 pl-11 pr-11 text-sm text-white placeholder-slate-600 outline-none transition-all duration-200 focus:border-emerald-400/60 focus:bg-white/[0.05] focus:ring-4 focus:ring-emerald-500/15"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/5 hover:text-emerald-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                    >
                      {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="mt-1.5 text-xs font-medium text-rose-400">
                      {errors.password.message}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group relative mt-1 flex w-full items-center justify-center gap-2 overflow-hidden rounded-xl bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 py-3.5 text-sm font-bold text-[#04120c] shadow-[0_10px_30px_-8px_rgba(16,185,129,0.55)] transition-all duration-300 hover:shadow-[0_14px_38px_-8px_rgba(16,185,129,0.7)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-300 active:scale-[0.99] disabled:cursor-wait disabled:opacity-70"
                >
                  {isLoading ? (
                    <>
                      <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                        />
                      </svg>
                      Authenticating…
                    </>
                  ) : (
                    <>
                      Enter control panel
                      <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 border-t border-white/[0.06] pt-5">
                <button
                  type="button"
                  onClick={handleFillDemo}
                  className="flex w-full items-center justify-between gap-2 rounded-xl border border-emerald-500/15 bg-emerald-500/[0.06] px-3.5 py-2.5 text-xs font-medium text-emerald-300 transition-all duration-200 hover:border-emerald-400/30 hover:bg-emerald-500/[0.12] hover:text-emerald-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-emerald-400"
                >
                  <span className="flex items-center gap-2">
                    <Sparkles size={14} />
                    Demo admin access
                  </span>
                  <span className="rounded-md bg-emerald-400/15 px-2 py-0.5 text-[11px] font-semibold">
                    {filledDemo ? '✓ Filled' : 'Auto-fill'}
                  </span>
                </button>
              </div>
            </div>
          </section>
        </main>

        <footer className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1 py-6 text-center text-xs font-medium text-slate-600 lg:justify-between">
          <span>Kalikaccha, Sarail, Brahmanbaria</span>
          <span suppressHydrationWarning>
            © {new Date().getFullYear()} GrameenWifi · All rights reserved
          </span>
        </footer>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
