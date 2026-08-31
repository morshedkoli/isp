'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { loginSchema, LoginInput } from '@/types/schemas';
import { 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  Radio, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles,
  Zap,
  Layers,
  Activity
} from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
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

      if (result?.error) {
        setError('Invalid admin credentials. Please verify your email and password.');
      } else {
        router.push('/dashboard');
        router.refresh();
      }
    } catch {
      setError('An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[#050b07] text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-emerald-500 selection:text-white" suppressHydrationWarning>
      {/* ── Background Cyber Grid & Ambient Lighting ─────────────────────── */}
      <div className="fixed inset-0 pointer-events-none cyber-grid opacity-60 z-0" />
      
      {/* Dynamic Glowing Radial Lights */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-[550px] bg-emerald-500/15 rounded-full blur-[140px] animate-pulse-slow" />
        <div className="absolute top-1/3 -left-48 w-[450px] h-[450px] bg-teal-500/10 rounded-full blur-[130px] animate-pulse-slow" style={{ animationDelay: '3s' }} />
        <div className="absolute -bottom-24 right-0 w-[550px] h-[500px] bg-emerald-600/10 rounded-full blur-[150px] animate-pulse-slow" style={{ animationDelay: '5s' }} />
      </div>

      {/* ── Top Header Navigation Bar ───────────────────────────────────── */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-700 p-0.5 shadow-lg shadow-emerald-500/20">
            <div className="flex h-full w-full items-center justify-center rounded-[10px] bg-[#07130b] overflow-hidden">
              <img src="/logo.png" alt="GrameenWifi" className="h-full w-full object-cover" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold tracking-tight text-white text-base">GrameenWifi</span>
              <span className="inline-flex items-center rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
                v2.4
              </span>
            </div>
            <p className="text-[11px] text-emerald-300/60 font-medium">Kalikaccha, Sarail, Brahmanbaria</p>
          </div>
        </div>

        {/* Live Status Pill */}
        <div className="hidden sm:flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-950/40 px-3.5 py-1 text-xs font-medium text-emerald-300 backdrop-blur-md">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
          <span>Sarail Core Node · Online</span>
        </div>
      </header>

      {/* ── Main Content Area ────────────────────────────────────────────── */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-md">
          
          {/* Brand Presentation */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center mb-4 p-2 rounded-2xl bg-gradient-to-b from-emerald-500/25 to-teal-500/10 border border-emerald-500/30 shadow-[0_0_45px_rgba(16,185,129,0.3)] animate-float-gentle">
              <div className="h-20 w-20 rounded-xl overflow-hidden bg-[#07130b] flex items-center justify-center border border-emerald-500/30">
                <img 
                  src="/logo.png" 
                  alt="GrameenWifi Logo" 
                  className="h-full w-full object-cover scale-105"
                  onError={(e) => {
                    // Fallback to stylized SVG icon if image fails
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </div>

            <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-white via-emerald-100 to-teal-200 bg-clip-text text-transparent sm:text-4xl">
              Operator Sign In
            </h1>
            <p className="mt-2 text-sm text-slate-400 font-medium max-w-xs mx-auto">
              Centralized Billing, Partner Settlement & Network Management Panel
            </p>
          </div>

          {/* Frosted Glass Login Card */}
          <div className="login-glass-panel rounded-3xl p-7 sm:p-8 transition-all duration-300">
            
            {/* Error Notification */}
            {error && (
              <div className="mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/30 p-4 text-sm text-rose-300 flex items-start gap-3 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-300">
                <div className="h-2 w-2 rounded-full bg-rose-400 mt-1.5 flex-shrink-0 animate-pulse" />
                <div className="flex-1">
                  <p className="font-medium text-rose-200">{error}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              
              {/* Email Address */}
              <div>
                <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-slate-300">
                  Admin Email
                </label>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-400 transition-colors">
                    <Mail size={18} />
                  </div>
                  <input
                    {...register('email')}
                    type="email"
                    autoComplete="email"
                    placeholder="admin@isp.com"
                    className="w-full rounded-xl border border-slate-700/70 bg-slate-900/80 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-emerald-400 focus:bg-slate-900 focus:ring-4 focus:ring-emerald-500/15"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.email.message}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300">
                    Security Password
                  </label>
                </div>
                <div className="relative group">
                  <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-emerald-400 transition-colors">
                    <Lock size={18} />
                  </div>
                  <input
                    {...register('password')}
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full rounded-xl border border-slate-700/70 bg-slate-900/80 py-3 pl-11 pr-11 text-sm text-white placeholder-slate-500 outline-none transition-all duration-200 focus:border-emerald-400 focus:bg-slate-900 focus:ring-4 focus:ring-emerald-500/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-emerald-300 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1.5 text-xs text-rose-400 font-medium">{errors.password.message}</p>
                )}
              </div>

              {/* Submit CTA Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="group relative mt-2 w-full overflow-hidden rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 py-3.5 text-sm font-bold text-slate-950 shadow-[0_0_25px_rgba(16,185,129,0.3)] transition-all duration-300 hover:from-emerald-400 hover:via-teal-400 hover:to-emerald-500 hover:shadow-[0_0_35px_rgba(16,185,129,0.45)] hover:scale-[1.01] active:scale-[0.99] focus:outline-none focus:ring-4 focus:ring-emerald-500/25 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <span className="relative z-10 flex items-center justify-center gap-2">
                  {isLoading ? (
                    <>
                      <svg className="h-5 w-5 animate-spin text-slate-950" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      <span>Authenticating System...</span>
                    </>
                  ) : (
                    <>
                      <span>Enter Control Panel</span>
                      <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
                    </>
                  )}
                </span>
              </button>
            </form>

            {/* Quick Demo Credentials Autofill Pill */}
            <div className="mt-6 pt-5 border-t border-slate-800/80">
              <button
                type="button"
                onClick={handleFillDemo}
                className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-emerald-950/40 hover:bg-emerald-950/70 border border-emerald-500/20 text-xs font-medium text-emerald-300 hover:text-emerald-200 transition-all duration-200"
              >
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-emerald-400" />
                  <span>Demo Admin Access</span>
                </div>
                <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-300 font-semibold">
                  {filledDemo ? '✓ Filled!' : 'Click to Auto-fill'}
                </span>
              </button>
            </div>
          </div>

          {/* Feature Badges below card */}
          <div className="mt-8 grid grid-cols-3 gap-2 px-2">
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm text-center">
              <Zap size={16} className="text-emerald-400 mb-1.5" />
              <span className="text-[11px] font-semibold text-slate-200">Real-Time</span>
              <span className="text-[9px] text-slate-400">Cycle Billing</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm text-center">
              <Layers size={16} className="text-teal-400 mb-1.5" />
              <span className="text-[11px] font-semibold text-slate-200">Settlements</span>
              <span className="text-[9px] text-slate-400">Partner Ledgers</span>
            </div>
            <div className="flex flex-col items-center justify-center p-3 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm text-center">
              <ShieldCheck size={16} className="text-emerald-400 mb-1.5" />
              <span className="text-[11px] font-semibold text-slate-200">256-Bit</span>
              <span className="text-[9px] text-slate-400">Encrypted Auth</span>
            </div>
          </div>

        </div>
      </main>

      {/* ── Footer ──────────────────────────────────────────────────────── */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-6 py-6 text-center text-xs text-slate-500 font-medium">
        <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          <span>GrameenWifi Network Administration</span>
          <span className="hidden sm:inline">·</span>
          <span>Kalikaccha, Sarail, Brahmanbaria</span>
          <span className="hidden sm:inline">·</span>
          <span suppressHydrationWarning>
            © {new Date().getFullYear()} All Rights Reserved
          </span>
        </div>
      </footer>
    </div>
  );
}
